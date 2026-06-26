import Link from "next/link"
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
  getAdminLaunchOverview,
  type AdminReadinessRow,
  type AdminReadinessTone,
} from "@/lib/services/admin-readiness.service"
import { cn } from "@/lib/utils"
import { AdminDetailSectionIndex } from "./section-index"

export const dynamic = "force-dynamic"

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

function ReadinessTable({ rows }: { rows: AdminReadinessRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Gate</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Signal</th>
            <th className="px-4 py-3 text-left font-medium">Next action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area} className="border-b last:border-0">
              <td className="px-4 py-3 align-top font-medium">{row.area}</td>
              <td className="px-4 py-3 align-top">
                <StatusBadge tone={row.tone} label={row.status} />
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.signal}
              </td>
              <td className="max-w-lg whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.nextAction}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function AdminDetailPage() {
  const consoleState = await getAdminLaunchOverview()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppHeader
        title="管理細節"
        description="Personal OS admin section shell, launch evidence navigation, and read-only operator boundaries"
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
          <section className="rounded-lg border bg-background" data-admin-detail-shell="ADMIN-009">
            <div className="flex flex-col gap-4 border-b px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <GaugeIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Admin detail section shell</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    ADMIN-009 keeps /admin/detail lightweight by loading operator context, section navigation,
                    and the Admin write boundary without building the full launch console detail by default.
                    Generated {formatDate(consoleState.generatedAt)}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
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
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              {consoleState.summaryItems.map((item) => (
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

          <AdminDetailSectionIndex mode="route" />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="rounded-lg border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <AlertTriangleIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Launch blockers</h2>
              </div>
              <ReadinessTable rows={consoleState.launchBlockers} />
            </div>

            <div className="rounded-lg border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <LockIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Loop state</h2>
              </div>
              <dl className="grid gap-0 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Automation</dt>
                  <dd className="min-w-0 truncate font-medium">{consoleState.loop.automationId}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Current loop</dt>
                  <dd className="font-medium">{consoleState.loop.currentLoop}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Next loop</dt>
                  <dd className="font-medium">{consoleState.loop.nextLoop}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Next task</dt>
                  <dd className="font-medium">{consoleState.loop.nextRecommendedTask}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3 px-4 py-3">
                  <dt className="text-muted-foreground">Last task</dt>
                  <dd className="font-medium">{consoleState.loop.lastCompletedTask}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Admin write boundary</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This shell is read-only. It does not add user management, permission writes, deployment writes,
                  connector sync, auth mutation, database migration, public API expansion, or launch-level claims.
                </p>
              </div>
              <Badge variant="outline">read-only</Badge>
            </div>
            <div className="grid gap-3 p-4 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Loaded by default</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Overview summary, launch blockers, loop state, and section index only.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">First section route</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  /admin/detail/owner-evidence loads the owner evidence family without full evidence tables.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Audit fallback</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  /admin/detail/all preserves the full protected console until each section has its own loader.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
