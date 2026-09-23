import { NextResponse, type NextRequest } from "next/server"

import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { requireUser } from "@/lib/services/auth.service"
import {
  OperatingConflictError,
  applyOperatingCommands,
  readOperatingVersion,
} from "@/lib/services/operating-commands.service"
import {
  MAX_CHANGES_PER_COMMAND,
  MAX_COMMANDS_PER_BATCH,
  type CommandBatchRequest,
  type OperatingCommand,
} from "@/lib/ui-data/yuanzhan/operating-commands"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" }

type ErrorCode =
  | "unauthenticated"
  | "no_seat"
  | "source_not_database"
  | "invalid_input"
  | "commands_route_failed"

function errorResponse(status: number, code: ErrorCode, error: string) {
  return NextResponse.json({ error, code }, { status, headers: noStoreHeaders })
}

function parseBody(body: unknown): CommandBatchRequest | null {
  if (!body || typeof body !== "object") return null
  const { baseVersion, commands } = body as Record<string, unknown>

  if (typeof baseVersion !== "number" || !Number.isInteger(baseVersion) || baseVersion < 0) return null
  if (!Array.isArray(commands) || commands.length === 0 || commands.length > MAX_COMMANDS_PER_BATCH) return null

  for (const command of commands) {
    if (!command || typeof command !== "object") return null
    const { clientRef, op, ent, label, changes } = command as Record<string, unknown>
    if (typeof clientRef !== "string" || clientRef.length === 0 || clientRef.length > 64) return null
    if (op !== "create" && op !== "update" && op !== "delete") return null
    if (typeof ent !== "string" || typeof label !== "string") return null
    if (!Array.isArray(changes) || changes.length === 0 || changes.length > MAX_CHANGES_PER_COMMAND) return null

    for (const change of changes) {
      if (!change || typeof change !== "object") return null
      const { collection, id, op: changeOp } = change as Record<string, unknown>
      if (typeof collection !== "string" || typeof id !== "string" || id.length === 0) return null
      if (changeOp !== "create" && changeOp !== "update" && changeOp !== "delete") return null
    }
  }

  return { baseVersion, commands: commands as OperatingCommand[] }
}

/**
 * 營運工作台的寫入 BFF（ARC-042 §5）。
 *
 * 工作台跑在 shadow DOM 裡，用得到的是網址而不是 server action —— 與既有的
 * /api/company/settings 同一個理由，所以沿用同一個形狀。
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const seat = resolveYuanzhanSeat(user.email)
    if (!seat) {
      return errorResponse(403, "no_seat", "這個帳號沒有營運工作台席位。")
    }

    // 前端在 prototype 模式本來就不會送；這裡是第二道，防的是直接打 API。
    if (readOperatingDataSource() !== "database") {
      return errorResponse(403, "source_not_database", "這個環境的營運工作台是預覽模式，不接受寫入。")
    }

    const parsed = parseBody(await request.json().catch(() => null))
    if (!parsed) {
      return errorResponse(400, "invalid_input", "指令格式不正確。")
    }

    const result = await applyOperatingCommands(user, seat, parsed.baseVersion, parsed.commands)
    return NextResponse.json(result, { headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof OperatingConflictError) {
      // 另一個席位先寫了。回傳現況版本，讓前端保留本地未送出的內容並顯示差異。
      return NextResponse.json(
        { code: "version_conflict", version: error.version },
        { status: 409, headers: noStoreHeaders },
      )
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse(401, "unauthenticated", "請先登入。")
    }
    console.error("[api/company/operating/commands] POST failed:", error)
    return errorResponse(500, "commands_route_failed", "寫入失敗。")
  }
}

/** 前端啟動時取一次目前版本，避免第一次送出就撞 409。 */
export async function GET() {
  try {
    const user = await requireUser()
    const seat = resolveYuanzhanSeat(user.email)
    if (!seat) {
      return errorResponse(403, "no_seat", "這個帳號沒有營運工作台席位。")
    }

    return NextResponse.json(
      { version: await readOperatingVersion(), dataSource: readOperatingDataSource() },
      { headers: noStoreHeaders },
    )
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse(401, "unauthenticated", "請先登入。")
    }
    console.error("[api/company/operating/commands] GET failed:", error)
    return errorResponse(500, "commands_route_failed", "版本讀取失敗。")
  }
}
