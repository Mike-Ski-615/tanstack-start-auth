import { defineWebSocketHandler } from "nitro";
import { getUserIdFromRequest } from "#lib/auth/get-user-id-from-request";
import { db } from "#prisma/db";
import type { Char } from "@prisma/orm-postgres/target/codec-types";

export default defineWebSocketHandler({
  async upgrade(request) {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    return {
      context: {
        userId,
      },
    };
  },

  async open(peer) {
    const userId = peer.context.userId as Char<36>;
    const now = new Date().toISOString();

    await db.orm.public.User.where({
      id: userId,
    }).update({
      status: "online",
      connectedAt: now,
      disconnectedAt: undefined,
    });

    console.log(`[WS] ${userId} 上线了`);
  },

  async close(peer, details) {
    const userId = peer.context.userId as Char<36>;
    const now = new Date().toISOString();

    await db.orm.public.User.where({
      id: userId,
    }).update({
      status: "offline",
      disconnectedAt: now,
    });

    console.log(`[WS] ${userId} 下线了 (${details.code})`);
  },

  error(peer, error) {
    console.error("[WS] ERROR", peer.id, error);
  },
});
