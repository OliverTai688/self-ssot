import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCardProps extends React.ComponentProps<typeof Card> {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    isUp: boolean
  }
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span
                className={cn(
                  "mr-1 font-medium",
                  trend.isUp ? "text-emerald-500" : "text-red-500"
                )}
              >
                {trend.isUp ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
            {description}
            {trend && trend.label && ` ${trend.label}`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
