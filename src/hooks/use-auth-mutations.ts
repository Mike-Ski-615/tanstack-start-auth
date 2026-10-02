import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "#lib/auth-client";
import type { EmailOnlyValues, LoginValues, RegisterValues } from "#schemas/auth";

export function useLoginMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: LoginValues) => {
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("登录成功，欢迎回来");
      navigate({ to: "/authenticated" });
    },
    onError: (error, variables) => {
      if ("code" in error && error.code === "EMAIL_NOT_VERIFIED") {
        toast.info(error.message);
        navigate({ to: "/auth/verify-email", search: { email: variables.email } });
        return;
      }

      toast.error(error.message);
    },
  });
}

export function useRegisterMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: RegisterValues) => {
      const { error } = await authClient.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success("验证码已发送，请查收邮箱");
      navigate({ to: "/auth/verify-email", search: { email: variables.email } });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useRequestPasswordResetMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: EmailOnlyValues) => {
      const { error } = await authClient.emailOtp.requestPasswordReset({ email: data.email });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.info("若该邮箱已注册，重置验证码已发送，请查收");
      navigate({ to: "/auth/reset", search: { email: variables.email } });
    },
    onError: () => toast.error("请求失败，请稍后重试"),
  });
}

export function useResetPasswordMutation(email: string, otp: string) {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await authClient.emailOtp.resetPassword({ email, otp, password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("密码重置成功，请登录");
      navigate({ to: "/auth/login" });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useLogoutMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("已退出登录");
      navigate({ to: "/" });
    },
    onError: () => toast.error("退出失败，请稍后重试"),
  });
}
