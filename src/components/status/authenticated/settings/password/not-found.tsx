import { Link } from "@tanstack/react-router";

/**
 * 密码设置未找到（/authenticated/settings/password）。
 *
 * 弹窗内，容器对齐 max-w-3xl。
 *
 * 退路给设置总览。这里额外在文案里点明「忘记密码」这条路 ——
 * 用户之所以找不到密码设置，很可能就是想改密码但走错了入口。
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">密码设置不存在</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没找到密码设置分区。如果你忘了当前密码，请从登录页走「忘记密码」。
      </p>
      <Link
        to="/authenticated/settings/home"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        设置总览
      </Link>
    </div>
  );
}
