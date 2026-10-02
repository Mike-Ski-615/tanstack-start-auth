import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon } from "@hugeicons/core-free-icons";
import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "#components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { emailOnlySchema } from "#schemas/auth";
import { toast } from "sonner";
import { authClient } from "#lib/auth-client";
import { LoadingPage } from "#components/status/auth/forgot-password/loading";
import { ErrorPage } from "#components/status/auth/forgot-password/error";
import { NotFoundPage } from "#components/status/auth/forgot-password/not-found";

export const Route = createFileRoute("/auth/forgot-password")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: emailOnlySchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.emailOtp.requestPasswordReset(
        { email: value.email },
        {
          onSuccess: () => {
            toast.info("若该邮箱已注册，重置验证码已发送，请查收");
            navigate({ to: "/auth/reset", search: { email: value.email } });
          },
          onError: (ctx) => {
            toast.error(ctx.error.message);
          },
        },
      );
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
          <h1 className="text-xl font-bold">忘记密码</h1>
          <FieldDescription>
            输入注册邮箱，我们将发送 6 位验证码。
            <br />
            想起来了？ <Link to="/auth/login">返回登录</Link>
          </FieldDescription>
        </div>

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

        <Field>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "发送中..." : "发送重置邮件"}
              </Button>
            )}
          </form.Subscribe>
        </Field>
      </FieldGroup>
    </form>
  );
}
