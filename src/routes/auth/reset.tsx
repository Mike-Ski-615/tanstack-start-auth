import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon } from "@hugeicons/core-free-icons";
import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "#components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { useState } from "react";
import { resetPasswordSchema } from "#schemas/auth";
import { useResetPasswordMutation } from "#hooks/use-auth-mutations";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "#components/ui/input-otp";
import { LoadingPage } from "#components/status/auth/reset/loading";
import { ErrorPage } from "#components/status/auth/reset/error";
import { NotFoundPage } from "#components/status/auth/reset/not-found";

const resetSearchSchema = z.object({
  email: z.string().catch(""),
});

export const Route = createFileRoute("/auth/reset")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  validateSearch: resetSearchSchema,
  component: ResetPage,
});

function ResetPage() {
  const { email } = Route.useSearch();
  const [otp, setOtp] = useState("");
  const resetMutation = useResetPasswordMutation(email, otp);

  const form = useForm({
    defaultValues: {
      password: "",
    },
    validators: {
      onSubmit: resetPasswordSchema.pick({ password: true }),
    },
    onSubmit: ({ value }) => {
      resetMutation.mutate(value.password);
    },
  });

  // 缺 email 无从校验验证码（本页由忘记密码→邮件跳转而来）
  if (!email) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold">缺少邮箱信息</h1>
        <FieldDescription>
          请重新发起
          <Link to="/auth/forgot-password" className="underline">
            密码重置
          </Link>
          。
        </FieldDescription>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <Link to="/" className="flex flex-col items-center gap-2 font-medium">
            <div className="flex size-8 items-center justify-center rounded-md">
              <HugeiconsIcon icon={UserIcon} className="size-6" />
            </div>
            <span className="sr-only">Demo</span>
          </Link>
          <h1 className="text-xl font-bold">设置新密码</h1>
          <FieldDescription>验证码已发送至 {email}，15 分钟内有效。</FieldDescription>
        </div>

        <Field>
          <FieldLabel htmlFor="otp">邮箱验证码</FieldLabel>
          {/*
            id 必填：FieldLabel 的 htmlFor="otp" 需要一个真实存在的
            id 才能建立关联。OTP 控件底层是原生 input，id 会透传。
            缺了它 label 就是个死链 —— 无障碍树里该控件没有名字。
          */}
          <InputOTP
            id="otp"
            maxLength={6}
            value={otp}
            onChange={setOtp}
            disabled={resetMutation.isPending}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Field>

        <form.Field name="password">
          {(passwordField) => {
            const invalid = passwordField.state.meta.isTouched && !passwordField.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={passwordField.name}>新密码</FieldLabel>
                <Input
                  id={passwordField.name}
                  name={passwordField.name}
                  type="password"
                  value={passwordField.state.value}
                  onBlur={passwordField.handleBlur}
                  onChange={(event) => passwordField.handleChange(event.target.value)}
                  aria-invalid={invalid}
                  placeholder="请输入新密码"
                  autoComplete="new-password"
                  required
                />
                {invalid && <FieldError errors={passwordField.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <Field>
          <Button type="submit" disabled={otp.length !== 6 || resetMutation.isPending}>
            {resetMutation.isPending ? "重置中..." : "重置密码"}
          </Button>
          {resetMutation.isError && (
            <p className="text-sm text-destructive">验证码不正确或已过期，请重试</p>
          )}
        </Field>
      </FieldGroup>
    </form>
  );
}
