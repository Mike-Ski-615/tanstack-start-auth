import { Link } from "@tanstack/react-router";
import { SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

/**
 * 帮助文档未找到（/authenticated/help）。
 *
 * 挂载在 SidebarInset 内，让开侧栏手柄（lg:ps-7）。
 *
 * 这页是固定路径，所以"未找到"只可能是地址错了 —— 文案承认这点，
 * 并给回工作台的出路。指 `/` 会离开已登录上下文，绕远路。
 */
export function NotFoundPage() {
  return (
    <div className={`flex flex-1 flex-col items-start gap-3 p-4 ${SIDEBAR_GUTTER_CLASS}`}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">帮助页不存在</h1>
      <p className="text-sm text-muted-foreground">
        没找到这个帮助页面，地址可能有误。帮助文档在侧栏「帮助」里。
      </p>
      <Link
        to="/authenticated"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回到工作台
      </Link>
    </div>
  );
}
