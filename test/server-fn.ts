/**
 * bun 测试直调 server function 的助手。
 *
 * server function 的 RPC 封装需经 vite 插件编译注入，bun 测试中不可直调：
 * 编译器把 .handler(fn) 改写为 .handler(clientRpcStub, serverFn)（见
 * start-plugin-core/start-compiler/handleCreateServerFn.js），未编译时
 * 第二个参数 serverFn 缺失，__executeServer 走到 handler 层直接落空。
 *
 * 对策：mock.module 拦截 "@tanstack/react-start" 的 createServerFn，
 * 在 .handler(fn) 时自动补齐第二参数（serverFn = handler 本体），
 * 还原编译形态。之后经 __executeServer + runWithStartContext 即可在
 * 最小请求上下文中运行完整的服务端链条（validator → middleware → handler），
 * 与真实请求路径（createStartHandler 的 serverFn 分支）等价。
 *
 * 注意：本模块必须在 server function 模块之前被导入（mock 先于使用）。
 */
import { mock } from "bun:test";
import {
  requestHandler,
  getResponseHeader,
} from "@tanstack/react-start/server";
import { runWithStartContext } from "@tanstack/start-storage-context";
import {
  createServerFn as actualCreateServerFn,
  createMiddleware,
} from "@tanstack/start-client-core";

type Chain = {
  handler: (fn: HandlerFn, serverFn?: HandlerFn) => unknown;
  validator: (v: unknown) => Chain;
  middleware: (m: unknown[]) => Chain;
};
type HandlerFn = (ctx: unknown) => Promise<unknown>;

/** 补齐编译器注入的第二参数，并让链上后续节点同样携带补丁。 */
function patchChain(chain: Chain): Chain {
  const origHandler = chain.handler;
  const origValidator = chain.validator;
  const origMiddleware = chain.middleware;
  chain.handler = (fn, serverFn) => origHandler(fn, serverFn ?? fn);
  chain.validator = (v) => patchChain(origValidator(v));
  chain.middleware = (m) => patchChain(origMiddleware(m));
  return chain;
}

mock.module("@tanstack/react-start", () => ({
  createServerFn: (options?: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patchChain(actualCreateServerFn(options as any) as unknown as Chain),
  createMiddleware,
}));

type ServerFn = {
  // 测试助手不关心 __executeServer 的完整类型，放宽以兼容各 server function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __executeServer: (opts: any) => Promise<any>;
};

/**
 * 在最小请求上下文中执行 server function，
 * 捕获 handler 返回值、抛出的错误与 Set-Cookie 响应头。
 * handler 抛错时 error 为原错误对象，result 为 undefined。
 */
export async function callServerFn<R = unknown>(
  fn: ServerFn,
  data?: unknown,
  opts?: { cookie?: string },
): Promise<{ result?: R; error?: Error; setCookieHeader: string | null }> {
  let captured: { result?: R; error?: Error } | undefined;
  let setCookieHeader: string | null = null;

  const handle = requestHandler(async (request) => {
    const r = await runWithStartContext(
      // 最小 Start 上下文：只补齐 __executeServer 用到的字段
      {
        getRouter: () => undefined,
        startOptions: {},
        contextAfterGlobalMiddlewares: {},
        request,
        executedRequestMiddlewares: new Set(),
        handlerType: "serverFn",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      () => fn.__executeServer({ data }),
    );
    captured = { result: r.result as R, error: r.error as Error | undefined };
    setCookieHeader = getResponseHeader("Set-Cookie") ?? null;
    return new Response(null);
  });

  const headers = new Headers();
  if (opts?.cookie) headers.set("cookie", opts.cookie);
  await handle(new Request("http://localhost/", { headers }), undefined);

  if (!captured) throw new Error("request handler did not run");
  return { ...captured, setCookieHeader };
}

/** 在最小请求上下文中直调模块函数（如 useAppSession），捕获结果与 Set-Cookie 响应头。 */
export async function inRequest<T>(
  fn: () => Promise<T>,
  opts?: { cookie?: string },
): Promise<{ result: T; setCookieHeader: string | null }> {
  let captured: { result: T; setCookieHeader: string | null } | undefined;

  const handle = requestHandler(async () => {
    const result = await fn();
    captured = {
      result,
      setCookieHeader: getResponseHeader("Set-Cookie") ?? null,
    };
    return new Response(null);
  });

  const headers = new Headers();
  if (opts?.cookie) headers.set("cookie", opts.cookie);
  await handle(new Request("http://localhost/", { headers }), undefined);

  if (!captured) throw new Error("request handler did not run");
  return captured;
}

export function parseSessionToken(setCookieHeader: string): string {
  const pair = setCookieHeader.split(";")[0]!;
  return pair.slice(pair.indexOf("=") + 1);
}
