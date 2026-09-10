import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * 测试专用配置。
 *
 * 刻意不加载 vite.config.ts：那里挂着 tanstackStart / react / tailwind 等
 * 应用插件，纯逻辑测试用不上，反而会因为 React 的 CJS interop 在
 * module runner 里报 "module is not defined"。
 * 这里只保留路径别名（测试里用 #lib/... 导入源码）。
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // 纯 node 环境即可；需要 DOM 的测试单独用 // @vitest-environment jsdom
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
