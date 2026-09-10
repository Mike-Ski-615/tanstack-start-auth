import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreHorizontalIcon,
  UserEdit01Icon,
  UserCheck01Icon,
  UserRemove01Icon,
  Key01Icon,
  LogoutIcon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import { Button } from "#components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { Input } from "#components/ui/input";
import { Field, FieldLabel, FieldError } from "#components/ui/field";
import { useForm } from "@tanstack/react-form";
import {
  useAdminSetRoleMutation,
  useAdminKickMutation,
  useAdminResetPasswordMutation,
  useAdminUpdateProfileMutation,
  useAdminDeleteUserMutation,
} from "#hooks/use-admin-mutations";
import type { User } from "#lib/auth/current-user";
import { adminResetPasswordSchema, adminUpdateProfileSchema } from "#schemas/auth";

/**
 * 表格每行的操作菜单（下拉）。
 *
 * 五个操作分两类：
 *   - 无破坏性：踢下线（可逆，重新登录即恢复）
 *   - 破坏性：删账号、重置他人密码 —— 都需二次确认
 *
 * 「管理员不能被操作」这条在服务端强制（admin.functions.ts 的
 * requireManageableTarget）。前端只负责不显示入口 —— 但即便有人绕过来
 * 调接口，也会被服务端拒。
 */

type Props = { user: User };

export function UserRowActions({ user }: Props) {
  const toTeacher = user.role === "student";

  const setRole = useAdminSetRoleMutation();
  const kick = useAdminKickMutation();
  const resetPassword = useAdminResetPasswordMutation();
  const updateProfile = useAdminUpdateProfileMutation();
  const remove = useAdminDeleteUserMutation();

  const [roleOpen, setRoleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={`对 ${user.name} 的操作`}>
            <HugeiconsIcon icon={MoreHorizontalIcon} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <HugeiconsIcon icon={UserEdit01Icon} />
            编辑资料
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setRoleOpen(true)}>
            <HugeiconsIcon icon={UserCheck01Icon} />
            {toTeacher ? "升为教师" : "降为学生"}
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => kick.mutate({ userId: user.id })}>
            <HugeiconsIcon icon={LogoutIcon} />
            踢下线
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => setResetOpen(true)}>
            <HugeiconsIcon icon={Key01Icon} />
            重置密码
          </DropdownMenuItem>

          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <HugeiconsIcon icon={UserRemove01Icon} />
            删除账号
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 编辑资料 */}
      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        onSubmit={(v) =>
          updateProfile.mutate(
            { userId: user.id, name: v.name, bio: v.bio },
            { onSuccess: () => setEditOpen(false) },
          )
        }
        pending={updateProfile.isPending}
      />

      {/* 重置密码 */}
      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        userName={user.name}
        onSubmit={(password) =>
          resetPassword.mutate(
            { userId: user.id, password },
            { onSuccess: () => setResetOpen(false) },
          )
        }
        pending={resetPassword.isPending}
      />

      {/* 改角色：二次确认 */}
      <AlertDialog open={roleOpen} onOpenChange={setRoleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toTeacher ? "升为教师？" : "降为学生？"}</AlertDialogTitle>
            <AlertDialogDescription>
              {user.name} 的工作台会变成
              {toTeacher ? "教师" : "学生"}版，并且需要重新登录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">取消</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() =>
                setRole.mutate(
                  { userId: user.id, role: toTeacher ? "teacher" : "student" },
                  { onSuccess: () => setRoleOpen(false) },
                )
              }
            >
              {toTeacher ? "升为教师" : "降为学生"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除：二次确认，最高风险 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 {user.name} 的账号？</AlertDialogTitle>
            <AlertDialogDescription>
              该用户的登录凭证与会话记录会一并删除，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">取消</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={() =>
                remove.mutate({ userId: user.id }, { onSuccess: () => setDeleteOpen(false) })
              }
            >
              删除账号
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* kick 是即时操作，不弹窗；pending 时禁用按钮 */}
      <span hidden aria-live="polite">
        {kick.isPending ? "正在踢下线" : ""}
      </span>
    </>
  );
}

// ============================================================
// 子对话框
// ============================================================

function EditProfileDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: User;
  onSubmit: (v: { name: string; bio: string }) => void;
  pending: boolean;
}) {
  const form = useForm({
    defaultValues: { name: user.name, bio: user.bio },
    validators: { onChange: adminUpdateProfileSchema.omit({ userId: true }) },
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑资料</DialogTitle>
          <DialogDescription>修改 {user.name} 的姓名与个人简介。</DialogDescription>
        </DialogHeader>

        <form
          id="admin-edit-profile"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="admin-edit-name">姓名</FieldLabel>
                <Input
                  id="admin-edit-name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="bio">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="admin-edit-bio">个人简介</FieldLabel>
                <Input
                  id="admin-edit-bio"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="admin-edit-profile" disabled={pending}>
            {pending ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  userName,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userName: string;
  onSubmit: (password: string) => void;
  pending: boolean;
}) {
  const form = useForm({
    defaultValues: { password: "", confirm: "" },
    validators: {
      onChange: ({ value }) => {
        const r = adminResetPasswordSchema.omit({ userId: true }).safeParse(value);
        if (!r.success) return r.error;
        if (value.password !== value.confirm) {
          return { fields: { confirm: { message: "两次输入不一致" } } };
        }
        return undefined;
      },
    },
    onSubmit: ({ value }) => onSubmit(value.password),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置 {userName} 的密码</DialogTitle>
          <DialogDescription>
            设置一个新密码。该用户的所有会话会立即失效，需要用新密码重新登录。
          </DialogDescription>
        </DialogHeader>

        <form
          id="admin-reset-password"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="password">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="admin-reset-pw">新密码</FieldLabel>
                <Input
                  id="admin-reset-pw"
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="confirm">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="admin-reset-pw2">确认新密码</FieldLabel>
                <Input
                  id="admin-reset-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="admin-reset-password" disabled={pending}>
            {pending ? "重置中…" : "重置密码"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
