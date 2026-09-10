import "#test/mock-server-env";
import { describe, it, expect, afterEach } from "vitest";
import {
  listUsersByRoleFn,
  adminSetUserRoleFn,
  adminKickUserFn,
  adminResetUserPasswordFn,
  adminUpdateUserProfileFn,
  adminDeleteUserFn,
} from "#server/admin.functions";
import { createUser, deleteUser, callServerFnValidated } from "#test/helpers";
import { listManagedUsers } from "#lib/auth/admin-actions";
import type { CallContext } from "#test/request";
import { db } from "#prisma/db";
import {
  adminSetRoleSchema,
  adminResetPasswordSchema,
  adminUpdateProfileSchema,
  userIdSchema,
} from "#schemas/auth";
import { verifyPassword } from "#lib/auth/password";

/**
 * 管理员接口。
 *
 * 第一优先级不是「功能对不对」，而是**权限拦没拦住** —— 这是全项目
 * 第一处基于 role 的服务端校验。漏掉它，学生直接 POST 就能改任何人
 * 角色、删任何人账号。所以每个接口都测一遍「非管理员被拒」。
 *
 * 第二优先级是防自伤：管理员不能对自己做这些操作，否则把自己降级后
 * 就再也没有管理权了。
 *
 * 调用约定：callServerFnValidated(fn, schema, args, ctx) —— ctx 里的
 * cookies 会被注入成请求头。这样一次调用同时带上 schema 校验与身份。
 */

const created: string[] = [];
const IP = "192.0.2.60";

async function cleanup() {
  for (const id of created.splice(0)) await deleteUser(id);
}

afterEach(cleanup);

/** 请求上下文：把会话 token 作为 cookie 注入。 */
const ctx = (token?: string): CallContext => (token ? { cookies: { "session-token": token } } : {});

/** 建一个用户并给他一个会话 token。 */
async function userWithSession(
  opts: { role?: "student" | "teacher" | "admin"; name?: string } = {},
) {
  const { user, email } = await createUser({ verified: true, ...opts });
  created.push(user.id);
  const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
  const { token } = await createAuthenticatedSession({
    userId: user.id,
    userAgent: "vitest",
    ip: IP,
  });
  return { user, email, token };
}

const studentTarget = async (name = "目标学生") => {
  const { user } = await createUser({ verified: true, role: "student", name });
  created.push(user.id);
  return user;
};

/**
 * 列表分两层测：
 *
 * - **权限**走 serverFn（未登录 / 非管理员必须被拒）—— 那是真正的
 *   安全边界，必须经 serverFn 验证。
 * - **内容**直测 listManagedUsers —— serverFn 的返回值在测试里拿不到
 *   （__executeServer 把结果写进响应流），而过滤逻辑必须断言。
 */
const listStudents = (token?: string) =>
  callServerFnValidated(
    listUsersByRoleFn,
    adminSetRoleSchema.pick({ role: true }),
    { role: "student" },
    ctx(token),
  );

/** 直接调查询层，用于断言列表内容。 */
const fetchStudents = () => listManagedUsers("student");
const fetchTeachers = () => listManagedUsers("teacher");

// ============================================================
// 权限：非管理员必须被拒（最重要的一组）
// ============================================================

