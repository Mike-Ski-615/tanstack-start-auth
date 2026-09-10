import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, CheckCircle } from "@hugeicons/core-free-icons";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "#components/ui/button";
import { verifyEmailFn } from "#server/email-verification.functions";
import { useAuthCacheSync } from "#lib/queries/auth-sync";

const verifyEmailSearchSchema = z.object({
  token: z.string().catch(""),
});

export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: verifyEmailSearchSchema,
  component: VerifyEmailPage,
});

type Status = "loading" | "success" | "error";

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const router = useRouter();
  const authSync = useAuthCacheSync();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    verifyEmailFn({ data: { token } })
      .then(async () => {
        // 验证成功即建立会话，同步缓存后再跳转（细节见 auth-sync）
        await authSync.onSignedIn();
        setStatus("success");
        // 2 秒后跳转到认证页面
        setTimeout(() => {
          router.navigate({ to: "/authenticated" });
        }, 2000);
      })
      .catch(() => {
        setStatus("error");
      });
  }, [token, router, authSync]);

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <HugeiconsIcon icon={Mail01Icon} className="size-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">验证链接无效</h1>
        <p className="text-sm text-muted-foreground">
          请检查链接是否完整，或重新注册。
        </p>
        <Button asChild>
          <Link to="/auth/register">返回注册</Link>
        </Button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <HugeiconsIcon icon={Mail01Icon} className="size-12 animate-pulse text-primary" />
        <h1 className="text-xl font-bold">正在验证邮箱...</h1>
        <p className="text-sm text-muted-foreground">请稍候</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <HugeiconsIcon icon={CheckCircle} className="size-12 text-green-500" />
        <h1 className="text-xl font-bold">邮箱验证成功</h1>
        <p className="text-sm text-muted-foreground">
          即将跳转到首页...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <HugeiconsIcon icon={Mail01Icon} className="size-12 text-destructive" />
      <h1 className="text-xl font-bold">验证失败</h1>
      <p className="text-sm text-muted-foreground">
        链接已过期或无效，请重新注册。
      </p>
      <Button asChild>
        <Link to="/auth/register">返回注册</Link>
      </Button>
    </div>
  );
}
