import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { GalleryVerticalEnd } from "lucide-react";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "#components/ui/field";
import { TextField } from "#components/form/text-field";
import { toast } from "sonner";
import { resetPasswordSchema } from "#schemas/auth";
import { resetPasswordFn } from "../../server/verification.functions";

const resetSearchSchema = z.object({
  token: z.string().catch(""),
});

export const Route = createFileRoute("/auth/reset")({
  validateSearch: resetSearchSchema,
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  const resetMutation = useMutation({
    mutationFn: (password: string) =>
      resetPasswordFn({ data: { token, password } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("密码重置成功，欢迎回来");
        navigate({ to: "/dashboard" });
      } else {
        toast.error("重置链接无效或已过期，请重新发起");
      }
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

        <TextField
          form={form}
          name="password"
          label="新密码"
          type="password"
          placeholder="请输入新密码"
          autoComplete="new-password"
        />

        <Field>
          <Button type="submit" disabled={resetMutation.isPending}>
            {resetMutation.isPending ? "重置中..." : "重置密码"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
