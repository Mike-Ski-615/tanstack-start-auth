import { HugeiconsIcon } from "@hugeicons/react";
import { AppleIcon, UserIcon } from "@hugeicons/core-free-icons";
import { GoogleIcon } from "#components/ui/google-icon";
import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute } from "@tanstack/react-router";
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
import { registerSchema } from "#schemas/auth";
import { useRegisterMutation } from "#hooks/use-auth-mutations";
import { LoadingPage } from "#components/status/auth/register/loading";
import { ErrorPage } from "#components/status/auth/register/error";
import { NotFoundPage } from "#components/status/auth/register/not-found";

export const Route = createFileRoute("/auth/register")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: RegisterPage,
});

function RegisterPage() {
  const registerMutation = useRegisterMutation();

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
              <HugeiconsIcon icon={UserIcon} className="size-6" />
            </div>
            <span className="sr-only">Demo</span>
          </Link>
          <h1 className="text-xl font-bold">创建账号</h1>
          <FieldDescription>
            已有账号？ <Link to="/auth/login">登录</Link>
          </FieldDescription>
        </div>
        <form.Field name="name">
          {(nameField) => {
            const invalid = nameField.state.meta.isTouched && !nameField.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={nameField.name}>名称</FieldLabel>
                <Input
                  id={nameField.name}
                  name={nameField.name}
                  type="text"
                  value={nameField.state.value}
                  onBlur={nameField.handleBlur}
                  onChange={(event) => nameField.handleChange(event.target.value)}
                  aria-invalid={invalid}
                  placeholder="张三"
                  autoComplete="name"
                  required
                />
                {invalid && <FieldError errors={nameField.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="email">
          {(emailField) => {
            const invalid = emailField.state.meta.isTouched && !emailField.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={emailField.name}>邮箱</FieldLabel>
                <Input
                  id={emailField.name}
                  name={emailField.name}
                  type="email"
                  value={emailField.state.value}
                  onBlur={emailField.handleBlur}
                  onChange={(event) => emailField.handleChange(event.target.value)}
                  aria-invalid={invalid}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
                {invalid && <FieldError errors={emailField.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="password">
          {(passwordField) => {
            const invalid = passwordField.state.meta.isTouched && !passwordField.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={passwordField.name}>密码</FieldLabel>
                <Input
                  id={passwordField.name}
                  name={passwordField.name}
                  type="password"
                  value={passwordField.state.value}
                  onBlur={passwordField.handleBlur}
                  onChange={(event) => passwordField.handleChange(event.target.value)}
                  aria-invalid={invalid}
                  placeholder="请输入密码"
                  autoComplete="new-password"
                  required
                />
                {invalid && <FieldError errors={passwordField.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <Field>
          <Button type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "注册中..." : "注册"}
          </Button>
        </Field>

        <FieldSeparator>或</FieldSeparator>

        <Field className="grid gap-4 sm:grid-cols-2">
          <Button variant="outline" type="button">
            <HugeiconsIcon icon={AppleIcon} />
            使用 Apple 注册
          </Button>

          <Button variant="outline" type="button">
            <GoogleIcon className="size-4" />
            使用 Google 注册
          </Button>
        </Field>

        <FieldDescription className="px-6 text-center">
          继续即表示你同意 <Link to="/">服务条款</Link> 和<Link to="/">隐私政策</Link>。
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
