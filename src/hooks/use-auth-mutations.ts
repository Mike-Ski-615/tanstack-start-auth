import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { currentUserQueryOptions } from "#lib/queries/user";
import type { EmailOnlyValues, LoginValues, RegisterValues } from "#schemas/auth";
import { login } from "#server/login.functions";
import { register } from "#server/register.functions";
import { logout } from "#server/logout.functions";
import { requestPasswordResetFn, resetPasswordFn } from "#server/reset.functions";

export function useAuthCacheSync() {
  const queryClient = useQueryClient();

  return {
    async onSignedIn() {
      queryClient.removeQueries({ queryKey: currentUserQueryOptions.queryKey });
      await queryClient.query({ ...currentUserQueryOptions, staleTime: "static" });
    },

    onSignedOut() {
      queryClient.setQueryData(currentUserQueryOptions.queryKey, null);
    },
  };
}

export function useLoginMutation() {
  const navigate = useNavigate();
  const authSync = useAuthCacheSync();
  return useMutation({
    mutationFn: (data: LoginValues) => login({ data }),
    onSuccess: async () => {
      await authSync.onSignedIn();
      toast.success("登录成功，欢迎回来");
      navigate({ to: "/authenticated" });
    },
    onError: () => {
      toast.error("登录失败，请检查邮箱或密码");
    },
  });
}

export function useRegisterMutation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: RegisterValues) => register({ data }),
    onSuccess: (data) => {
      toast.success("验证码已发送，请查收邮箱");
      navigate({
        to: "/auth/verify-email",
        search: { email: data.user.email },
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRequestPasswordResetMutation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: EmailOnlyValues) => requestPasswordResetFn({ data }),
    onSuccess: (_data, variables) => {
      toast.info("若该邮箱已注册，重置验证码已发送，请查收");
      navigate({ to: "/auth/reset", search: { email: variables.email } });
    },
    onError: () => {
      toast.error("请求失败，请稍后重试");
    },
  });
}

export function useResetPasswordMutation(email: string, otp: string) {
  const navigate = useNavigate();
  const authSync = useAuthCacheSync();
  return useMutation({
    mutationFn: (password: string) => resetPasswordFn({ data: { email, otp, password } }),
    onSuccess: async () => {
      await authSync.onSignedIn();
      toast.success("密码重置成功，欢迎回来");
      navigate({ to: "/authenticated" });
    },
    onError: () => {
      toast.error("重置失败，请稍后重试");
    },
  });
}

export function useLogoutMutation() {
  const navigate = useNavigate();
  const authSync = useAuthCacheSync();
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      authSync.onSignedOut();
      toast.success("已退出登录");
      navigate({ to: "/" });
    },
    onError: () => {
      toast.error("退出失败，请稍后重试");
    },
  });
}
