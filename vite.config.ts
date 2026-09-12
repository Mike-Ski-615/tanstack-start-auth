import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { visualizer } from "rollup-plugin-visualizer";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { nitro } from "nitro/vite";

const viz = visualizer({
  filename: "./stats-client.html",
  template: "treemap",
  gzipSize: true,
  brotliSize: true,
  open: false,
});

const vizPlugins = (Array.isArray(viz) ? viz : [viz]).map((p) => ({
  ...p,
  // 只在 client 环境出图：vite build 会跑三次打包（client / ssr / nitro）。
  // 不加这个限定，nitro 的服务端打包也会跑 visualizer 并覆盖同名文件。
  applyToEnvironment: (env: { name: string }) => env.name === "client",
}));

export default defineConfig({
  server: {
    port: 3000,
  },

  plugins: [
    devtools({
      consolePiping: { enabled: false },
    }),

    ...vizPlugins,

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
    ssr: {
      build: {
        rollupOptions: {
          input: "./src/server.ts",
        },
      },
    },
  },
});
