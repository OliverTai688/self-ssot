import { normalizeNextPath } from "@/lib/auth/redirect"

/**
 * 登入頁的「工作區」選擇。
 *
 * 一個帳號同時有兩個入口：
 *   company  → 圓展營運工作台（兩人協作、契約與金流）
 *   personal → Personal OS（個人的書寫與研究）
 *
 * 選擇只影響「登入後落在哪裡」與登入頁的視覺提示，不影響驗證方式。
 */
export type WorkspaceMode = "company" | "personal"

export const WORKSPACE_MODES = ["company", "personal"] as const

/** 預設進公司工作台。 */
export const DEFAULT_WORKSPACE: WorkspaceMode = "company"

export const WORKSPACE_LANDING: Record<WorkspaceMode, string> = {
  company: "/company/operating",
  personal: "/ai-input",
}

export const WORKSPACE_META: Record<
  WorkspaceMode,
  { label: string; title: string; description: string; hint: string }
> = {
  company: {
    label: "公司",
    title: "圓展營運工作台",
    description: "登入後進入公司的營運系統：專案、金流、承諾與出勤紀錄。",
    hint: "預設入口。同一組帳號登入，權限依契約 §18／§20 決定看得到什麼。",
  },
  personal: {
    label: "個人",
    title: "Personal OS",
    description: "登入後進入你的私人工作系統：日誌、研究與個人推論。",
    hint: "個人資料與公司工作台分開；切換工作區不需要重新登入。",
  },
}

/** 這些前綴屬於公司工作區，其餘視為個人。 */
const COMPANY_PATH_PREFIXES = ["/company"]

/**
 * 公司工作區的實際入口是營運工作台；`/company` 只是願景／策略的定版頁。
 * 已登入而落點是公司區首頁時，一律升級成營運工作台，避免每次還要再點一次。
 */
export function preferOperatingLanding(path: string) {
  return path === "/company" ? WORKSPACE_LANDING.company : path
}

export function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return typeof value === "string" && (WORKSPACE_MODES as readonly string[]).includes(value)
}

/** 從既有落點反推該用哪個分頁（被保護頁面踢回登入時會用到）。 */
export function workspaceFromNextPath(path: string): WorkspaceMode {
  const isCompany = COMPANY_PATH_PREFIXES.some((prefix) => {
    return path === prefix || path.startsWith(`${prefix}/`)
  })

  return isCompany ? "company" : "personal"
}

/**
 * 決定這次登入要用哪個工作區、以及登入後要去哪裡。
 *
 * 優先序：
 *   1. 使用者在登入頁明確點了分頁（?ws=）→ 以分頁為準，落點換成該工作區首頁。
 *   2. 被保護頁面踢回來並帶著原路徑（?next=）→ 保留深連結，分頁由路徑反推。
 *   3. 直接打開 /login → 預設公司。
 */
export function resolveWorkspaceSelection({
  workspaceParam,
  nextParam,
}: {
  workspaceParam?: string
  nextParam?: string
}): { workspace: WorkspaceMode; nextPath: string } {
  if (isWorkspaceMode(workspaceParam)) {
    return { workspace: workspaceParam, nextPath: WORKSPACE_LANDING[workspaceParam] }
  }

  // normalizeNextPath 對不安全或不合法的路徑會回退成預設值；
  // 只有「正規化後與原值相同」才算是使用者真的要去的地方。
  if (typeof nextParam === "string" && nextParam.length > 0) {
    const normalized = normalizeNextPath(nextParam)

    if (normalized === nextParam) {
      return {
        workspace: workspaceFromNextPath(normalized),
        nextPath: preferOperatingLanding(normalized),
      }
    }
  }

  return { workspace: DEFAULT_WORKSPACE, nextPath: WORKSPACE_LANDING[DEFAULT_WORKSPACE] }
}
