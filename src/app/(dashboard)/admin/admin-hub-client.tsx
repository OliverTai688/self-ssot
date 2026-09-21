"use client"

import * as React from "react"
import Link from "next/link"
import { CheckCircle2Icon, CircleIcon, FileTextIcon, GaugeIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ControlPlaneShell,
  DetailList,
  DetailListRow,
} from "@/components/owneros/control-plane-shell"
import { adminNavItems } from "@/components/owneros/control-plane-nav"
import { useLocalEntities } from "@/lib/owneros/use-local-entities"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProductLocale } from "@/lib/i18n/product-copy"

function truncate(text: string, max = 90) {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

type AdminHubTone = "good" | "warn" | "blocked" | "neutral"

export interface AdminHubSummaryItem {
  label: string
  value: string
  detail: string
  tone: AdminHubTone
}

export interface AdminHubBlocker {
  area: string
  status: string
  signal: string
  nextAction: string
  tone: AdminHubTone
}

export interface AdminHubModel {
  generatedAt: string
  currentLevel: string
  targetNextLevel: string
  currentLoop: string
  nextRecommendedTask: string
  summaryItems: AdminHubSummaryItem[]
  launchBlockers: AdminHubBlocker[]
}

const adminCopy = {
  "zh-TW": {
    title: "管理",
    description: "Operator console for RBAC, AI governance, audit, and system readiness.",
    eyebrow: "Operator console",
    heading: "管理控制台",
    body: "首頁只保留核心狀態和阻塞摘要；治理入口在左側，詳細 proof、診斷和原始 evidence 放到完整 detail。",
    primaryAction: "完整 detail",
    secondaryAction: "系統就緒",
    summaryTitle: "狀態摘要",
    blockerTitle: "阻塞與下一步",
    generated: "產生時間",
    nextTask: "下一步",
    about: "管理邊界",
    acknowledge: "標記已處理",
    acknowledged: "已處理",
    signal: "Signal",
    next: "Next",
    boundaries: [
      ["Read-only overview", "首頁只讀 overview loader；完整 evidence 進 /admin/detail。"],
      ["No production mutation", "不從此頁改 env、DB、provider、權限或公開輸出。"],
      ["Admin keeps proof", "任務 ID、proof、阻塞原因留在 admin，正常 owner 頁保持簡潔。"],
      ["Acknowledge ≠ resolve", "「標記已處理」只是本機 UI 狀態，不會關閉真正的閘門；正式解除仍要走 /admin/system-readiness。"],
    ],
  },
  "en-US": {
    title: "Admin",
    description: "Operator console for RBAC, AI governance, audit, and system readiness.",
    eyebrow: "Operator console",
    heading: "Admin control hub",
    body: "The overview keeps key status and blockers. Governance entry points live in the sidebar; detailed proof and diagnostics live in full detail.",
    primaryAction: "Full detail",
    secondaryAction: "System readiness",
    summaryTitle: "Status summary",
    blockerTitle: "Blockers and next steps",
    generated: "Generated",
    nextTask: "Next task",
    about: "Admin boundaries",
    acknowledge: "Mark handled",
    acknowledged: "Handled",
    signal: "Signal",
    next: "Next",
    boundaries: [
      ["Read-only overview", "The home page uses the lightweight overview loader; full evidence lives in /admin/detail."],
      ["No production mutation", "This page does not change env, DB, providers, permissions, or public output."],
      ["Admin owns proof", "Task ids, proof, and blockers stay in Admin so owner pages remain simple."],
      ["Acknowledge ≠ resolve", "\"Mark handled\" is a local UI state only — it does not close the real gate. Formal resolution still goes through /admin/system-readiness."],
    ],
  },
} satisfies Record<ProductLocale, Record<string, unknown>>

function ToneIcon({ tone }: { tone: AdminHubTone }) {
  if (tone === "good") return <CheckCircle2Icon className="size-4 text-emerald-600" />
  return <CircleIcon className="size-4 text-muted-foreground/40" />
}

interface AckState {
  id: string
  acknowledged: boolean
}

export function AdminHubClient({ model }: { model: AdminHubModel }) {
  const { locale } = useProductLanguage()
  const copy = adminCopy[locale]

  const ackStore = useLocalEntities<AckState>(
    model.launchBlockers.map((row) => ({ id: row.area, acknowledged: false })),
    { storageKey: "admin-hub-blocker-ack" }
  )
  const ackMap = React.useMemo(() => new Map(ackStore.items.map((row) => [row.id, row.acknowledged])), [ackStore.items])

  return (
    <ControlPlaneShell
      title={copy.title}
      description={copy.description}
      eyebrow={copy.eyebrow}
      stateLabel={model.currentLevel}
      stateTone="review"
      navItems={adminNavItems}
      activeHref="/admin"
      aboutTitle={copy.about}
      aboutContent={
        <div className="grid gap-3">
          {copy.boundaries.map(([label, body]) => (
            <div key={label}>
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      }
      actions={
        <>
          <Button variant="outline" size="sm" render={<Link href="/admin/system-readiness" />}>
            <GaugeIcon className="size-3.5" />
            {copy.secondaryAction}
          </Button>
          <Button size="sm" render={<Link href="/admin/detail" />}>
            <FileTextIcon className="size-3.5" />
            {copy.primaryAction}
          </Button>
        </>
      }
    >
      <section className="grid overflow-hidden rounded-lg border bg-background sm:grid-cols-3">
        <div className="border-b px-3 py-2.5 sm:border-b-0 sm:border-r">
          <p className="text-[11px] font-medium text-muted-foreground">{copy.generated}</p>
          <p className="mt-1 text-sm font-semibold">{new Date(model.generatedAt).toLocaleString(locale)}</p>
        </div>
        <div className="border-b px-3 py-2.5 sm:border-b-0 sm:border-r">
          <p className="text-[11px] font-medium text-muted-foreground">Loop</p>
          <p className="mt-1 text-sm font-semibold">{model.currentLoop}</p>
        </div>
        <div className="min-w-0 px-3 py-2.5">
          <p className="text-[11px] font-medium text-muted-foreground">{copy.nextTask}</p>
          <p className="mt-1 truncate text-sm font-semibold" title={model.nextRecommendedTask}>
            {truncate(model.nextRecommendedTask, 60)}
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{copy.summaryTitle}</h2>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {model.summaryItems.map((item) => (
            <div key={item.label} className="rounded-lg border px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">{item.label}</p>
                <ToneIcon tone={item.tone} />
              </div>
              <p className="mt-1.5 text-sm font-semibold">{item.value}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{copy.blockerTitle}</h2>
        </div>
        <DetailList className="border-none">
          {model.launchBlockers.map((row) => {
            const acknowledged = ackMap.get(row.area) ?? false
            return (
              <DetailListRow
                key={row.area}
                label={row.area}
                status={acknowledged ? copy.acknowledged : row.status}
                tone={acknowledged ? "good" : row.tone}
                summary={row.signal}
                detailTitle={row.area}
                detail={
                  <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">{copy.signal}</span>: {row.signal}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">{copy.next}</span>: {row.nextAction}
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
                    <CheckCircle2Icon className="size-3.5" />
                    {acknowledged ? copy.acknowledged : copy.acknowledge}
                  </Button>
                }
              />
            )
          })}
        </DetailList>
      </section>
    </ControlPlaneShell>
  )
}
