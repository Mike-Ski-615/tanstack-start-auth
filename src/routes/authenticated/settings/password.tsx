import { HugeiconsIcon } from "@hugeicons/react";
import { Key02Icon } from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheckIcon } from "@hugeicons/core-free-icons";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field";
import { Input } from "#components/ui/input";
import { changePasswordSchema, type ChangePasswordValues } from "#schemas/auth";
import { changePasswordFn } from "#server/profile.functions";
import { LoadingPage } from "#components/status/authenticated/settings/password/loading";
import { ErrorPage } from "#components/status/authenticated/settings/password/error";
import { NotFoundPage } from "#components/status/authenticated/settings/password/not-found";

export const Route = createFileRoute("/authenticated/settings/password")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsPasswordPage,
});

function SettingsPasswordPage() {
  const { user } = Route.useRouteContext();
  const pwdMutation = useMutation({
    mutationFn: (v: ChangePasswordValues) => changePasswordFn({ data: v }),
    onSuccess: () => {
      toast.success("密码已修改");
      pwdForm.reset();
    },
    onError: () => toast.error("当前密码不正确"),
  });

  const pwdForm = useForm({
    defaultValues: { currentPassword: "", newPassword: "" },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: ({ value }) => pwdMutation.mutate(value),
  });

  return (
    <form
      className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        pwdForm.handleSubmit();
      }}
    >
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={user.name}
        readOnly
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Key02Icon}
            className="size-5 text-muted-foreground"
          />
          <h1 className="text-xl font-semibold">修改密码</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          更新登录密码，需验证当前密码。
        </p>
      </header>

      <FieldGroup>
        <pwdForm.Field name="currentPassword">
          {(f) => {
            const invalid = f.state.meta.isTouched && !f.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={f.name}>当前密码</FieldLabel>
                <Input
                  id={f.name}
                  type="password"
                  value={f.state.value}
                  onBlur={f.handleBlur}
                  onChange={(e) => f.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  autoComplete="current-password"
                />
                {invalid && <FieldError errors={f.state.meta.errors} />}
              </Field>
            );
          }}
        </pwdForm.Field>

        <pwdForm.Field name="newPassword">
          {(f) => {
            const invalid = f.state.meta.isTouched && !f.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={f.name}>新密码</FieldLabel>
                <Input
                  id={f.name}
                  type="password"
                  value={f.state.value}
                  onBlur={f.handleBlur}
                  onChange={(e) => f.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="6~32 位"
                  autoComplete="new-password"
                />
                <FieldDescription>
                  <HugeiconsIcon
                    icon={ShieldCheckIcon}
                    className="mr-1 inline size-4 align-[-3px]"
                  />
                  修改密码需要验证当前密码
                </FieldDescription>
                {invalid && <FieldError errors={f.state.meta.errors} />}
              </Field>
            );
          }}
        </pwdForm.Field>
      </FieldGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={pwdMutation.isPending}>
          {pwdMutation.isPending ? "提交中..." : "更新密码"}
        </Button>
      </div>
    </form>
  );
}
