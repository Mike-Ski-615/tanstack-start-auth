import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { GalleryVerticalEnd, Apple } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "#components/ui/field";
import { TextField } from "#components/form/text-field";
import { toast } from "sonner";
import { registerSchema, RegisterValues } from "#schemas/auth";
import { register } from "../../server/register.functions";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();

  const registerMutation = useMutation({
    mutationFn: (data: RegisterValues) => register({ data }),
    onSuccess: (result) => {
      // 验证是登录的硬门槛：注册不即登录，
      // 等待验证的状态属于 awaiting-verification 页（状态进 URL）
      navigate({
        to: "/auth/awaiting-verification",
        search: { email: result.user.email },
      });
    },
    onError: () => {
      toast.error("注册失败，请检查信息后重试");
    },
  });

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

        <FieldSeparator>或</FieldSeparator>

        <Field className="grid gap-4 sm:grid-cols-2">
          <Button variant="outline" type="button">
            <Apple />
            使用 Apple 注册
          </Button>

          <Button variant="outline" type="button">
            <Apple />
            使用 Google 注册
          </Button>
        </Field>

        <FieldDescription className="px-6 text-center">
          继续即表示你同意 <Link to="/">服务条款</Link> 和{" "}
          <Link to="/">隐私政策</Link>。
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
