import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon } from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { currentUserQueryOptions } from "#lib/queries/user";
import { Button } from "#components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { updateProfileSchema, type UpdateProfileValues } from "#schemas/auth";
import { updateProfileFn } from "#server/profile.functions";
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
  const { data: user } = useQuery(currentUserQueryOptions);
  const queryClient = useQueryClient();

  const infoMutation = useMutation({
    mutationFn: (v: UpdateProfileValues) => updateProfileFn({ data: v }),
    onSuccess: () => {
      toast.success("资料已保存");
      queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey });
    },
  });

  const infoForm = useForm({
    defaultValues: { name: user?.name ?? "", bio: user?.bio ?? "" },
    validators: { onSubmit: updateProfileSchema },
    onSubmit: ({ value }) => infoMutation.mutate(value),
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
        <p className="mt-1 text-sm text-muted-foreground">编辑头像、用户名与个人介绍。</p>
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

        <infoForm.Field name="bio">
          {(f) => {
            const invalid = f.state.meta.isTouched && !f.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={f.name}>个人介绍</FieldLabel>
                <Textarea
                  id={f.name}
                  rows={4}
                  value={f.state.value}
                  onBlur={f.handleBlur}
                  onChange={(e) => f.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="介绍一下自己"
                />
                <FieldDescription>最多 200 个字符</FieldDescription>
                {invalid && <FieldError errors={f.state.meta.errors} />}
              </Field>
            );
          }}
        </infoForm.Field>
      </FieldGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={infoMutation.isPending}>
          {infoMutation.isPending ? "保存中..." : "保存资料"}
        </Button>
      </div>
    </form>
  );
}
