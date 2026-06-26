import Link from "next/link"
import { notFound } from "next/navigation"
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GaugeIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getAdminOwnerEvidenceSection,
  type AdminReadinessTone,
  type OwnerEvidenceConsoleRow,
} from "@/lib/services/admin-readiness.service"
import { cn } from "@/lib/utils"
import { AdminDetailSectionIndex } from "../section-index"

export const dynamic = "force-dynamic"

type AdminDetailSectionPageProps = {
  params: Promise<{ section: string }>
}

const toneLabel: Record<AdminReadinessTone, string> = {
  good: "ready",
  warn: "review",
  blocked: "blocked",
  neutral: "watch",
}

function badgeVariant(tone: AdminReadinessTone) {
  if (tone === "good") return "secondary" as const
  if (tone === "blocked") return "destructive" as const
  return "outline" as const
}

function StatusBadge({ tone, label }: { tone: AdminReadinessTone; label?: string }) {
  return (
    <Badge variant={badgeVariant(tone)} className="w-fit">
      {label ?? toneLabel[tone]}
    </Badge>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function OwnerEvidenceConsoleTable({ rows }: { rows: OwnerEvidenceConsoleRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Check</th>
            <th className="px-4 py-3 text-left font-medium">Owner action</th>
            <th className="px-4 py-3 text-left font-medium">Command / evidence</th>
            <th className="px-4 py-3 text-left font-medium">Pass / fail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <span className="font-medium">
                    {row.priority}. {row.surface}
                  </span>
                  <StatusBadge tone={row.tone} label={row.status} />
                  <span className="text-xs text-muted-foreground">{row.linkedTask}</span>
                </div>
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.ownerAction}
                <br />
                <span className="text-xs">Blocker: {row.blocker}</span>
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="break-all font-mono text-xs">{row.command}</span>
                <br />
                <span className="break-all text-xs">{row.evidenceTarget}</span>
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">Pass:</span> {row.passSignal}
                <br />
                <span className="font-medium text-foreground">Fail:</span> {row.failSignal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function AdminDetailSectionPage({ params }: AdminDetailSectionPageProps) {
  const { section } = await params
  if (section !== "owner-evidence") {
    notFound()
  }

  const consoleState = await getAdminOwnerEvidenceSection()
  const contract = consoleState.ownerEvidenceConsoleContract

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppHeader
        title="管理證據"
        description="Personal OS owner evidence section for AUTH-005, WORK-009, deployment proof, and owner-run handoff"
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
          <section className="rounded-lg border bg-background" data-admin-detail-owner-evidence="ADMIN-009">
            <div className="flex flex-col gap-4 border-b px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <FileTextIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Owner evidence section</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    ADMIN-009 loads only OWNER-EVIDENCE-001 plus lightweight operator context. This read-only
                    section covers AUTH-005, WORK-009, deployment proof, pass/fail signals, and no-secret evidence
                    handoff. Generated {formatDate(consoleState.generatedAt)}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" render={<Link href="/admin/detail" />}>
                  <GaugeIcon className="size-3.5" />
                  Section shell
                </Button>
                <Button variant="outline" size="sm" render={<Link href="/admin/detail/all#admin-detail-owner-evidence" />}>
                  <ExternalLinkIcon className="size-3.5" />
                  Full fallback
                </Button>
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              {consoleState.summaryItems.slice(0, 4).map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex min-h-24 items-start justify-between gap-3 rounded-lg border px-3 py-3",
                    item.tone === "blocked"
                      ? "border-red-200 bg-red-50"
                      : item.tone === "good"
                        ? "border-emerald-200 bg-emerald-50"
                        : "bg-muted/30",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-semibold">{item.value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                  <StatusBadge tone={item.tone} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Owner evidence console</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{contract.id}</Badge>
                <Badge variant="outline">{contract.summary.rowCount} checks</Badge>
                <Badge variant="outline">{contract.summary.blockedCount} blocked</Badge>
                <Badge variant="outline">{contract.summary.ownerRunCount} owner-run</Badge>
              </div>
            </div>
            <OwnerEvidenceConsoleTable rows={contract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Primary owner action</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {contract.summary.primaryOwnerAction}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next task</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {contract.summary.nextTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {contract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Admin write boundary</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Owner evidence is a protected read-only section. It exposes no cookies, tokens, Supabase keys,
                  database URLs, raw auth claims, profile IDs, raw report bodies, public client data, or external
                  agent registration.
                </p>
              </div>
              <Badge variant="outline">read-only</Badge>
            </div>
            <div className="grid gap-3 p-4 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Formal claim boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This route does not claim AUTH-005, WORK-009, DEPLOY-002, L1, L3, or L4.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Loop state</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Next loop {consoleState.loop.nextLoop}: {consoleState.loop.nextRecommendedTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Section map</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Unknown section slugs fail closed; unsplit sections remain available through full fallback.
                </p>
              </div>
            </div>
          </section>

          <AdminDetailSectionIndex mode="route" />
        </div>
      </main>
    </div>
  )
}
