import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, CheckCircle } from "@hugeicons/core-free-icons";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "#components/ui/input-otp";
import { verifyEmailFn, resendVerificationEmailFn } from "#server/email-verification.functions";
import { useAuthCacheSync } from "#lib/queries/auth-sync";

const verifyEmailSearchSchema = z.object({
  email: z.string().catch(""),
});

export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: verifyEmailSearchSchema,
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email } = Route.useSearch();
  const router = useRouter();
  const authSync = useAuthCacheSync();
  const [otp, setOtp] = useState("");

  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyEmailFn({ data: { email, otp: code } }),
    onSuccess: async () => {
      // 验证成功即建立会话，同步缓存后跳转（细节见 auth-sync）
      await authSync.onSignedIn();
      setTimeout(() => router.navigate({ to: "/authenticated" }), 1500);
    },
  });

  // 重发：用户没收到邮件时重新生成 OTP（旧 OTP 作废）
  const resendMutation = useMutation({
    mutationFn: () => resendVerificationEmailFn({ data: { email } }),
    onSuccess: () => {
      setOtp("");
      toast.success("验证码已重新发送");
    },
    onError: () => toast.error("发送失败，请稍后重试"),
  });

  // 缺 email 无从验证（本页由注册/重发邮件跳转而来，正常不会缺）
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

  if (verifyMutation.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <HugeiconsIcon icon={CheckCircle} className="size-12 text-green-500" />
        <h1 className="text-xl font-bold">邮箱验证成功</h1>
        <p className="text-sm text-muted-foreground">即将跳转到首页...</p>
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
          // 只在填满 6 位时才提交，避免半截输入打满错误次数
          if (otp.length === 6) verifyMutation.mutate(otp);
        }}
      >
        {/*
          sr-only label + htmlFor：OTP 控件的底层是原生 input，id 会透传。
          视觉上已有 h1 与上方说明文字，不必重复显示，但屏幕阅读器需要
          一个真实的可访问名（否则只听到“编辑框”）。
        */}
        <label htmlFor="otp" className="sr-only">
          邮箱验证码
        </label>
        <InputOTP
          id="otp"
          aria-describedby="otp-hint"
          maxLength={6}
          value={otp}
          onChange={setOtp}
          disabled={verifyMutation.isPending}
          autoFocus
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {verifyMutation.isError && (
          <p className="text-sm text-destructive">验证码不正确或已过期，请重试</p>
        )}

        <Button type="submit" disabled={otp.length !== 6 || verifyMutation.isPending}>
          {verifyMutation.isPending ? "验证中..." : "验证"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Button asChild variant="link" size="sm">
          <Link to="/auth/login">返回登录</Link>
        </Button>
        <Button
          variant="link"
          size="sm"
          disabled={resendMutation.isPending}
          onClick={() => resendMutation.mutate()}
        >
          {resendMutation.isPending ? "发送中..." : "重新发送验证码"}
        </Button>
      </div>
    </div>
  );
}
