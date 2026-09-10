/**
 * User-Agent 解析器：提取平台 + 浏览器信息，生成可读设备名。
 *
 * 不依赖第三方库，用简单规则覆盖主流浏览器/平台。
 */

const UA_RULES: { pattern: RegExp; name: string }[] = [
  // iOS
  { pattern: /iPhone/, name: "iPhone" },
  { pattern: /iPad/, name: "iPad" },
  // Android
  { pattern: /Android.*Mobile/, name: "Android Phone" },
  { pattern: /Android/, name: "Android Tablet" },
  // Desktop browsers
  { pattern: /Edg/, name: "Edge" },
  { pattern: /Chrome/, name: "Chrome" },
  { pattern: /Firefox/, name: "Firefox" },
  { pattern: /Safari/, name: "Safari" },
  { pattern: /Opera|OPR/, name: "Opera" },
];

const OS_RULES: { pattern: RegExp; name: string }[] = [
  { pattern: /Windows/, name: "Windows" },
  { pattern: /Mac OS X|macOS/, name: "macOS" },
  { pattern: /Linux/, name: "Linux" },
  { pattern: /Android/, name: "Android" },
  { pattern: /iOS|iPhone|iPad/, name: "iOS" },
];

export interface ParsedUA {
  browser: string;
  os: string;
}

/** 解析 User-Agent，返回浏览器 + 操作系统。 */
export function parseUserAgent(ua: string): ParsedUA {
  const browser =
    UA_RULES.find((r) => r.pattern.test(ua))?.name ?? "Unknown Browser";
  const os = OS_RULES.find((r) => r.pattern.test(ua))?.name ?? "Unknown OS";
  return { browser, os };
}

/** 生成可读设备名：`"Chrome on Windows"`。 */
export function formatDeviceName(ua: string): string {
  const { browser, os } = parseUserAgent(ua);
  return `${browser} on ${os}`;
}

/** 推断设备平台（用于 Device.platform 字段）。 */
export function inferPlatform(
  ua: string,
): "web" | "android" | "ios" | "desktop" {
  if (/iPhone|iPad/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "web";
}
