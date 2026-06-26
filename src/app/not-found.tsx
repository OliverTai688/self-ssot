import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon, FileQuestionIcon, LockIcon, ShieldCheckIcon } from "lucide-react"

import { RouteStatePanel } from "@/components/layout/route-state-panel"
import { Button } from "@/components/ui/button"
import { createLoginPath } from "@/lib/auth/redirect"

export const metadata: Metadata = {
  title: "Not Found | Personal OS",
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <RouteStatePanel
      eyebrow="Personal OS"
      title="找不到這個頁面"
      description="這個公開路徑不存在，或必須從受保護的 owner workspace 進入。Personal OS 不會在 404 狀態顯示專案、來源、任務、交付物、token 或環境資訊。"
      badge="404"
      badgeTone="warn"
      icon={<FileQuestionIcon className="size-5" />}
      actions={
        <>
          <Button variant="outline" render={<Link href="/" prefetch={false} />}>
            <ArrowLeftIcon className="size-4" />
            Public entry
          </Button>
          <Button render={<Link href={createLoginPath("/ai-input")} prefetch={false} />}>
            <LockIcon className="size-4" />
            Owner login
          </Button>
        </>
      }
      rows={[
        {
          label: "Public boundary",
          status: "safe",
          detail: "The 404 surface is static and does not query private module records.",
          icon: <ShieldCheckIcon className="size-4 text-muted-foreground" />,
        },
        {
          label: "Owner routes",
          status: "login first",
          detail: "Protected workspace links continue through /login?next=... before any private shell renders.",
          icon: <LockIcon className="size-4 text-muted-foreground" />,
        },
      ]}
    />
  )
}
