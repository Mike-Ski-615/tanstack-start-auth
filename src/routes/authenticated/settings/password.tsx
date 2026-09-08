import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "#components/ui/field";
import { Input } from "#components/ui/input";
import { changePasswordSchema, type ChangePasswordValues } from "#schemas/auth";
import { changePasswordFn } from "#server/profile.functions";

export const Route = createFileRoute("/authenticated/settings/password")({
  component: SettingsPasswordPage,
});

function SettingsPasswordPage() {
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
      className="flex flex-1 flex-col items-center"
      onSubmit={(event) => {
        event.preventDefault();
        pwdForm.handleSubmit();
      }}
    >
      <FieldGroup className="w-full max-w-xl flex-1">
        <FieldSet className="flex-1">
          <FieldLegend>修改密码</FieldLegend>
          <FieldDescription>更新你的登录密码。</FieldDescription>
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
                      <ShieldCheck className="mr-1 inline size-4 align-[-3px]" />
                      修改密码需要验证当前密码
                    </FieldDescription>
                    {invalid && <FieldError errors={f.state.meta.errors} />}
                  </Field>
                );
              }}
            </pwdForm.Field>
          </FieldGroup>
        </FieldSet>

        <Field orientation="horizontal" className="mt-auto">
          <Button type="submit" disabled={pwdMutation.isPending}>
            {pwdMutation.isPending ? "提交中..." : "更新密码"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
