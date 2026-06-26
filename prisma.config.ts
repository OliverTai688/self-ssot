import { defineConfig } from "prisma/config"
import { config } from "dotenv"

// Load .env.local first (Next.js convention), then fall back to .env
config({ path: ".env.local" })
config({ path: ".env" })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_DATABASE_URL"] || process.env["DATABASE_URL"]!,
  },
})

