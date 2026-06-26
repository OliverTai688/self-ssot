import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RouteStateTone = "neutral" | "good" | "warn" | "blocked"

export type RouteStateRow = {
  label: string
  detail: string
  status?: string
  tone?: RouteStateTone
  icon?: ReactNode
}

type RouteStatePanelProps = {
  eyebrow: string
  title: string
  description: string
  badge?: string
  badgeTone?: RouteStateTone
  icon?: ReactNode
  rows?: RouteStateRow[]
  actions?: ReactNode
  footer?: ReactNode
  surface?: "screen" | "dashboard"
  className?: string
}

const badgeVariantByTone: Record<RouteStateTone, "secondary" | "outline" | "destructive"> = {
  neutral: "outline",
  good: "secondary",
  warn: "outline",
  blocked: "destructive",
}

const iconClassByTone: Record<RouteStateTone, string> = {
  neutral: "border-border bg-muted/40 text-muted-foreground",
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
}

export function RouteStatePanel({
  eyebrow,
  title,
  description,
  badge,
  badgeTone = "neutral",
  icon,
  rows = [],
  actions,
  footer,
  surface = "screen",
  className,
}: RouteStatePanelProps) {
  return (
    <main
      className={cn(
        "flex bg-background text-foreground",
        surface === "dashboard" ? "h-full min-h-[520px] px-4 py-6 sm:px-6" : "min-h-screen px-5 py-10",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-5">
        <section className="rounded-lg border bg-background">
          <div className="grid gap-6 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg border",
                    iconClassByTone[badgeTone]
                  )}
                >
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</p>
                  {badge && (
                    <Badge variant={badgeVariantByTone[badgeTone]} className="mt-1">
                      {badge}
                    </Badge>
                  )}
                </div>
              </div>

              <h1 className="mt-5 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                {description}
              </p>

              {actions && <div className="mt-5 flex flex-col gap-2 sm:flex-row">{actions}</div>}
            </div>

            <div className="rounded-lg border bg-muted/20">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Route boundary</h2>
              </div>
              <div className="divide-y">
                {rows.map((row) => (
                  <div key={row.label} className="grid gap-2 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {row.icon}
                        <p className="truncate font-medium">{row.label}</p>
                      </div>
                      {row.status && (
                        <Badge variant={badgeVariantByTone[row.tone ?? "neutral"]} className="shrink-0">
                          {row.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{row.detail}</p>
                  </div>
                ))}
                {rows.length === 0 && (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    This state exposes no private records, raw provider payloads, or environment values.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {footer && (
          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </main>
  )
}
