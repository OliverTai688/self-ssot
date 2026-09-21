"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckCircle2Icon, ExternalLinkIcon, GaugeIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ControlPlaneShell,
  DetailList,
  DetailListRow,
} from "@/components/owneros/control-plane-shell"
import { adminDetailNavItems } from "@/components/owneros/control-plane-nav"
import { useLocalEntities } from "@/lib/owneros/use-local-entities"
import type { getAdminOwnerEvidenceSection } from "@/lib/services/admin-readiness.service"

type OwnerEvidenceConsoleState = Awaited<ReturnType<typeof getAdminOwnerEvidenceSection>>

interface VerifyState {
  id: string
  verified: boolean
}

export function OwnerEvidenceClient({
  consoleState,
}: {
  consoleState: OwnerEvidenceConsoleState
}) {
  const pathname = usePathname()
  const contract = consoleState.ownerEvidenceConsoleContract
  const verifyStore = useLocalEntities<VerifyState>(
    contract.rows.map((row) => ({ id: row.id, verified: false })),
    { storageKey: "admin-owner-evidence-verified" }
  )
  const verifiedMap = React.useMemo(
    () => new Map(verifyStore.items.map((row) => [row.id, row.verified])),
    [verifyStore.items]
  )

  return (
    <ControlPlaneShell
      title="管理證據"
      description="Owner evidence for AUTH-005, WORK-009, deployment proof, and owner-run handoff."
      eyebrow="ADMIN-009"
      stateLabel="read-only"
      stateTone="neutral"
      navItems={adminDetailNavItems}
      activeHref={pathname ?? "/admin/detail/owner-evidence"}
      aboutTitle="No-secret 邊界"
      aboutContent={
        <div className="grid gap-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Owner evidence 是受保護的唯讀 section，不曝露 cookies、tokens、Supabase keys、database URLs、raw auth
            claims、profile IDs、raw report bodies、public client data 或外部 agent 註冊。
          </p>
          <p>本頁不宣稱 AUTH-005、WORK-009、DEPLOY-002、L1、L3 或 L4。</p>
          <p>
            Next loop {consoleState.loop.nextLoop}: {consoleState.loop.nextRecommendedTask}
          </p>
        </div>
      }
      actions={
        <>
          <Button variant="outline" size="sm" render={<Link href="/admin/detail" />}>
            <GaugeIcon className="size-3.5" />
            Section shell
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/admin/detail/all#admin-detail-owner-evidence" />}>
            <ExternalLinkIcon className="size-3.5" />
            Full fallback
          </Button>
        </>
      }
    >
      <section className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-2 xl:grid-cols-4">
        {consoleState.summaryItems.slice(0, 4).map((item) => (
          <div key={item.label} className="rounded-lg border px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm font-semibold">{item.value}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Owner evidence console</h2>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">{contract.id}</Badge>
            <Badge variant="outline" className="text-[10px]">{contract.summary.rowCount} checks</Badge>
            <Badge variant="outline" className="text-[10px]">{contract.summary.blockedCount} blocked</Badge>
            <Badge variant="outline" className="text-[10px]">{contract.summary.ownerRunCount} owner-run</Badge>
          </div>
        </div>
        <DetailList className="border-none">
          {contract.rows.map((row) => {
            const verified = verifiedMap.get(row.id) ?? false
            return (
              <DetailListRow
                key={row.id}
                label={`${row.priority}. ${row.surface}`}
                status={verified ? "已核對" : row.status}
                tone={verified ? "good" : row.tone}
                summary={row.ownerAction}
                detailTitle={row.surface}
                detail={
                  <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Owner action</span>: {row.ownerAction}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Blocker</span>: {row.blocker}
                    </p>
                    <p className="break-all">
                      <span className="font-medium text-foreground">Command</span>:{" "}
                      <span className="font-mono">{row.command}</span>
                    </p>
                    <p className="break-all">
                      <span className="font-medium text-foreground">Evidence target</span>: {row.evidenceTarget}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Pass</span>: {row.passSignal}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Fail</span>: {row.failSignal}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Linked task</span>: {row.linkedTask}
                    </p>
                  </div>
                }
                trailing={
                  <Button
                    type="button"
                    variant={verified ? "secondary" : "outline"}
                    size="sm"
                    className="shrink-0"
                    disabled={verifyStore.isPending}
                    onClick={() => verifyStore.update(row.id, { verified: !verified })}
                  >
                    <CheckCircle2Icon className="size-3.5" />
                    {verified ? "已核對" : "標記核對"}
                  </Button>
                }
              />
            )
          })}
        </DetailList>
        <div className="grid gap-3 border-t p-4 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs font-medium">Primary owner action</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{contract.summary.primaryOwnerAction}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs font-medium">Next task</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{contract.summary.nextTask}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs font-medium">No-secret boundary</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {contract.prohibitedExposure.slice(0, 5).join(" / ")}
            </p>
          </div>
        </div>
      </section>
    </ControlPlaneShell>
  )
}
