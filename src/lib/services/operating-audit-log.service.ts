import "server-only"

import { db } from "@/lib/db"
import { DEFAULT_ORG_KEY } from "@/lib/services/operating-settings.service"
import {
  AUDIT_PAGE_SIZE,
  AUTOSAVE_ENTITY,
  AUTOSAVE_LABEL,
  type OperatingAuditResponse,
} from "@/lib/ui-data/yuanzhan/operating-commands"

/**
 * 稽核軌跡的讀取面：把 `operating_command_logs` 交給工作台的稽核抽屜。
 *
 * 這張表從 PLN-074 M7 起每一筆成功的命令都有寫，但一直沒有人讀它 —— 抽屜顯示的是
 * 瀏覽器記憶體裡的另一份陣列，重新整理就清空，也看不到另一個席位做了什麼。
 * 「不可刪除」因此只是一句文案。這裡讓抽屜讀真正留下來的那一份。
 *
 * 只讀不寫：這個檔案沒有任何會改動命令紀錄的函式，也不該有。紀錄只在
 * `applyOperatingCommands()` 套用成功之後新增一列。
 *
 * 授權在 route handler（負責人席位）；這裡不重複判斷，但也不接受呼叫端指定 workspace ——
 * 工作台只有一個，從 slug 解析，避免「帶別人的 id 進來」這種路徑存在。
 */
export async function listOperatingAuditLog(options: {
  before?: Date | null
  includeAutosave?: boolean
  limit?: number
}): Promise<OperatingAuditResponse> {
  const workspace = await db.workspace.findUnique({ where: { slug: DEFAULT_ORG_KEY }, select: { id: true } })
  // 還沒有人寫過任何東西：沒有 workspace 就沒有紀錄。讀取不建立資料（ARC-040）。
  if (!workspace) return { rows: [], total: 0, autosaveTotal: 0, nextBefore: null }

  const limit = Math.min(Math.max(options.limit ?? AUDIT_PAGE_SIZE, 1), AUDIT_PAGE_SIZE)
  const autosave = { entity: AUTOSAVE_ENTITY, label: AUTOSAVE_LABEL }
  const scope = {
    workspaceId: workspace.id,
    ...(options.includeAutosave ? {} : { NOT: autosave }),
  }

  const [rows, total, autosaveTotal] = await Promise.all([
    db.operatingCommandLog.findMany({
      where: { ...scope, ...(options.before ? { createdAt: { lt: options.before } } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      // 多取一列用來判斷「還有沒有更舊的」，不必再數一次。
      take: limit + 1,
      select: {
        id: true,
        createdAt: true,
        actorKey: true,
        op: true,
        entity: true,
        label: true,
        detail: true,
        collections: true,
        changeCount: true,
        riskLevel: true,
      },
    }),
    db.operatingCommandLog.count({ where: scope }),
    db.operatingCommandLog.count({ where: { workspaceId: workspace.id, ...autosave } }),
  ])

  const page = rows.slice(0, limit)
  return {
    // clientRefHash 與 actorProfileId 刻意不出去：前者是冪等鍵，後者是內部主鍵，
    // 抽屜要的是「誰」的席位字串。
    rows: page.map((row) => ({
      id: row.id,
      at: row.createdAt.toISOString(),
      actor: row.actorKey ?? "",
      op: row.op,
      entity: row.entity,
      label: row.label,
      detail: row.detail ?? "",
      collections: row.collections,
      changeCount: row.changeCount,
      riskLevel: row.riskLevel,
    })),
    total,
    autosaveTotal,
    nextBefore: rows.length > limit ? page[page.length - 1].createdAt.toISOString() : null,
  }
}
