"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon, CheckIcon, AlertTriangleIcon, HelpCircleIcon, ZapIcon } from "lucide-react"
import { AIFeedbackRun } from "@/types/research"

const perspectiveLabels: Record<string, string> = {
  method_reviewer: "方法論評審",
  theory_reviewer: "理論評審",
  domain_expert: "領域專家",
  critical_reviewer: "批判性評審",
  friendly_mentor: "指導教授",
  conference_chair: "會議主席",
  journal_editor: "期刊編輯",
}

const perspectiveColors: Record<string, string> = {
  method_reviewer: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  theory_reviewer: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  domain_expert: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  critical_reviewer: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  friendly_mentor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  conference_chair: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  journal_editor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
}

interface AIFeedbackPanelProps {
  feedback: AIFeedbackRun
  defaultExpanded?: boolean
}

export function AIFeedbackPanel({ feedback, defaultExpanded = false }: AIFeedbackPanelProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-left">
          <SparklesIcon className="size-4 text-primary shrink-0" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${perspectiveColors[feedback.perspective]}`}>
                {perspectiveLabels[feedback.perspective]}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(feedback.createdAt).toLocaleDateString("zh-TW")}
              </span>
            </div>
            <p className="text-xs text-foreground leading-relaxed text-left line-clamp-2">{feedback.summary}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUpIcon className="size-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDownIcon className="size-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {feedback.strengths.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="size-3" /> 優點
              </div>
              <ul className="space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <span className="text-emerald-500 shrink-0 mt-0.5">·</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {feedback.weaknesses.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                <AlertTriangleIcon className="size-3" /> 待改進
              </div>
              <ul className="space-y-1">
                {feedback.weaknesses.map((w, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <span className="text-rose-500 shrink-0 mt-0.5">·</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {feedback.questions.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                <HelpCircleIcon className="size-3" /> 審稿人可能的問題
              </div>
              <ul className="space-y-1">
                {feedback.questions.map((q, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-500 shrink-0 mt-0.5">?</span> {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {feedback.actionItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary">
                <ZapIcon className="size-3" /> 行動項目
              </div>
              <ul className="space-y-1">
                {feedback.actionItems.map((a, i) => (
                  <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5 font-medium">
                    <span className="text-primary shrink-0 mt-0.5">→</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
