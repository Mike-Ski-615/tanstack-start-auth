export const PUBLIC_COLUMNS = [
  "id",
  "email",
  "name",
  "image",
  "bio",
  "role",
  "createdAt",
  "sessionVersion",
  "emailVerifiedAt",
  "notifyOnNewMessage",
] as const;

export const ROLES = ["student", "teacher", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_HOME = {
  student: "/authenticated/student",
  teacher: "/authenticated/teacher",
  admin: "/authenticated/admin/teachers",
} as const satisfies Record<Role, string>;

export type ManagedRole = Exclude<Role, "admin">;

export const MANAGED_ROLES: readonly ManagedRole[] = ROLES.filter(
  (r): r is ManagedRole => r !== "admin",
);

export function isManagedRole(role: string): role is ManagedRole {
  return (MANAGED_ROLES as readonly string[]).includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  student: "学生",
  teacher: "教师",
  admin: "管理员",
};

export type User = {
  id: string;
  email: string;
  name: string;
  image: string;
  bio: string;
  role: Role;
  notifyOnNewMessage: boolean;
  createdAt: string;
  sessionVersion: number;
  emailVerifiedAt: string | null;
};
