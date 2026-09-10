/**
 * 测试用请求上下文注入。
 *
 * serverFn 通过 TanStack 的 AsyncLocalStorage 取请求信息（cookie / IP /
 * header），脱离真实服务器直接调用会抛 "No StartEvent found"。
 * 这个模块把构造好的 h3Event 塞进同一个 storage，让 serverFn 能在测试里
 * 被当普通函数调用。
 *
 * 之所以能这么做：TanStack 把 storage 挂在
 * globalThis[Symbol.for("tanstack-start:event-storage")] 上（见
 * @tanstack/start-server-core 的 request-response.js），而不是模块私有变量。
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { mockEvent } from "h3-v2";
import { runWithStartContext } from "@tanstack/start-storage-context";

const EVENT_STORAGE_KEY = Symbol.for("tanstack-start:event-storage");

type H3Event = ReturnType<typeof mockEvent>;

interface StartEvent {
  h3Event: H3Event;
}

function getStorage(): AsyncLocalStorage<StartEvent> {
  const g = globalThis as unknown as Record<
    string | symbol,
    AsyncLocalStorage<StartEvent> | undefined
  >;
  if (!g[EVENT_STORAGE_KEY]) {
    g[EVENT_STORAGE_KEY] = new AsyncLocalStorage<StartEvent>();
  }
  return g[EVENT_STORAGE_KEY];
}

/** 当前请求的上下文（withRequest 执行期间可用）。 */
export interface CallContext {
  /** Cookie 键值对，会序列化成 Cookie 头。 */
  cookies?: Record<string, string>;
  /** 请求头，键名大小写不敏感。 */
  headers?: Record<string, string>;
  /**
   * 客户端 IP。
   *
   * 不写进 x-forwarded-for：生产代码用的是无参 getRequestIP()，读的是
   * socket 地址，而 mockEvent 造不出真实 socket。测试里改由 module mock
   * 提供（见下方的 getRequestIP 拦截）。
   */
  ip?: string;
  method?: string;
  /** 请求 URL，默认 http://localhost:3000/。 */
  url?: string;
}

/**
 * 当前请求上下文。
 *
 * 用 globalThis 保存：getRequestIP 的 mock 在另一个模块作用域里执行，
 * 需要读到调用方设置的 IP。
 */
const CURRENT_CTX_KEY = Symbol.for("test:current-request-ctx");

function setCurrentCtx(ctx: CallContext | undefined) {
  (globalThis as unknown as Record<symbol, CallContext | undefined>)[CURRENT_CTX_KEY] = ctx;
}

/** 供 module mock 读取当前注入的 IP。 */
export function currentRequestIP(): string | undefined {
  return (globalThis as unknown as Record<symbol, CallContext | undefined>)[CURRENT_CTX_KEY]?.ip;
}

/**
 * 最近一次 withRequest 里设置的响应状态码。
 *
 * serverFn 通过 setResponseStatus 设的是 event 上的状态，测试拿不到
 * event 本身，所以在这里记一份。仅用于断言「限速时确实返回 429」
 * 这类响应层的行为。
 */
const LAST_STATUS_KEY = Symbol.for("test:last-response-status");

function setLastStatus(code: number | undefined) {
  (globalThis as unknown as Record<symbol, number | undefined>)[LAST_STATUS_KEY] = code;
}

/** 读取最近一次 withRequest 结束时的响应状态码。 */
export function lastResponseStatus(): number | undefined {
  return (globalThis as unknown as Record<symbol, number | undefined>)[LAST_STATUS_KEY];
}

/**
 * 在指定请求上下文里调 serverFn。
 *
 * 两个实测出来的限制（都已确认原因，不是猜的）：
 *
 * 1. validator 不执行。executeMiddleware 里写的是
 *    `if (validator && env === "server")`，而测试直调走的是 client 存根
 *    路径（env === "client"），所以在测试里非法输入不会像生产那样被拦在
 *    入口 —— 会直接跑到 handler 里落库。
 *    需要校验覆盖的用例用 callServerFnValidated。
 *
 * 2. 拿不到成功返回值（客户端存根要经 RPC 传输层回传 result），
 *    但失败会正常抛错。所以断言策略是：
 *      失败 → rejects.toThrow()
 *      成功 → 断言数据库副作用（比断言返回值更严格）
 */
export function callServerFn<TArgs, TResult>(
  fn: (opts: { data: TArgs }) => Promise<TResult>,
  args: TArgs,
  ctx: CallContext = {},
): Promise<TResult> {
  return withRequest(ctx, () => fn({ data: args }));
}

/**
 * serverFn 对象上真正的服务端执行入口。
 *
 * 类型故意放宽（fn 用 unknown 收）：serverFn 的实际类型是 TanStack 生成的
 * 复杂泛型，与这里的签名对不上。测试里传进来的参数是手写的，语义正确即可。
 */
