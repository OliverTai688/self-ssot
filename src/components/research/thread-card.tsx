"use client"

import * as React from "react"
import Link from "next/link"
import { FlaskConicalIcon, LightbulbIcon, BookOpenIcon, TargetIcon, SparklesIcon, ArrowRightIcon } from "lucide-react"

import { ResearchThread, ResearchIdea, ResearchMaterial, PublicationTarget } from "@/types/research"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface ThreadCardProps {
  thread: ResearchThread
  ideas: ResearchIdea[]
  materials: ResearchMaterial[]
  targets: PublicationTarget[]
}

const statusConfig: Record<ResearchThread["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  exploring: { label: "想法探索", variant: "outline" },
  active: { label: "研究進行中", variant: "default" },
  writing: { label: "論文撰寫", variant: "secondary" },
  published: { label: "已發表", variant: "outline" },
  paused: { label: "已暫停", variant: "outline" },
}

export function ThreadCard({ thread, ideas, materials, targets }: ThreadCardProps) {
  const cfg = statusConfig[thread.status]
  
  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all hover:border-primary/20">
      <div className="space-y-3.5">
        {/* Top header */}
        <div className="flex items-start justify-between gap-3">
          <Badge variant={cfg.variant} className="text-[10px]">
            {cfg.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground/60">
            更新於 {new Date(thread.updatedAt).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
            {thread.title}
          </h3>
          {thread.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
              {thread.description}
            </p>
          )}
        </div>

        {/* Work linkage */}
        {thread.workLinkage && (
          <div className="rounded-lg bg-primary/[0.03] dark:bg-primary/[0.05] border border-primary/10 px-3 py-2 flex gap-1.5 items-start">
            <SparklesIcon className="size-3.5 text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-primary leading-none">工作跨界連結</span>
              <span className="text-[10px] text-muted-foreground leading-normal line-clamp-1">
                {thread.workLinkage}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Counts and button footer */}
      <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between gap-4">
        {/* Counts */}
        <div className="flex items-center gap-3.5 text-muted-foreground">
          <div className="flex items-center gap-1" title="靈感數">
            <LightbulbIcon className="size-3.5 text-amber-500" />
            <span className="text-xs tabular-nums">{ideas.length}</span>
          </div>
          <div className="flex items-center gap-1" title="文獻數">
            <BookOpenIcon className="size-3.5 text-blue-500" />
            <span className="text-xs tabular-nums">{materials.length}</span>
          </div>
          <div className="flex items-center gap-1" title="目標 Venue 數">
            <TargetIcon className="size-3.5 text-emerald-500" />
            <span className="text-xs tabular-nums">{targets.length}</span>
          </div>
        </div>

        {/* Link button */}
        <Link
          href={`/research/${thread.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform"
        >
          進入沙盒
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
