import { CheckCircle, CircleIcon, UserIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { MANAGED_ROLES, ROLE_LABEL, type ManagedRole } from "#lib/auth/current-user";

/**
 * 表格里的可选项定义（对应官方 tasks/data/data.tsx 的 labels/statuses/priorities）。
 *
 * 角色那一份不再各自声明：值与标签来自 #lib/auth/current-user 的词汇表，
 * 这里只负责这个界面独有的东西 —— 图标。
 *
 * 刻意标注类型而非裸数组：覆盖 MANAGED_ROLES 漏一个角色会编译报错，
 * 而不是让筛选按钮少一个（与 data/nav.ts 用 Record<Role, NavGroup[]> 同一个理由）。
 */
const ROLE_ICON = {
  student: UserIcon,
  teacher: UserGroupIcon,
} as const satisfies Record<ManagedRole, typeof UserIcon>;

/** 侧边栏/表格里出现的角色。管理员不在此列（不可被管理）。 */
export const roles = MANAGED_ROLES.map((value) => ({
  value,
  label: ROLE_LABEL[value],
  icon: ROLE_ICON[value],
}));

/** 邮箱验证状态。 */
export const verificationStates = [
  {
    value: "verified",
    label: "已验证",
    icon: CheckCircle,
  },
  {
    value: "unverified",
    label: "未验证",
    icon: CircleIcon,
  },
] as const;
