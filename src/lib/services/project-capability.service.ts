/**
 * 專案能力解析層（PLN-075 S2 Wave 2a）。
 *
 * 為什麼要有這一層：`assertCanAccessProject()` 只回答「是不是擁有者」這一個布林。
 * 五大資源（硬碟／聊天／會議／計劃／專案本體）需要的是「這個人在這個專案上
 * 可以做哪幾件事」——讀得到硬碟不等於寫得進硬碟，能留言不等於能改計劃。
 * 把它收斂成一組能力字串，呼叫端（route／service）就只問一句話，
 * 不必各自重新推一次 membership × grant × accessMode 的組合。
 *
 * 三條不可退讓的規則：
 *
 * 1. **deny-by-default**：`granted` 從空集合起算，每一條能力都要有一條規則明確放行。
 *    任何 early return 的結果都是「比較少」，不會是「比較多」。
 * 2. **擁有者精確比對是第一條規則**：`project.ownerId === profileId`，與既有
 *    `assertCanAccessProject()` 同一條判準。引入 membership 不得讓既有行為變寬——
 *    擁有者路徑在任何 workspace 查詢之前就結束，membership 查不到也不影響擁有者。
 * 3. **身分與範圍一律伺服器端解析**：這裡只收 `profileId` 與 `projectId`，
 *    workspaceId 由 `Project.workspaceId` 讀出來，不從呼叫端收。
 *    讓呼叫端指定 workspace 等於讓它自己決定要看哪一個租戶的資料
 *    （與 `src/app/api/company/operating/uploads/route.ts` 的 `resolveActor()` 同一形狀）。
 */
import type {
  ProjectAccessMode,
  ProjectAccessRole,
  WorkspaceMemberRole,
} from "@prisma/client"

import { db } from "@/lib/db"

export type ProjectCapability =
  | "project:read"
  | "project:write"
  | "drive:read"
  | "drive:write"
  | "chat:read"
  | "chat:write"
  | "plan:write"
  | "meeting:write"

/** 八條能力的完整清單。只在「擁有者」那一條規則上整包放行。 */
export const ALL_PROJECT_CAPABILITIES: readonly ProjectCapability[] = [
  "project:read",
  "project:write",
  "drive:read",
  "drive:write",
  "chat:read",
  "chat:write",
  "plan:write",
  "meeting:write",
]

/**
 * 能力代碼。
 * - `project_not_found`：專案不存在（與既有 `NotFoundError` 同一語意）。
 * - `capability_denied`：專案存在但這個人沒有這條能力。
 */
export type ProjectCapabilityErrorCode = "project_not_found" | "capability_denied"

export class ProjectCapabilityError extends Error {
  readonly code: ProjectCapabilityErrorCode
  readonly capability: ProjectCapability | null

  constructor(
    code: ProjectCapabilityErrorCode,
    message: string,
    capability: ProjectCapability | null = null
  ) {
    super(message)
    this.name = "ProjectCapabilityError"
    this.code = code
    this.capability = capability
  }
}

/**
 * 角色 → 能力對照表。**唯一的放行來源**，不要在別處再補 `granted.add()`。
 *
 * `MANAGER` 與 `EDITOR` 的能力目前相同：兩者的差別在「能不能再發 grant 給別人」，
 * 那是 `ProjectAccessGrant` 的寫入權，不屬於這八條資源能力，等 S3 的邀請流程再分。
 */
export const PROJECT_CAPABILITY_BY_ROLE: Record<
  ProjectAccessRole,
  readonly ProjectCapability[]
> = {
  VIEWER: ["project:read", "drive:read", "chat:read"],
  COMMENTER: ["project:read", "drive:read", "chat:read", "chat:write"],
  EDITOR: [
    "project:read",
    "project:write",
    "drive:read",
    "drive:write",
    "chat:read",
    "chat:write",
    "plan:write",
    "meeting:write",
  ],
  MANAGER: [
    "project:read",
    "project:write",
    "drive:read",
    "drive:write",
    "chat:read",
    "chat:write",
    "plan:write",
    "meeting:write",
  ],
}

/**
 * 從資料庫撈出來的事實，去掉所有 Prisma 形狀。純函式只看這一包。
 *
 * `membershipRole: null` ＝ 這個 workspace 沒有這個人的 ACTIVE membership。
 * `grantRole: null` ＝ 這個專案沒有發給這個 membership 的 ACTIVE grant。
 */
export type ProjectAccessFacts = {
  isOwner: boolean
  hasWorkspace: boolean
  accessMode: ProjectAccessMode
  workspaceDefaultRole: ProjectAccessRole
  membershipRole: WorkspaceMemberRole | null
  grantRole: ProjectAccessRole | null
}

