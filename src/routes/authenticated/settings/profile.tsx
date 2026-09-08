import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Textarea } from "#components/ui/textarea";
import { updateProfileSchema, type UpdateProfileValues } from "#schemas/auth";
import { updateProfileFn } from "#server/profile.functions";

export const Route = createFileRoute("/authenticated/settings/profile")({
  component: SettingsProfilePage,
});

function SettingsProfilePage() {
  const { user } = Route.useRouteContext();
  const router = useRouter();

  const infoMutation = useMutation({
    mutationFn: (v: UpdateProfileValues) => updateProfileFn({ data: v }),
    onSuccess: () => {
      toast.success("资料已保存");
      router.invalidate();
    },
    onError: () => toast.error("保存失败，请重试"),
  });

  const infoForm = useForm({
    defaultValues: { name: user.name, bio: user.bio },
    validators: { onSubmit: updateProfileSchema },
    onSubmit: ({ value }) => infoMutation.mutate(value),
  });

  return (
    <form
      className="flex flex-1 flex-col items-center"
      onSubmit={(event) => {
        event.preventDefault();
        infoForm.handleSubmit();
      }}
    >
      <FieldGroup className="w-full max-w-xl flex-1">
        <div className="flex justify-center">
          <img
            src={user.image}
            alt={`${user.name} 的头像`}
            className="size-16 rounded-full object-cover"
          />
        </div>

        <FieldSet className="flex-1">
          <FieldLegend className="text-center text-xl font-bold">
            个人资料设置
          </FieldLegend>
          <FieldDescription className="text-center">
            更新你的用户名与个人介绍。
          </FieldDescription>
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
        </FieldSet>

        <Field orientation="horizontal" className="mt-auto">
          <Button type="submit" disabled={infoMutation.isPending}>
            {infoMutation.isPending ? "保存中..." : "保存资料"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
