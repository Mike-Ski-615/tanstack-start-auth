/**
 * User-Agent 解析器：提取平台 + 浏览器信息，生成可读设备名。
 *
 * 不依赖第三方库，用简单规则覆盖主流浏览器/平台。
 *
 * ⚠️ 规则数组是「首个匹配胜出」，所以**顺序即优先级**：越具体的规则必须
 * 排在越靠前。这里曾经踩过 —— `/Mac OS X/` 排在 `/iOS/` 前，而 iPhone 的
 * UA 里含 "like Mac OS X"，于是 iPhone 被识别成 macOS；`/Linux/` 排在
 * `/Android/` 前，Android 的 UA 含 "Linux"，于是被识别成 Linux。
 * 改动下面任何一条时，请同时确认它不会抢走后面规则的目标。
 */

/**
 * 浏览器规则，**从具体到宽泛**。
 *
 * 关键顺序：
 * - `Edg`（Edge）必须在 `Chrome` 前 —— Edge 的 UA 同时含 Chrome
 * - `OPR|Opera` 必须在 `Chrome` 前 —— Opera 的 UA 同时含 Chrome
 * - `CriOS` / `FxiOS` 必须在 `Safari` 前 —— iOS 上的 Chrome/Firefox UA 含 Safari
 * - `FxiOS` / `Firefox` 在 `Android` 前 —— Firefox for Android 的 UA 含 Android
 */
const UA_RULES: { pattern: RegExp; name: string }[] = [
  // ── 移动端专属标识（最具体，必须最先）──
  // iOS 上的第三方浏览器：UA 里同时带 Safari 标识，且带各自的前缀
  { pattern: /CriOS/, name: "Chrome" },
  { pattern: /FxiOS/, name: "Firefox" },
  { pattern: /EdgiOS/, name: "Edge" },

  // ── 桌面端「伪装成 Chrome」的浏览器 ──
  { pattern: /Edg\//, name: "Edge" },
  { pattern: /OPR\/|Opera/, name: "Opera" },
  { pattern: /Firefox/, name: "Firefox" }, // 桌面 Firefox（Android 版已在上面被 FxiOS 处理，此处兜底）

  // ── 设备类型（在通用浏览器之前，避免被 Chrome/Safari 抢走）──
  { pattern: /iPhone/, name: "iPhone" },
  { pattern: /iPad/, name: "iPad" },
  { pattern: /Android.*Mobile/, name: "Android Phone" },
  { pattern: /Android/, name: "Android Tablet" },

  // ── 通用浏览器（最后）──
  { pattern: /Chrome/, name: "Chrome" },
  { pattern: /Safari/, name: "Safari" },
];

/**
 * 操作系统规则，**从具体到宽泛**。
 *
 * 关键顺序：
 * - `iPhone|iPad|iOS` 必须在 `Mac OS X` 前 —— 苹果移动端 UA 含 "like Mac OS X"
 * - `Android` 必须在 `Linux` 前 —— Android UA 含 "Linux"
 */
const OS_RULES: { pattern: RegExp; name: string }[] = [
  { pattern: /iPhone|iPad|iOS/, name: "iOS" },
  { pattern: /Android/, name: "Android" },
  { pattern: /Windows/, name: "Windows" },
  { pattern: /CrOS/, name: "ChromeOS" },
  { pattern: /Mac OS X|macOS/, name: "macOS" },
  { pattern: /Linux/, name: "Linux" },
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
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "web";
}
