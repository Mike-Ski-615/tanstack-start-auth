import { defineConfig } from "vitest/config";

/**
 * 测试专用配置。
 *
 * 刻意不加载 vite.config.ts：那里挂着 tanstackStart / react / tailwind 等
 * 应用插件，纯逻辑测试用不上，反而会因为 React 的 CJS interop 在
 * module runner 里报 "module is not defined"。
 * 这里只保留路径别名（测试里用 #lib/... 导入源码）。
 *
 * 别名用 Vite 内置的 resolve.tsconfigPaths（Vite 8+），不再依赖
 * vite-tsconfig-paths 插件 —— 与 vite.config.ts 保持一致。
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // 纯 node 环境即可；需要 DOM 的测试单独用 // @vitest-environment jsdom
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    // 认证测试要连真实 DB，串行跑避免用例间互相干扰（单设备模型下
    // 同一用户的 Session/Device 是唯一约束，并发会随机失败）
    fileParallelism: false,
    // 涉及 Argon2 哈希 + 多次 DB 往返，默认 5s 不够
    testTimeout: 20_000,
  },
});
