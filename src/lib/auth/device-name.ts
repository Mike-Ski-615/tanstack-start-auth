const UA_RULES: { pattern: RegExp; name: string }[] = [
  { pattern: /CriOS/, name: "Chrome" },
  { pattern: /FxiOS/, name: "Firefox" },
  { pattern: /EdgiOS/, name: "Edge" },

  { pattern: /Edg\//, name: "Edge" },
  { pattern: /OPR\/|Opera/, name: "Opera" },
  { pattern: /Firefox/, name: "Firefox" },

  { pattern: /iPhone/, name: "iPhone" },
  { pattern: /iPad/, name: "iPad" },
  { pattern: /Android.*Mobile/, name: "Android Phone" },
  { pattern: /Android/, name: "Android Tablet" },

  { pattern: /Chrome/, name: "Chrome" },
  { pattern: /Safari/, name: "Safari" },
];

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

export function parseUserAgent(ua: string): ParsedUA {
  const browser = UA_RULES.find((r) => r.pattern.test(ua))?.name ?? "Unknown Browser";
  const os = OS_RULES.find((r) => r.pattern.test(ua))?.name ?? "Unknown OS";
  return { browser, os };
}

export function formatDeviceName(ua: string): string {
  const { browser, os } = parseUserAgent(ua);
  return `${browser} on ${os}`;
}

export function inferPlatform(ua: string): "web" | "android" | "ios" | "desktop" {
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "web";
}
