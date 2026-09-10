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
