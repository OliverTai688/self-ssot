"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeftIcon, SparklesIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { AIFeedbackPanel } from "@/components/research/ai-feedback-panel"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  idea: "bg-muted text-muted-foreground",
  outline: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  drafting: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  reviewing: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  submitted: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  accepted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

const statusLabels: Record<string, string> = {
  idea: "想法", outline: "大綱中", drafting: "草稿中",
  reviewing: "評審中", submitted: "已投稿", accepted: "已錄取", rejected: "已拒稿",
}

const sectionStatusColors: Record<string, string> = {
  empty: "bg-muted text-muted-foreground",
  draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  needs_evidence: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  reviewed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  revised: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
}

const sectionStatusLabels: Record<string, string> = {
  empty: "空白", draft: "草稿", needs_evidence: "需補據", reviewed: "已審", revised: "已修",
}

export default function WritingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const writingProjectId = params.writingProjectId as string

  const { writingProjects, writingSections, feedbackRuns } = useResearch()

  const project = writingProjects.find((w) => w.id === writingProjectId)
  const sections = writingSections.filter((s) => s.writingProjectId === writingProjectId).sort((a, b) => a.order - b.order)
  const projectFeedback = feedbackRuns.filter((f) => f.targetType === "writing_project" && f.targetId === writingProjectId)

  const [activeSection, setActiveSection] = React.useState<string | null>(sections[0]?.id ?? null)
  const [draftText, setDraftText] = React.useState("")

  const currentSection = sections.find((s) => s.id === activeSection)

  React.useEffect(() => {
    if (currentSection) setDraftText(currentSection.body)
  }, [currentSection])

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">找不到此寫作專案</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <AppHeader title={project.title} description="三欄式寫作視圖 · AI 多視角評審" />

      <div className="border-b px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/research/writing")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" /> 返回寫作列表
        </button>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusColors[project.status]}`}>
          {statusLabels[project.status]}
        </span>
        {project.targetVenueName && (
          <span className="text-[10px] text-muted-foreground">目標: {project.targetVenueName}</span>
        )}
      </div>

      {/* Three-column layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Outline */}
        <div className="w-56 shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">大綱</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sections.length === 0 ? (
              <p className="text-[11px] text-muted-foreground px-3 py-4 text-center">尚無章節</p>
            ) : sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-[11px] transition-colors",
                  activeSection === sec.id ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="line-clamp-2 leading-snug">{sec.title}</span>
                  <span className={`text-[9px] px-1 py-0.5 rounded shrink-0 ${sectionStatusColors[sec.status]}`}>
                    {sectionStatusLabels[sec.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Draft Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              {currentSection ? currentSection.title : "選擇章節"}
            </p>
            {currentSection && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${sectionStatusColors[currentSection.status]}`}>
                {sectionStatusLabels[currentSection.status]}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {currentSection ? (
              <textarea
                className="w-full h-full min-h-[400px] bg-transparent text-sm text-foreground leading-relaxed outline-none resize-none placeholder:text-muted-foreground/40"
                placeholder="開始撰寫此章節…"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">請從左側大綱選擇章節</p>
              </div>
            )}
          </div>
          {currentSection?.aiNotes && currentSection.aiNotes.length > 0 && (
            <div className="border-t border-border/50 px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary">
                <SparklesIcon className="size-3" /> AI 建議
              </div>
              {currentSection.aiNotes.map((note, i) => (
                <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">· {note}</p>
              ))}
            </div>
          )}
        </div>

        {/* Right: AI Feedback */}
        <div className="w-80 shrink-0 border-l border-border flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border/50 flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 text-primary" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">AI 評審</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {projectFeedback.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center">
                <SparklesIcon className="size-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-[11px] text-muted-foreground">尚無 AI 評審記錄</p>
              </div>
            ) : projectFeedback.map((fb) => (
              <AIFeedbackPanel key={fb.id} feedback={fb} defaultExpanded={projectFeedback.length === 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
