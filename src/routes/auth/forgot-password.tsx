import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { GalleryVerticalEnd } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field";
import { Input } from "#components/ui/input";
import { toast } from "sonner";
import { emailOnlySchema, EmailOnlyValues } from "#schemas/auth";
import { requestPasswordResetFn } from "../../server/reset.functions";
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
  const resetMutation = useMutation({
    mutationFn: (data: EmailOnlyValues) =>
      requestPasswordResetFn({ data }),
    // 防枚举：无论邮箱是否存在，服务端恒返回 ok，客户端恒显示同一提示
    onSuccess: () => {
      toast.info("若该邮箱已注册，重置邮件已发送，请查收");
    },
    onError: () => {
      toast.error("请求失败，请稍后重试");
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: emailOnlySchema,
    },
    onSubmit: ({ value }) => {
      resetMutation.mutate(value);
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
          <h1 className="text-xl font-bold">忘记密码</h1>
          <FieldDescription>
            输入注册邮箱，我们将发送重置链接。
            <br />
            想起来了？ <Link to="/auth/login">返回登录</Link>
          </FieldDescription>
        </div>

        <form.Field name="email">
          {(emailField) => {
            const invalid =
              emailField.state.meta.isTouched &&
              !emailField.state.meta.isValid;
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

        <Field>
          <Button type="submit" disabled={resetMutation.isPending}>
            {resetMutation.isPending ? "发送中..." : "发送重置邮件"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
