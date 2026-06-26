"use client"

import * as React from "react"
import {
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  PlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  CircleIcon,
  EyeIcon,
  LockIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
  createProjectDeliverable,
  updateProjectDeliverable,
  updateProjectDeliverableVisibility,
  deleteProjectDeliverable,
} from "@/app/actions/work"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { AddDeliverableDialog, type DeliverableDialogInput } from "@/components/work/deliverable/add-deliverable-dialog"
import type { ProjectDeliverable, DeliverableStatus, DeliverableVisibility } from "@/types/work"

// ─── helpers ──────────────────────────────────────────────────────────────────

const statusIcon: Record<DeliverableStatus, React.ReactNode> = {
  draft: <CircleIcon className="size-3 text-muted-foreground/50" />,
  delivered: <ClockIcon className="size-3 text-amber-500" />,
  approved: <CheckCircle2Icon className="size-3 text-emerald-500" />,
}

const statusLabel: Record<DeliverableStatus, string> = {
  draft: "草稿",
  delivered: "已交付",
  approved: "已核准",
}

function buildTree(nodes: ProjectDeliverable[], parentId: string | null) {
  return nodes.filter((n) => n.parentId === parentId)
}

// ─── FolderNode ───────────────────────────────────────────────────────────────

function FolderNode({
  node,
  allNodes,
  depth,
  onAdd,
  pendingNodeIds,
  onUpdateStatus,
  onToggleVisibility,
  onDelete,
}: {
  node: ProjectDeliverable
  allNodes: ProjectDeliverable[]
  depth: number
  onAdd: (parentId: string | null, type: "folder" | "file") => void
  pendingNodeIds: Set<string>
  onUpdateStatus: (id: string, status: DeliverableStatus) => void
  onToggleVisibility: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = React.useState(true)
  const children = buildTree(allNodes, node.id)

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer select-none"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => setExpanded((v) => !v)}
      >
        <ChevronRightIcon
          className={cn(
            "size-3.5 text-muted-foreground/60 transition-transform shrink-0",
            expanded && "rotate-90"
          )}
        />
        {expanded ? (
          <FolderOpenIcon className="size-3.5 text-amber-400 shrink-0" />
        ) : (
          <FolderIcon className="size-3.5 text-amber-400 shrink-0" />
        )}
        <span className="text-sm font-medium flex-1">{node.title}</span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          {/* + button */}
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center size-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <PlusIcon className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd(node.id, "folder")
                }}
              >
                <FolderIcon className="size-3.5" />
                新增資料夾
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd(node.id, "file")
                }}
              >
                <FileIcon className="size-3.5" />
                新增文件
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* delete button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(node.id)
            }}
            title="刪除資料夾"
            className="flex items-center justify-center size-5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2Icon className="size-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div>
          {children.map((child) =>
            child.type === "folder" ? (
              <FolderNode
                key={child.id}
                node={child}
                allNodes={allNodes}
                depth={depth + 1}
                onAdd={onAdd}
                pendingNodeIds={pendingNodeIds}
                onUpdateStatus={onUpdateStatus}
                onToggleVisibility={onToggleVisibility}
                onDelete={onDelete}
              />
            ) : (
              <FileNode
                key={child.id}
                node={child}
                depth={depth + 1}
                isPending={pendingNodeIds.has(child.id)}
                onUpdateStatus={onUpdateStatus}
                onToggleVisibility={onToggleVisibility}
                onDelete={onDelete}
              />
            )
          )}
          {children.length === 0 && (
            <div
              className="text-xs text-muted-foreground/40 py-1"
              style={{ paddingLeft: `${24 + (depth + 1) * 16}px` }}
            >
              空資料夾
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── FileNode ─────────────────────────────────────────────────────────────────

function FileNode({
  node,
  depth,
  isPending,
  onUpdateStatus,
  onToggleVisibility,
  onDelete,
}: {
  node: ProjectDeliverable
  depth: number
  isPending: boolean
  onUpdateStatus: (id: string, status: DeliverableStatus) => void
  onToggleVisibility: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-opacity",
        isPending && "opacity-70"
      )}
      style={{ paddingLeft: `${24 + depth * 16}px` }}
    >
      <FileIcon className="size-3.5 text-muted-foreground/50 shrink-0" />
      <span className="text-sm flex-1 min-w-0 truncate">{node.title}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {isPending ? (
          <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
        ) : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {statusIcon[node.status]}
                {statusLabel[node.status]}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                {(["draft", "delivered", "approved"] as const).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onUpdateStatus(node.id, status)}
                    disabled={status === node.status}
                  >
                    {statusIcon[status]}
                    {statusLabel[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => onToggleVisibility(node.id)}
              title={node.visibility === "client_visible" ? "改為內部" : "標記為客戶可見"}
              className={cn(
                "rounded p-0.5 transition-colors",
                node.visibility === "client_visible"
                  ? "text-blue-500 hover:bg-blue-500/10"
                  : "text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
              )}
            >
              {node.visibility === "client_visible" ? (
                <EyeIcon className="size-3" />
              ) : (
                <LockIcon className="size-3" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              title="刪除文件"
              className="rounded p-0.5 transition-colors opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2Icon className="size-3" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── DeliverableTree ──────────────────────────────────────────────────────────

interface DeliverableTreeProps {
  initialDeliverables: ProjectDeliverable[]
  projectId: string
}

export function DeliverableTree({ initialDeliverables, projectId }: DeliverableTreeProps) {
  const router = useRouter()
  const [nodes, setNodes] = React.useState(initialDeliverables)
  const [addState, setAddState] = React.useState<{
    open: boolean
    parentId: string | null
    defaultType: "folder" | "file"
    formKey: number
  }>({ open: false, parentId: null, defaultType: "file", formKey: 0 })
  const [isAdding, setIsAdding] = React.useState(false)
  const [pendingNodeIds, setPendingNodeIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [, startTransition] = React.useTransition()

  const roots = buildTree(nodes, null)

  function refreshProjectDetail() {
    startTransition(() => router.refresh())
  }

  function handleAdd(parentId: string | null, type: "folder" | "file") {
    setActionError(null)
    setAddState((state) => ({
      open: true,
      parentId,
      defaultType: type,
      formKey: state.formKey + 1,
    }))
  }

  async function handleDeleteNode(id: string) {
    if (pendingNodeIds.has(id)) return

    const node = nodes.find((item) => item.id === id)
    if (!node) return

    setActionError(null)
    setPendingNodeIds((prev) => new Set(prev).add(id))
    setNodes((prev) => prev.filter((item) => item.id !== id))

    try {
      const result = await deleteProjectDeliverable(id)

      if (!result.success) {
        setNodes((prev) => [...prev, node])
        setActionError(result.error)
      } else {
        refreshProjectDetail()
      }
    } catch {
      setNodes((prev) => [...prev, node])
      setActionError("刪除交付物失敗，請稍後再試")
    } finally {
      setPendingNodeIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleSave(data: DeliverableDialogInput) {
    if (isAdding) return false

    setActionError(null)
    setIsAdding(true)

    try {
      const result = await createProjectDeliverable(projectId, data)

      if (!result.success) {
        setActionError(result.error)
        return false
      }

      setNodes((prev) => [...prev, result.data])
      refreshProjectDetail()
      return true
    } catch {
      setActionError("新增交付物失敗，請稍後再試")
      return false
    } finally {
      setIsAdding(false)
    }
  }

  async function handleUpdateStatus(id: string, status: DeliverableStatus) {
    if (pendingNodeIds.has(id)) return

    const node = nodes.find((item) => item.id === id)
    if (!node || node.status === status) return

    const nextNode: ProjectDeliverable = { ...node, status }

    setActionError(null)
    setNodes((prev) => prev.map((item) => (item.id === id ? nextNode : item)))
    setPendingNodeIds((prev) => new Set(prev).add(id))

    try {
      const result = await updateProjectDeliverable(id, { status })

      if (!result.success) {
        setNodes((prev) => prev.map((item) => (item.id === id ? node : item)))
        setActionError(result.error)
        return
      }

      setNodes((prev) => prev.map((item) => (item.id === id ? result.data : item)))
      refreshProjectDetail()
    } catch {
      setNodes((prev) => prev.map((item) => (item.id === id ? node : item)))
      setActionError("更新交付物狀態失敗，請稍後再試")
    } finally {
      setPendingNodeIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleToggleVisibility(id: string) {
    if (pendingNodeIds.has(id)) return

    const node = nodes.find((item) => item.id === id)
    if (!node) return

    const visibility: DeliverableVisibility =
      node.visibility === "client_visible" ? "internal" : "client_visible"
    const nextNode: ProjectDeliverable = { ...node, visibility }

    setActionError(null)
    setNodes((prev) => prev.map((item) => (item.id === id ? nextNode : item)))
    setPendingNodeIds((prev) => new Set(prev).add(id))

    try {
      const result = await updateProjectDeliverableVisibility(id, visibility)

      if (!result.success) {
        setNodes((prev) => prev.map((item) => (item.id === id ? node : item)))
        setActionError(result.error)
        return
      }

      setNodes((prev) => prev.map((item) => (item.id === id ? result.data : item)))
      refreshProjectDetail()
    } catch {
      setNodes((prev) => prev.map((item) => (item.id === id ? node : item)))
      setActionError("更新交付物可見性失敗，請稍後再試")
    } finally {
      setPendingNodeIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </p>
      )}

      {roots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">尚無交付物</p>
          <button
            onClick={() => handleAdd(null, "folder")}
            className="text-xs text-primary hover:underline"
          >
            新增資料夾
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/60">
          {roots.map((root) =>
            root.type === "folder" ? (
              <FolderNode
                key={root.id}
                node={root}
                allNodes={nodes}
                depth={0}
                onAdd={handleAdd}
                pendingNodeIds={pendingNodeIds}
                onUpdateStatus={(id, status) => void handleUpdateStatus(id, status)}
                onToggleVisibility={(id) => void handleToggleVisibility(id)}
                onDelete={(id) => void handleDeleteNode(id)}
              />
            ) : (
              <FileNode
                key={root.id}
                node={root}
                depth={0}
                isPending={pendingNodeIds.has(root.id)}
                onUpdateStatus={(id, status) => void handleUpdateStatus(id, status)}
                onToggleVisibility={(id) => void handleToggleVisibility(id)}
                onDelete={(id) => void handleDeleteNode(id)}
              />
            )
          )}
        </div>
      )}

      {/* top-level add buttons */}
      <div className="flex items-center gap-3 mt-2 px-1">
        <button
          onClick={() => handleAdd(null, "folder")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3" />
          新增根目錄資料夾
        </button>
        <button
          onClick={() => handleAdd(null, "file")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3" />
          新增文件
        </button>
      </div>

      <AddDeliverableDialog
        key={addState.formKey}
        open={addState.open}
        defaultType={addState.defaultType}
        parentId={addState.parentId}
        allNodes={nodes}
        onClose={() => setAddState((s) => ({ ...s, open: false }))}
        onSave={handleSave}
        isSaving={isAdding}
        error={actionError}
      />
    </div>
  )
}
