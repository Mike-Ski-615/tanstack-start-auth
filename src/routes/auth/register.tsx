import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { GalleryVerticalEnd } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "#components/ui/field";
import { TextField } from "#components/form/text-field";
import { toast } from "sonner";
import { registerSchema, RegisterValues } from "#schemas/auth";
import { register } from "../../server/register.functions";
import { resendVerificationFn } from "../../server/verification.functions";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const registerMutation = useMutation({
    mutationFn: (data: RegisterValues) => register({ data }),
    onSuccess: (result) => {
      // 验证是登录的硬门槛：注册不再即登录，先验证邮箱
      setSentTo(result.user.email);
      setResendIn(60);
    },
    onError: () => {
      toast.error("注册失败，请检查信息后重试");
    },
  });

  const handleResend = async () => {
    if (!sentTo) return;

    await resendVerificationFn({ data: { email: sentTo } });
    toast.info("验证邮件已重新发送，请查收");
    setResendIn(60);
  };

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex flex-col items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-6" />
          </div>
        </div>
        <h1 className="text-xl font-bold">验证邮件已发送</h1>
        <FieldGroup>
          <FieldDescription className="px-6">
            我们已向 <strong>{sentTo}</strong>{" "}
            发送了一封验证邮件，点击其中的链接完成验证后即可登录。
            验证链接 24 小时内有效。
          </FieldDescription>
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
          <FieldDescription className="text-center">
            已完成验证？ <Link to="/auth/login">去登录</Link>
          </FieldDescription>
        </FieldGroup>
      </div>
    );
  }

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: registerSchema,
    },
    onSubmit: ({ value }) => {
      registerMutation.mutate(value);
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
          <h1 className="text-xl font-bold">创建账号</h1>
          <FieldDescription>
            已有账号？ <Link to="/auth/login">登录</Link>
          </FieldDescription>
        </div>
        <TextField
          form={form}
          name="name"
          label="名称"
          placeholder="张三"
          autoComplete="name"
        />

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
          autoComplete="new-password"
        />

        <Field>
          <Button type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "注册中..." : "注册"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
