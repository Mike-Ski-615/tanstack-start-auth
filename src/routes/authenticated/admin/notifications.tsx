import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon } from "@hugeicons/core-free-icons";

import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { Checkbox } from "#components/ui/checkbox";
import { Label } from "#components/ui/label";
import { Field, FieldDescription, FieldError, FieldLabel } from "#components/ui/field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#components/ui/card";
import { RoleMultiSelect, UserMultiSelect } from "#components/admin/user-multi-select";
import { SentNotificationsList } from "#components/admin/sent-notifications";
import { useSelectableUsers, useSendNotificationMutation } from "#hooks/use-notifications";
import { sendNotificationSchema } from "#schemas/auth";
import { LoadingPage } from "#components/status/authenticated/loading";
import { ErrorPage } from "#components/status/authenticated/error";
import { NotFoundPage } from "#components/status/authenticated/not-found";

export const Route = createFileRoute("/authenticated/admin/notifications")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AdminNotificationsPage,
});

/**
 * 发送通知。
 *
 * 三种目标可混选（角色 + 指定人取并集），但勾了「全体」时另外两项禁用 ——
 * 那时它们已无意义（全体已包含一切），留着只会让人以为能组合出别的结果。
 * 接口层也会在 all=true 时忽略另外两项，两边一致。
 */
function AdminNotificationsPage() {
  const { data: users = [] } = useSelectableUsers();
  const send = useSendNotificationMutation();

  const [all, setAll] = useState(false);
  const [roles, setRoles] = useState<("student" | "teacher")[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);

  // 角色与指定人取并集去重 —— 与接口层 resolveRecipients 同一套规则，
  // 这样提示的人数就是实际会收到的人数。
  const targetCount = all
    ? users.length
    : new Set([
        ...users.filter((u) => roles.includes(u.role as "student" | "teacher")).map((u) => u.id),
        ...userIds,
      ]).size;

  const form = useForm({
    defaultValues: { title: "", body: "", link: "" },
    validators: {
      onChange: ({ value }) => {
        const r = sendNotificationSchema.safeParse({
          ...value,
          all,
          roles: all ? undefined : roles,
          userIds: all ? undefined : userIds,
        });
        return r.success ? undefined : r.error;
      },
    },
    onSubmit: ({ value }) => {
      send.mutate(
        {
          title: value.title,
          body: value.body,
          ...(value.link ? { link: value.link } : {}),
          ...(all ? { all: true } : { roles, userIds }),
        },
        {
          onSuccess: () => {
            form.reset();
            setAll(false);
            setRoles([]);
            setUserIds([]);
          },
        },
      );
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">发送通知</h2>
        <p className="text-muted-foreground">通知会出现在收件人的铃铛里，并计入未读数。</p>
      </div>

      {/*
        分栏按**容器**宽度而非视口：父级宽度由 header 上的 ContentWidthToggle
        控制，narrow 档（max-w-3xl ≈768px）时视口 lg: 照样触发，把两个面板
        各压到 ~370px。容器查询让断点跟着实际可用宽度走。
      */}
      <div className="@container grid gap-6 @3xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>新建通知</CardTitle>
            <CardDescription>标题与内容必填，链接可留空。</CardDescription>
          </CardHeader>

          <CardContent>
            <form
              id="send-notification"
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
              }}
              className="flex flex-col gap-5"
            >
              <form.Field name="title">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="n-title">标题</FieldLabel>
                    <Input
                      id="n-title"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="例如：本周五停课通知"
                      maxLength={100}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <form.Field name="body">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="n-body">内容</FieldLabel>
                    <Textarea
                      id="n-body"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="写下要通知的内容…"
                      maxLength={1000}
                      rows={5}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <form.Field name="link">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="n-link">链接（可选）</FieldLabel>
                    <Input
                      id="n-link"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="/authenticated/student"
                    />
                    <FieldDescription>站内路径，以 / 开头。点击通知会跳到这里。</FieldDescription>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <Field>
                <FieldLabel>发送目标</FieldLabel>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="n-all" checked={all} onCheckedChange={(v) => setAll(!!v)} />
                    <Label htmlFor="n-all" className="font-normal">
                      全部师生（{users.length} 人）
                    </Label>
                  </div>

                  <div className="flex flex-col gap-2 ps-6">
                    <p className="text-xs text-muted-foreground">
                      按角色（可与下面的指定用户叠加）
                    </p>
                    <RoleMultiSelect value={roles} onChange={setRoles} disabled={all} />
                  </div>

                  <div className="flex flex-col gap-2 ps-6">
                    <p className="text-xs text-muted-foreground">指定用户</p>
                    <UserMultiSelect
                      users={users}
                      value={userIds}
                      onChange={setUserIds}
                      disabled={all}
                    />
                  </div>
                </div>

                <FieldDescription>
                  {all
                    ? "勾选「全部师生」后，角色与指定用户不再生效。"
                    : targetCount === 0
                      ? "请至少选择一种发送目标。"
                      : `将发送给 ${targetCount} 人（管理员不会收到）。`}
                </FieldDescription>
              </Field>
            </form>

            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                form="send-notification"
                disabled={send.isPending || (!all && targetCount === 0)}
              >
                <HugeiconsIcon icon={SentIcon} />
                {send.isPending ? "发送中…" : "发送通知"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>已发送</CardTitle>
            <CardDescription>最近发出的通知，可查看送达与阅读情况，或撤回。</CardDescription>
          </CardHeader>
          <CardContent>
            <SentNotificationsList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
