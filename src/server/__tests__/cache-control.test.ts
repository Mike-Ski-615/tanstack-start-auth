import { describe, it, expect } from "vitest";
import { lastResponseHeaders } from "#test/request";
import { withRequest, callServerFn } from "#test/helpers";
import { getUserFn, getUserById } from "#server/user.functions";
import { userIdSchema } from "#schemas/auth";
import { logout } from "#server/logout.functions";

/**
 * 「所有 serverFn 响应一律 no-store」由 src/start.ts 的全局 functionMiddleware
 * 负责 —— 原先它是每个 handler 手写一行，共 14 处。
 *
 * 这组用例的存在意义：**这是唯一能证明那条全局中间件真的挂上了的地方**。
 * 中间件挂在 start 实例上，而 start 实例要走 `startInstance.getOptions()` 才被
 * 读到（serverFn 执行时 flatten 进中间件链）。测试脚手架若不去读它
 * （以前写死 `startOptions: {}`），这条保证会在测试里静默失效而全绿 ——
 * 与这个仓库反复踩的坑是同一个形状。
 *
 * 所以下面刻意同时覆盖两种情况：
 *   - 完全没有认证中间件的接口（登出）—— 认证中间件盖不到它，
 *     这正是 no-store 必须做成全局的原因
 *   - 挂了认证中间件的接口 —— 两条链都得带上
 */

describe("全局 no-store", () => {
  it("没有认证中间件的接口也带（登出）", async () => {
    await withRequest({}, () => logout());

    expect(lastResponseHeaders()["cache-control"]).toBe("no-store");
  });

  it("挂了 withUser 的接口带", async () => {
    await withRequest({}, () => getUserFn());

    expect(lastResponseHeaders()["cache-control"]).toBe("no-store");
  });

  it("handler 抛错时也带（header 在解析输入之前就设好了）", async () => {
    // userId 为空 → 校验失败。中间件链在 validator 之前跑，所以头已经设上
    await expect(callServerFn(getUserById, { userId: "" }, {})).rejects.toThrow();

    expect(lastResponseHeaders()["cache-control"]).toBe("no-store");
  });

  it("是 no-store 而不是 no-cache（两者语义不同）", async () => {
    await withRequest({}, () => logout());

    const value = lastResponseHeaders()["cache-control"];
    expect(value).toBe("no-store");
    expect(value).not.toContain("no-cache");
  });

  it("userIdSchema 仍然拦得住空 id（证明上一条不是因为没校验）", () => {
    expect(userIdSchema.safeParse({ userId: "" }).success).toBe(false);
  });
});
