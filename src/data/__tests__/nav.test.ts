import { describe, it, expect } from "vitest";
import { NAV_BY_ROLE, navItemsFor } from "#data/nav";
import { ROLES } from "#lib/auth/current-user";

/**
 * 按角色分的侧边栏菜单。
 *
 * 需求（用户明确给的规则）：
 *   student → 资源、课例
 *   teacher → 资源、课例、小组合作、展评、拓展（学生那两项 + 后三项）
 *   admin   → 教师管理、学生管理（完全独立，不与师生共享）
 *
 * 这组测试盯着两件容易改错的事：
 *   1. 漏给某个角色配菜单 → 那个人登录后侧边栏空白（用表驱动覆盖检查）
 *   2. 管理员被意外塞进师生共用的项 → admin 应完全独立
 *
 * 菜单是占位（都指向 /authenticated），这里只验「看到什么」，不验跳转。
 */

const idsOf = (role: (typeof ROLES)[number]) => navItemsFor(role).map((i) => i.id);

describe("每个角色都有菜单", () => {
  it("ROLES 里每个角色都配了菜单", () => {
    for (const role of ROLES) {
      expect(NAV_BY_ROLE[role], `${role} 没有菜单`).toBeTruthy();
      expect(NAV_BY_ROLE[role].length).toBeGreaterThan(0);
    }
  });

  it("NAV_BY_ROLE 的键与 ROLES 完全一致（无多余无遗漏）", () => {
    expect(Object.keys(NAV_BY_ROLE).sort()).toEqual([...ROLES].sort());
  });

  it("每个分组都有非空 label 和 id，且至少一项", () => {
    for (const role of ROLES) {
      for (const g of NAV_BY_ROLE[role]) {
        expect(g.id, `${role} 的分组缺 id`).toBeTruthy();
        expect(g.label, `${role}/${g.id} 缺 label`).toBeTruthy();
        expect(g.items.length, `${role}/${g.id} 是空组`).toBeGreaterThan(0);
      }
    }
  });

  it("分组 id 在同一角色内不重复", () => {
    for (const role of ROLES) {
      const ids = NAV_BY_ROLE[role].map((g) => g.id);
      expect(new Set(ids).size, `${role} 有重复分组 id`).toBe(ids.length);
    }
  });

  it("菜单项 id 在同一角色内不重复", () => {
    for (const role of ROLES) {
      const ids = idsOf(role);
      expect(new Set(ids).size, `${role} 有重复菜单 id`).toBe(ids.length);
    }
  });
});

describe("学生菜单", () => {
  it("只有资源与课例", () => {
    expect(idsOf("student").sort()).toEqual(["lessons", "resources"]);
  });

  it("看不到小组合作 / 展评 / 拓展", () => {
    const ids = idsOf("student");
    expect(ids).not.toContain("collaboration");
    expect(ids).not.toContain("exhibition");
    expect(ids).not.toContain("extension");
  });

  it("看不到管理菜单", () => {
    const ids = idsOf("student");
    expect(ids).not.toContain("manage-teachers");
    expect(ids).not.toContain("manage-students");
  });
});

describe("教师菜单", () => {
  it("五项齐全", () => {
    expect(idsOf("teacher").sort()).toEqual([
      "collaboration",
      "exhibition",
      "extension",
      "lessons",
      "resources",
    ]);
  });

  it("完整包含学生的两项（共同可见部分）", () => {
    for (const id of idsOf("student")) {
      expect(idsOf("teacher")).toContain(id);
    }
  });

  it("比学生多出小组合作 / 展评 / 拓展", () => {
    const extra = idsOf("teacher").filter((id) => !idsOf("student").includes(id));
    expect(extra.sort()).toEqual(["collaboration", "exhibition", "extension"]);
  });

  it("看不到管理菜单", () => {
    expect(idsOf("teacher")).not.toContain("manage-teachers");
    expect(idsOf("teacher")).not.toContain("manage-students");
  });
});

describe("管理员菜单", () => {
  it("只有教师管理与学生管理", () => {
    expect(idsOf("admin").sort()).toEqual(["manage-students", "manage-teachers"]);
  });

  it("与学生 / 教师的菜单完全不重叠", () => {
    const admin = idsOf("admin");
    for (const other of ["student", "teacher"] as const) {
      for (const id of idsOf(other)) {
        expect(admin, `admin 不应有 ${id}`).not.toContain(id);
      }
    }
  });

  it("三者的菜单集合两两不同", () => {
    const sets = ROLES.map((r) => idsOf(r).sort().join(","));
    expect(new Set(sets).size).toBe(ROLES.length);
  });
});

describe("菜单项的其他约束", () => {
  it("每项都有 title 和 icon", () => {
    for (const role of ROLES) {
      for (const item of navItemsFor(role)) {
        expect(item.title, `${role}/${item.id} 缺 title`).toBeTruthy();
        expect(item.icon, `${role}/${item.id} 缺 icon`).toBeTruthy();
      }
    }
  });

  it("管理员的菜单指向真实页面（学生/教师管理已实现）", () => {
    const admin = navItemsFor("admin");
    expect(admin.find((i) => i.id === "manage-teachers")!.to).toBe("/authenticated/admin/teachers");
    expect(admin.find((i) => i.id === "manage-students")!.to).toBe("/authenticated/admin/students");
  });

  it("师生的菜单仍指向占位地址（那些页面还没实现）", () => {
    // 现状快照，不是需求。师生各页开始实现时这条会失败，从而提醒
    // 回来更新断言与文档 —— 这正是它存在的意义。
    for (const role of ["student", "teacher"] as const) {
      for (const item of navItemsFor(role)) {
        expect(item.to, `${role}/${item.id}`).toBe("/authenticated");
      }
    }
  });

  it("navItemsFor 拍平顺序与分组内顺序一致", () => {
    for (const role of ROLES) {
      const flat = navItemsFor(role);
      const manual = NAV_BY_ROLE[role].flatMap((g) => g.items);
      expect(flat.map((i) => i.id)).toEqual(manual.map((i) => i.id));
    }
  });
});
