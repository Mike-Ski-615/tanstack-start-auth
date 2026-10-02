import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// 运行时走 Neon 池化连接；CLI 迁移走 DIRECT_URL（见 prisma.config.ts）。
const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"]!,
});

export const prisma = new PrismaClient({ adapter });
