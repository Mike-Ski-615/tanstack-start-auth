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
 * 错误文案是静态的，不透传服务端字符串（项目约定）。服务端只发错误码：
 *   forbidden          —— 不是管理员（正常流程下不该出现，除非会话过期）
 *   not_found          —— 目标不存在，或目标是管理员
 *   cannot_target_self —— 管理员对自己操作
 */

function useAdminMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  messages: { success: string; notAdmin?: string; self?: string },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.adminUsers });
      toast.success(messages.success);
    },
    onError: (e: Error) => {
      const m = e.message;
      // 会话过期（原本是管理员，token 失效后被判为非管理员）
      if (m.includes("forbidden")) {
        toast.error(messages.notAdmin ?? "权限不足，请重新登录");
        return;
      }
      if (m.includes("cannot_target_self")) {
        toast.error(messages.self ?? "不能对自己执行此操作");
        return;
      }
      if (m.includes("not_found")) {
        toast.error("该用户不存在或不可管理");
        return;
      }
      toast.error("操作失败，请稍后重试");
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
