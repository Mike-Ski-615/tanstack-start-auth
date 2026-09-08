import { getUserIdFromRequest } from "#lib/auth/get-user-id-from-request";
import { defineWebSocketHandler } from "nitro";

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

  open(peer) {
    console.log("[WS] OPEN", peer.id, "userId:", peer.context.userId);
    peer.send("Hello from Nitro WebSocket");
  },

  message(peer, message) {
    const text = message.text();

    console.log("[WS] MESSAGE", text, "userId:", peer.context.userId);

    peer.send(`Echo: ${text}`);
  },

  close(peer, details) {
    console.log("[WS] CLOSE", peer.id, details.code, details.reason);
  },

  error(peer, error) {
    console.error("[WS] ERROR", peer.id, error);
  },
});
