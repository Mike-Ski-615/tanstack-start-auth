// src/client.tsx

import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

const ws = new WebSocket("ws://localhost:3000/ws");

ws.addEventListener("open", () => {
  console.log("Connected!");
});

ws.addEventListener("message", (event) => {
  console.log("Received:", event.data);
});

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);
