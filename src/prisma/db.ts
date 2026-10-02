import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "#prisma/schema.d";
import schemaJson from "#prisma/schema.json" with { type: "json" };

export const db = postgres<Contract>({
  contractJson: schemaJson,
  url: process.env["DATABASE_URL"]!,
});
