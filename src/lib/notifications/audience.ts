/**
 * 通知受众规则 —— 纯函数，服务端与客户端共用同一个实现。
 *
 * ## 为什么要单独一个 module
 *
 * 「谁会收到这条通知」原先有两个实现：服务端的 `resolveRecipients`
 * （见 ./index.ts）和发送页里一行手写的并集表达式 —— 后者的注释写着
 * 「与接口层 resolveRecipients 同一套规则」。两处**今天就已经不等价**：
 *
 * - 前端不知道 `MAX_RECIPIENTS`：界面显示「将发送给 6000 人」，
 *   点下去直接抛 TOO_MANY_RECIPIENTS
 * - 前端算不出「排除发送者」：管理员角色被改成师生后，他会出现在候选
 *   名单里，前端把他算进人数、服务端把他剔掉
 *
 * ## 为什么必须住在这里（而不是 ./index.ts）
 *
 * 规则的另一个调用者是客户端，而 ./index.ts import 了 db（服务端专用）。
 * 放在这个零依赖的叶子里，两边才都能 import —— 与 lib/auth/current-user.ts
 * 同一个道理：seam 放错 module 的代价，就是客户端再抄一份。
 */

import { isManagedRole, type ManagedRole } from "#lib/auth/current-user";

/** 单次发送的收件人上限。防手滑给几万人建行（每人一行）。 */
export const MAX_RECIPIENTS = 5000;

/** 选择发送目标的方式。三者可混用（前提是没勾 all）。 */
export type NotificationTarget = {
  /** 发给全部师生。勾了它，下面两项忽略。 */
  all?: boolean;
  /** 按角色。 */
  roles?: ManagedRole[];
  /** 指定若干用户。 */
  userIds?: string[];
};

/**
 * 候选行 —— 判断受众只需要这两个字段。
 *
 * 允许是**超集**：多给几行不影响结果（规则自己会筛）。所以调用方可以按
 * 目标窄化查询，也可以像发送页那样把手上整份名单直接丢进来。
 */
export type AudienceCandidate = {
  id: string;
  /** 比 ManagedRole 宽 —— 数据库里取出来的是 Role，非受管角色由规则剔除。 */
  role: string;
};

export type Audience = {
  /** 去重后的收件人 id。 */
  recipientIds: string[];
  /**
   * 是否超出 MAX_RECIPIENTS。
   *
   * 刻意**不在这里抛错**：这条规则要同时服务「要 id 列表」的服务端和
   * 「要人数」的发送页预览，而会抛错的规则没法用来渲染。由调用方决定 ——
   * 服务端抛 TOO_MANY_RECIPIENTS，客户端禁用发送按钮并提示。
   */
  overLimit: boolean;
};

/**
 * 从候选行里挑出真正的受众。
 *
 * 规则：
 * - 只有受管角色是受众 —— admin 永不是，无论按角色过滤还是被指名
 * - 发送者自己不是受众（即便他当前恰好是 student/teacher：角色被改过的情况）
 * - 勾了 all 时 roles / userIds 被忽略（与接口层、发送页三处一致）
 * - 多路结果取并集后去重，顺序跟随候选行
 *
 * @param senderId 发送者 id。省略表示不排除任何人 —— 发送页在 currentUser
 *   还没加载出来时会这样调；而「发送者恰好是受管角色」是只有服务端才知道的
 *   情况，数据一到就会传进来。
 */
export function resolveAudience(
  candidates: readonly AudienceCandidate[],
  target: NotificationTarget,
  senderId?: string,
): Audience {
  const wantsAll = target.all === true;
  const wantedRoles = new Set<string>(wantsAll ? [] : (target.roles ?? []));
  const wantedIds = new Set<string>(wantsAll ? [] : (target.userIds ?? []));

  const recipientIds: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    if (!isManagedRole(candidate.role)) continue;
    if (candidate.id === senderId) continue;
    if (!wantsAll && !wantedRoles.has(candidate.role) && !wantedIds.has(candidate.id)) continue;

    seen.add(candidate.id);
    recipientIds.push(candidate.id);
  }

  return { recipientIds, overLimit: recipientIds.length > MAX_RECIPIENTS };
}
