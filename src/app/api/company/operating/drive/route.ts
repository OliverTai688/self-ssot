import { NextResponse, type NextRequest } from "next/server"

import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { requireUser } from "@/lib/services/auth.service"
import { resolveWorkbenchRowId } from "@/lib/services/operating-commands.service"
import { ProjectCapabilityError } from "@/lib/services/project-capability.service"
import {
  ProjectDriveIndexingBlockedError,
  ProjectDriveNotFoundError,
  ProjectDriveRuleError,
  createProjectFolder,
  ensureProjectRootAndInbox,
  fileAssetIntoFolder,
  listFolderContents,
  listProjectFolderTree,
  moveProjectFolder,
  renameProjectFolder,
  resolveProjectWorkspaceId,
  setProjectFolderVisibility,
  softDeleteProjectFolder,
  type DriveFolderKind,
  type DriveVisibility,
} from "@/lib/services/project-drive.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" }

/**
 * 工作台手上只有業務 id（`PRJ-…`／`FLD-…`），主鍵由寫入管線的同一條規則推導。
 * 本來就是 UUID 的值原樣通過，所以直接帶主鍵的呼叫端不受影響。
 */
const projectKey = (value: string) => (value ? resolveWorkbenchRowId("projects", value) : "")
const folderKey = (value: string) => (value ? resolveWorkbenchRowId("folders", value) : "")

function errorResponse(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status, headers: noStoreHeaders })
}

/**
 * 專案雲端硬碟的資料夾樹 BFF（`PLN-075` S2，整合決策 §5「檔案」分頁）。
 *
 * 三個動詞，與既有 `uploads/route.ts` 同一個形狀：
 *   - `GET`    列出樹（含每夾檔案計數）／列出某夾內容
 *   - `POST`   建立資料夾 ｜ `action:"bootstrap"` 冪等建立 ROOT ＋ INBOX
 *   - `PATCH`  改名 ｜ 搬移 ｜ 改可見性 ｜ 軟刪 ｜ 歸檔資產
 *
 * 一條不可妥協的規則：**`workspaceId` 一律伺服器端解析**（OD-C）。
 * 它是授權的範圍本身，讓呼叫端指定等於讓呼叫端自己挑租戶。
 * 前端若真的送了這個欄位，這裡不是忽略它而是**當場退 400** ——
 * 靜靜忽略會讓呼叫端以為自己指定成功了，於是在別的地方也照送。
 */
type Actor = { profileId: string }

async function resolveActor(): Promise<Actor | NextResponse> {
  const user = await requireUser()
  if (readOperatingDataSource() !== "database") {
    return errorResponse(403, "source_not_database", "這個環境是預覽模式，專案硬碟不會寫入。")
  }
  return { profileId: user.id }
}

function isResponse(value: Actor | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

/** 前端送 workspaceId 一律視為錯誤，不是「可被忽略的多餘欄位」。 */
function rejectClientWorkspace(body: Record<string, unknown> | null) {
  if (body && "workspaceId" in body) {
    return errorResponse(
      400,
      "workspace_id_not_accepted",
      "workspaceId 由伺服器解析，不接受前端指定。"
    )
  }
  return null
}

function readString(body: Record<string, unknown> | null, key: string): string {
  const value = body?.[key]
  return typeof value === "string" ? value.trim() : ""
}

function handleError(scope: string, error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return errorResponse(401, "unauthenticated", "請先登入。")
  }
  if (error instanceof ProjectDriveIndexingBlockedError) {
    return errorResponse(409, error.code, error.message)
  }
  if (error instanceof ProjectDriveNotFoundError) {
    return errorResponse(404, "not_found", error.message)
  }
  if (error instanceof ProjectDriveRuleError) {
    // 規則衝突（撞名、環、不得放寬）是 409；輸入本身不合法是 400。
    const conflictCodes = [
      "duplicate_name",
      "cycle",
      "noop",
      "folder_not_empty",
      "ancestor_visibility_floor",
      "kind_forbids_client_visible",
      "system_folder_immutable",
      "cross_project_move",
      "cross_project_parent",
      "cross_project_filing",
      "cross_workspace_filing",
      "asset_not_ready",
      "asset_deleted",
      "folder_deleted",
      "parent_deleted",
      "bad_state",
    ]
    return errorResponse(conflictCodes.includes(error.code) ? 409 : 400, error.code, error.message)
  }
  // capability 服務（Wave 2a）的兩種 code 要分開：404 與 403 給的是不同的下一步。
  // 「專案不存在」在 assert 路徑才回 404 —— 呼叫端已經過 requireUser()。
  if (error instanceof ProjectCapabilityError) {
    return error.code === "project_not_found"
      ? errorResponse(404, "not_found", error.message)
      : errorResponse(403, "forbidden", error.message)
  }
  // 名稱比對是最後一道防線（capability 服務換了型別時仍然**預設拒絕**，不是放行）。
  const name = (error as { name?: string })?.name ?? ""
  if (/Capability|Forbidden|Unauthorized|Permission/i.test(name)) {
    return errorResponse(403, "forbidden", "沒有權限操作這個專案的檔案。")
  }
  console.error("[api/company/operating/drive] " + scope + " failed:", error)
  return errorResponse(500, scope + "_failed", "操作失敗。")
}

