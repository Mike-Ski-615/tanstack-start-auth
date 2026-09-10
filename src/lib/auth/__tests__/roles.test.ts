import "#test/mock-server-env";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ROLES, ROLE_HOME, PUBLIC_COLUMNS } from "#lib/auth/current-user";
import { db } from "#prisma/db";
import { hashPassword } from "#lib/auth/password";
import { deleteUser, withRequest } from "#test/helpers";
import type { Role } from "#lib/auth/current-user";

/**
 * 角色枚举（student / teacher / admin）。
 *
 * admin 目前不比其他角色多任何权限 —— 它是个预留落点。但「枚举加了新成员」
 * 这件事本身有几个容易漏的地方，这组测试就是盯着它们：
 *
 *  1. ROLE_HOME 必须覆盖每个角色 —— 漏一个，那个角色登录后会卡在
 *     /authenticated 空白页（重定向表查不到目标）
 *  2. 数据库 CHECK 约束必须接受新值 —— 契约改了但库没更新时，创建会失败
 *  3. 应用层类型与数据库契约要一致 —— 两处都要改才算改完
 *
 * 第 1 条尤其隐蔽：TypeScript 能查出 `ROLE_HOME[role]` 的缺键（Record<Role,string>），
 * 但如果有人把 ROLE_HOME 的类型放宽成 Record<string, string>，这个保护就没了。
 * 所以下面显式断言一遍。
 */

const created: string[] = [];

async function cleanup() {
  vi.restoreAllMocks();
  for (const id of created.splice(0)) await deleteUser(id);
}

afterEach(cleanup);

async function createUserWithRole(role: Role) {
  const email = `role-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const user = await db.orm.public.User.create({
    email,
    name: `测试${role}`,
    passwordHash: await hashPassword("123456789"),
    image: "",
    bio: "",
    role,
    emailVerifiedAt: new Date().toISOString(),
  });
  created.push(user.id);
  return user;
}

describe("角色枚举的完整性", () => {
  it("ROLE_HOME 覆盖每一个角色", () => {
    for (const role of ROLES) {
      expect(ROLE_HOME[role], `ROLE_HOME 缺 ${role}`).toBeTruthy();
      expect(ROLE_HOME[role]).toMatch(/^\/authenticated\//);
    }
  });

  it("每个角色落到互不相同的工作台", () => {
    const homes = ROLES.map((r) => ROLE_HOME[r]);
    expect(new Set(homes).size).toBe(ROLES.length);
  });

  it("ROLE_HOME 的键与 ROLES 完全一致（无多余、无遗漏）", () => {
    expect(Object.keys(ROLE_HOME).sort()).toEqual([...ROLES].sort());
  });

  it("role 是公开字段（会被投影给客户端）", () => {
    expect(PUBLIC_COLUMNS).toContain("role");
  });

  it("admin 的工作台是教师管理页（管理区的入口）", () => {
    expect(ROLE_HOME.admin).toBe("/authenticated/admin/teachers");
  });
});

describe("数据库契约接受三个角色", () => {
  for (const role of ROLES) {
    it(`可以创建 role=${role} 的用户`, async () => {
      const user = await createUserWithRole(role);
      expect(user.role).toBe(role);
    });

    it(`role=${role} 能查到且值不变`, async () => {
      const user = await createUserWithRole(role);
      const found = await db.orm.public.User.where({ id: user.id }).first();
      expect(found!.role).toBe(role);
    });
  }

  it("默认角色仍是 student", async () => {
    const email = `default-role-${Date.now()}@example.test`;
    const user = await db.orm.public.User.create({
      email,
      name: "默认",
      passwordHash: await hashPassword("123456789"),
      image: "",
      bio: "",
    });
    created.push(user.id);
    expect(user.role).toBe("student");
  });

  it("非法角色被数据库拒绝（CHECK 约束还在）", async () => {
    await expect(
      db.orm.public.User.create({
        email: `bad-role-${Date.now()}@example.test`,
        name: "非法",
        passwordHash: "x",
        image: "",
        bio: "",
        role: "superuser" as never,
      }),
    ).rejects.toThrow();
  });
});

describe("admin 用户的认证链路", () => {
  it("admin 能建立会话并通过 guard 取回自己", async () => {
    const user = await createUserWithRole("admin");
    const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
    const { getCurrentUser } = await import("#lib/auth/guard");

    const { token } = await createAuthenticatedSession({
      userId: user.id,
      userAgent: "vitest",
      ip: "192.0.2.20",
    });

    const me = await withRequest({ cookies: { "session-token": token } }, () => getCurrentUser());

    expect(me).toBeTruthy();
    expect(me!.role).toBe("admin");
  });

  it("admin 的角色能走到客户端（不被列投影掉）", async () => {
    const user = await createUserWithRole("admin");
    const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
    const { getCurrentUser } = await import("#lib/auth/guard");

    const { token } = await createAuthenticatedSession({
      userId: user.id,
      userAgent: "vitest",
      ip: "192.0.2.20",
    });
    const me = await withRequest({ cookies: { "session-token": token } }, () => getCurrentUser());

    // 模拟前端的路由判断：ROLE_HOME 必须查得到
    expect(ROLE_HOME[me!.role]).toBe("/authenticated/admin/teachers");
  });
});