describe("非管理员调用一律被拒", () => {
  it("未登录调用列表被拒", async () => {
    await expect(listStudents()).rejects.toThrow(/forbidden/);
  });

  it("学生调用列表被拒", async () => {
    const s = await userWithSession({ role: "student" });
    await expect(listStudents(s.token)).rejects.toThrow(/forbidden/);
  });

  it("教师调用列表被拒（教师也不是管理员）", async () => {
    const t = await userWithSession({ role: "teacher" });
    await expect(listStudents(t.token)).rejects.toThrow(/forbidden/);
  });

  it("学生不能改别人角色", async () => {
    const s = await userWithSession({ role: "student" });
    const target = await studentTarget();

    await expect(
      callServerFnValidated(
        adminSetUserRoleFn,
        adminSetRoleSchema,
        { userId: target.id, role: "teacher" },
        ctx(s.token),
      ),
    ).rejects.toThrow(/forbidden/);

    const after = await db.orm.public.User.where({ id: target.id }).first();
    expect(after!.role).toBe("student");
  });

  it("学生不能删别人", async () => {
    const s = await userWithSession({ role: "student" });
    const target = await studentTarget();

    await expect(
      callServerFnValidated(adminDeleteUserFn, userIdSchema, { userId: target.id }, ctx(s.token)),
    ).rejects.toThrow(/forbidden/);

    expect(await db.orm.public.User.where({ id: target.id }).first()).toBeTruthy();
  });

  it("学生不能重置别人密码", async () => {
    const s = await userWithSession({ role: "student" });
    const target = await studentTarget();
    const before = await db.orm.public.User.where({ id: target.id }).first();

    await expect(
      callServerFnValidated(
        adminResetUserPasswordFn,
        adminResetPasswordSchema,
        { userId: target.id, password: "hacked123" },
        ctx(s.token),
      ),
    ).rejects.toThrow(/forbidden/);

    const after = await db.orm.public.User.where({ id: target.id }).first();
    expect(after!.passwordHash).toBe(before!.passwordHash);
  });

  it("学生不能踢别人下线", async () => {
    const s = await userWithSession({ role: "student" });
    const target = await studentTarget();
    const before = await db.orm.public.User.where({ id: target.id }).first();

    await expect(
      callServerFnValidated(adminKickUserFn, userIdSchema, { userId: target.id }, ctx(s.token)),
    ).rejects.toThrow(/forbidden/);

    const after = await db.orm.public.User.where({ id: target.id }).first();
    expect(after!.sessionVersion).toBe(before!.sessionVersion);
  });

  it("未登录 / 非管理员报同一个错误码（不透露区别）", async () => {
    const s = await userWithSession({ role: "student" });
    const anon = await listStudents().catch((e: Error) => e.message);
    const asStudent = await listStudents(s.token).catch((e: Error) => e.message);

    expect(anon).toBe(asStudent);
    expect(anon).toMatch(/forbidden/);
  });
});

// ============================================================
// 列表
// ============================================================

describe("列表", () => {
  it("只返回指定角色的人", async () => {
    const admin = await userWithSession({ role: "admin" });
    const s1 = await studentTarget("甲同学");
    const s2 = await studentTarget("乙同学");
    const { user: t1 } = await createUser({
      verified: true,
      role: "teacher",
      name: "某老师",
    });
    created.push(t1.id);

    void admin; // 权限已由上面的「非管理员被拒」组覆盖
    const students = await fetchStudents();

    const ids = students.map((u) => u.id);
    expect(ids).toContain(s1.id);
    expect(ids).toContain(s2.id);
    expect(ids).not.toContain(t1.id);
    expect(ids).not.toContain(admin.user.id);
  });

  it("管理员不在任何一个列表里", async () => {
    const admin = await userWithSession({ role: "admin" });

    const lists = [await fetchStudents(), await fetchTeachers()];
    for (const list of lists) {
      expect(list.map((u) => u.id)).not.toContain(admin.user.id);
    }
  });

  it("返回结果不含 passwordHash", async () => {
    await studentTarget();
    const list = await fetchStudents();

    expect(JSON.stringify(list)).not.toContain("passwordHash");
    expect(JSON.stringify(list)).not.toContain("$argon2");
  });

  it("含管理员界面要用的字段", async () => {
    await studentTarget();
    const list = await fetchStudents();
    const u = list.find((x) => x.role === "student")!;

    for (const k of ["id", "name", "email", "role", "emailVerifiedAt", "createdAt"]) {
      expect(u, `缺字段 ${k}`).toHaveProperty(k);
    }
  });
});

// ============================================================
// 防自伤
// ============================================================

describe("管理员不能对自己操作", () => {
  it("不能改自己的角色", async () => {
    const admin = await userWithSession({ role: "admin" });
    await expect(
      callServerFnValidated(
        adminSetUserRoleFn,
        adminSetRoleSchema,
        { userId: admin.user.id, role: "student" },
        ctx(admin.token),
      ),
    ).rejects.toThrow(/cannot_target_self/);
  });

  it("不能删自己", async () => {
    const admin = await userWithSession({ role: "admin" });
    await expect(
      callServerFnValidated(
        adminDeleteUserFn,
        userIdSchema,
        { userId: admin.user.id },
        ctx(admin.token),
      ),
    ).rejects.toThrow(/cannot_target_self/);
  });

  it("不能踢自己下线", async () => {
    const admin = await userWithSession({ role: "admin" });
    await expect(
      callServerFnValidated(
        adminKickUserFn,
        userIdSchema,
        { userId: admin.user.id },
        ctx(admin.token),
      ),
    ).rejects.toThrow(/cannot_target_self/);
  });

  it("不能重置自己的密码（应走普通改密流程）", async () => {
    const admin = await userWithSession({ role: "admin" });
    await expect(
      callServerFnValidated(
        adminResetUserPasswordFn,
        adminResetPasswordSchema,
        { userId: admin.user.id, password: "newpass123" },
        ctx(admin.token),
      ),
    ).rejects.toThrow(/cannot_target_self/);
  });

  it("不能改自己的资料", async () => {
    const admin = await userWithSession({ role: "admin" });
    await expect(
      callServerFnValidated(
        adminUpdateUserProfileFn,
        adminUpdateProfileSchema,
        { userId: admin.user.id, name: "改名", bio: "" },
        ctx(admin.token),
      ),
    ).rejects.toThrow(/cannot_target_self/);
  });
});

