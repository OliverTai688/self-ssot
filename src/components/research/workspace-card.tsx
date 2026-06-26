"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

interface WorkspaceCardProps {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  stats: { label: string; value: number }[]
  accentColor?: string
}

export function WorkspaceCard({ title, description, href, icon, stats }: WorkspaceCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <ArrowRightIcon className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
      </div>
      <div className="relative space-y-1">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="relative flex items-center gap-4 pt-1 border-t border-border/50">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1">
            <span className="text-base font-bold text-foreground tabular-nums">{s.value}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </Link>
  )
}
