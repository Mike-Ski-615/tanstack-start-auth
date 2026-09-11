import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    devtools({
      /*
       * 关掉「服务端日志管道到浏览器控制台」。
       *
       * 这个功能靠一条 SSE 长连接（/__tsd/console-pipe/sse），而它注入的
       * 客户端代码在 onerror 里什么都没做 —— 没 close、也没退避：
       *
       *     var eventSource = new EventSource('/__tsd/console-pipe/sse');
       *     eventSource.onerror = function() {  };
       *
       * 而 EventSource 是浏览器原生 API、自带无限自动重连（默认约 3s，无次数
       * 上限，只有显式 close() 才停）。于是**只要服务器一停**，开着的页面就
       * 会不停地重连，控制台里刷满请求。
       *
       * 代价：浏览器控制台里看不到带 [Server] 前缀的服务端日志了 ——
       * 终端里仍然有完整输出（包括报错），所以损失很小。
       */
      consolePiping: { enabled: false },
    }),
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
});
