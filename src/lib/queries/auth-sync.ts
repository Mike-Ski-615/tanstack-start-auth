// src/lib/queries/auth-sync.ts
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "#lib/query-keys";
import { currentUserQueryOptions } from "#lib/queries/current-user";

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
      await queryClient.ensureQueryData(currentUserQueryOptions);
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
