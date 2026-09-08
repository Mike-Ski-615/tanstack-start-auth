// src/client.tsx

import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

const ws = new WebSocket("ws://localhost:3000/ws");

ws.addEventListener("open", () => {
  console.log("[WS] Connected");
});

ws.addEventListener("message", (event) => {
  console.log("[WS] Received:", event.data);
});

ws.addEventListener("close", (event) => {
  console.log("[WS] Closed:", event.code, event.reason);
});

ws.addEventListener("error", (error) => {
  console.error("[WS] Error:", error);
});

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);