type ExecutableServerFn = {
  __executeServer?: (opts: {
    method: "GET" | "POST";
    data: unknown;
    headers?: HeadersInit;
    context?: unknown;
  }) => Promise<unknown>;
};

/**
 * 调用 serverFn 并**拿到返回值**（callServerFn 拿不到，原因见文件头）。
 *
 * 走的是 serverFn 上的 `__executeServer`，即服务端真正执行 handler 的那条
 * 路径 —— 所以返回值是 handler 的原值，不经 RPC 传输层。
 *
 * 仅用于必须断言返回值的读接口（比如列表）。写接口优先用 callServerFn /
 * callServerFnValidated 并断言数据库副作用 —— 那比断言返回值更严格。
 */
export function callServerFnResult<TArgs, TResult>(
  fn: ExecutableServerFn,
  args: TArgs,
  ctx: CallContext = {},
): Promise<TResult> {
  const exec = fn.__executeServer;
  if (!exec) {
    throw new Error("callServerFnResult: 该函数没有 __executeServer（不是 serverFn？）");
  }
  return withRequest(ctx, async () => {
    const r = await exec({ method: "POST", data: args });
    // 服务端路径的返回值可能被包了一层 { result }，也可能就是原值。
    return ((r as { result?: unknown })?.result ?? r) as TResult;
  });
}

/** 带校验、且能拿到返回值。 */
export function callServerFnResultValidated<TArgs, TResult>(
  fn: ExecutableServerFn,
  schema: ValidatorLike<TArgs>,
  args: TArgs,
  ctx: CallContext = {},
): Promise<TResult> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) return Promise.reject(parsed.error);
  return callServerFnResult<TArgs, TResult>(fn, parsed.data, ctx);
}

/** zod 风格的 schema（只用到 safeParse）。 */
export interface ValidatorLike<T> {
  safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: unknown };
}

/**
 * 带 schema 校验的 serverFn 调用，模拟生产环境 env==="server" 的行为。
 *
 * 校验失败时抛错（与生产一致：校验不过就不进 handler，因此不会落库）。
 */
export function callServerFnValidated<TArgs, TResult>(
  fn: (opts: { data: TArgs }) => Promise<TResult>,
  schema: ValidatorLike<TArgs>,
  args: TArgs,
  ctx: CallContext = {},
): Promise<TResult> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    return Promise.reject(parsed.error);
  }
  return callServerFn(fn, parsed.data, ctx);
}

/**
 * 在给定的请求上下文里执行 fn。
 *
 * 可嵌套 —— 外层上下文在 fn 返回后恢复。
 */
export function withRequest<T>(ctx: CallContext, fn: () => Promise<T> | T): Promise<T> {
  const headers = new Headers();
  for (const [k, v] of Object.entries(ctx.headers ?? {})) headers.set(k, v);
  if (ctx.cookies && Object.keys(ctx.cookies).length > 0) {
    headers.set(
      "cookie",
      Object.entries(ctx.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; "),
    );
  }

  const event = mockEvent(ctx.url ?? "http://localhost:3000/", {
    method: ctx.method ?? "POST",
    headers,
  }) as H3Event;

  const storage = getStorage();

  // TanStack 有两层 AsyncLocalStorage：eventStorage（h3Event）与
  // startStorage（start context）。serverFn 两层都要读，缺后者就报
  // "No Start context found"。
  //
  // getRouter 用不到（serverFn 不经路由），但类型要求给出；
  // 真被调用时抛错，避免静默返回错值。
  const startContext = {
    getRouter: () => {
      throw new Error("[test] serverFn 不应访问 router");
    },
    request: new Request(ctx.url ?? "http://localhost:3000/"),
    startOptions: {},
    // __executeServer 会把它合并进 serverFn 的 context 参数。
    // 用空对象而非 undefined，避免 merge 时抛错。
    contextAfterGlobalMiddlewares: {},
    executedRequestMiddlewares: new Set(),
    handlerType: "serverFn" as const,
  };

  return Promise.resolve(
    storage.run({ h3Event: event }, () =>
      runWithStartContext(startContext as never, async () => {
        const prev = currentRequestIP();
        setCurrentCtx(ctx);
        try {
          return await fn();
        } finally {
          // 记下本次请求的响应状态（供 429 断言使用）
          const res = (event as unknown as { res?: { status?: number } }).res;
          setLastStatus(res?.status);
          // 恢复外层上下文（嵌套调用时不能清成 undefined）
          setCurrentCtx(prev === undefined ? undefined : { ip: prev });
        }
      }),
    ),
  );
}
