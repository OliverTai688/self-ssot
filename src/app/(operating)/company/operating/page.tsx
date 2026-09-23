import Link from "next/link"
import { redirect } from "next/navigation"
import { resolveCurrentUser } from "@/lib/services/auth.service"
import { createLoginPath } from "@/lib/auth/redirect"
import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { findOperatingWorkspaceId, loadOperatingStore } from "@/lib/services/operating-store.service"
import { OPERATING_WORKSPACE_SLUG } from "@/lib/services/operating-commands.service"
import { readUiDataMode } from "@/lib/config/ui-data-mode"
import { operatingSettingsCatalog, loadOperatingSettings } from "@/lib/services/operating-settings.service"
import { parseUiDataMode } from "@/lib/ui-data/yuanzhan/mode"
import { createV5State } from "@/lib/ui-data/yuanzhan/v5-state"
import { V5Desktop } from "@/components/yuanzhan/v5/desktop"

export const dynamic = "force-dynamic"
export const metadata = { title: "圓展營運工作台 | Personal OS" }

export default async function OperatingPage() {
  const auth = await resolveCurrentUser()
  if (!auth.user) redirect(createLoginPath("/company/operating", auth.status))

  // 席位由登入的 email 決定：進來就是自己，工作台裡不能換人。
  const seat = resolveYuanzhanSeat(auth.user.email)
  if (!seat) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">沒有營運工作台席位</h1>
          <p className="text-sm text-muted-foreground">
            {auth.user.email} 可以使用 Personal OS，但還沒有被指派圓展營運工作台的席位。
            公司資料依契約 §18 保密義務只開放給有席位的成員。
          </p>
          <p className="text-xs text-muted-foreground">
            要開通，請在 <code className="rounded bg-muted px-1 py-0.5">YUANZHAN_SEATS</code> 加入
            <code className="ml-1 rounded bg-muted px-1 py-0.5">{auth.user.email}:lily</code>
            （員工視角）或 <code className="rounded bg-muted px-1 py-0.5">:yz</code>（負責人視角）。
          </p>
          <div className="flex gap-3 text-sm">
            <Link className="underline underline-offset-4" href="/ai-input">
              回到 Personal OS
            </Link>
            <Link className="underline underline-offset-4" href="/login?ws=company">
              換一個帳號登入
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const settings = await loadOperatingSettings(auth.user, seat)
  // 組織設定可以覆寫環境變數決定的資料來源；inherit 就沿用 PERSONAL_OS_UI_DATA_MODE。
  const configuredMode = settings.org["org.dataMode"]
  const mode =
    typeof configuredMode === "string" && configuredMode !== "inherit"
      ? parseUiDataMode(configuredMode)
      : readUiDataMode()

  // 資料來源與資料模式是兩件事：mode 決定畫面上有沒有範例，dataSource 決定輸入的東西會不會留下。
  const dataSource = readOperatingDataSource()

  // database 模式才讀資料庫。讀取不建立 workspace —— 打開頁面不該在資料庫留下東西；
  // 還沒有 workspace 就是第一次使用，那時的空白是真的空白。
  let store = null
  if (dataSource === "database") {
    try {
      const workspaceId = await findOperatingWorkspaceId(OPERATING_WORKSPACE_SLUG)
      store = workspaceId ? await loadOperatingStore(workspaceId, auth.user.id) : null
    } catch (error) {
      // 不退回 showcase／empty：靜默降級會讓人以為資料是空的，而不是讀取失敗了。
      console.error("[operating] failed to load the operating store", error)
      throw new Error("營運資料讀取失敗，請重新整理；若持續發生請檢查資料庫連線。")
    }
  }

  return (
    <V5Desktop
      key={`${auth.user.id}:${seat.actor}:${mode}:${dataSource}`}
      initialState={createV5State(
        mode,
        seat,
        { ...settings, catalog: operatingSettingsCatalog().all },
        dataSource,
        store,
      )}
    />
  )
}
