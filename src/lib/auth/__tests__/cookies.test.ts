import "#test/mock-server-env";
import { describe, it, expect } from "vitest";
import {
  SESSION_COOKIE_NAME,
  DEVICE_COOKIE_NAME,
  setSessionCookie,
  getSessionToken,
  clearSessionCookie,
  setDeviceCookie,
  getDeviceKey,
  clearDeviceCookie,
} from "#lib/auth/session";
import { withRequest } from "#test/helpers";

/**
 * cookie 读写工具（session.ts）。
 *
 * 注意文件名：session.test.ts 已被 validateSession 的测试占用，
 * 本文件专测 cookie 层。
 *
 * 这两个 cookie 是整个认证的入口：session-token 是凭证，device_key 是
 * 设备身份。此前只被 serverFn 测试间接经过，没有直接用例 —— 而它们的
 * 名字、存取、清除是四条登录路径共同依赖的契约。
 */

describe("cookie 名", () => {
  it("与服务端约定一致（改动会登出所有已登录用户）", () => {
    expect(SESSION_COOKIE_NAME).toBe("session-token");
    expect(DEVICE_COOKIE_NAME).toBe("device_key");
  });
});

describe("session-token cookie", () => {
  /**
   * 注意 set / get 是分开的两次 withRequest：setCookie 写在**响应**上，
   * getCookie 读**请求**头，同一次请求里写完读不到是 HTTP 语义，不是 bug。
   * set 的返回值（是否真的写了）由「两个都设」一例单独断言。
   */
  it("写入不抛错（写的是响应头）", async () => {
    await expect(withRequest({}, () => setSessionCookie("tok-abc"))).resolves.toBeUndefined();
  });

  it("请求带 cookie 时能读回", async () => {
    const v = await withRequest({ cookies: { [SESSION_COOKIE_NAME]: "tok-abc" } }, () =>
      getSessionToken(),
    );
    expect(v).toBe("tok-abc");
  });

  it("未设置时返回 undefined", async () => {
    expect(await withRequest({}, () => getSessionToken())).toBeUndefined();
  });

  it("清除不抛错（写的同样是响应头）", async () => {
    await expect(withRequest({}, () => clearSessionCookie())).resolves.toBeUndefined();
  });

  it("只读自己那个 cookie，不受 device_key 影响", async () => {
    const v = await withRequest({ cookies: { [DEVICE_COOKIE_NAME]: "dev-1" } }, () =>
      getSessionToken(),
    );
    expect(v).toBeUndefined();
  });
});

describe("device_key cookie", () => {
  it("写入不抛错（写的是响应头）", async () => {
    await expect(withRequest({}, () => setDeviceCookie("dev-abc"))).resolves.toBeUndefined();
  });

  it("请求带 cookie 时能读回", async () => {
    const v = await withRequest({ cookies: { [DEVICE_COOKIE_NAME]: "dev-abc" } }, () =>
      getDeviceKey(),
    );
    expect(v).toBe("dev-abc");
  });

  it("未设置时返回 undefined", async () => {
    expect(await withRequest({}, () => getDeviceKey())).toBeUndefined();
  });

  it("清除不抛错（写的同样是响应头）", async () => {
    await expect(withRequest({}, () => clearDeviceCookie())).resolves.toBeUndefined();
  });
});

describe("两个 cookie 互不干扰", () => {
  it("读取互不依赖：清除 device_key 后仍能读 session-token", async () => {
    const v = await withRequest(
      {
        cookies: {
          [SESSION_COOKIE_NAME]: "tok",
          [DEVICE_COOKIE_NAME]: "dev",
        },
      },
      () => {
        clearDeviceCookie();
        return getSessionToken();
      },
    );
    expect(v).toBe("tok");
  });

  it("读取互不依赖：清除 session-token 后仍能读 device_key", async () => {
    const v = await withRequest(
      {
        cookies: {
          [SESSION_COOKIE_NAME]: "tok",
          [DEVICE_COOKIE_NAME]: "dev",
        },
      },
      () => {
        clearSessionCookie();
        return getDeviceKey();
      },
    );
    expect(v).toBe("dev");
  });

  it("两个都带时各自读到自己那个", async () => {
    const r = await withRequest(
      {
        cookies: {
          [SESSION_COOKIE_NAME]: "tok-x",
          [DEVICE_COOKIE_NAME]: "dev-y",
        },
      },
      () => ({ t: getSessionToken(), d: getDeviceKey() }),
    );
    expect(r).toEqual({ t: "tok-x", d: "dev-y" });
  });
});
