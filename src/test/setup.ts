/**
 * vitest 全局前置：加载测试环境变量。
 *
 * 必须早于任何 import 了 db 的模块执行 —— db.ts 在模块顶层就读取
 * DATABASE_URL 建连接池，晚一步就会连到 .env 的生产库上。
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.test"), override: true });

// 双保险：万一 .env.test 缺失或写错，这里直接拦下，
// 避免测试对着生产库建用户、删数据。
const url = process.env["DATABASE_URL"] ?? "";
if (/neon\.tech|aws\.neon/.test(url)) {
  throw new Error(
    "[test setup] DATABASE_URL 指向 Neon（生产库）。测试会真实写数据，已中止。\n" +
      "请检查 .env.test 是否存在且指向本机测试库。",
  );
}
if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  throw new Error(
    `[test setup] DATABASE_URL 不是本机地址，测试拒绝运行：${url.replace(/:[^:@]*@/, ":***@")}`,
  );
}
