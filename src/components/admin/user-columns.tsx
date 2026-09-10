import { createColumnHelper } from "@tanstack/react-table";
import { UserRowActions } from "./user-row-actions";
import { adminTableFeatures } from "./table-features";
import type { User } from "#lib/auth/current-user";

/**
 * 管理员列表的列定义。
 *
 * 两页（教师 / 学生）共用列，只有标题与数据不同 —— 所以抽在这里。
 * 必须用与表格相同的 features（见 table-features.ts），否则列类型对不上。
 *
 * 关于 size：不写的话表格按内容自适应，结果是姓名列被压到刚好容下
 * 「测试用户」那么宽、邮箱列吃掉剩余全部宽度，右侧几列挤在一起。
 * 这里给每列一个基准宽度，让视觉重心落在姓名与邮箱上。
 * size 生效需要注册 columnSizingFeature（见 table-features.ts）。
 *
 * 宽度约束（合计约 780，容器 max-w-5xl=1024）：
 * 邮件列之所以最大，是因为它是唯一内容长度不可控的列（种子测试里出现过
 * 40+ 字符的邮箱）。
 */
const h = createColumnHelper<typeof adminTableFeatures, User>();

export const userColumns = h.columns([
  h.accessor("name", {
    header: "姓名",
    size: 160,
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),

  h.accessor("email", {
    header: "邮箱",
    size: 320,
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),

  h.accessor("emailVerifiedAt", {
    header: "验证状态",
    size: 120,
    // v9 里叫 sortFn（v8 是 sortingFn）。按有无验证时间排，而不是排字符串
    sortFn: (a, b) => Number(!!a.original.emailVerifiedAt) - Number(!!b.original.emailVerifiedAt),
    cell: (info) => {
      const s = verifyState(info.row.original);
      return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
      );
    },
  }),

  h.accessor("createdAt", {
    header: "注册时间",
    size: 120,
    cell: (info) => (
      <span className="text-muted-foreground">
        {new Date(info.getValue()).toLocaleDateString("zh-CN")}
      </span>
    ),
  }),

  h.display({
    id: "actions",
    header: "",
    size: 60,
    // 操作列靠右：与表头的空标题一致，按钮不贴着表格右边缘
    cell: (info) => (
      <div className="flex justify-end">
        <UserRowActions user={info.row.original} />
      </div>
    ),
  }),
]);

/** 邮箱验证状态的中文与配色。 */
function verifyState(u: User) {
  return u.emailVerifiedAt
    ? { text: "已验证", cls: "bg-green-100 text-green-700" }
    : { text: "未验证", cls: "bg-amber-100 text-amber-700" };
}
