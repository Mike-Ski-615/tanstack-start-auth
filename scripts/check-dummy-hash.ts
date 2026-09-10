/**
 * 回归检查：登录防枚举的 DUMMY_PASSWORD_HASH 必须是 argon2id 真实产物。
 *
 * 手写伪哈希（如 "$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy"）会让
 * argon2Verify 因盐值非法直接抛异常、不执行任何计算，于是「用户不存在」比
 * 「密码错」快约 220ms 且返回 500 —— 攻击者据此可枚举邮箱是否注册。
 *
 * 运行：bun run scripts/check-dummy-hash.ts
 */
import { argon2Verify } from "hash-wasm";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/server/login.functions.ts", import.meta.url),
  "utf8",
);

const match = source.match(
  /const DUMMY_PASSWORD_HASH =\s*\n?\s*"([^"]+)"/,
);

if (!match) {
  console.error("✗ 未能在 login.functions.ts 中找到 DUMMY_PASSWORD_HASH");
  process.exit(1);
}

const hash = match[1];
console.log(`DUMMY_PASSWORD_HASH 长度 ${hash.length}`);

// 1. 必须能被 argon2Verify 正常处理（不抛异常）
let ok = false;
const t0 = performance.now();
try {
  ok = await argon2Verify({ password: "definitely-not-the-password", hash });
} catch (error) {
  console.error(`✗ argon2Verify 抛异常：${(error as Error).message}`);
  console.error(
    "  这会让「用户不存在」走不到 Argon2，恢复 timing oracle。必须换成真实哈希。",
  );
  process.exit(1);
}
const elapsed = performance.now() - t0;

// 2. 必须是「校验失败」而不是「校验通过」（否则任何人都能登录）
if (ok) {
  console.error("✗ DUMMY 哈希被判为匹配，任意密码可登录！");
  process.exit(1);
}

// 3. 必须真的消耗了 Argon2 的时间，而不是立刻返回
const MIN_MS = 100;
if (elapsed < MIN_MS) {
  console.error(
    `✗ 校验仅耗时 ${elapsed.toFixed(0)}ms（期望 ≥ ${MIN_MS}ms），疑似未执行 Argon2`,
  );
  process.exit(1);
}

console.log(`✓ 不抛异常、结果 false、耗时 ${elapsed.toFixed(0)}ms — 恒定时间成立`);
