/**
 * 会话模块集成测试（文档模式：无状态加密 cookie）。
 *
 * 不依赖数据库：useAppSession 的 update/data/clear 原语
 * 与 cookie 传输边缘在最小请求上下文中验证。
 */
import { describe, expect, test } from "bun:test";

const { inRequest, parseSessionToken } = await import("./server-fn");
const { useAppSession } = await import("../src/lib/session");

const SESSION_COOKIE = "app-session";
const SEVEN_DAYS = 7 * 24 * 60 * 60;

/** 篡改密封载荷：替换末位字符（HMAC 校验必然失败）。 */
function tamper(sealed: string): string {
  const last = sealed[sealed.length - 1];
  return sealed.slice(0, -1) + (last === "A" ? "B" : "A");
}

describe.skipIf(!process.env.SESSION_SECRET)(
  "useAppSession（文档模式）",
  () => {
    test("update 写入会话并下发安全 cookie", async () => {
      const { result, setCookieHeader } = await inRequest(async () => {
        const session = await useAppSession();
        const updated = await session.update({
          userId: "u-1",
          email: "a@b.c",
        });
        return updated.data;
      });

      expect(result).toMatchObject({ userId: "u-1", email: "a@b.c" });

      expect(setCookieHeader).not.toBeNull();
      const attrs = setCookieHeader!.toLowerCase();
      expect(attrs).toContain(`${SESSION_COOKIE}=`);
      expect(attrs).toContain("httponly");
      expect(attrs).toContain("samesite=lax");
      expect(attrs).toContain(`max-age=${SEVEN_DAYS}`);
    });

    test("cookie 跨请求重放 → data 往返", async () => {
      const { setCookieHeader } = await inRequest(async () => {
        const session = await useAppSession();
        await session.update({ userId: "u-2" });
      });
      const sealed = parseSessionToken(setCookieHeader!);

      const { result } = await inRequest(
        async () => {
          const session = await useAppSession();
          return session.data;
        },
        { cookie: `${SESSION_COOKIE}=${sealed}` },
      );

      expect(result).toMatchObject({ userId: "u-2" });
    });

    test("无会话 → data 为空", async () => {
      const { result } = await inRequest(async () => {
        const session = await useAppSession();
        return session.data;
      });

      expect(result.userId).toBeUndefined();
    });

    test("篡改的 cookie → data 为空（解密失败安全降级）", async () => {
      const { setCookieHeader } = await inRequest(async () => {
        const session = await useAppSession();
        await session.update({ userId: "u-3" });
      });
      const sealed = tamper(parseSessionToken(setCookieHeader!));

      const { result } = await inRequest(
        async () => {
          const session = await useAppSession();
          return session.data;
        },
        { cookie: `${SESSION_COOKIE}=${sealed}` },
      );

      expect(result.userId).toBeUndefined();
    });

    test("clear 清空会话并下发过期 cookie", async () => {
      const { setCookieHeader } = await inRequest(async () => {
        const session = await useAppSession();
        await session.update({ userId: "u-4" });
      });
      const sealed = parseSessionToken(setCookieHeader!);

      const { result, setCookieHeader: clearHeader } = await inRequest(
        async () => {
          const session = await useAppSession();
          await session.clear();
          return session.data;
        },
        { cookie: `${SESSION_COOKIE}=${sealed}` },
      );

      expect(result.userId).toBeUndefined();
      expect(clearHeader).not.toBeNull();
      const attrs = clearHeader!.toLowerCase();
      expect(attrs.includes("max-age=0") || attrs.includes("expires=")).toBe(
        true,
      );
    });
  },
);