/**
 * `GET ?projectId=…`            → 整棵樹 ＋ 每夾檔案計數 ＋ 待整理數
 * `GET ?projectId=…&folderId=…` → 那一夾的檔案清單 ＋ 索引政策
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await resolveActor()
    if (isResponse(actor)) return actor

    const params = request.nextUrl.searchParams
    if (params.has("workspaceId")) {
      return errorResponse(
        400,
        "workspace_id_not_accepted",
        "workspaceId 由伺服器解析，不接受前端指定。"
      )
    }
    const projectId = projectKey(params.get("projectId") ?? "")
    if (!projectId) return errorResponse(400, "missing_project_id", "缺少專案代號。")

    const folderId = folderKey(params.get("folderId") ?? "")
    if (folderId) {
      const contents = await listFolderContents(actor.profileId, folderId)
      return NextResponse.json(contents, { headers: noStoreHeaders })
    }

    const tree = await listProjectFolderTree(actor.profileId, projectId)
    return NextResponse.json(tree, { headers: noStoreHeaders })
  } catch (error) {
    return handleError("list_tree", error)
  }
}

/**
 * `POST { projectId, action:"bootstrap" }` → 冪等建立 ROOT ＋ INBOX
 * `POST { projectId, name, parentId?, kind?, visibility? }` → 建立資料夾
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await resolveActor()
    if (isResponse(actor)) return actor

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const rejected = rejectClientWorkspace(body)
    if (rejected) return rejected

    const projectId = projectKey(readString(body, "projectId"))
    if (!projectId) return errorResponse(400, "missing_project_id", "缺少專案代號。")

    if (body?.action === "bootstrap") {
      // workspaceId 在服務層解析，bootstrap 只是把它接過去。
      const workspaceId = await resolveProjectWorkspaceId(actor.profileId, projectId)
      const result = await ensureProjectRootAndInbox(projectId, workspaceId)
      return NextResponse.json(result, { headers: noStoreHeaders })
    }

    const folder = await createProjectFolder(actor.profileId, projectId, {
      parentId: folderKey(readString(body, "parentId")) || null,
      name: readString(body, "name"),
      kind: (typeof body?.kind === "string" ? body.kind : undefined) as DriveFolderKind | undefined,
      visibility: (typeof body?.visibility === "string" ? body.visibility : null) as
        | DriveVisibility
        | null,
      note: readString(body, "note") || null,
      space: body?.space === "personal" ? "personal" : "team",
    })
    return NextResponse.json({ folder }, { status: 201, headers: noStoreHeaders })
  } catch (error) {
    return handleError("create_folder", error)
  }
}

/**
 * 一個 `PATCH`，五個 `action`。刻意不切成五條路由：
 * 它們共用同一套授權、同一套錯誤分類、同一棵樹的鎖，分開只會讓四份重複。
 *
 * `action`：`rename` ｜ `move` ｜ `visibility` ｜ `delete` ｜ `file`
 */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await resolveActor()
    if (isResponse(actor)) return actor

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const rejected = rejectClientWorkspace(body)
    if (rejected) return rejected

    const action = readString(body, "action")
    const folderId = folderKey(readString(body, "folderId"))

    if (action === "file") {
      const assetId = readString(body, "assetId")
      if (!assetId || !folderId) {
        return errorResponse(400, "missing_ids", "缺少檔案或資料夾代號。")
      }
      const result = await fileAssetIntoFolder(actor.profileId, assetId, folderId)
      return NextResponse.json(result, { headers: noStoreHeaders })
    }

    if (!folderId) return errorResponse(400, "missing_folder_id", "缺少資料夾代號。")

    if (action === "rename") {
      const folder = await renameProjectFolder(actor.profileId, folderId, readString(body, "name"))
      return NextResponse.json({ folder }, { headers: noStoreHeaders })
    }
    if (action === "move") {
      const parentId = folderKey(readString(body, "parentId"))
      if (!parentId) return errorResponse(400, "missing_parent_id", "缺少目標資料夾。")
      const result = await moveProjectFolder(actor.profileId, folderId, parentId)
      return NextResponse.json(result, { headers: noStoreHeaders })
    }
    if (action === "visibility") {
      const visibility = readString(body, "visibility") as DriveVisibility
      const result = await setProjectFolderVisibility(actor.profileId, folderId, visibility)
      return NextResponse.json(result, { headers: noStoreHeaders })
    }
    if (action === "delete") {
      const result = await softDeleteProjectFolder(actor.profileId, folderId)
      return NextResponse.json(result, { headers: noStoreHeaders })
    }

    return errorResponse(400, "unknown_action", "不認得這個動作。")
  } catch (error) {
    return handleError("patch_folder", error)
  }
}
