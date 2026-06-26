import Link from "next/link"
import {
  ArrowLeftIcon,
  FileQuestionIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { RouteStatePanel } from "@/components/layout/route-state-panel"
import { Button } from "@/components/ui/button"

export default function DashboardNotFound() {
  return (
    <RouteStatePanel
      surface="dashboard"
      eyebrow="Protected workspace"
      title="找不到這個私人工作區項目"
      description="這個受保護頁面不存在、已被移除，或目前使用者沒有可讀取的對應資料。畫面不會猜測或揭露任何專案、來源、任務或客戶資料。"
      badge="Not found"
      badgeTone="warn"
      icon={<FileQuestionIcon className="size-5" />}
      actions={
        <Button variant="outline" render={<Link href="/work" prefetch={false} />}>
          <ArrowLeftIcon className="size-4" />
          Back to Work
        </Button>
      }
      rows={[
        {
          label: "Scope",
          status: "protected",
          detail: "The dashboard layout still requires an authenticated user before this state is visible.",
          icon: <LockIcon className="size-4 text-muted-foreground" />,
        },
        {
          label: "Disclosure",
          status: "safe",
          detail: "Missing resources are not distinguished from unavailable resources in a way that reveals private IDs.",
          icon: <ShieldCheckIcon className="size-4 text-muted-foreground" />,
        },
      ]}
    />
  )
}
