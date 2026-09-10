# OTP 的 tokenHash 不加全局唯一约束

**Status**: 已采纳（2026-09-11）

`EmailVerificationToken.tokenHash` 与 `ResetToken.tokenHash` 去掉 `UNIQUE`。
`Session.tokenHash` 的 `UNIQUE` **保留**（理由见下）。

## 问题

两张 OTP 表的 `tokenHash` 原本带全局唯一约束。而：

- `hashOtp(otp)` 是 `hashToken(otp)` —— **无盐纯函数**，同一个 6 位数字永远得到同一个 hash
- OTP 空间只有 **100 万种**（6 位数字）

于是**两个不同用户随机到同一个 OTP 时，第二个人直接 500**：

```
重复键违反唯一约束 "EmailVerificationToken_tokenHash_key"
→ [Register] failed
```

这是实测复现的（不是推测）。用户量上来后这是偶发但必然发生的故障 ——
1000 个未过期 token 时，单次注册撞码概率约 0.1%。

## 为什么约束是多余的

`consumeOtp` 按 **userId** 查记录：

```ts
const record = await store.findLive(userId);   // 按 userId，不是 tokenHash
if (record.tokenHash !== hashOtp(otp)) { ... }
```

从不按 `tokenHash` 查。所以**撞码本来无害** —— 每人查自己那条，互不影响。
全局唯一反而把一件正常的事变成了错误。

## 为什么不改成 (userId, tokenHash) 复合唯一

那也能解决，但没必要：复合唯一只禁止「同一用户持有两条相同 hash」，
而同一用户的历史记录本来就会在创建新 OTP 时被作废（`verifiedAt` / `usedAt`），
不会出现需要靠约束拦的重复。少一个约束少一份维护。

## 为什么 Session.tokenHash 的 UNIQUE 保留

会话令牌是 `randomBytes(32)`（256 位随机），撞的概率是 0 —— 那个约束
拦的是真问题，而且代码里会按 tokenHash 直查会话。

## Consequences

- 两张 OTP 表可以存在相同 `tokenHash` 的多条记录，各属不同用户。
- 校验必须始终按 `userId` 查，**不能**改成按 tokenHash 查 —— 否则会命中
  别人那条记录。`consumeOtp` 的签名已经强制了这一点（第一个参数是 userId）。
- 回归测试在 `src/lib/auth/__tests__/otp-collision.test.ts`：同码可共存、
  撞码时各自校验互不干扰。在测试库上手工加回唯一约束会让其中 4 条失败。
- 两个库（本地测试库 + Neon dev）都已应用。