describe("管理员不能操作其他管理员", () => {
  it("改另一个管理员角色 → not_found", async () => {
    const a1 = await userWithSession({ role: "admin" });
    const a2 = await userWithSession({ role: "admin" });

    await expect(
      callServerFnValidated(
        adminSetUserRoleFn,
        adminSetRoleSchema,
        { userId: a2.user.id, role: "student" },
        ctx(a1.token),
      ),
    ).rejects.toThrow(/not_found/);
  });

  it("删另一个管理员 → not_found，且对方还在", async () => {
    const a1 = await userWithSession({ role: "admin" });
    const a2 = await userWithSession({ role: "admin" });

    await expect(
      callServerFnValidated(adminDeleteUserFn, userIdSchema, { userId: a2.user.id }, ctx(a1.token)),
    ).rejects.toThrow(/not_found/);

    expect(await db.orm.public.User.where({ id: a2.user.id }).first()).toBeTruthy();
  });
});

// ============================================================
// 写操作的实际效果
// ============================================================

describe("改角色", () => {
  it("学生升为教师，且被踢下线", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await studentTarget();
    const before = await db.orm.public.User.where({ id: target.id }).first();

    await callServerFnValidated(
      adminSetUserRoleFn,
      adminSetRoleSchema,
      { userId: target.id, role: "teacher" },
      ctx(admin.token),
    );

    const after = await db.orm.public.User.where({ id: target.id }).first();
    expect(after!.role).toBe("teacher");
    expect(after!.sessionVersion).toBe(before!.sessionVersion + 1);
  });

  it("目标是 uuid 不存在 → not_found", async () => {
    const admin = await userWithSession({ role: "admin" });
    await expect(
      callServerFnValidated(
        adminSetUserRoleFn,
        adminSetRoleSchema,
        { userId: "00000000-0000-7000-8000-000000000000", role: "teacher" },
        ctx(admin.token),
      ),
    ).rejects.toThrow(/not_found/);
  });
});

describe("踢下线", () => {
  it("sessionVersion 递增，其他资料不变", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await studentTarget();
    const before = await db.orm.public.User.where({ id: target.id }).first();

    await callServerFnValidated(
      adminKickUserFn,
      userIdSchema,
      { userId: target.id },
      ctx(admin.token),
    );

    const after = await db.orm.public.User.where({ id: target.id }).first();
    expect(after!.sessionVersion).toBe(before!.sessionVersion + 1);
    expect(after!.role).toBe(before!.role);
    expect(after!.passwordHash).toBe(before!.passwordHash);
  });

  it("目标用户确实登不进去了", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await userWithSession({ role: "student" });

    await callServerFnValidated(
      adminKickUserFn,
      userIdSchema,
      { userId: target.user.id },
      ctx(admin.token),
    );

    const { getCurrentUser } = await import("#lib/auth/guard");
    const { withRequest } = await import("#test/helpers");
    const me = await withRequest(ctx(target.token), () => getCurrentUser());
    expect(me).toBeNull();
  });
});