/**
 * 純決策函式：事實 → 能力集合。沒有 I/O，所以 `check-project-capability.mjs`
 * 能直接把它實例化來驗 deny-by-default，不必連資料庫。
 *
 * 刻意寫成「只要去掉三處型別標註就是合法 JS」：checker 用三條窄 regex 去標註，
 * 任何一處對不上就整支失敗（與 v5 `source-patches.mjs` 的 `rep()` 同一個習慣）。
 *
 * 規則順序（先到先決定，後面的不會再放寬）：
 *
 * | # | 條件 | 結果 |
 * |---|---|---|
 * | 1 | `isOwner`（`ownerId === profileId` 精確比對） | 八條全開，直接結束 |
 * | 2 | 專案沒綁 workspace | 空集合 |
 * | 3 | 沒有 ACTIVE membership | 空集合 |
 * | 4 | 有 ACTIVE grant | 用 grant 的角色（明確授權優先，可以比預設窄） |
 * | 5 | 無 grant 且 `accessMode !== WORKSPACE_VISIBLE` | 空集合 |
 * | 6 | 無 grant 且 membership 是 `GUEST` | 空集合（訪客必須有明確 grant） |
 * | 7 | 無 grant 且 membership 是 `OWNER`／`ADMIN` | 視為 `MANAGER` |
 * | 8 | 其餘（`MEMBER`） | 用 `Workspace.defaultProjectAccessRole` |
 */
export function capabilitiesFromAccessFacts(facts: ProjectAccessFacts): Set<ProjectCapability> {
  const granted = new Set<ProjectCapability>()

  // 規則 1：擁有者精確比對。在任何 workspace／membership 判斷之前結束，
  // 所以「專案還沒綁公司」或「擁有者不是 workspace 成員」都不會讓既有行為變窄。
  if (facts.isOwner) {
    for (const capability of ALL_PROJECT_CAPABILITIES) {
      granted.add(capability)
    }
    return granted
  }

  // 規則 2：沒綁 workspace 就沒有任何 membership 可以依附。
  if (!facts.hasWorkspace) {
    return granted
  }

  // 規則 3：非擁有者一律要有 ACTIVE membership。
  if (!facts.membershipRole) {
    return granted
  }

  let role = facts.grantRole

  if (!role) {
    // 規則 5：PRIVATE 專案沒有隱含可見性，只有明確 grant 進得來。
    if (facts.accessMode !== "WORKSPACE_VISIBLE") {
      return granted
    }
    // 規則 6：訪客不吃隱含放行。
    if (facts.membershipRole === "GUEST") {
      return granted
    }
    // 規則 7／8。
    role =
      facts.membershipRole === "OWNER" || facts.membershipRole === "ADMIN"
        ? "MANAGER"
        : facts.workspaceDefaultRole
  }

  const capabilities = PROJECT_CAPABILITY_BY_ROLE[role]
  if (!capabilities) {
    return granted
  }

  for (const capability of capabilities) {
    granted.add(capability)
  }

  return granted
}

/**
 * 伺服器端解析使用者所屬的公司 workspace。
 *
 * **走 membership 關聯，不做名稱字串比對**：公司全名已定案為「圓展教育科技有限公司」
 * （PLN-075 OD-A），但名稱是顯示字串、會被改；拿它當鍵等於把授權綁在可編輯欄位上。
 *
 * 選擇順序（確定性排序，同一個人每次都拿到同一個 workspace）：
 * 1. `WorkspaceType.TEAM` 優先於 `PERSONAL`——公司資源掛在團隊工作區。
 * 2. membership 角色 `OWNER` > `ADMIN` > `MEMBER`。`GUEST` 不列入：訪客不能當專案的家。
 * 3. `Workspace.createdAt` 早的優先，再以 `id` 收尾。
 *
 * 沒有任何符合的 membership 時回 `null`。呼叫端必須把 `null` 當成明確失敗，
 * 不得退回「建一個私人專案」——那正是 Wave 2a 要修掉的 P0。
 */
