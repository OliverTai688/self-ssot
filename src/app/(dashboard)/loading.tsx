import {
  DatabaseIcon,
  LoaderCircleIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { RouteStatePanel } from "@/components/layout/route-state-panel"

export default function DashboardLoading() {
  return (
    <RouteStatePanel
      surface="dashboard"
      eyebrow="Protected workspace"
      title="正在載入私人工作區"
      description="Personal OS 正在解析登入狀態、模組權限與頁面資料。這個狀態只顯示安全邊界，不會先串流私有專案、來源或環境資訊。"
      badge="Loading"
      icon={<LoaderCircleIcon className="size-5 animate-spin" />}
      rows={[
        {
          label: "Auth boundary",
          status: "protected",
          detail: "Dashboard layout resolves the current user before the private app shell renders.",
          icon: <LockIcon className="size-4 text-muted-foreground" />,
        },
        {
          label: "Permission snapshot",
          status: "server",
          detail: "Module visibility is loaded from the server-side snapshot before interactive overrides appear.",
          icon: <ShieldCheckIcon className="size-4 text-muted-foreground" />,
        },
        {
          label: "Data exposure",
          status: "no secrets",
          detail: "Loading UI avoids tokens, database hosts, provider payloads, raw IDs, and private records.",
          icon: <DatabaseIcon className="size-4 text-muted-foreground" />,
        },
      ]}
    />
  )
}
