import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon } from "@hugeicons/core-free-icons";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { authClient } from "#lib/auth-client";
import { Button } from "#components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { updateProfileSchema } from "#schemas/auth";
import { LoadingPage } from "#components/status/authenticated/settings/profile/loading";
import { ErrorPage } from "#components/status/authenticated/settings/profile/error";
import { NotFoundPage } from "#components/status/authenticated/settings/profile/not-found";

export const Route = createFileRoute("/authenticated/settings/profile")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsProfilePage,
});

function SettingsProfilePage() {
  const { session } = getRouteApi("/authenticated").useRouteContext();
  const user = session.user;

  const infoForm = useForm({
    defaultValues: { name: user.name },
    validators: { onSubmit: updateProfileSchema },
    onSubmit: async ({ value }) => {
      await authClient.updateUser(
        { name: value.name },
        {
          onSuccess: () => {
            toast.success("资料已保存");
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
      className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        infoForm.handleSubmit();
      }}
    >
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={UserIcon} className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">个人信息</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">编辑用户名。</p>
      </header>

      <FieldGroup>
        <infoForm.Field name="name">
          {(f) => {
            const invalid = f.state.meta.isTouched && !f.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={f.name}>用户名</FieldLabel>

                <Input
                  id={f.name}
                  type="text"
                  value={f.state.value}
                  onBlur={f.handleBlur}
                  onChange={(e) => f.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="张三"
                  autoComplete="username"
                  className="flex-1"
                />
                {invalid && <FieldError errors={f.state.meta.errors} />}
              </Field>
            );
          }}
        </infoForm.Field>
      </FieldGroup>

      <div className="flex justify-end">
        <infoForm.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存资料"}
            </Button>
          )}
        </infoForm.Subscribe>
      </div>
    </form>
  );
}
