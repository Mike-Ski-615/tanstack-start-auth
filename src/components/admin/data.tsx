import { CheckCircle, CircleIcon, UserIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { MANAGED_ROLES, ROLE_LABEL, type ManagedRole } from "#lib/auth/current-user";

const ROLE_ICON = {
  student: UserIcon,
  teacher: UserGroupIcon,
} as const satisfies Record<ManagedRole, typeof UserIcon>;

export const roles = MANAGED_ROLES.map((value) => ({
  value,
  label: ROLE_LABEL[value],
  icon: ROLE_ICON[value],
}));

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
