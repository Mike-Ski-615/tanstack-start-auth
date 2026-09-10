import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
  // 邮箱本身是受控输入（用户可改），不是请求状态，所以留在 useState
  const [email, setEmail] = useState(emailFromQuery);
  // 空邮箱的本地校验：请求根本没发出，isError 不会为真
  const [emailError, setEmailError] = useState(false);

  // 请求状态交给 Query：不再手写 idle/sending/sent/error 四态
  // 与 try/catch 的转换，也与其他 6 个 mutation 的写法保持一致。
  const resendMutation = useMutation({
    mutationFn: () => resendVerificationEmailFn({ data: { email } }),
    // 防枚举：服务端无论邮箱是否存在恒返回成功，客户端不做区分
  });

  const handleResend = () => {
    // 空邮箱不发请求（不发请求就不会有 isError，所以在此直接标记失败）
    if (!email) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    resendMutation.mutate();
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

      {resendMutation.isSuccess ? (
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
            disabled={resendMutation.isPending}
            onClick={handleResend}
          >
            {resendMutation.isPending ? "发送中..." : "重新发送"}
          </Button>
        </div>
      )}

      {(resendMutation.isError || emailError) && (
        <p className="text-sm text-destructive">发送失败，请稍后重试</p>
      )}

      <Button asChild>
        <Link to="/auth/login">返回登录</Link>
      </Button>
    </div>
  );
}
