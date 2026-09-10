import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuthCacheSync } from "#lib/queries/auth-sync";
import type { EmailOnlyValues, LoginValues, RegisterValues } from "#schemas/auth";
import { login } from "#server/login.functions";
import { register } from "#server/register.functions";
import { logout } from "#server/logout.functions";
import { requestPasswordResetFn, resetPasswordFn } from "#server/reset.functions";

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
    // 凭据失败或网络异常统一走这里，文案刻意笼统（防枚举）
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
      // 注册 ≠ 登录：跳转到验证码输入页（验证成功后自动登录）
      toast.success("注册成功，验证码已发送至邮箱");
      navigate({
        to: "/auth/verify-email",
        search: { email: data.user.email },
      });
    },
    onError: () => {
      toast.error("注册失败，请检查信息后重试");
    },
  });
}

export function useRequestPasswordResetMutation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: EmailOnlyValues) => requestPasswordResetFn({ data }),
    // 防枚举：无论邮箱是否存在，服务端恒返回 ok，客户端恒显示同一提示
    onSuccess: (_data, variables) => {
      toast.info("若该邮箱已注册，重置验证码已发送，请查收");
      // 无论邮箱是否存在都跳转（否则会暴露邮箱是否注册）。
      // 不存在的邮箱在验证阶段会得到统一的「验证码不正确」。
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
