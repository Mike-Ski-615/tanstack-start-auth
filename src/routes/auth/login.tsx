import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import { GalleryVerticalEnd, Apple } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "#components/ui/field";
import { Input } from "#components/ui/input";
import { loginSchema } from "#schemas/auth";
import { useLoginMutation } from "#hooks/use-auth-mutations";
import { LoadingPage } from "#components/status/auth/login/loading";
import { ErrorPage } from "#components/status/auth/login/error";
import { NotFoundPage } from "#components/status/auth/login/not-found";

export const Route = createFileRoute("/auth/login")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: LoginPage,
});

function LoginPage() {
  const loginMutation = useLoginMutation();

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

        <form.Field name="email">
          {(emailField) => {
            const invalid =
              emailField.state.meta.isTouched && !emailField.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={emailField.name}>邮箱</FieldLabel>
                <Input
                  id={emailField.name}
                  name={emailField.name}
                  type="email"
                  value={emailField.state.value}
                  onBlur={emailField.handleBlur}
                  onChange={(event) =>
                    emailField.handleChange(event.target.value)
                  }
                  aria-invalid={invalid}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
                {invalid && (
                  <FieldError errors={emailField.state.meta.errors} />
                )}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="password">
          {(passwordField) => {
            const invalid =
              passwordField.state.meta.isTouched &&
              !passwordField.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={passwordField.name}>密码</FieldLabel>
                <Input
                  id={passwordField.name}
                  name={passwordField.name}
                  type="password"
                  value={passwordField.state.value}
                  onBlur={passwordField.handleBlur}
                  onChange={(event) =>
                    passwordField.handleChange(event.target.value)
                  }
                  aria-invalid={invalid}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  required
                />
                {invalid && (
                  <FieldError errors={passwordField.state.meta.errors} />
                )}
              </Field>
            );
          }}
        </form.Field>

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
          继续即表示你同意 <Link to="/">服务条款</Link> 和
          <Link to="/">隐私政策</Link>。
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
