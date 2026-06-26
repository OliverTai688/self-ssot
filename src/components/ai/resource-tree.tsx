"use client"

import * as React from "react"
import {
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  LinkIcon,
  FileIcon,
  PlusIcon,
  Trash2Icon,
  ExternalLinkIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useIngestion } from "@/lib/context/ingestion-context"
import type { ResourceNode, ResourceNodeType } from "@/types/ingestion"

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildTree(nodes: ResourceNode[], parentId: string | null) {
  return nodes.filter((n) => n.parentId === parentId)
}

// ─── FolderNode ───────────────────────────────────────────────────────────────

function FolderNode({
  node,
  allNodes,
  depth,
  onAdd,
  onDelete,
}: {
  node: ResourceNode
  allNodes: ResourceNode[]
  depth: number
  onAdd: (parentId: string | null, type: ResourceNodeType) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = React.useState(true)
  const children = buildTree(allNodes, node.id)

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-sidebar-accent/50 cursor-pointer select-none"
        style={{ paddingLeft: `${4 + depth * 12}px` }}
        onClick={() => setExpanded((v) => !v)}
      >
        <ChevronRightIcon
          className={cn(
            "size-3 text-sidebar-foreground/40 transition-transform shrink-0",
            expanded && "rotate-90"
          )}
        />
        {expanded ? (
          <FolderOpenIcon className="size-3.5 text-amber-500/80 shrink-0" />
        ) : (
          <FolderIcon className="size-3.5 text-amber-500/80 shrink-0" />
        )}
        <span className="text-[11px] font-medium text-sidebar-foreground/80 flex-1 truncate">{node.title}</span>

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="size-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/40 hover:text-sidebar-foreground"
            >
              <PlusIcon className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-32">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdd(node.id, "folder") }}>
                <FolderIcon className="size-3.5" />
                新資料夾
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdd(node.id, "link") }}>
                <LinkIcon className="size-3.5" />
                新連結
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdd(node.id, "file") }}>
                <FileIcon className="size-3.5" />
                新 Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
            className="size-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/40 hover:text-destructive transition-colors"
          >
            <Trash2Icon className="size-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-0.5">
          {children.map((child) =>
            child.type === "folder" ? (
              <FolderNode
                key={child.id}
                node={child}
                allNodes={allNodes}
                depth={depth + 1}
                onAdd={onAdd}
                onDelete={onDelete}
              />
            ) : (
              <ResourceLeafNode key={child.id} node={child} depth={depth + 1} onDelete={onDelete} />
            )
          )}
          {children.length === 0 && (
            <div
              className="text-[10px] text-sidebar-foreground/30 py-1"
              style={{ paddingLeft: `${24 + depth * 12}px` }}
            >
              (空)
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ResourceLeafNode ──────────────────────────────────────────────────────────

function ResourceLeafNode({
  node,
  depth,
  onDelete,
}: {
  node: ResourceNode
  depth: number
  onDelete: (id: string) => void
}) {
  const Icon = node.type === "link" ? LinkIcon : FileIcon
  
  return (
    <div
      className="group flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-sidebar-accent/50"
      style={{ paddingLeft: `${20 + depth * 12}px` }}
    >
      <Icon className={cn("size-3.5 shrink-0", node.type === "link" ? "text-blue-400/70" : "text-sidebar-foreground/40")} />
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-[11px] text-sidebar-foreground/80 truncate leading-tight">{node.title}</span>
        {node.url && (
          <span className="text-[9px] text-sidebar-foreground/30 truncate flex items-center gap-1">
            {node.url}
            <ExternalLinkIcon className="size-2" />
          </span>
        )}
      </div>
      <button
        onClick={() => onDelete(node.id)}
        className="size-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2Icon className="size-3" />
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResourceTree() {
  const { resourceNodes, addResourceNode, deleteResourceNode, mockUploadMarkdown } = useIngestion()
  const roots = buildTree(resourceNodes, null)

  function handleAdd(parentId: string | null, type: ResourceNodeType) {
    if (type === "file") {
      mockUploadMarkdown(parentId)
      return
    }
    
    const title = type === "folder" ? "未命名資料夾" : "新連結"
    addResourceNode({
      parentId,
      type,
      title,
      url: type === "link" ? "https://" : undefined,
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto py-2 px-1 space-y-1">
        {roots.length === 0 ? (
          <div className="px-4 py-8 text-center border border-dashed border-sidebar-border/50 rounded-lg mx-2">
            <p className="text-[10px] text-sidebar-foreground/40">尚無整理資源</p>
            <button
              onClick={() => handleAdd(null, "folder")}
              className="text-[10px] text-primary hover:underline mt-1"
            >
              建立第一個資料夾
            </button>
          </div>
        ) : (
          roots.map((root) =>
            root.type === "folder" ? (
              <FolderNode
                key={root.id}
                node={root}
                allNodes={resourceNodes}
                depth={0}
                onAdd={handleAdd}
                onDelete={deleteResourceNode}
              />
            ) : (
              <ResourceLeafNode key={root.id} node={root} depth={0} onDelete={deleteResourceNode} />
            )
          )
        )}
      </div>

      <div className="border-t border-sidebar-border/40 p-2 flex items-center gap-2">
        <button
          onClick={() => handleAdd(null, "folder")}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-sidebar-accent/30 text-[10px] font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <PlusIcon className="size-3" />
          新增資料夾
        </button>
        <button
          onClick={() => handleAdd(null, "link")}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-sidebar-accent/30 text-[10px] font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <PlusIcon className="size-3" />
          新增連結
        </button>
        <button
          onClick={() => handleAdd(null, "file")}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-sidebar-accent/30 text-[10px] font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <PlusIcon className="size-3" />
          新增 Markdown
        </button>
      </div>
    </div>
  )
}
