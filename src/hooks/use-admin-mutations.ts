import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminUsersQueryKey } from "#lib/queries/admin";
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

function useAdminMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  messages: { success: string },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminUsersQueryKey });
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
