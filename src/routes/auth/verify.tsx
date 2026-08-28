import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { GalleryVerticalEnd } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "#components/ui/field";
import { toast } from "sonner";
import { verifyEmailFn } from "../../server/verification.functions";

const verifySearchSchema = z.object({
  token: z.string().catch(""),
});

export const Route = createFileRoute("/auth/verify")({
  validateSearch: verifySearchSchema,
  component: VerifyPage,
});

type VerifyState = "pending" | "success" | "failed";

function VerifyPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<VerifyState>("pending");
  // 令牌一次性：防 StrictMode 双调用重复消费（第一次消费被丢弃、
  // 第二次得 invalid_token 会把成功态覆盖成失败态）
  const consumedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("failed");
      return;
    }

    if (consumedToken.current === token) return;
    consumedToken.current = token;

    let cancelled = false;

    (async () => {
      const result = await verifyEmailFn({ data: { token } });

      if (cancelled) return;

      if (result.ok) {
        setState("success");
        toast.success("邮箱验证成功，欢迎加入");
        navigate({ to: "/dashboard" });
      } else {
        setState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

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
          {state === "pending" && "正在验证，请稍候…"}
          {state === "success" && "验证成功，正在进入仪表盘…"}
          {state === "failed" && (
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
        {state === "failed" && (
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
