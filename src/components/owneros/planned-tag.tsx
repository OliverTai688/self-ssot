import { cn } from "@/lib/utils"

/**
 * Single-word marker for a feature that is planned but not yet real —
 * no description, no task id, no timeline. Use instead of a "Coming
 * soon" sentence, a disabled button with a long tooltip, or a governance
 * badge wall. See `ui-cleanup-repair-plan.md` §3.2.
 */
export function PlannedTag({ label = "規劃中", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  )
}
