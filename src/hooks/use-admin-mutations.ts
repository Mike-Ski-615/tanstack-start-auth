import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "#lib/query-keys";
import {
  adminSetUserRoleFn,
  adminKickUserFn,
  adminResetUserPasswordFn,
  adminUpdateUserProfileFn,
  adminDeleteUserFn,
} from "#server/admin.functions";
import type {
  AdminSetRoleValues,
  AdminResetPasswordValues,
  AdminUpdateProfileValues,
  UserIdValues,
} from "#schemas/auth";

/**
 * 管理员操作的 mutation。
 *
 * 每个成功后都 invalidate 对应的用户列表 —— 不只是「刷新表格」，因为
 * 改角色会让那个人从学生列表**消失**、出现在教师列表里，两个列表都要重取。
 * 所以统一 invalidate users 前缀（见 query-keys）。
 *
 * 错误文案直接展示服务端的 error.message —— 服务端抛的就是用户可读句子
 * （见 lib/error-messages.ts）。所以这里不再做错误码字符串匹配，
 * 也无需传入 notAdmin / self 之类的自定义文案。
 */

function useAdminMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  messages: { success: string },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.adminUsers });
      toast.success(messages.success);
    },
  });
}

export function useAdminSetRoleMutation() {
  return useAdminMutation<Pick<AdminSetRoleValues, "userId" | "role">>(
    (vars) => adminSetUserRoleFn({ data: vars }),
    { success: "角色已修改，该用户需要重新登录" },
  );
}

export function useAdminKickMutation() {
  return useAdminMutation<UserIdValues>((vars) => adminKickUserFn({ data: vars }), {
    success: "已踢下线",
  });
}

export function useAdminResetPasswordMutation() {
  return useAdminMutation<Pick<AdminResetPasswordValues, "userId" | "password">>(
    (vars) => adminResetUserPasswordFn({ data: vars }),
    {
      success: "密码已重置，该用户需要重新登录",
    },
  );
}

export function useAdminUpdateProfileMutation() {
  return useAdminMutation<Pick<AdminUpdateProfileValues, "userId" | "name" | "bio">>(
    (vars) => adminUpdateUserProfileFn({ data: vars }),
    {
      success: "资料已更新",
    },
  );
}

export function useAdminDeleteUserMutation() {
  return useAdminMutation<UserIdValues>((vars) => adminDeleteUserFn({ data: vars }), {
    success: "账号已删除",
  });
}
