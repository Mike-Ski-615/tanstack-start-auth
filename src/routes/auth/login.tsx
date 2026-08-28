import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { GalleryVerticalEnd } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "#components/ui/field";
import { TextField } from "#components/form/text-field";
import { loginSchema, LoginValues } from "#schemas/auth";
import { getCurrentUserFn } from "../../server/current-user.functions";
import { EMAIL_NOT_VERIFIED, login } from "../../server/login.functions";
import { resendVerificationFn } from "../../server/verification.functions";
import { toast } from "sonner";
import { z } from "zod";

// 重定向目标校验：仅允许站内相对路径，防止开放重定向攻击
const loginSearchSchema = z.object({
  redirect: z
    .string()
    .refine((url) => url.startsWith("/") && !url.startsWith("//"))
    .default("/")
    .catch("/"),
});

export const Route = createFileRoute("/auth/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUserFn();

    if (user) {
      throw redirect({ to: search.redirect });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const loginMutation = useMutation({
    mutationFn: (data: LoginValues) => login({ data }),
    onSuccess: () => {
      toast.success("登录成功，欢迎回来");
      navigate({ to: search.redirect });
    },
    onError: (error) => {
      if (error.message === EMAIL_NOT_VERIFIED) {
        setNeedsVerification(true);
        toast.error("邮箱尚未验证，请先完成验证");
      } else {
        toast.error("登录失败，请检查邮箱或密码");
      }
    },
  });

  const handleResend = async () => {
    const email = form.state.values.email;
    if (!email) return;

    await resendVerificationFn({ data: { email } });
    toast.info("验证邮件已重新发送，请查收");
    setResendIn(60);
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: ({ value }) => {
      loginMutation.mutate(value);
    },
  });

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
              <GalleryVerticalEnd className="size-6" />
            </div>
            <span className="sr-only">Demo</span>
          </Link>
          <h1 className="text-xl font-bold">欢迎回来</h1>
          <FieldDescription>
            还没有账号？ <Link to="/auth/register">注册</Link>
          </FieldDescription>
        </div>

        <TextField
          form={form}
          name="email"
          label="邮箱"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
        />

        <TextField
          form={form}
          name="password"
          label="密码"
          type="password"
          placeholder="请输入密码"
          autoComplete="current-password"
        />

        <Field>
          <Button type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "登录中..." : "登录"}
          </Button>
        </Field>

        {needsVerification && (
          <Field>
            <Button
              type="button"
              variant="outline"
              disabled={resendIn > 0}
              onClick={handleResend}
            >
              {resendIn > 0 ? `重新发送（${resendIn}s）` : "重新发送验证邮件"}
            </Button>
          </Field>
        )}

        <FieldDescription className="text-center">
          <Link to="/auth/forgot-password">忘记密码？</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
