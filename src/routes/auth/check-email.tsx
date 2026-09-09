import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { resendVerificationEmailFn } from "#server/email-verification.functions";

const checkEmailSearchSchema = z.object({
  email: z.string().catch(""),
});

export const Route = createFileRoute("/auth/check-email")({
  validateSearch: checkEmailSearchSchema,
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email: emailFromQuery } = Route.useSearch();
  const [email, setEmail] = useState(emailFromQuery);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const handleResend = async () => {
    if (!email) {
      setStatus("error");
      return;
    }

    setStatus("sending");
    try {
      await resendVerificationEmailFn({ data: { email } });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <HugeiconsIcon icon={Mail01Icon} className="size-12 text-primary" />
      <h1 className="text-xl font-bold">请查收验证邮件</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        我们已向你的邮箱发送了一封验证邮件。请点击邮件中的链接完成验证。
      </p>
      <p className="text-xs text-muted-foreground">
        验证通过后将自动登录。
      </p>

      {status === "sent" ? (
        <p className="text-sm text-green-600">验证邮件已重新发送，请查收</p>
      ) : (
        <div className="flex w-full max-w-xs gap-2">
          <Input
            type="email"
            placeholder="输入邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            variant="outline"
            disabled={status === "sending"}
            onClick={handleResend}
          >
            {status === "sending" ? "发送中..." : "重新发送"}
          </Button>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-destructive">发送失败，请稍后重试</p>
      )}

      <Button asChild>
        <Link to="/auth/login">返回登录</Link>
      </Button>
    </div>
  );
}
