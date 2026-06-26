"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { RouteStatePanel } from "@/components/layout/route-state-panel"
import { Button } from "@/components/ui/button"

export default function ClientPortalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("Client Portal public route failed", { digest: error.digest })
  }, [error.digest])

  return (
    <RouteStatePanel
      eyebrow="Personal OS Client Portal"
      title="客戶連結目前無法載入"
      description="公開頁面發生暫時性錯誤，因此內容維持關閉。這個畫面不會顯示 token、內部專案資料、mock 任務或交付物。"
      badge="No mock output"
      badgeTone="blocked"
      icon={<AlertTriangleIcon className="size-5" />}
      actions={
        <>
          <Button onClick={() => unstable_retry()}>
            <RefreshCwIcon className="size-4" />
            Retry
          </Button>
          <Button variant="outline" render={<Link href="/" prefetch={false} />}>
            <ArrowLeftIcon className="size-4" />
            Personal OS entry
          </Button>
        </>
      }
      rows={[
        {
          label: "Token",
          status: "hidden",
          detail: "The requested token is never echoed into the UI, logs, or recovery copy.",
          icon: <KeyRoundIcon className="size-4 text-muted-foreground" />,
        },
        {
          label: "Public output",
          status: "blocked",
          tone: "blocked",
          detail: "No client-visible records are rendered while the public BFF path is unavailable.",
          icon: <ShieldCheckIcon className="size-4 text-muted-foreground" />,
        },
      ]}
    />
  )
}
