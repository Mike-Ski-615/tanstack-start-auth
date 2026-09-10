/**
 * vitest 全局前置：加载测试环境变量。
 *
 * 必须早于任何 import 了 db 的模块执行 —— db.ts 在模块顶层就读取
 * DATABASE_URL 建连接池，晚一步就会连到 .env 的生产库上。
 *
 * 优先级：进程已有的环境变量 > .env.test 文件。
 * CI 里数据库由 workflow 直接注入环境变量（service container），此时
 * 不能再用文件覆盖，否则会跑到一个不存在的地址上。
 */
import { config } from "dotenv";
import { resolve } from "node:path";

const fromEnv = process.env["DATABASE_URL"];
// override: false —— 已有的环境变量优先，不被文件覆盖
config({ path: resolve(process.cwd(), ".env.test"), override: false });
if (fromEnv) process.env["DATABASE_URL"] = fromEnv;

// 双保险：万一 DATABASE_URL 配错，这里直接拦下，
// 避免测试对着生产库建用户、删数据。
const url = process.env["DATABASE_URL"] ?? "";
if (!url) {
  throw new Error(
    "[test setup] 缺少 DATABASE_URL。\n" + "本地：复制 .env.test.example 为 .env.test。",
  );
}
if (/neon\.tech|aws\.neon/.test(url)) {
  throw new Error(
    "[test setup] DATABASE_URL 指向 Neon（生产库）。测试会真实写数据，已中止。\n" +
      "请检查 .env.test 是否存在且指向本机测试库。",
  );
}
// 允许 localhost / 127.0.0.1（本地与 CI 的 service container 都是这个）
if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  throw new Error(
    `[test setup] DATABASE_URL 不是本机地址，测试拒绝运行：${url.replace(/:[^:@]*@/, ":***@")}`,
  );
}
