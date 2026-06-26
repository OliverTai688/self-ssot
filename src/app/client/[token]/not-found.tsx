import Link from "next/link"
import { ArrowLeftIcon, DatabaseIcon, KeyRoundIcon, LockIcon, ShieldCheckIcon } from "lucide-react"

import { RouteStatePanel } from "@/components/layout/route-state-panel"
import { Button } from "@/components/ui/button"

const boundaryRows = [
  {
    label: "Mock data blocked",
    detail: "This public route no longer maps token strings to demo projects, tasks, or deliverables.",
    icon: <LockIcon className="size-4 text-red-600" />,
  },
  {
    label: "DB token required",
    detail: "Content only appears when the DB portal gate is enabled and the token validates against persisted Work records.",
    icon: <KeyRoundIcon className="size-4 text-amber-600" />,
  },
  {
    label: "Visibility filter required",
    detail: "Only records explicitly marked client-visible may appear after DB-backed filtering lands.",
    icon: <ShieldCheckIcon className="size-4 text-emerald-600" />,
  },
]

export default function ClientPortalUnavailable() {
  return (
    <RouteStatePanel
      eyebrow="Personal OS Client Portal"
      title="客戶連結目前不可用"
      description="為了避免 mock 專案或內部工作資料出現在公開頁，Client Portal 在 DB-backed token validation gate 開啟且 client-visible filtering 通過前會先關閉內容顯示。"
      badge="No mock output"
      badgeTone="blocked"
      icon={<ShieldCheckIcon className="size-5" />}
      actions={
        <Button variant="outline" render={<Link href="/" prefetch={false} />}>
          <ArrowLeftIcon className="size-4" />
          Personal OS entry
        </Button>
      }
      rows={boundaryRows.map((row) => ({
        label: row.label,
        detail: row.detail,
        status: row.label === "Mock data blocked" ? "blocked" : "required",
        tone: row.label === "Mock data blocked" ? "blocked" : "warn",
        icon: row.icon,
      }))}
      footer={
        <span className="inline-flex items-center gap-2">
          <DatabaseIcon className="size-4" />
          Client Portal unavailable. Public data boundary is fail-closed until launch gates pass.
        </span>
      }
    />
  )
}
