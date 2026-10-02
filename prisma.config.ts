import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/prisma/schema.prisma",

  // CLI（migrate / db push / introspect）走 Neon 直连，绕开 PgBouncer。
  datasource: {
    url: env("DIRECT_URL"),
  },
});
