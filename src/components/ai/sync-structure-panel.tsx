"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  MessageSquareIcon,
  UserIcon,
  LibraryIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useIngestion } from "@/lib/context/ingestion-context"
import {
  computeLineSyncStats,
  computeDriveSyncStats,
  type LINEChat,
  type DriveItem,
} from "@/types/sync-scope"
import { ResourceTree } from "@/components/ai/resource-tree"

// ─── Tab ──────────────────────────────────────────────────────────────────────

type Tab = "line" | "drive" | "resources"

// ─── LINE tree ────────────────────────────────────────────────────────────────

function LineChatRow({ chat, onToggle }: { chat: LINEChat; onToggle: (id: string) => void }) {
  const [expanded, setExpanded] = React.useState(false)
  const hasMessages = chat.recentMessages.length > 0

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent/40 transition-colors group">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-sidebar-foreground/30 hover:text-sidebar-foreground/60 flex-shrink-0"
          disabled={!hasMessages}
        >
          {hasMessages ? (
            expanded ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />
          ) : (
            <span className="size-3 inline-block" />
          )}
        </button>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={chat.isSelected}
          onChange={() => onToggle(chat.id)}
          className="size-3.5 rounded accent-primary flex-shrink-0"
        />

        {/* Icon */}
        <span className="flex-shrink-0 text-sidebar-foreground/50">
          {chat.type === "group" ? (
            <MessageSquareIcon className="size-3.5" />
          ) : (
            <UserIcon className="size-3.5" />
          )}
        </span>

        {/* Name + count */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-sidebar-foreground/80 truncate leading-tight">{chat.name}</p>
          <p className="text-[10px] text-sidebar-foreground/40">
            {chat.type === "group" ? `群組・${chat.memberCount} 人` : "私聊"}
          </p>
        </div>

        {/* Unread badge */}
        {chat.unreadSinceLastSync > 0 && (
          <span className="text-[9px] text-sidebar-foreground/40 whitespace-nowrap flex-shrink-0">
            {chat.unreadSinceLastSync} 則
          </span>
        )}
      </div>

      {/* Messages preview */}
      {expanded && hasMessages && (
        <div className="ml-8 space-y-1 pb-1">
          {chat.recentMessages.map((msg) => (
            <div key={msg.id} className="rounded-md bg-sidebar-accent/20 px-2.5 py-1.5">
              <p className="text-[10px] font-medium text-sidebar-foreground/60">{msg.authorName}</p>
              <p className="text-[10px] text-sidebar-foreground/50 leading-snug line-clamp-2">{msg.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Drive tree ───────────────────────────────────────────────────────────────

function DriveItemRow({
  item,
  depth,
  onToggle,
}: {
  item: DriveItem
  depth: number
  onToggle: (id: string) => void
}) {
  const [expanded, setExpanded] = React.useState(depth === 0 && item.type === "folder" && item.isSelected)
  const isFolder = item.type === "folder"
  const hasChildren = isFolder && (item.children?.length ?? 0) > 0

  const Icon = () => {
    if (isFolder) return expanded ? <FolderOpenIcon className="size-3.5 text-amber-500" /> : <FolderIcon className="size-3.5 text-amber-500" />
    if (item.type === "spreadsheet") return <FileSpreadsheetIcon className="size-3.5 text-emerald-500" />
    return <FileTextIcon className="size-3.5 text-blue-400" />
  }

  return (
    <div>
      <div
        className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent/40 transition-colors"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-sidebar-foreground/30 hover:text-sidebar-foreground/60 flex-shrink-0"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />
          ) : (
            <span className="size-3 inline-block" />
          )}
        </button>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={item.isSelected}
          onChange={() => onToggle(item.id)}
          className="mt-0.5 size-3.5 rounded accent-primary flex-shrink-0"
        />

        {/* Icon */}
        <span className="mt-0.5 flex-shrink-0">
          <Icon />
        </span>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-sidebar-foreground/80 leading-tight line-clamp-1">{item.name}</p>
          {!isFolder && item.wordCount && (
            <p className="text-[10px] text-sidebar-foreground/40">{item.wordCount.toLocaleString()} 字</p>
          )}
          {/* Preview chunk when expanded (file only) */}
          {!isFolder && expanded && item.previewChunk && (
            <p className="mt-1 text-[10px] text-sidebar-foreground/50 leading-snug line-clamp-3 border-l border-border/40 pl-2">
              {item.previewChunk}
            </p>
          )}
        </div>
      </div>

      {/* Children */}
      {isFolder && expanded && item.children?.map((child) => (
        <DriveItemRow key={child.id} item={child} depth={depth + 1} onToggle={onToggle} />
      ))}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface SyncStructurePanelProps {
  defaultTab?: Tab
}

export function SyncStructurePanel({ defaultTab = "line" }: SyncStructurePanelProps) {
  const { lineChats, driveRoot, resourceNodes, toggleLineChat, toggleDriveItem } = useIngestion()
  const [tab, setTab] = React.useState<Tab>(defaultTab)

  const lineStats  = computeLineSyncStats(lineChats)
  const driveStats = computeDriveSyncStats(driveRoot)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-2 border-b">
        <TabButton active={tab === "line"}  onClick={() => setTab("line")}>LINE</TabButton>
        <TabButton active={tab === "drive"} onClick={() => setTab("drive")}>雲端</TabButton>
        <TabButton active={tab === "resources"} onClick={() => setTab("resources")}>資源</TabButton>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1.5 px-1 space-y-0.5">
        {tab === "line" && lineChats.map((chat) => (
          <LineChatRow key={chat.id} chat={chat} onToggle={toggleLineChat} />
        ))}

        {tab === "drive" && driveRoot.map((item) => (
          <DriveItemRow key={item.id} item={item} depth={0} onToggle={toggleDriveItem} />
        ))}

        {tab === "resources" && <ResourceTree />}
      </div>

      {/* Stats footer */}
      <div className="border-t px-3 py-2 bg-sidebar-accent/10">
        {tab === "line" ? (
          <p className="text-[10px] text-sidebar-foreground/50 leading-snug">
            已選 {lineStats.groupCount} 個群組・{lineStats.directCount} 個私聊
            {lineStats.estimatedMessages > 0 && `・約 ${lineStats.estimatedMessages} 則訊息`}
          </p>
        ) : tab === "drive" ? (
          <p className="text-[10px] text-sidebar-foreground/50 leading-snug">
            已選 {driveStats.fileCount} 份文件
            {driveStats.estimatedWordCount > 0 && `・約 ${driveStats.estimatedWordCount.toLocaleString()} 字`}
          </p>
        ) : (
          <p className="text-[10px] text-sidebar-foreground/50 leading-snug">
            資源整理：{resourceNodes.length} 個項目
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md py-1 text-xs font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
      )}
    >
      {children}
    </button>
  )
}
