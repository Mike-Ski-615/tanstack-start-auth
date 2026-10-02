import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, CheckCircle } from "@hugeicons/core-free-icons";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as v from "valibot";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "#components/ui/input-otp";
import { authClient } from "#lib/auth-client";
import { LoadingPage } from "#components/status/auth/verify-email/loading";
import { ErrorPage } from "#components/status/auth/verify-email/error";
import { NotFoundPage } from "#components/status/auth/verify-email/not-found";

const verifyEmailSearchSchema = v.object({
  email: v.fallback(v.string(), ""),
});

export const Route = createFileRoute("/auth/verify-email")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  validateSearch: verifyEmailSearchSchema,
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email } = Route.useSearch();
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  async function verify(code: string) {
    await authClient.emailOtp.verifyEmail(
      { email, otp: code },
      {
        onRequest: () => setVerifying(true),
        onSuccess: () => {
          setVerifying(false);
          setVerified(true);
          toast.success("邮箱验证成功，请登录");
          setTimeout(() => router.navigate({ to: "/auth/login" }), 1200);
        },
        onError: (ctx) => {
          setVerifying(false);
          toast.error(ctx.error.message);
        },
      },
    );
  }

  async function resend() {
    await authClient.emailOtp.sendVerificationOtp(
      { email, type: "email-verification" },
      {
        onRequest: () => setResending(true),
        onSuccess: () => {
          setResending(false);
          setOtp("");
          toast.success("验证码已重新发送");
        },
        onError: (ctx) => {
          setResending(false);
          toast.error(ctx.error.message);
        },
      },
    );
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <HugeiconsIcon icon={Mail01Icon} className="size-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">缺少邮箱信息</h1>
        <p className="text-sm text-muted-foreground">请从注册页重新开始，或返回登录。</p>
        <Button asChild>
          <Link to="/auth/login">返回登录</Link>
        </Button>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <HugeiconsIcon icon={CheckCircle} className="size-12 text-success" />
        <h1 className="text-xl font-bold">邮箱验证成功</h1>
        <p className="text-sm text-muted-foreground">即将跳转到登录页...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <HugeiconsIcon icon={Mail01Icon} className="size-12 text-primary" />
      <h1 className="text-xl font-bold">输入邮箱验证码</h1>
      <p id="otp-hint" className="max-w-sm text-sm text-muted-foreground">
        验证码已发送至 <span className="font-medium">{email}</span>， 15 分钟内有效。
      </p>

      <form
        className="flex flex-col items-center gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (otp.length === 6) verify(otp);
        }}
      >
        <label htmlFor="otp" className="sr-only">
          邮箱验证码
        </label>
        <InputOTP
          id="otp"
          aria-describedby="otp-hint"
          maxLength={6}
          value={otp}
          onChange={setOtp}
          disabled={verifying}
          autoFocus
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <Button type="submit" disabled={otp.length !== 6 || verifying}>
          {verifying ? "验证中..." : "验证"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Button asChild variant="link" size="sm">
          <Link to="/auth/login">返回登录</Link>
        </Button>
        <Button
          type="button"
          variant="link"
          size="sm"
          disabled={resending}
          onClick={() => resend()}
        >
          {resending ? "发送中..." : "重新发送验证码"}
        </Button>
      </div>
    </div>
  );
}
