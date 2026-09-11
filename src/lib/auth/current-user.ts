/**
 * CurrentUser —— 当前登录用户的唯一公开形态（见 CONTEXT.md）。
 *
 * 角色的**全部词汇**也住在这里：ROLES / Role / ROLE_HOME / MANAGED_ROLES /
 * isManagedRole / ROLE_LABEL。放在这个零依赖的叶子里是刻意的 —— 服务端与
 * 客户端都要用它们，而原先 MANAGED_ROLES 住在 import 了 db 的 admin-actions，
 * 客户端够不着，于是各自又写了一份名单（值、标签各三处）。
 *
 * 投影发生在查询层（PUBLIC_COLUMNS），passwordHash 等存储层字段不进入查询结果。
 *
 * 这是一个叶子模块：不 import auth 链上的任何东西。
 * guard / session-manager / user.functions 都要用它，放在这里才不会形成
 * `session-manager → user.functions → guard → session-manager` 的运行时循环。
 */

/**
 * 公开字段列表，凡是要投影出 CurrentUser 的地方都用它。
 */
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
  // 通知弹窗偏好。放在公开投影里是有意的 —— 前端需要读它决定弹不弹，
  // 且它不含任何敏感信息。
  "notifyOnNewMessage",
] as const;

/**
 * 角色。
 *
 * 与 prisma/contract.ts 的 Role enum 必须一致 —— 那边是数据库契约，
 * 这边是应用层类型，两处都改才算改完。
 *
 * `teacher` 在权限上等同管理员（最高 role），但名字是业务角色。
 * `admin` 目前只是预留：它不比其他角色多任何权限，仅用于将来接入
 * 管理功能时有个落点。详见 CONTEXT.md。
 */
export const ROLES = ["student", "teacher", "admin"] as const;

export type Role = (typeof ROLES)[number];

/**
 * 各角色登录后默认落在哪个工作台。路由重定向与页内守卫共用此表。
 *
 * 故意**不用** `Record<Role, string>` 标注：那样每个值会退化成 string，
 * 导致 `<Link to={ROLE_HOME[role]}>` 无法通过类型检查（Link 的 to 只接受
 * 已知路由字面量），只能靠 as 断言绕过。用 as const satisfies 保留字面量
 * 类型，同时仍然强制覆盖每个角色。
 */
export const ROLE_HOME = {
  student: "/authenticated/student",
  teacher: "/authenticated/teacher",
  admin: "/authenticated/admin/teachers",
} as const satisfies Record<Role, string>;

/**
 * 受管角色：可被管理员列出与操作的角色。
 *
 * **从 ROLES 推导，不另写一份数组。** 「admin 不能被 admin 自己管」是所有
 * 非 admin 角色的通例，不是一份要逐个裁决的名单 —— 存成数组会把它伪装成后者。
 * 加第 4 个角色时这里自动跟进，词汇不可能漂移。
 *
 * 一个需要记住的边界：这**不是**「能收通知的角色」的同义词，只是今天恰好
 * 同集合（见 schemas/auth.ts 的 sendNotificationSchema）。真出现「能被管理
 * 但不能收通知」的角色（比如服务账号）时再拆成两个名字。
 */
export type ManagedRole = Exclude<Role, "admin">;

export const MANAGED_ROLES: readonly ManagedRole[] = ROLES.filter(
  (r): r is ManagedRole => r !== "admin",
);

/**
 * 类型守卫：某个角色是否可被管理。
 *
 * 不直接写 `MANAGED_ROLES.includes(x)`：数据库里的角色是 `Role` 这个**更宽**
 * 的类型，而 `includes` 的参数被约束成数组元素的字面量联合，直接传会报错，
 * 逼得到处写 `x as ManagedRole` —— 那个断言把自己的类型问题推给调用点，
 * 而且断言后仍然是错的（admin 并不会因此变成不受管）。
 *
 * 用 `readonly string[]` 收参再断言，把窄化集中在这一个函数里。
 * 客户端与服务端都要判断「这个角色算不算受管」，所以它必须住在这个
 * 无依赖的叶子里 —— 原先它住在 import 了 db 的 admin-actions，客户端够不着，
 * 于是各自又写了一份名单。
 */
export function isManagedRole(role: string): role is ManagedRole {
  return (MANAGED_ROLES as readonly string[]).includes(role);
}

/**
 * 角色显示名。
 *
 * 角色的词汇表的一部分，所以和上面几个住在一起。覆盖**全部** Role（含 admin）：
 * 账号页要把「管理员」显示给 admin 自己看。
 *
 * 此前有三处各存一份，其中两处的类型是 `Record<string, string>` —— 加角色时
 * 不会编译报错，只是静默渲染成原始枚举值。图标不在这里：它来自客户端图标包，
 * 见 components/admin/data.tsx。
 */
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
