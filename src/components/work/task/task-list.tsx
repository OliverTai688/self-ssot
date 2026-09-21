"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  addProjectTask,
  toggleProjectTaskComplete,
  deleteProjectTask,
} from "@/app/actions/work"
import { Button } from "@/components/ui/button"
import { TaskItem } from "@/components/work/task/task-item"
import { TaskSheet, type TaskSheetInput } from "@/components/work/task/task-sheet"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProjectTask, TaskStatus } from "@/types/work"

type FilterValue = "all" | TaskStatus

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) =>
      formatted.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

interface TaskListProps {
  initialTasks: ProjectTask[]
  projectId: string
}

export function TaskList({ initialTasks, projectId }: TaskListProps) {
  const { copy } = useProductLanguage()
  const taskCopy = copy.work.tasks
  const router = useRouter()
  const [tasks, setTasks] = React.useState<ProjectTask[]>(initialTasks)
  const [filter, setFilter] = React.useState<FilterValue>("all")
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)
  const [pendingTaskIds, setPendingTaskIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const [deletingTaskIds, setDeletingTaskIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [, startTransition] = React.useTransition()

  function refreshProjectDetail() {
    startTransition(() => router.refresh())
  }

  async function handleToggleDone(id: string) {
    if (pendingTaskIds.has(id)) return

    const task = tasks.find((t) => t.id === id)
    if (!task) return

    const nextTask: ProjectTask = {
      ...task,
      status: task.status === "done" ? "todo" : "done",
      completedAt: task.status === "done" ? undefined : new Date().toISOString(),
    }

    setActionError(null)
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? nextTask : t))
    )
    setPendingTaskIds((prev) => new Set(prev).add(id))

    try {
      const result = await toggleProjectTaskComplete(id)

      if (!result.success) {
        setTasks((prev) => prev.map((t) => (t.id === id ? task : t)))
        setActionError(taskCopy.errors.toggle)
        return
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? result.data : t))
      )
      refreshProjectDetail()
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)))
      setActionError(taskCopy.errors.toggle)
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleDeleteTask(id: string) {
    if (deletingTaskIds.has(id)) return

    const task = tasks.find((t) => t.id === id)
    if (!task) return

    setActionError(null)
    setDeletingTaskIds((prev) => new Set(prev).add(id))
    setTasks((prev) => prev.filter((t) => t.id !== id))

    try {
      const result = await deleteProjectTask(id)

      if (!result.success) {
        setTasks((prev) => [...prev, task].sort((a, b) => a.priority - b.priority))
        setActionError(taskCopy.errors.delete)
      } else {
        refreshProjectDetail()
      }
    } catch {
      setTasks((prev) => [...prev, task].sort((a, b) => a.priority - b.priority))
      setActionError(taskCopy.errors.delete)
    } finally {
      setDeletingTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleAddTask(task: TaskSheetInput) {
    if (isAdding) return false

    setActionError(null)
    setIsAdding(true)

    try {
      const result = await addProjectTask(projectId, task)

      if (!result.success) {
        setActionError(taskCopy.errors.add)
        return false
      }

      setTasks((prev) => [result.data, ...prev])
      refreshProjectDetail()
      return true
    } catch {
      setActionError(taskCopy.errors.add)
      return false
    } finally {
      setIsAdding(false)
    }
  }

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter)
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1
    if (a.status !== "done" && b.status === "done") return -1
    return a.priority - b.priority
  })

  const filters: { value: FilterValue; label: string }[] = [
    {
      value: "all",
      label: formatCopy(taskCopy.filters.allTemplate, { count: tasks.length }),
    },
    { value: "todo", label: taskCopy.statuses.todo },
    { value: "in_progress", label: taskCopy.statuses.in_progress },
    { value: "done", label: taskCopy.statuses.done },
    { value: "blocked", label: taskCopy.statuses.blocked },
  ]

  return (
    <div className="flex flex-col gap-3">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                filter === value
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setActionError(null)
            setSheetOpen(true)
          }}
        >
          <PlusIcon className="size-3.5" />
          {taskCopy.addTask}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? taskCopy.emptyAll : taskCopy.emptyFiltered}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isPending={pendingTaskIds.has(task.id)}
              isDeleting={deletingTaskIds.has(task.id)}
              onToggleDone={(id) => void handleToggleDone(id)}
              onDelete={(id) => void handleDeleteTask(id)}
            />
          ))}
        </div>
      )}

      <TaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleAddTask}
        isSaving={isAdding}
        error={actionError}
      />
    </div>
  )
}
