import Link from "next/link"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  DatabaseIcon,
  GaugeIcon,
  LockIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TerminalSquareIcon,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getDailyCommandCenter,
  type AdminReadinessTone,
  type DailyCommandCenterAction,
  type DailyCommandCenterLane,
  type OwnerEvidenceConsoleRow,
} from "@/lib/services/admin-readiness.service"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const toneLabels: Record<AdminReadinessTone, string> = {
  good: "ready",
  warn: "watch",
  blocked: "blocked",
  neutral: "review",
}

const laneLabels: Record<DailyCommandCenterLane, string> = {
  proof: "Proof",
  operate: "Operate",
  capture: "Capture",
  agent: "Agent",
  admin: "Admin",
  real_data: "Real data",
}

function badgeVariant(tone: AdminReadinessTone) {
  if (tone === "good") return "secondary" as const
  if (tone === "blocked") return "destructive" as const
  return "outline" as const
}

function toneIcon(tone: AdminReadinessTone) {
  if (tone === "good") return <CheckCircle2Icon className="size-4 text-emerald-600" />
  if (tone === "blocked") return <AlertTriangleIcon className="size-4 text-red-600" />
  return <AlertTriangleIcon className="size-4 text-amber-600" />
}

function laneIcon(lane: DailyCommandCenterLane) {
  if (lane === "proof") return <ShieldCheckIcon className="size-4 text-muted-foreground" />
  if (lane === "operate") return <DatabaseIcon className="size-4 text-muted-foreground" />
  if (lane === "capture") return <SparklesIcon className="size-4 text-muted-foreground" />
  if (lane === "agent") return <TerminalSquareIcon className="size-4 text-muted-foreground" />
  if (lane === "admin") return <GaugeIcon className="size-4 text-muted-foreground" />
  return <ClipboardCheckIcon className="size-4 text-muted-foreground" />
}

function StatusBadge({ tone, label }: { tone: AdminReadinessTone; label?: string }) {
  return (
    <Badge variant={badgeVariant(tone)} className="w-fit">
      {label ?? toneLabels[tone]}
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

function ActionRow({ action }: { action: DailyCommandCenterAction }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          {laneIcon(action.lane)}
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {laneLabels[action.lane]}
          </span>
        </div>
      </td>
      <td className="max-w-sm px-4 py-3 align-top">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{action.title}</span>
            <StatusBadge tone={action.tone} label={action.status} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {action.actor} · {action.sourceScenario}
          </p>
        </div>
      </td>
      <td className="max-w-xl px-4 py-3 align-top text-muted-foreground">
        <p className="text-sm leading-relaxed">{action.signal}</p>
        <p className="mt-2 text-xs leading-relaxed">{action.boundary}</p>
      </td>
      <td className="max-w-md px-4 py-3 align-top">
        <div className="grid gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{action.linkedTask}</span> · {action.nextAction}
          </p>
          <Button variant="outline" size="sm" className="w-fit" render={<Link href={action.href} />}>
            {action.hrefLabel}
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

function EvidenceCheckRow({ row }: { row: OwnerEvidenceConsoleRow }) {
  return (
    <div className="grid gap-2 border-b px-4 py-3 text-sm last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{row.priority}. {row.surface}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.ownerAction}</p>
        </div>
        <StatusBadge tone={row.tone} label={row.status} />
      </div>
      <p className="break-all rounded-md bg-muted/50 px-2 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
        {row.command}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">{row.linkedTask}</span> · {row.passSignal}
      </p>
    </div>
  )
}

export default async function DashboardPage() {
  const commandCenter = await getDailyCommandCenter()
  const [primaryAction, ...nextActions] = commandCenter.actions
  const evidenceConsole = commandCenter.ownerEvidenceConsoleContract
  const today = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date())

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppHeader title="Daily Command Center" description={today} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-4 border-b px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <GaugeIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">Today&apos;s operating focus</h2>
                    <Badge variant="secondary">{commandCenter.id}</Badge>
                    <Badge variant="outline">{commandCenter.summary.launchLevel}</Badge>
                  </div>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                    {commandCenter.summary.primaryAction}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" render={<Link href="/admin" />}>
                  <GaugeIcon className="size-3.5" />
                  Admin
                </Button>
                <Button variant="outline" size="sm" render={<Link href="/settings" />}>
                  <LockIcon className="size-3.5" />
                  Settings
                </Button>
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Actions</p>
                <p className="mt-1 text-sm font-semibold">{commandCenter.summary.actionCount} queued</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {commandCenter.summary.warningCount} watch, {commandCenter.summary.blockedCount} blocked
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Next loop</p>
                <p className="mt-1 text-sm font-semibold">{commandCenter.summary.nextLoop}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {commandCenter.summary.nextRecommendedTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Generated</p>
                <p className="mt-1 text-sm font-semibold">{formatDate(commandCenter.generatedAt)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Server-loaded, protected, no-secret contract
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Write boundary</p>
                <p className="mt-1 text-sm font-semibold">Read-only</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {commandCenter.prohibitedWrites.slice(0, 3).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Owner evidence console</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{evidenceConsole.id}</Badge>
                <Badge variant="outline">{evidenceConsole.summary.blockedCount} blocked</Badge>
                <Badge variant="outline">{evidenceConsole.summary.ownerRunCount} owner-run</Badge>
              </div>
            </div>
            <div className="grid gap-4 border-b px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <p className="text-sm font-medium">Primary owner action</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {evidenceConsole.summary.primaryOwnerAction}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">No-secret boundary</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {evidenceConsole.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
            <div className="grid lg:grid-cols-3">
              {evidenceConsole.rows.slice(0, 3).map((row) => (
                <EvidenceCheckRow key={row.id} row={row} />
              ))}
            </div>
          </section>

          {primaryAction ? (
            <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div
                className={cn(
                  "rounded-lg border bg-background",
                  primaryAction.tone === "blocked"
                    ? "border-red-200"
                    : primaryAction.tone === "good"
                      ? "border-emerald-200"
                      : "border-amber-200"
                )}
              >
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    {toneIcon(primaryAction.tone)}
                    <h2 className="text-sm font-semibold">Now</h2>
                  </div>
                  <StatusBadge tone={primaryAction.tone} label={primaryAction.status} />
                </div>
                <div className="grid gap-4 p-4">
                  <div>
                    <p className="text-lg font-semibold leading-snug">{primaryAction.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {primaryAction.signal}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {primaryAction.linkedTask}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {primaryAction.nextAction}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Boundary</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {primaryAction.boundary}
                    </p>
                  </div>
                  <Button variant="default" size="lg" className="w-fit" render={<Link href={primaryAction.href} />}>
                    {primaryAction.hrefLabel}
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-background">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <ClipboardCheckIcon className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Next useful moves</h2>
                </div>
                <div className="divide-y">
                  {nextActions.slice(0, 3).map((action) => (
                    <div key={action.id} className="grid gap-2 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {laneIcon(action.lane)}
                          <p className="font-medium">{action.title}</p>
                        </div>
                        <StatusBadge tone={action.tone} label={action.status} />
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">{action.linkedTask}</span> · {action.nextAction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Action queue</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{commandCenter.status.replace(/_/g, " ")}</Badge>
                <Badge variant="outline">{commandCenter.source.scenarioContract}</Badge>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Lane</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">Signal</th>
                    <th className="px-4 py-3 text-left font-medium">Next</th>
                  </tr>
                </thead>
                <tbody>
                  {commandCenter.actions.map((action) => (
                    <ActionRow key={action.id} action={action} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
