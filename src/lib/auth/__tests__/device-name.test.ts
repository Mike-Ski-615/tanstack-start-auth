import { describe, it, expect } from "vitest";
import { parseUserAgent, formatDeviceName, inferPlatform } from "#lib/auth/device-name";

/**
 * User-Agent 解析。
 *
 * 这组测试的价值在于**规则顺序**：解析用「首个匹配胜出」，所以顺序错了
 * 就会静默给出错误结果 —— 不报错、不崩溃，只是设备名显示成别的。
 * 实测踩过的坑：
 *   - iPhone 显示成「iPhone on macOS」（/Mac OS X/ 抢在 /iOS/ 前，
 *     而苹果移动端 UA 含 "like Mac OS X"）
 *   - Android 显示成「Android Phone on Linux」（/Linux/ 抢在 /Android/ 前）
 *   - Opera 显示成 Chrome（/OPR/ 抢在 /Chrome/ 后）
 */

// ── 真实 UA 样本 ──

const UA = {
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  firefoxWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  operaWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
  chromeLinux:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  chromeOS:
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",

  iPhone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  iPad: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  chromeIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
  firefoxIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15",

  androidPhone:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  firefoxAndroid: "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0",
};

describe("parseUserAgent — 操作系统（规则顺序敏感）", () => {
  it("苹果移动端识别为 iOS，不是 macOS", () => {
    // 回归：这两个 UA 都含 "like Mac OS X"，/Mac OS X/ 若排在 /iOS/ 前会抢走
    expect(parseUserAgent(UA.iPhone).os).toBe("iOS");
    expect(parseUserAgent(UA.iPad).os).toBe("iOS");
    expect(parseUserAgent(UA.chromeIOS).os).toBe("iOS");
  });

  it("Android 识别为 Android，不是 Linux", () => {
    // 回归：Android UA 含 "Linux"，/Linux/ 若排在 /Android/ 前会抢走
    expect(parseUserAgent(UA.androidPhone).os).toBe("Android");
    expect(parseUserAgent(UA.androidTablet).os).toBe("Android");
    expect(parseUserAgent(UA.firefoxAndroid).os).toBe("Android");
  });

  it("桌面平台识别正确", () => {
    expect(parseUserAgent(UA.chromeWindows).os).toBe("Windows");
    expect(parseUserAgent(UA.safariMac).os).toBe("macOS");
    expect(parseUserAgent(UA.chromeLinux).os).toBe("Linux");
    expect(parseUserAgent(UA.chromeOS).os).toBe("ChromeOS");
  });

  it("无法识别时返回 Unknown OS", () => {
    expect(parseUserAgent("").os).toBe("Unknown OS");
    expect(parseUserAgent("totally-not-a-ua").os).toBe("Unknown OS");
  });
});

describe("parseUserAgent — 浏览器（规则顺序敏感）", () => {
  it("Edge 不被误认成 Chrome（UA 同时含两者标识）", () => {
    expect(parseUserAgent(UA.edgeWindows).browser).toBe("Edge");
  });

  it("Opera 不被误认成 Chrome（UA 同时含两者标识）", () => {
    expect(parseUserAgent(UA.operaWindows).browser).toBe("Opera");
  });

  it("iOS 上的 Chrome 识别为 Chrome，不是 iPhone/Safari", () => {
    expect(parseUserAgent(UA.chromeIOS).browser).toBe("Chrome");
  });

  it("iOS 上的 Firefox 识别为 Firefox", () => {
    expect(parseUserAgent(UA.firefoxIOS).browser).toBe("Firefox");
  });

  it("Android 上的 Firefox 识别为 Firefox，不是 Android Phone", () => {
    // 回归：Firefox for Android 的 UA 含 "Android ... Mobile"
    expect(parseUserAgent(UA.firefoxAndroid).browser).toBe("Firefox");
  });

  it("纯 Chrome / Safari / Firefox 正常识别", () => {
    expect(parseUserAgent(UA.chromeWindows).browser).toBe("Chrome");
    expect(parseUserAgent(UA.safariMac).browser).toBe("Safari");
    expect(parseUserAgent(UA.firefoxWindows).browser).toBe("Firefox");
  });

  it("移动设备类型识别", () => {
    expect(parseUserAgent(UA.iPhone).browser).toBe("iPhone");
    expect(parseUserAgent(UA.iPad).browser).toBe("iPad");
    expect(parseUserAgent(UA.androidPhone).browser).toBe("Android Phone");
    expect(parseUserAgent(UA.androidTablet).browser).toBe("Android Tablet");
  });

  it("无法识别时返回 Unknown Browser", () => {
    expect(parseUserAgent("").browser).toBe("Unknown Browser");
  });
});

describe("formatDeviceName", () => {
  it("拼成「浏览器 on 系统」", () => {
    expect(formatDeviceName(UA.chromeWindows)).toBe("Chrome on Windows");
    expect(formatDeviceName(UA.edgeWindows)).toBe("Edge on Windows");
  });

  it("移动端名字正确（修复前是 iPhone on macOS）", () => {
    expect(formatDeviceName(UA.iPhone)).toBe("iPhone on iOS");
    expect(formatDeviceName(UA.androidPhone)).toBe("Android Phone on Android");
  });

  it("未知 UA 不抛错", () => {
    expect(formatDeviceName("")).toBe("Unknown Browser on Unknown OS");
  });
});

describe("inferPlatform", () => {
  it("iPhone / iPad → ios", () => {
    expect(inferPlatform(UA.iPhone)).toBe("ios");
    expect(inferPlatform(UA.iPad)).toBe("ios");
    expect(inferPlatform(UA.chromeIOS)).toBe("ios");
  });

  it("Android → android", () => {
    expect(inferPlatform(UA.androidPhone)).toBe("android");
    expect(inferPlatform(UA.androidTablet)).toBe("android");
    expect(inferPlatform(UA.firefoxAndroid)).toBe("android");
  });

  it("桌面 → web", () => {
    expect(inferPlatform(UA.chromeWindows)).toBe("web");
    expect(inferPlatform(UA.safariMac)).toBe("web");
    expect(inferPlatform(UA.chromeLinux)).toBe("web");
  });

  it("空 / 垃圾 UA → web（兜底不抛错）", () => {
    expect(inferPlatform("")).toBe("web");
    expect(inferPlatform("junk")).toBe("web");
  });
});
