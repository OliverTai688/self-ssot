"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  AlertTriangleIcon,
  HomeIcon,
  LockIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { RouteStatePanel } from "@/components/layout/route-state-panel"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("Protected dashboard route failed", { digest: error.digest })
  }, [error.digest])

  return (
    <RouteStatePanel
      surface="dashboard"
      eyebrow="Protected workspace"
      title="私人工作區暫時無法載入"
      description="頁面資料或互動元件載入失敗。你可以重試目前頁面，或回到公開入口重新進入登入流程。錯誤細節只會留在伺服器或瀏覽器紀錄，不會顯示在畫面上。"
      badge="Unavailable"
      badgeTone="warn"
      icon={<AlertTriangleIcon className="size-5" />}
      actions={
        <>
          <Button onClick={() => unstable_retry()}>
            <RefreshCwIcon className="size-4" />
            Retry
          </Button>
          <Button variant="outline" render={<Link href="/" prefetch={false} />}>
            <HomeIcon className="size-4" />
            Public entry
          </Button>
        </>
      }
      rows={[
        {
          label: "Recovery",
          status: "retryable",
          detail: "Retry re-renders the protected segment without exposing the underlying exception message.",
          icon: <RefreshCwIcon className="size-4 text-muted-foreground" />,
        },
        {
          label: "Auth guard",
          status: "kept",
          detail: "Unauthenticated protected requests continue to use /login?next=... before this shell renders.",
          icon: <LockIcon className="size-4 text-muted-foreground" />,
        },
        {
          label: "Disclosure",
          status: "safe",
          detail: "The UI does not print env values, cookies, provider payloads, profile IDs, or private records.",
          icon: <ShieldCheckIcon className="size-4 text-muted-foreground" />,
        },
      ]}
    />
  )
}
