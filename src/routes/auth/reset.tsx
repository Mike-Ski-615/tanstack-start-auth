import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
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
import { resetPasswordSchema } from "#schemas/auth";
import { resetPasswordFn } from "#server/reset.functions";
import { LoadingPage } from "#components/status/auth/reset/loading";
import { ErrorPage } from "#components/status/auth/reset/error";
import { NotFoundPage } from "#components/status/auth/reset/not-found";

const resetSearchSchema = z.object({
  token: z.string().catch(""),
});

export const Route = createFileRoute("/auth/reset")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  validateSearch: resetSearchSchema,
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  const resetMutation = useMutation({
    mutationFn: (password: string) =>
      resetPasswordFn({ data: { token, password } }),
    onSuccess: () => {
      toast.success("密码重置成功，欢迎回来");
      navigate({ to: "/dashboard" });
    },
    onError: () => {
      toast.error("重置失败，请稍后重试");
    },
  });

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

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold">重置链接无效</h1>
        <FieldDescription>
          请重新发起{" "}
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
              <GalleryVerticalEnd className="size-6" />
            </div>
            <span className="sr-only">Demo</span>
          </Link>
          <h1 className="text-xl font-bold">设置新密码</h1>
          <FieldDescription>重置成功后即可直接登录。</FieldDescription>
        </div>

        <form.Field name="password">
          {(passwordField) => {
            const invalid =
              passwordField.state.meta.isTouched &&
              !passwordField.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={passwordField.name}>新密码</FieldLabel>
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
                  placeholder="请输入新密码"
                  autoComplete="new-password"
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
          <Button type="submit" disabled={resetMutation.isPending}>
            {resetMutation.isPending ? "重置中..." : "重置密码"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
