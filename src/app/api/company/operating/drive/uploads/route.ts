import { NextResponse, type NextRequest } from "next/server"

import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { requireUser } from "@/lib/services/auth.service"
import { resolveWorkbenchRowId } from "@/lib/services/operating-commands.service"
import { ProjectCapabilityError } from "@/lib/services/project-capability.service"
import {
  ProjectDriveIndexingBlockedError,
  ProjectDriveNotFoundError,
  ProjectDriveRuleError,
  createProjectDriveUpload,
  failProjectDriveAsset,
  finalizeProjectDriveAsset,
  resolveProjectDriveDownloadUrl,
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
 * 專案硬碟的 bytes 管線。**刻意與 `../../uploads/route.ts` 同形**：
 * `POST` 換預簽網址（列先建）、`PATCH` finalize（伺服器 `headObject()` 核對）、
 * `GET` 換短命下載網址（先查 DB 這一列屬不屬於這個專案再簽）。
 *
 * 沒有另造一套：bytes 直接在瀏覽器與 R2 之間傳，不經過這台伺服器
 * （Vercel 的 body 上限約 4.5 MB，而且中轉會丟掉 R2 出口免費的優勢）。
 *
 * 與既有那條路的差別只有兩點：
 *   1. 授權看專案 capability（`drive:write` / `drive:read`），不是席位；
 *   2. key 走 `operating/{workspaceId}/project/{projectId}/{yyyy-mm}/{uuid}{ext}`。
 *      資料夾路徑與原檔名**都不進 key** —— R2 沒有 server-side rename，
 *      而中文／全形檔名在 SigV4 會變成查不出原因的 403。
 */
type Actor = { profileId: string }

async function resolveActor(): Promise<Actor | NextResponse> {
  const user = await requireUser()
  if (readOperatingDataSource() !== "database") {
    return errorResponse(403, "source_not_database", "這個環境是預覽模式，檔案不會上傳。")
  }
  return { profileId: user.id }
}

function isResponse(value: Actor | NextResponse): value is NextResponse {
  return value instanceof NextResponse
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
    return errorResponse(error.code === "bad_state" ? 409 : 400, error.code, error.message)
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
  console.error("[api/company/operating/drive/uploads] " + scope + " failed:", error)
  return errorResponse(500, scope + "_failed", "操作失敗。")
}

function rejectClientWorkspace(hasWorkspaceId: boolean) {
  if (!hasWorkspaceId) return null
  return errorResponse(
    400,
    "workspace_id_not_accepted",
    "workspaceId 由伺服器解析，不接受前端指定。"
  )
}

/** `POST { projectId, name, bytes, contentType?, folderId? }` → 預簽 PUT 網址 ＋ 已建好的那一列 */
export async function POST(request: NextRequest) {
  try {
    const actor = await resolveActor()
    if (isResponse(actor)) return actor

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const rejected = rejectClientWorkspace(Boolean(body && "workspaceId" in body))
    if (rejected) return rejected
    // objectKey 同理：key 由伺服器產生，接受前端送來的 key 等於開放目錄穿越。
    if (body && ("objectKey" in body || "key" in body)) {
      return errorResponse(400, "object_key_not_accepted", "檔案位置由伺服器產生，不接受指定。")
    }

    const projectId = projectKey(typeof body?.projectId === "string" ? body.projectId.trim() : "")
    if (!projectId) return errorResponse(400, "missing_project_id", "缺少專案代號。")

    const result = await createProjectDriveUpload(actor.profileId, {
      projectId,
      folderId: typeof body?.folderId === "string" && body.folderId ? folderKey(body.folderId.trim()) : null,
      name: typeof body?.name === "string" ? body.name : "",
      contentType: typeof body?.contentType === "string" ? body.contentType : null,
      bytes: Number(body?.bytes),
    })
    return NextResponse.json(result, { headers: noStoreHeaders })
  } catch (error) {
    return handleError("upload_url", error)
  }
}

/** `PATCH { projectId, assetId, outcome? }` → finalize（或標記失敗） */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await resolveActor()
    if (isResponse(actor)) return actor

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const rejected = rejectClientWorkspace(Boolean(body && "workspaceId" in body))
    if (rejected) return rejected

    const projectId = projectKey(typeof body?.projectId === "string" ? body.projectId.trim() : "")
    const assetId = typeof body?.assetId === "string" ? body.assetId.trim() : ""
    if (!projectId || !assetId) return errorResponse(400, "missing_ids", "缺少專案或檔案代號。")

    // 使用者取消、或前端自己就知道傳壞了：直接標 failed，不必浪費一次 HeadObject。
    if (body?.outcome === "failed") {
      const result = await failProjectDriveAsset(actor.profileId, projectId, assetId)
      return NextResponse.json(result, { headers: noStoreHeaders })
    }

    const result = await finalizeProjectDriveAsset(actor.profileId, projectId, assetId)
    if (!result.ok) return errorResponse(422, result.code, result.error)
    return NextResponse.json(result, { headers: noStoreHeaders })
  } catch (error) {
    return handleError("finalize", error)
  }
}

/** `GET ?projectId=…&key=…` → 短命（5 分鐘）下載網址 */
export async function GET(request: NextRequest) {
  try {
    const actor = await resolveActor()
    if (isResponse(actor)) return actor

    const params = request.nextUrl.searchParams
    const rejected = rejectClientWorkspace(params.has("workspaceId"))
    if (rejected) return rejected

    const projectId = projectKey(params.get("projectId") ?? "")
    const objectKey = params.get("key") ?? ""
    if (!projectId) return errorResponse(400, "missing_project_id", "缺少專案代號。")

    const result = await resolveProjectDriveDownloadUrl(actor.profileId, projectId, objectKey)
    return NextResponse.json(result, { headers: noStoreHeaders })
  } catch (error) {
    return handleError("download_url", error)
  }
}
