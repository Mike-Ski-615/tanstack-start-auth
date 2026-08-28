import { useForm } from "@tanstack/react-form";
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
import { ResendVerificationButton } from "#components/form/resend-verification-button";
import { emailOnlySchema } from "#schemas/auth";

const awaitingSearchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/auth/awaiting-verification")({
  validateSearch: awaitingSearchSchema,
  component: AwaitingVerificationPage,
});

/**
 * 验证等待态的唯一归属地。
 *
 * 页面零状态：带 email 参数 → 已发送面板；不带 → 邮箱表单，
 * 提交后导航到带参的自己——状态进 URL，不进组件。
 */
function AwaitingVerificationPage() {
  const { email } = Route.useSearch();

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Link to="/" className="flex flex-col items-center gap-2 font-medium">
        <div className="flex size-8 items-center justify-center rounded-md">
          <GalleryVerticalEnd className="size-6" />
        </div>
        <span className="sr-only">Demo</span>
      </Link>
      <h1 className="text-xl font-bold">验证你的邮箱</h1>

      {email ? <SentPanel email={email} /> : <EmailForm />}
    </div>
  );
}

function SentPanel({ email }: { email: string }) {
  return (
    <FieldGroup>
      <FieldDescription className="px-6">
        我们已向 <strong>{email}</strong>{" "}
        发送了一封验证邮件，点击其中的链接完成验证后即可登录。 验证链接 24
        小时内有效。
      </FieldDescription>
      <Field>
        <ResendVerificationButton email={email} />
      </Field>
      <FieldDescription className="text-center">
        已完成验证？ <Link to="/auth/login">去登录</Link>
      </FieldDescription>
    </FieldGroup>
  );
}

function EmailForm() {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: emailOnlySchema,
    },
    onSubmit: ({ value }) => {
      navigate({
        to: "/auth/awaiting-verification",
        search: { email: value.email },
      });
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
        <FieldDescription className="px-6">
          输入注册邮箱，我们将重新发送验证邮件。
        </FieldDescription>

        <TextField
          form={form}
          name="email"
          label="邮箱"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
        />

        <Field>
          <Button type="submit">下一步</Button>
        </Field>
        <FieldDescription className="text-center">
          <Link to="/auth/login">返回登录</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
