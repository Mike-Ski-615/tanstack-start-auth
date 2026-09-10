import "#test/mock-server-env";
import { describe, it, expect, afterEach, vi } from "vitest";
import { db } from "#prisma/db";
import { createUser, deleteUser, withRequest, TEST_PASSWORD } from "#test/helpers";
import { validateSession } from "#lib/auth/session-manager";

/**
 * rotatePassword 的 fail-closed 顺序。
 *
 * 为什么单独测：这个顺序以前只写在 CONTEXT.md 里、两个调用点各自照做。
 * 搬进代码后，破坏实验显示「把顺序倒过来」不会让任何现有测试失败 ——
 * 也就是说约束进了代码但没被守住。
 *
 * 顺序为什么重要：先失效再改密码，则 invalidate 失败时密码不动（用户被
 * 登出但安全）；反过来的话，会出现「密码已换、旧会话仍有效」的窗口。
 */

const created: string[] = [];

async function cleanup() {
  vi.restoreAllMocks();
  for (const id of created.splice(0)) await deleteUser(id);
}

afterEach(cleanup);

describe("rotatePassword 的顺序", () => {
  it("正常路径：密码被换、旧会话失效、新会话建立", async () => {
    const { user } = await createUser({ verified: true });
    created.push(user.id);

    const { createAuthenticatedSession, validateSession: vs } =
      await import("#lib/auth/session-manager");
    const { token: oldToken } = await createAuthenticatedSession({
      userId: user.id,
      ip: "192.0.2.10",
    });
    expect(await vs(oldToken)).toBeTruthy();

    const { rotatePassword } = await import("#lib/auth/password-rotation");
    await withRequest({ ip: "192.0.2.10" }, () => rotatePassword(user.id, "newpass123456"));

    // 旧 token 失效
    expect(await validateSession(oldToken)).toBeNull();

    // 密码确实被换
    const { verifyPassword } = await import("#lib/auth/password");
    const row = await db.orm.public.User.where({ id: user.id }).first();
    expect(await verifyPassword(row!.passwordHash, "newpass123456")).toBe(true);
    expect(await verifyPassword(row!.passwordHash, TEST_PASSWORD)).toBe(false);
  });

  it("invalidateAllSessions 失败时，密码不被修改（fail-closed）", async () => {
    const { user } = await createUser({ verified: true });
    created.push(user.id);

    const before = await db.orm.public.User.where({ id: user.id }).first();

    // 让 invalidate 抛错
    const sm = await import("#lib/auth/session-manager");
    const spy = vi.spyOn(sm, "invalidateAllSessions").mockRejectedValueOnce(new Error("boom"));

    const { rotatePassword } = await import("#lib/auth/password-rotation");
    await expect(
      withRequest({ ip: "192.0.2.10" }, () => rotatePassword(user.id, "newpass123456")),
    ).rejects.toThrow();

    spy.mockRestore();

    // 关键：密码原封不动 —— 这就是「先失效」的意义
    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.passwordHash).toBe(before!.passwordHash);
  });

  it("失败时不建立新会话", async () => {
    const { user } = await createUser({ verified: true });
    created.push(user.id);

    const sm = await import("#lib/auth/session-manager");
    const spy = vi.spyOn(sm, "invalidateAllSessions").mockRejectedValueOnce(new Error("boom"));

    const { rotatePassword } = await import("#lib/auth/password-rotation");
    await expect(
      withRequest({ ip: "192.0.2.10" }, () => rotatePassword(user.id, "newpass123456")),
    ).rejects.toThrow();

    spy.mockRestore();

    const sessions = await db.orm.public.Session.where((s) => s.userId.eq(user.id)).all();
    expect(sessions).toHaveLength(0);
  });
});
