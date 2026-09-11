/**
 * TanStack Start 编译期注入的虚拟模块。
 *
 * `#tanstack-start-server-fn-resolver` 由 start 编译器（见
 * @tanstack/start-plugin-core 的 start-compiler/server-fn-resolver-module）生成，
 * 内容是 functionId → 服务端实现模块的清单。它只在 Vite 的模块图里存在，
 * 磁盘上没有对应文件，所以 TypeScript 需要这里补一份声明。
 *
 * 测试脚手架用它取 serverFn 的**服务端**实现（src/test/request.ts）——
 * 那是唯一能让 server 中间件与 validator 真实执行的路径。
 */
declare module "#tanstack-start-server-fn-resolver" {
  /**
   * 取某个 serverFn 的服务端实现。
   *
   * 返回的是 `(opts) => serverFn.__executeServer(opts)`：
   * 它把结果包成 `{ result, error, context }`，**抛出的错误会落在 `error` 里
   * 而不冒泡** —— 调用方必须自己重新抛出（见 src/test/request.ts）。
   */
  export function getServerFnById(
    id: string,
    access: { origin: "client" | "server" },
  ): Promise<(opts: unknown) => Promise<unknown>>;
}
