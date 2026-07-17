import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AssetBadge, BadgeTone } from "@/lib/file-library/file-asset-status"

const TONE_CLASSNAME: Record<BadgeTone, string> = {
  neutral: "border-border text-muted-foreground bg-muted/40",
  success: "border-emerald-500/20 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  warning: "border-amber-500/20 text-amber-600 bg-amber-500/10 dark:text-amber-400",
  danger: "border-destructive/20 text-destructive bg-destructive/10",
  info: "border-blue-500/20 text-blue-600 bg-blue-500/10 dark:text-blue-400",
}

export function FileStatusBadges({ badges, className }: { badges: AssetBadge[]; className?: string }) {
  if (badges.length === 0) return null
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {badges.map((badge) => (
        <Badge
          key={badge.key}
          variant="outline"
          className={cn("rounded-full font-normal", TONE_CLASSNAME[badge.tone])}
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  )
}
