import { defineConfig } from "vitest/config";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

/**
 * 测试专用配置。
 *
 * ## 为什么加载 tanstackStart 插件
 *
 * serverFn 的真服务端执行入口是 `fn.__executeServer`，而它靠
 * `options.serverFn` 跑 handler —— 那个东西是 Start 编译器注入的：
 * 编译器把 `.handler(fn)` 重写成 `.handler(<RPC 客户端桩>, <真 handler>)`，
 * 第一个参数在客户端路径上是会发真实网络请求的桩，第二个才是服务端用的 handler。
 *
 * 不加载插件时这两者都不存在，于是：
 *   - `.server()` 中间件一条都不跑（executeMiddleware 按 env 分支）
 *   - validator 不跑（`if (validator && env === "server")`）
 *   - 走 `__executeServer` 会静默返回全 undefined
 *
 * 加载插件后测试与生产走同一条路径 —— 见 src/test/request.ts 的说明。
 *
 * ## 不加载的部分（刻意）
 *
 * vite.config.ts 里的 viteReact / tailwindcss / devtools / nitro 都不加载：
 * 测试不渲染组件、不需要样式、不需要 devtools，而 nitro 会试图起构建产物。
 * 实测只加载 tanstackStart 时，非 serverFn 的测试完全不受影响
 * （45 个文件里只有 server 测试与一条既有的 router.tsx 断言变化）。
 *
 * 别名用 Vite 内置的 resolve.tsconfigPaths（Vite 8+），不再依赖
 * vite-tsconfig-paths 插件 —— 与 vite.config.ts 保持一致。
 */
export default defineConfig({
  plugins: [tanstackStart()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // 纯 node 环境即可；需要 DOM 的测试单独用 // @vitest-environment jsdom
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    /**
     * 让 TanStack 的运行时也走 vite 的模块图。
     *
     * 默认 node_modules 会被外部化成原生 ESM，而那些包里 `import
     * "#tanstack-start-server-fn-resolver"` 是 start 插件生成的**虚拟模块**
     * （磁盘上没有文件，按 environment 分派实现）。外部化后那个 import 走不到
     * 插件的解析，`createSsrRpc` 拿到的东西不是函数 ——
     * 表现就是 `(intermediate value) is not a function`。
     */
    server: {
      deps: {
        inline: [
          /@tanstack\/start-server-core/,
          /@tanstack\/start-client-core/,
          /@tanstack\/react-start/,
        ],
      },
    },
    // 认证测试要连真实 DB，串行跑避免用例间互相干扰（单设备模型下
    // 同一用户的 Session/Device 是唯一约束，并发会随机失败）
    fileParallelism: false,
    // 涉及 Argon2 哈希 + 多次 DB 往返，默认 5s 不够
    testTimeout: 20_000,
  },
});
