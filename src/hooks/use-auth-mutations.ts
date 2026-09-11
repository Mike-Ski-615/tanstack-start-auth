import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { queryKeys } from "#lib/query-keys";
import { getUserFn } from "#server/user.functions";
import type { EmailOnlyValues, LoginValues, RegisterValues } from "#schemas/auth";
import { login } from "#server/login.functions";
import { register } from "#server/register.functions";
import { logout } from "#server/logout.functions";
import { requestPasswordResetFn, resetPasswordFn } from "#server/reset.functions";

/**
 * 认证状态变更后的缓存同步。
 *
 * 所有「建立 / 销毁会话」的服务端调用都必须走这里，原因有三：
 *
 * 1. 这段逻辑曾被复制在三处（login / resetPassword / verifyEmail），
 *    任何改动都可能改漏 —— 而我们正是漏过一次，表现为登录后被弹回登录页。
 * 2. 页面不该知道「有一个 current-user 缓存」这件事。缓存策略是认证机制的
 *    内部实现，页面只表达「会话已建立」这个业务事实。
 * 3. 新增认证入口（社交登录等）时，只需调一个语义明确的方法。
 *
 * 导出给 verify-email 页用 —— 那里也是「建立会话」的一个入口，
 * 必须与这里共用同一套逻辑。
 */
export function useAuthCacheSync() {
  const queryClient = useQueryClient();

  return {
    /**
     * 会话已建立（login / resetPassword / verifyEmail）。
     *
     * 先 removeQueries 再 ensureQueryData，两步都不能少：
     * - 不 remove：登录前未认证页面的 beforeLoad 已缓存了 null，会被后续的
     *   beforeLoad 命中，把刚登录的用户弹回登录页。
     * - 只 remove 不 ensure：Query 缓存被清空后，下一次 ensureQueryData 要等
     *   导航过去才发请求，白白多一次往返；而 invalidateQueries 在此处无效 ——
     *   它默认只重查 active 的 query，登录页上 current-user 没有活跃订阅。
     */
    async onSignedIn() {
      queryClient.removeQueries({ queryKey: queryKeys.currentUser });
      await queryClient.ensureQueryData({
        queryKey: queryKeys.currentUser,
        queryFn: () => getUserFn(),
        retry: false,
      });
    },

    /**
     * 会话已销毁（logout）。
     *
     * 直接写 null 而非 invalidate：登出后用户停在未认证页面，
     * 没有活跃订阅会去重查，写值是最省事且确定的。
     */
    onSignedOut() {
      queryClient.setQueryData(queryKeys.currentUser, null);
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
      /*
       * 注册 ≠ 登录：跳转到验证码输入页（验证成功后自动登录）。
       *
       * 注意：服务端在「邮箱已存在」时**也走这条路径**（返回同形的响应），
       * 所以这里不能推断“这是新用户”。区分只发生在邮件里（新用户收到验证码，
       * 已注册者收到提醒）—— 详见 register.functions.ts。
       */
      toast.success("验证码已发送，请查收邮箱");
      navigate({
        to: "/auth/verify-email",
        search: { email: data.user.email },
      });
    },
    /*
     * 这里的 onError 只会在**真失败**时触发（限速、网络、配置错误）——
     * 邮箱重复不再走这条路，所以不存在枚举泄漏。文案用 error.message，
     * 它是服务端给的用户可读句子（见 lib/error-messages.ts）。
     */
    onError: (error: Error) => toast.error(error.message),
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