export async function resolveOwnerWorkspaceId(profileId: string): Promise<string | null> {
  const memberships = await db.workspaceMembership.findMany({
    where: {
      profileId,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN", "MEMBER"] },
      workspace: { status: "ACTIVE" },
    },
    select: {
      role: true,
      workspace: { select: { id: true, type: true, createdAt: true } },
    },
  })

  if (memberships.length === 0) {
    return null
  }

  const typeRank = (type: string) => (type === "TEAM" ? 0 : 1)
  const roleRank = (role: WorkspaceMemberRole) =>
    role === "OWNER" ? 0 : role === "ADMIN" ? 1 : 2

  const sorted = [...memberships].sort((a, b) => {
    const byType = typeRank(a.workspace.type) - typeRank(b.workspace.type)
    if (byType !== 0) return byType
    const byRole = roleRank(a.role) - roleRank(b.role)
    if (byRole !== 0) return byRole
    const byCreated = a.workspace.createdAt.getTime() - b.workspace.createdAt.getTime()
    if (byCreated !== 0) return byCreated
    return a.workspace.id.localeCompare(b.workspace.id)
  })

  return sorted[0].workspace.id
}

/**
 * 撈出決策所需的事實。查詢全部帶 `status: "ACTIVE"`：
 * 停權的 membership 與撤銷的 grant 不得留下殘餘權限。
 */
async function loadProjectAccessFacts(
  profileId: string,
  projectId: string
): Promise<ProjectAccessFacts | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      workspaceId: true,
      accessMode: true,
      workspace: { select: { defaultProjectAccessRole: true, status: true } },
    },
  })

  if (!project) {
    return null
  }

  const isOwner = project.ownerId === profileId

  // 擁有者不需要 membership，也不該為了判斷而多打兩次資料庫。
  if (isOwner) {
    return {
      isOwner: true,
      hasWorkspace: Boolean(project.workspaceId),
      accessMode: project.accessMode,
      workspaceDefaultRole: project.workspace?.defaultProjectAccessRole ?? "VIEWER",
      membershipRole: null,
      grantRole: null,
    }
  }

  // workspace 被停權／封存時，整個租戶的隱含可見性一併收回。
  if (!project.workspaceId || project.workspace?.status !== "ACTIVE") {
    return {
      isOwner: false,
      hasWorkspace: false,
      accessMode: project.accessMode,
      workspaceDefaultRole: project.workspace?.defaultProjectAccessRole ?? "VIEWER",
      membershipRole: null,
      grantRole: null,
    }
  }

  const membership = await db.workspaceMembership.findFirst({
    where: {
      workspaceId: project.workspaceId,
      profileId,
      status: "ACTIVE",
    },
    select: { id: true, role: true },
  })

  if (!membership) {
    return {
      isOwner: false,
      hasWorkspace: true,
      accessMode: project.accessMode,
      workspaceDefaultRole: project.workspace.defaultProjectAccessRole,
      membershipRole: null,
      grantRole: null,
    }
  }

  const grant = await db.projectAccessGrant.findFirst({
    where: {
      projectId,
      membershipId: membership.id,
      status: "ACTIVE",
    },
    select: { role: true },
  })

  return {
    isOwner: false,
    hasWorkspace: true,
    accessMode: project.accessMode,
    workspaceDefaultRole: project.workspace.defaultProjectAccessRole,
    membershipRole: membership.role,
    grantRole: grant?.role ?? null,
  }
}

/**
 * 解析這個人在這個專案上的能力集合。
 *
 * 專案不存在時回**空集合**而不是丟錯：這是讀取路徑，用「不存在」與「沒權限」
 * 的不同錯誤來回應，等於把專案是否存在洩漏給沒有權限的人。
 */
export async function resolveProjectCapabilities(
  profileId: string,
  projectId: string
): Promise<Set<ProjectCapability>> {
  const facts = await loadProjectAccessFacts(profileId, projectId)

  if (!facts) {
    return new Set<ProjectCapability>()
  }

  return capabilitiesFromAccessFacts(facts)
}

/**
 * 沒有這條能力就丟 `ProjectCapabilityError`（帶 `code`，呼叫端可判讀後對映 HTTP 狀態）。
 *
 * 這裡保留「不存在」與「沒權限」兩種 code：assert 的呼叫端是已經通過
 * `requireUser()` 的寫入路徑，需要分辨 404 與 403 才能給出可用的錯誤訊息。
 */
export async function assertProjectCapability(
  profileId: string,
  projectId: string,
  capability: ProjectCapability
): Promise<void> {
  const facts = await loadProjectAccessFacts(profileId, projectId)

  if (!facts) {
    throw new ProjectCapabilityError("project_not_found", "找不到這個專案。", capability)
  }

  const granted = capabilitiesFromAccessFacts(facts)

  if (!granted.has(capability)) {
    throw new ProjectCapabilityError(
      "capability_denied",
      `沒有權限執行這個動作（需要 ${capability}）。`,
      capability
    )
  }
}
