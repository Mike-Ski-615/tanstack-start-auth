import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { GalleryVerticalEnd } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "#components/ui/field";
import { verifyEmailFn } from "../../server/verification.functions";

const verifySearchSchema = z.object({
  token: z.string().catch(""),
});

export const Route = createFileRoute("/auth/verify")({
  validateSearch: verifySearchSchema,
  // search 经 loaderDeps 流入 loader（本版本 LoaderFnContext 不直接携带 search）
  loaderDeps: ({ search }) => ({ token: search.token }),
  /**
   * 令牌消费属于 loader，不属于 effect：
   * loader 随导航在服务端运行一次，客户端 hydrate 直接复用
   * dehydrated 数据而不会重跑（router-core/load-client.js 的契约）——
   * 一次性消费由结构保证，StrictMode 双调用问题从根上消失。
   * 附带收益：会话 cookie 随 SSR 响应下发，首屏前已登录。
   */
  loader: async ({ deps }) => {
    if (!deps.token) return { ok: false as const };
    return verifyEmailFn({ data: { token: deps.token } });
  },
  component: VerifyPage,
});

/** 页面是 loader 数据的纯函数：无 state、无 effect、无 ref。 */
function VerifyPage() {
  const result = Route.useLoaderData();

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Link to="/" className="flex flex-col items-center gap-2 font-medium">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-6" />
        </div>
        <span className="sr-only">Demo</span>
      </Link>
      <h1 className="text-xl font-bold">邮箱验证</h1>
      <FieldGroup>
        <FieldDescription className="px-6">
          {result.ok ? (
            <>验证成功，你的邮箱已确认。</>
          ) : (
            <>
              验证链接无效或已过期。
              <br />
              请前往{" "}
              <Link to="/auth/awaiting-verification" className="underline">
                重发验证邮件
              </Link>{" "}
              或返回{" "}
              <Link to="/auth/login" className="underline">
                登录页
              </Link>
              。
            </>
          )}
        </FieldDescription>

        {result.ok ? (
          <Field>
            <Button asChild>
              <Link to="/dashboard">进入仪表盘</Link>
            </Button>
          </Field>
        ) : (
          <Field>
            <Button variant="outline" asChild>
              <Link to="/auth/awaiting-verification">重发验证邮件</Link>
            </Button>
          </Field>
        )}
      </FieldGroup>
    </div>
  );
}
