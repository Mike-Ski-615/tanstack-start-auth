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
 * serverFn 对象上真正的服务端入口。
 *
 * 类型故意放宽（用 unknown 收）：serverFn 的实际类型是 TanStack 生成的复杂
 * 泛型，与这里的签名对不上。测试里传进来的参数是手写的，语义正确即可。
 *
 * `url` 是编译器写入的 `/_serverFn/<functionId>` —— **这是取服务端实现的钥匙**，
 * 见下面的 resolveServerImplementation。
 */
export type ExecutableServerFn = {
  url?: string;
  __executeServer?: (opts: {
    method: "GET" | "POST";
    data: unknown;
    headers?: HeadersInit;
    context?: unknown;
  }) => Promise<unknown>;
};

/** serverFn 的返回值形状：服务端路径把结果 **和错误** 都放在这里。 */
type ServerFnOutcome = { result?: unknown; error?: unknown };

/**
 * 取 serverFn 的服务端实现。
 *
 * ## 为什么不能直接用 `fn(...)` 或 `fn.__executeServer(...)`
 *
 * Start 编译器把每个 serverFn 拆成两个模块：
 *
 * - **调用方模块**（`src/server/x.functions.ts` 本体）：`.handler()` 的第一个
 *   参数被换成 RPC 桩，第二个参数（真 handler）**不在这里**。
 *   所以这个模块里的 `fn.__executeServer` 没有 handler 可跑，
 *   只会静默返回 `{ result: undefined, error: undefined }` —— 不报错，
 *   所以断言会以一种很难查的方式失效。
 * - **服务端实现模块**（`...?tss-serverfn-split`）：`.handler(桩, 真 handler)`，
 *   `fn.__executeServer` 在这里是活的。
 *
 * `fn.url` 里的 functionId 就是通往后者的钥匙，而编译器生成的
 * `#tanstack-start-server-fn-resolver` 虚拟模块提供了查询入口。
 *
 * ## 拿到的是真服务端路径
 *
 * 返回的实现是 `(opts) => fn.__executeServer(opts)`，而 `__executeServer` 走
 * `executeMiddleware(..., "server")` —— 因此：
 *
 * - **`.server()` 中间件会执行**（认证中间件在这里生效）
 * - **validator 会执行**（与生产一致，非法输入被拦在入口）
 *
 * 对比：直接 `fn({ data })` 走的是 `executeMiddleware(..., "client")`，
 * 只跑 `.client()` 中间件、不跑 validator。
 */
async function resolveServerImplementation(fn: ExecutableServerFn) {
  const url = fn.url;
  if (!url) {
    throw new Error(
      "callServerFn: 该 serverFn 没有 url，说明 tanstackStart 插件没加载（见 vitest.config.ts）",
    );
  }
  const functionId = url.slice(url.lastIndexOf("/") + 1);
  const { getServerFnById } = await import("#tanstack-start-server-fn-resolver");
  return getServerFnById(functionId, { origin: "server" });
}

/**
 * 执行一次服务端路径，并把「错误装在返回值里」翻译回「抛错」。
 *
 * redirect 也在这条路上（executeMiddleware 把它放进 `error`），一并透传。
 */
async function runOnServerPath(
  fn: ExecutableServerFn,
  args: unknown,
  method: "GET" | "POST",
): Promise<unknown> {
  const run = await resolveServerImplementation(fn);
  const outcome = (await run({ method, data: args })) as ServerFnOutcome;
  if (outcome?.error) throw outcome.error;
  return outcome?.result;
}

/**
 * 在指定请求上下文里调 serverFn。
 *
 * 走的是编译后的**服务端实现**，与生产同一条路径 —— 因此 `.server()` 中间件
 * 与 validator 都真实执行，`.server()` 中间件挂的鉴权才是被回归网盯着的东西。
 * 细节见 resolveServerImplementation 的注释。
 *
 * 习惯上与原来一致：失败 → `rejects.toThrow()`；成功 → 断言数据库副作用
 * （比断言返回值更严格）。返回值现在也拿得到了。
 */
export function callServerFn<TArgs, TResult>(
  fn: ExecutableServerFn,
  args: TArgs,
  ctx: CallContext = {},
): Promise<TResult> {
  return withRequest(ctx, () => runOnServerPath(fn, args, "POST")) as Promise<TResult>;
}

/**
 * 调用 serverFn 并拿到返回值。
 *
 * `callServerFn` 现在也走服务端实现，两者等价 —— 保留这个名字是为了
 * 不动既有用例。
 */
export function callServerFnResult<TArgs, TResult>(
  fn: ExecutableServerFn,
  args: TArgs,
  ctx: CallContext = {},
): Promise<TResult> {
  return callServerFn<TArgs, TResult>(fn, args, ctx);
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
 * 带 schema 校验的 serverFn 调用。
 *
 * 保留是为了兼容既有用例，但**不再有必要** —— `callServerFn` 现在也走
 * 服务端路径，validator 会真实执行（这条路径下非法输入会被拦在入口）。
 */
export function callServerFnValidated<TArgs, TResult>(
  fn: ExecutableServerFn,
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

  /*
   * 把 IP 写进 event —— 交给生产代码自己的 getRequestIP() 去读。
   *
   * h3 的实现是 `event.req.context?.clientAddress || event.req.ip`
   * （见 h3-v2 的 getRequestIP），而它原本读的 socket 地址 mockEvent 造不出来。
   * 以前这里是靠 `vi.mock("@tanstack/react-start/server")` 换掉 getRequestIP ——
   * 但那个 mock 到不了 serverFn 的编译产物（`*?tss-serverfn-split`），
   * 于是**走服务端路径时 IP 维度静默失效**（限速桶全落进空 subject）。
   * 写在 event 上就没有这个问题：无论代码从哪条路径调 getRequestIP 都读得到。
   */
  if (ctx.ip) {
    const req = (event as unknown as { req: { ip?: string; context?: Record<string, unknown> } })
      .req;
    req.ip = ctx.ip;
  }

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
        try {
          return await fn();
        } finally {
          // 记下本次请求的响应状态（供 429 断言使用）
          const res = (event as unknown as { res?: { status?: number } }).res;
          setLastStatus(res?.status);
        }
      }),
    ),
  );
}
