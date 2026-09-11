/**
 * Knip 配置 —— 扫描未使用的文件 / 导出 / 依赖。
 *
 *   bun run knip       仅报告（CI 用）
 *   bun run knip:fix   自动修复可安全处理的部分
 *
 * ## 为什么要写配置（而不是裸跑）
 *
 * Knip 默认把整个仓库当项目根，于是会去扫这些**非应用代码**：
 *   .agents/ .claude/ .cursor/ .devin/   各 AI agent 各自复制一份的 skill 脚本
 *   migrations/                          prisma 迁移（由 prisma 工具链加载）
 * 裸跑会报 90+ 条这类噪音，把真正的死代码埋掉。
 *
 * 所以核心是 `project` + `entry` 两条：把分析范围钉死在 src/，
 * 并显式告诉 Knip「哪些是被动态加载的入口」。
 */
export default {
  /**
   * 项目文件范围。
   *
   * 只分析 src/ 下的 TS/TSX。这一条同时排除了 .agents/、.claude/、
   * migrations/ 等一切目录外内容 —— 所以下面不必逐个 ignore。
   *
   * 同时把两个 stylesheet 列进来：它们消费了 tailwindcss / tw-animate-css /
   * fontsource —— 不列的话这些包会被误报为「未使用的依赖」，
   * 而它们其实是被 CSS 的 @import 用着的。
   */
  project: ["src/**/*.{ts,tsx}", "src/styles/*.css"],

  /**
   * 入口 —— Knip 从这里出发找「被用到的」，找不到引用的即为候选死代码。
   *
   * 下列文件（或模式）不会被任何 import 语句引用，必须显式声明为入口，
   * 否则会被误报为未使用文件：
   */
  entry: [
    // 路由文件由 routeTree.gen.ts 动态加载，静态分析看不出引用关系
    "src/routes/**/*.tsx",
    // 测试由 vitest 按 include 配置加载
    "src/**/*.test.ts",
    // 测试基础设施：`#test/*` 由 vitest 的 setupFiles 与各测试动态引用
    "src/test/helpers.ts",
    "src/test/mock-server-env.ts",
    // prisma 契约由 prisma.config.ts 引用
    "src/prisma/contract.ts",
    // 注：src/server.ts、src/router.tsx、src/test/setup.ts 不必列 ——
    // Knip 的 TanStack Start / Vitest 插件能自动识别（列了会被提示冗余）。
  ],

  /**
   * 刻意保留、不要报告为死代码的路径。
   */
  ignore: [
    // shadcn 组件库：未用到的子组件（TableFooter、SelectGroup…）属于
    // 「组件完整性」，不是死代码 —— 删了下次 `shadcn add` 会被覆盖回来。
    "src/components/ui/**",
    // 注：routeTree.gen.ts 与 prisma/contract.d.ts 不必列 ——
    // 它们已是 project 范围外的生成物，Knip 会自动跳过（列了会被提示冗余）。
  ],

  /**
   * 用了但不在 package.json 里的依赖。
   *
   * 真实传递依赖：由框架依赖树提供，提升为直接依赖不划算。
   *
   * 注：tailwindcss / tw-animate-css / fontsource 不在这个列表里 ——
   * 它们由 src/styles/*.css 的 @import 消费，而那两个文件已列入上面的
   * project，Knip 能自己识别。加进来只会被提示冗余（shadcn 同理：
   * 它是 CLI，包名出现在 scripts 里）。
   */
  ignoreDependencies: [
    "cookie-es", // src/lib/auth/session.ts 的加密
    "h3-v2",
    "@tanstack/start-storage-context",
  ],

  /** 同文件内 export 又自用的情况不算未使用。 */
  ignoreExportsUsedInFile: true,

  /**
   * 导出相关降为 warn。
   *
   * 导出的类型别名（如 schemas 的 z.infer 命名）即便当前无人 import，
   * 也属于「给调用方的命名 API」，不该按需删。降级便于偶尔回看，
   * 不用每次都当错误处理。
   */
  rules: {
    exports: "warn",
    types: "warn",
  },
};
