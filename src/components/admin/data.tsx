import { CheckCircle, CircleIcon, UserIcon, UserGroupIcon } from "@hugeicons/core-free-icons";

/**
 * 表格里的可选项定义（对应官方 tasks/data/data.tsx 的 labels/statuses/priorities）。
 *
 * 三个数组分别服务于：
 * - roles      → 表格上方的 faceted filter（按角色筛选）
 * - verified   → 表格上方的 faceted filter（按验证状态筛选）
 * - roleLabels → 列里显示的角色名
 */

/** 侧边栏/表格里出现的角色。管理员不在此列（不可被管理）。 */
export const roles = [
  {
    value: "student",
    label: "学生",
    icon: UserIcon,
  },
  {
    value: "teacher",
    label: "教师",
    icon: UserGroupIcon,
  },
] as const;

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
