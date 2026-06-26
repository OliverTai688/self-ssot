"use client"

import { ClockIcon, EyeIcon, Loader2Icon, LockIcon, SparklesIcon, Trash2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { ProjectTask, TaskStatus } from "@/types/work"

const statusLabels: Record<TaskStatus, string> = {
  todo: "待辦",
  in_progress: "進行中",
  done: "完成",
  blocked: "阻塞",
}

const statusColors: Record<TaskStatus, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-blue-600 dark:text-blue-400",
  done: "text-emerald-600 dark:text-emerald-400",
  blocked: "text-destructive",
}

const priorityLabels: Record<number, string> = { 1: "高", 2: "中", 3: "低" }

interface TaskItemProps {
  task: ProjectTask
  onToggleDone: (id: string) => void
  onDelete: (id: string) => void
  isPending?: boolean
  isDeleting?: boolean
}

export function TaskItem({ task, onToggleDone, onDelete, isPending = false, isDeleting = false }: TaskItemProps) {
  const isDone = task.status === "done"

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-opacity",
        isDone && "opacity-50",
        (isPending || isDeleting) && "opacity-70"
      )}
    >
      <div className="mt-0.5 grid size-4 shrink-0 place-items-center">
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Checkbox
            checked={isDone}
            onCheckedChange={() => onToggleDone(task.id)}
            className="shrink-0"
            disabled={isPending}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <p className={cn("text-sm leading-snug", isDone && "line-through text-muted-foreground")}>
          {task.title}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn("text-[11px] font-medium", statusColors[task.status])}>
            {statusLabels[task.status]}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-[11px] text-muted-foreground">
            P{task.priority} {priorityLabels[task.priority]}
          </span>

          {task.visibility === "client_visible" ? (
            <span className="flex items-center gap-0.5 text-[11px] text-blue-600 dark:text-blue-400">
              <EyeIcon className="size-3" />
              客戶可見
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground/60">
              <LockIcon className="size-3" />
              內部
            </span>
          )}

          {task.source === "ai_suggested" && (
            <span className="flex items-center gap-0.5 text-[11px] text-primary/70">
              <SparklesIcon className="size-3" />
              AI 建議
            </span>
          )}

          {task.dueAt && (
            <span className={cn(
              "flex items-center gap-0.5 text-[11px]",
              new Date(task.dueAt) < new Date() && !isDone ? "text-destructive" : "text-muted-foreground"
            )}>
              <ClockIcon className="size-3" />
              {new Date(task.dueAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {task.status === "blocked" && (
          <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
            阻塞
          </Badge>
        )}
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          disabled={isPending || isDeleting}
          title="刪除任務"
          className={cn(
            "rounded p-1 transition-colors opacity-0 group-hover:opacity-100",
            "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10",
            (isPending || isDeleting) && "cursor-not-allowed"
          )}
        >
          {isDeleting ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <Trash2Icon className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
