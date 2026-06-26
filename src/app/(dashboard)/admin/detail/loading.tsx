import {
  FileTextIcon,
  LoaderCircleIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { RouteStatePanel } from "@/components/layout/route-state-panel"

export default function AdminDetailLoading() {
  return (
    <RouteStatePanel
      surface="dashboard"
      eyebrow="Admin detail"
      title="正在載入管理細節"
      description="Personal OS 正在載入完整 launch console、證據表格與 readiness 合約。這個 ADMIN-007 fallback 只顯示安全路由狀態，不提前曝光環境值、私有資料或 operator 證據內容。"
      badge="ADMIN-007 loading"
      icon={<LoaderCircleIcon className="size-5 animate-spin" />}
      rows={[
        {
          label: "Protected route",
          status: "server",
          detail: "/admin/detail keeps the same authenticated admin boundary as /admin before detailed evidence renders.",
          icon: <LockIcon className="size-4 text-muted-foreground" />,
        },
        {
          label: "Section index",
          status: "ready",
          tone: "good",
          detail: "The resolved page opens with a stable operator section index for long-table navigation.",
          icon: <FileTextIcon className="size-4 text-muted-foreground" />,
        },
        {
          label: "Write boundary",
          status: "read-only",
          detail: "Loading state performs no admin mutation, connector sync, user management, or launch-level upgrade.",
          icon: <ShieldCheckIcon className="size-4 text-muted-foreground" />,
        },
      ]}
      footer="Launch level remains unchanged until owner-run AUTH-005, Work proof, and deployment evidence are present."
    />
  )
}
