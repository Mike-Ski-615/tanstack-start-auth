import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    nitro({
      preset: "bun",
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  environments: {
    ssr: { build: { rollupOptions: { input: "./src/server.ts" } } },
  },
});
