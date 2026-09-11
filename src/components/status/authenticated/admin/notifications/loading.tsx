import { Skeleton } from "#components/ui/skeleton";

/**
 * 发送通知加载态（/authenticated/admin/notifications）。
 *
 * 挂载在 admin 布局的 `<Outlet />` 内（外层已有 padding，不重复）。
 *
 * 这页是**表单**，不是表格 —— 骨架照它真实的字段摆：
 *   收件人（全体勾选 + 角色多选 + 指定人多选）→ 标题输入 → 正文文本域
 *   → 发送按钮；下方是「已发送」列表。
 *
 * 不摆成表格形状：形状说谎比没有骨架更糟，加载完会整页换形。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      {/* 表单卡 */}
      <div className="flex flex-col gap-6 rounded-xl border p-6">
        {/* 收件人区块 */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-14" />

          {/* 「全体」勾选行 */}
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* 角色多选 + 指定人多选 */}
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* 标题 */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* 正文 */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* 发送按钮：靠右 */}
        <div className="flex justify-end">
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* 已发送列表 */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-20" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
