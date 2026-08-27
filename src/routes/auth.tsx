import { Button } from "#components/ui/button";
import { Field, FieldDescription, FieldSeparator } from "#components/ui/field";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Apple } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Outlet />

          <FieldSeparator>或</FieldSeparator>

          <Field className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" type="button">
              <Apple />
              使用 Apple 登录
            </Button>

            <Button variant="outline" type="button">
              <Apple />
              使用 Google 登录
            </Button>
          </Field>

          <FieldDescription className="px-6 text-center">
            继续即表示你同意 <Link to="/">服务条款</Link> 和{" "}
            <Link to="/">隐私政策</Link>。
          </FieldDescription>
        </div>
      </div>
    </div>
  );
}
