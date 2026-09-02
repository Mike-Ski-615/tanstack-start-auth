import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import {
  Link,
  createFileRoute,
  isRedirect,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { GalleryVerticalEnd, Apple } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "#components/ui/field";
import { TextField } from "#components/form/text-field";
import { loginSchema, LoginValues } from "#schemas/auth";
import { getUserFn } from "../../server/user.functions";
import { login } from "../../server/login.functions";
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
    const user = await getUserFn();

    if (user) {
      throw redirect({ to: search.redirect });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const loginMutation = useMutation({
    mutationFn: (data: LoginValues) => login({ data }),
    onSuccess: (result) => {
      // 凭据失败：server function 以返回值携带 error（防枚举文案）
      if (result?.error) {
        toast.error("登录失败，请检查邮箱或密码");
      }
    },
    onError: (error) => {
      // 登录成功：server function 抛 redirect，客户端 RPC 原样抛回
      if (isRedirect(error)) {
        toast.success("登录成功，欢迎回来");
        navigate({ to: search.redirect });
        return;
      }
      toast.error("登录失败，请检查邮箱或密码");
    },
  });

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

        <FieldDescription className="text-center">
          <Link to="/auth/forgot-password">忘记密码？</Link>
        </FieldDescription>

        <FieldSeparator>或</FieldSeparator>

        <Field className="grid gap-4 sm:grid-cols-2">
          <Button variant="outline" type="button">
            <Apple />
            使用 Apple 登录
          </Button>

          <Button variant="outline" type="button">
            <Apple />
            使用 Google 登录
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
