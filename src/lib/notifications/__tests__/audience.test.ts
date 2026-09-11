import { describe, it, expect } from "vitest";
import {
  MAX_RECIPIENTS,
  resolveAudience,
  type AudienceCandidate,
} from "#lib/notifications/audience";

/**
 * 受众规则 —— 纯函数，不碰数据库。
 *
 * 这组用例存在的原因：`resolveAudience` 现在是「谁会收到这条通知」的**唯一**
 * 实现（服务端落库与发送页预览人数都调它）。它同时含两条安全属性：
 *
 *   1. admin 永远不是受众（否则给管理员群发就是个权限口子）
 *   2. 发送者收不到自己发的通知
 *
 * 以前这两条只写在服务端，客户端那份手写并集两样都不知道 —— 所以现在
 * 它们值得直接钉住，而不是靠 DB 用例顺带覆盖。
 */

const c = (id: string, role: string): AudienceCandidate => ({ id, role });

const STUDENT = c("s1", "student");
const STUDENT2 = c("s2", "student");
const TEACHER = c("t1", "teacher");
const ADMIN = c("a1", "admin");
const ALL: AudienceCandidate[] = [STUDENT, STUDENT2, TEACHER, ADMIN];

describe("resolveAudience — 三路目标", () => {
  it("all：受管角色全收，admin 不收", () => {
    const { recipientIds } = resolveAudience(ALL, { all: true });

    expect(recipientIds).toEqual(["s1", "s2", "t1"]);
    expect(recipientIds).not.toContain("a1");
  });

  it("roles：只收指定角色", () => {
    const { recipientIds } = resolveAudience(ALL, { roles: ["teacher"] });
    expect(recipientIds).toEqual(["t1"]);
  });

  it("userIds：只收被指名的", () => {
    const { recipientIds } = resolveAudience(ALL, { userIds: ["s2", "t1"] });
    expect(recipientIds).toEqual(["s2", "t1"]);
  });

  it("roles 与 userIds 取并集并去重", () => {
    // s1 既是「学生」又被指名 —— 只能出现一次
    const { recipientIds } = resolveAudience(ALL, { roles: ["student"], userIds: ["s1", "t1"] });

    expect(recipientIds).toEqual(["s1", "s2", "t1"]);
    expect(new Set(recipientIds).size).toBe(recipientIds.length);
  });

  it("all=true 时忽略 roles 与 userIds", () => {
    const { recipientIds } = resolveAudience(ALL, {
      all: true,
      roles: ["teacher"],
      userIds: ["a1"],
    });
    expect(recipientIds).toEqual(["s1", "s2", "t1"]);
  });
});

describe("resolveAudience — 两条安全属性", () => {
  it("admin 不是受众，即便被指名", () => {
    const { recipientIds } = resolveAudience(ALL, { userIds: ["a1", "s1"] });

    expect(recipientIds).not.toContain("a1");
    expect(recipientIds).toEqual(["s1"]);
  });

  it("roles 里混入 admin（非法值）不会命中任何人", () => {
    const { recipientIds } = resolveAudience(ALL, { roles: ["admin" as never] });
    expect(recipientIds).toEqual([]);
  });

  it("发送者收不到自己的通知，即便他当前是学生/教师", () => {
    // 管理员角色被改成 student 的情况 —— 他会在受管名单里，但仍不该收到
    const { recipientIds } = resolveAudience(ALL, { all: true }, "s1");

    expect(recipientIds).not.toContain("s1");
    expect(recipientIds).toEqual(["s2", "t1"]);
  });

  it("不传 senderId 时不排除任何人（发送页 currentUser 未加载时）", () => {
    const { recipientIds } = resolveAudience(ALL, { all: true }, undefined);
    expect(recipientIds).toContain("s1");
  });
});

describe("resolveAudience — 候选是超集也不影响", () => {
  it("多给的行不会进结果", () => {
    const superset = [...ALL, c("x", "parent"), c("y", "")];

    const { recipientIds } = resolveAudience(superset, { all: true });
    expect(recipientIds).toEqual(["s1", "s2", "t1"]);
  });

  it("空目标返回空数组，不抛错", () => {
    expect(resolveAudience(ALL, {})).toEqual({ recipientIds: [], overLimit: false });
    expect(resolveAudience(ALL, { roles: [] })).toEqual({ recipientIds: [], overLimit: false });
  });
});

describe("resolveAudience — 上限是返回结果，不是异常", () => {
  const many = (n: number): AudienceCandidate[] =>
    Array.from({ length: n }, (_, i) => c(`u${i}`, "student"));

  it("恰好到上限不算超", () => {
    const { recipientIds, overLimit } = resolveAudience(many(MAX_RECIPIENTS), { all: true });

    expect(recipientIds).toHaveLength(MAX_RECIPIENTS);
    expect(overLimit).toBe(false);
  });

  it("多一个就算超（此时不抛错，由调用方决定怎么办）", () => {
    const { recipientIds, overLimit } = resolveAudience(many(MAX_RECIPIENTS + 1), { all: true });

    // 超限时仍然把完整名单给出来 —— 服务端据此抛错，客户端据此禁用按钮
    expect(recipientIds).toHaveLength(MAX_RECIPIENTS + 1);
    expect(overLimit).toBe(true);
  });

  it("被剔除的行不计入上限", () => {
    // 5001 个 admin：全部被规则剔除 → 没超
    const admins = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => c(`a${i}`, "admin"));
    expect(resolveAudience(admins, { all: true }).overLimit).toBe(false);
  });
});
