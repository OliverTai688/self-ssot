import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

let databaseDisposal: Promise<void> | null = null

/**
 * Process-shutdown/test seam for callers that own the database lifecycle.
 * PrismaPg receives an external pg Pool, so PrismaClient.$disconnect() alone
 * does not close every socket. Runtime request paths must never call this.
 */
export function disposeDatabaseConnections(): Promise<void> {
  const target = connectionString ? new URL(connectionString) : null
  const loopbackTarget =
    target?.hostname === "127.0.0.1" || target?.hostname === "::1"
  if (
    process.env.PERSONAL_OS_ALLOW_DATABASE_POOL_DISPOSAL !==
      "self_created_disposable" ||
    !loopbackTarget
  ) {
    throw new Error(
      "Database pool disposal is limited to an explicitly owned loopback disposable target.",
    )
  }

  databaseDisposal ??= (async () => {
    await db.$disconnect()
    await pool.end()
  })()

  return databaseDisposal
}
