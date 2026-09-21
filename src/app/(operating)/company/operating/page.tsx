import Link from "next/link"
import { redirect } from "next/navigation"
import { resolveCurrentUser } from "@/lib/services/auth.service"
import { createLoginPath } from "@/lib/auth/redirect"
import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
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

  return (
    <V5Desktop
      key={`${auth.user.id}:${seat.actor}:${mode}`}
      initialState={createV5State(mode, seat, {
        ...settings,
        catalog: operatingSettingsCatalog().all,
      })}
    />
  )
}