describe("重置他人密码", () => {
  const resetTarget = (adminToken: string, userId: string) =>
    callServerFnValidated(
      adminResetUserPasswordFn,
      adminResetPasswordSchema,
      { userId, password: "brandnew123" },
      ctx(adminToken),
    );

  it("换了密码、且目标被踢下线", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await userWithSession({ role: "student" });
    const before = await db.orm.public.User.where({
      id: target.user.id,
    }).first();

    await resetTarget(admin.token, target.user.id);

    const after = await db.orm.public.User.where({ id: target.user.id }).first();
    expect(after!.passwordHash).not.toBe(before!.passwordHash);
    expect(after!.sessionVersion).toBe(before!.sessionVersion + 1);
    expect(await verifyPassword(after!.passwordHash, "brandnew123")).toBe(true);
  });

  it("目标会话立刻失效", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await userWithSession({ role: "student" });

    await resetTarget(admin.token, target.user.id);

    const { getCurrentUser } = await import("#lib/auth/guard");
    const { withRequest } = await import("#test/helpers");
    expect(await withRequest(ctx(target.token), () => getCurrentUser())).toBeNull();
  });

  it("管理员自己的会话不受影响（没给自己建会话）", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await userWithSession({ role: "student" });

    await resetTarget(admin.token, target.user.id);

    const { getCurrentUser } = await import("#lib/auth/guard");
    const { withRequest } = await import("#test/helpers");
    const me = await withRequest(ctx(admin.token), () => getCurrentUser());
    expect(me).toBeTruthy();
    expect(me!.id).toBe(admin.user.id);
  });

  it("不改目标的邮箱验证状态", async () => {
    const admin = await userWithSession({ role: "admin" });
    const { user, email } = await createUser({
      verified: false,
      role: "student",
    });
    created.push(user.id);

    await resetTarget(admin.token, user.id);

    const after = await db.orm.public.User.where({ email }).first();
    expect(after!.emailVerifiedAt ?? null).toBeNull();
  });
});

describe("改资料", () => {
  const editProfile = (adminToken: string, userId: string, name: string, bio: string) =>
    callServerFnValidated(
      adminUpdateUserProfileFn,
      adminUpdateProfileSchema,
      { userId, name, bio },
      ctx(adminToken),
    );

  it("改姓名与简介", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await studentTarget();

    await editProfile(admin.token, target.id, "新名字", "新简介");

    const after = await db.orm.public.User.where({ id: target.id }).first();
    expect(after!.name).toBe("新名字");
    expect(after!.bio).toBe("新简介");
  });

  it("不改角色、不踢下线（会话仍有效）", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await userWithSession({ role: "student" });
    const before = await db.orm.public.User.where({
      id: target.user.id,
    }).first();

    await editProfile(admin.token, target.user.id, "改名", "");

    const after = await db.orm.public.User.where({ id: target.user.id }).first();
    expect(after!.role).toBe(before!.role);
    expect(after!.sessionVersion).toBe(before!.sessionVersion);

    const { getCurrentUser } = await import("#lib/auth/guard");
    const { withRequest } = await import("#test/helpers");
    expect(await withRequest(ctx(target.token), () => getCurrentUser())).toBeTruthy();
  });
});

describe("删除用户", () => {
  it("用户被删掉", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await studentTarget();

    await callServerFnValidated(
      adminDeleteUserFn,
      userIdSchema,
      { userId: target.id },
      ctx(admin.token),
    );

    expect(await db.orm.public.User.where({ id: target.id }).first()).toBeNull();
  });

  it("Session 与 Device 一并清掉（级联）", async () => {
    const admin = await userWithSession({ role: "admin" });
    const target = await userWithSession({ role: "student" });

    expect(
      (await db.orm.public.Session.where((s) => s.userId.eq(target.user.id)).all()).length,
    ).toBeGreaterThan(0);
    expect(
      (await db.orm.public.Device.where((d) => d.userId.eq(target.user.id)).all()).length,
    ).toBeGreaterThan(0);

    await callServerFnValidated(
      adminDeleteUserFn,
      userIdSchema,
      { userId: target.user.id },
      ctx(admin.token),
    );

    expect(
      await db.orm.public.Session.where((s) => s.userId.eq(target.user.id)).all(),
    ).toHaveLength(0);
    expect(await db.orm.public.Device.where((d) => d.userId.eq(target.user.id)).all()).toHaveLength(
      0,
    );
  });

  it("删完不会影响其他用户", async () => {
    const admin = await userWithSession({ role: "admin" });
    const doomed = await studentTarget("要删的");
    const survivor = await studentTarget("要留的");

    await callServerFnValidated(
      adminDeleteUserFn,
      userIdSchema,
      { userId: doomed.id },
      ctx(admin.token),
    );

    expect(await db.orm.public.User.where({ id: survivor.id }).first()).toBeTruthy();
  });
});
