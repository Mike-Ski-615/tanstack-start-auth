/**
 * WebSocket 关闭码 — 服务端 kick 与客户端分支共用的唯一真源。
 *
 * 叶子模块：零依赖，服务端（ws-registry）与客户端（use-ws）都能安全 import。
 * 不能放在 lib/auth/ws-registry.ts —— 那里持有 peer 引用与 Map，
 * 客户端引入会把服务端依赖拖进浏览器包。
 *
 * 见 CONTEXT.md「WS Close Codes」。
 */
export const WS_CLOSE_SESSION_REPLACED = 4001;
export const WS_CLOSE_ALL_SESSIONS_REVOKED = 4002;

/**
 * 正常关闭（用户主动登出）。客户端不提示、不重连、不跳转 ——
 * 登出的 UI 反馈由 logout mutation 自己负责。
 *
 * 用 1000 而非 4001：若复用 SESSION_REPLACED，用户自己点登出会收到
 * 「账号在另一设备登录」的提示，且 use-ws 的 4001 分支会抢先跳到登录页，
 * 与 logout 的 "跳首页" 冲突。
 */
export const WS_CLOSE_NORMAL = 1000;
