"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProjectStatus } from "@/types/work"

export type StatusFilter = ProjectStatus | "all"
export type SortKey = "updatedAt" | "dueAt" | "name"

interface ProjectFilterBarProps {
  statusFilter: StatusFilter
  sortKey: SortKey
  onStatusChange: (v: StatusFilter) => void
  onSortChange: (v: SortKey) => void
}

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "active", label: "進行中" },
  { value: "paused", label: "暫停" },
  { value: "completed", label: "完成" },
  { value: "archived", label: "封存" },
]

export function ProjectFilterBar({
  statusFilter,
  sortKey,
  onStatusChange,
  onSortChange,
}: ProjectFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Tabs value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
        <TabsList variant="line">
          {statusTabs.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Select value={sortKey} onValueChange={(v) => onSortChange(v as SortKey)}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updatedAt">最近更新</SelectItem>
          <SelectItem value="dueAt">截止日</SelectItem>
          <SelectItem value="name">名稱</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
