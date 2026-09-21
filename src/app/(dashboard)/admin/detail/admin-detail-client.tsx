"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ExternalLinkIcon, FileTextIcon, GaugeIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ControlPlaneShell,
  DetailList,
  DetailListRow,
} from "@/components/owneros/control-plane-shell"
import { adminDetailNavItems } from "@/components/owneros/control-plane-nav"
import { useLocalEntities } from "@/lib/owneros/use-local-entities"
import type { getAdminLaunchOverview } from "@/lib/services/admin-readiness.service"

type AdminLaunchOverview = Awaited<ReturnType<typeof getAdminLaunchOverview>>

interface AckState {
  id: string
  acknowledged: boolean
}

export function AdminDetailClient({
  consoleState,
}: {
  consoleState: AdminLaunchOverview
}) {
  const pathname = usePathname()
  const ackStore = useLocalEntities<AckState>(
    consoleState.launchBlockers.map((row) => ({ id: row.area, acknowledged: false })),
    { storageKey: "admin-detail-blocker-ack" }
  )
  const ackMap = React.useMemo(
    () => new Map(ackStore.items.map((row) => [row.id, row.acknowledged])),
    [ackStore.items]
  )

  return (
    <ControlPlaneShell
      title="管理細節"
      description="Launch evidence navigation and read-only operator boundaries for the protected admin console."
      eyebrow="ADMIN-009"
      stateLabel="read-only"
      stateTone="neutral"
      navItems={adminDetailNavItems}
      activeHref={pathname ?? "/admin/detail"}
      aboutTitle="Admin 寫入邊界"
      aboutContent={
        <div className="grid gap-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            這個 shell 是唯讀的。它不新增使用者管理、權限寫入、部署寫入、connector sync、auth mutation、資料庫遷移、公開
            API 擴充或 launch-level 宣稱。
          </p>
          <p>預設只載入 overview summary、launch blockers、loop state 與 section index。</p>
          <p>/admin/detail/all 在每個 section 有自己的 loader 之前，保留完整 protected console 作為 fallback。</p>
        </div>
      }
      actions={
        <>
          <Button variant="outline" size="sm" render={<Link href="/admin" />}>
            <GaugeIcon className="size-3.5" />
            Overview
          </Button>
          <Button variant="secondary" size="sm" render={<Link href="/admin/detail/owner-evidence" />}>
            <FileTextIcon className="size-3.5" />
            Owner evidence
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/admin/detail/all" />}>
            <ExternalLinkIcon className="size-3.5" />
            Full fallback
          </Button>
        </>
      }
    >
      <section className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-2 xl:grid-cols-4">
        {consoleState.summaryItems.map((item) => (
          <div key={item.label} className="rounded-lg border px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm font-semibold">{item.value}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Launch blockers</h2>
        </div>
        <DetailList className="border-none">
          {consoleState.launchBlockers.map((row) => {
            const acknowledged = ackMap.get(row.area) ?? false
            return (
              <DetailListRow
                key={row.area}
                label={row.area}
                status={acknowledged ? "已處理" : row.status}
                tone={acknowledged ? "good" : row.tone}
                summary={row.signal}
                detailTitle={row.area}
                detail={
                  <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Signal</span>: {row.signal}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Next</span>: {row.nextAction}
                    </p>
                  </div>
                }
                trailing={
                  <Button
                    type="button"
                    variant={acknowledged ? "secondary" : "outline"}
                    size="sm"
                    className="shrink-0"
                    disabled={ackStore.isPending}
                    onClick={() => ackStore.update(row.area, { acknowledged: !acknowledged })}
                  >
                    {acknowledged ? "已處理" : "標記已處理"}
                  </Button>
                }
              />
            )
          })}
        </DetailList>
      </section>

      <section className="rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Loop state</h2>
        </div>
        <dl className="grid gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-2">
          {[
            ["Automation", consoleState.loop.automationId],
            ["Current loop", consoleState.loop.currentLoop],
            ["Next loop", consoleState.loop.nextLoop],
            ["Next task", consoleState.loop.nextRecommendedTask],
            ["Last task", consoleState.loop.lastCompletedTask],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 truncate font-medium" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </ControlPlaneShell>
  )
}
