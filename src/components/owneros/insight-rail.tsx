import { cn } from "@/lib/utils"

export interface InsightRailItem {
  label: string
  value: string | number
  tone?: "default" | "warn" | "good"
}

/**
 * Compact narrow-column stat list used as a page's secondary rail
 * (e.g. "待確認 3 / 已引用來源 5 / 最近對話 2"). Keeps the first viewport to
 * a handful of numbers instead of full summary cards. See RPT-066 §4.
 */
export function InsightRail({ items, className }: { items: InsightRailItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/60 bg-muted/10 text-center sm:grid-cols-1 sm:divide-x-0 sm:divide-y", className)}>
      {items.map((item) => (
        <div key={item.label} className="px-3 py-2.5 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p
            className={cn(
              "mt-0.5 text-sm font-semibold sm:mt-0",
              item.tone === "warn" && "text-amber-700",
              item.tone === "good" && "text-emerald-700"
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
