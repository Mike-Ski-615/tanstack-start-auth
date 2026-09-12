import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import * as v from "valibot";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Alert01Icon, Loading02Icon } from "@hugeicons/core-free-icons";

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
import {
  selectableUsersQueryOptions,
  sentNotificationsQueryOptions,
} from "#lib/queries/notifications";
import { currentUserQueryOptions } from "#lib/queries/user";
import { issuesToFields } from "#lib/validation";
import { MAX_RECIPIENTS, resolveAudience } from "#lib/notifications/audience";
import {
  NOTIFICATION_BODY_MAX,
  NOTIFICATION_TITLE_MAX,
  sendNotificationSchema,
} from "#schemas/auth";
import type { ManagedRole } from "#lib/auth/current-user";
import { LoadingPage } from "#components/status/authenticated/admin/notifications/loading";
import { ErrorPage } from "#components/status/authenticated/admin/notifications/error";
import { NotFoundPage } from "#components/status/authenticated/admin/notifications/not-found";

export const Route = createFileRoute("/authenticated/admin/notifications")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AdminNotificationsPage,
  beforeLoad: ({ context }) =>
    Promise.all([
      context.queryClient.query({ ...selectableUsersQueryOptions, staleTime: "static" }),
      context.queryClient.query({ ...sentNotificationsQueryOptions, staleTime: "static" }),
    ]).then(() => undefined),
});

function AdminNotificationsPage() {
  const { data: users = [], isPending, error } = useSelectableUsers();
  const send = useSendNotificationMutation();

  const [all, setAll] = useState(false);
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);

  const { data: currentUser } = useQuery(currentUserQueryOptions);

  const audience = resolveAudience(users, { all, roles, userIds }, currentUser?.id);
  const targetCount = audience.recipientIds.length;

  const allCount = resolveAudience(users, { all: true }, currentUser?.id).recipientIds.length;

  const form = useForm({
    defaultValues: { title: "", body: "", link: "" },
    validators: {
      onChange: ({ value }) => {
        const r = v.safeParse(sendNotificationSchema, {
          ...value,
          all,
          roles: all ? undefined : roles,
          userIds: all ? undefined : userIds,
        });
        return r.success ? undefined : issuesToFields(r.issues);
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

  if (isPending || error) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">发送通知</h2>
          <p className="text-muted-foreground">通知会出现在收件人的铃铛里，并计入未读数。</p>
        </div>

        <div
          className={
            error
              ? "flex flex-col items-center gap-2 rounded-xl border py-16 text-destructive"
              : "flex flex-col items-center gap-2 rounded-xl border py-16 text-muted-foreground"
          }
        >
          {error ? (
            <>
              <HugeiconsIcon icon={Alert01Icon} className="size-5" />
              <p className="text-sm">{error.message}</p>
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Loading02Icon} className="size-5 animate-spin" />
              <p className="text-sm">加载中…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">发送通知</h2>
        <p className="text-muted-foreground">通知会出现在收件人的铃铛里，并计入未读数。</p>
      </div>

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
                      maxLength={NOTIFICATION_TITLE_MAX}
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
                      maxLength={NOTIFICATION_BODY_MAX}
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
                      全部师生（{allCount} 人）
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
                  {audience.overLimit
                    ? `将发送给 ${targetCount} 人，超出单次上限 ${MAX_RECIPIENTS} 人 —— 请分批发。`
                    : all
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
                disabled={send.isPending || (!all && targetCount === 0) || audience.overLimit}
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
