"use client"

import * as React from "react"
import {
  CheckCircle2Icon,
  CircleIcon,
  DatabaseIcon,
  LockIcon,
  ShieldCheckIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMockDataMode } from "@/lib/context/mock-data-mode-context"
import { useModulePermissions } from "@/lib/context/module-permissions-context"
import { cn } from "@/lib/utils"
import {
  ALL_MODULES,
  type ModuleKey,
  type ModulePermissionSnapshot,
  type UserRole,
} from "@/types/module-permission"

const roleOptions: Array<{ id: UserRole; label: string; description: string }> = [
  { id: "owner", label: "Owner", description: "完整私人操作模式" },
  { id: "partner", label: "Partner", description: "合作檢視模擬" },
  { id: "client", label: "Client", description: "外部視角模擬" },
]

const sourceRows = [
  {
    source: "Supabase Auth",
    scope: "Email magic link session",
    status: "等待環境",
    boundary: "只允許既有使用者登入，不自動建立 Profile",
  },
  {
    source: "Work PostgreSQL",
    scope: "Projects, tasks, notes, deliverables",
    status: "DB-backed",
    boundary: "所有讀寫仍經由 requireUser 與 Work service ownership checks",
  },
  {
    source: "LINE / Telegram",
    scope: "Messaging source intake",
    status: "未連線",
    boundary: "DATTR-011 前不可建立 webhook、背景抓取或 final writes",
  },
  {
    source: "Google Drive / Docs",
    scope: "Document source intake",
    status: "未連線",
    boundary: "目前只保留 UI placeholder，不讀取外部文件",
  },
  {
    source: "Gmail / RSS / GitHub",
    scope: "Future source adapters",
    status: "未連線",
    boundary: "需先完成 SourceConnection BFF 與隱私策略",
  },
]

const permissionSourceLabels: Record<ModulePermissionSnapshot["source"], string> = {
  database: "DB hybrid",
  role_default: "Role default",
  browser_override: "Browser override",
  unauthenticated: "Unauthenticated",
}

function StatusDot({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <CheckCircle2Icon className="size-4 text-emerald-600" />
  ) : (
    <CircleIcon className="size-4 text-muted-foreground/50" />
  )
}

export function SettingsClient({
  permissionSnapshot,
}: {
  permissionSnapshot: ModulePermissionSnapshot
}) {
  const {
    role,
    setRole,
    enabledModules,
    toggleModule,
    permissionSource,
    dbPermissionRows,
    unknownModuleRows,
    resetToServerPermissions,
  } = useModulePermissions()
  const { isMockDataEnabled, toggleMockData } = useMockDataMode()

  const enabledSet = React.useMemo(() => new Set<ModuleKey>(enabledModules), [enabledModules])
  const disabledCount = ALL_MODULES.length - enabledModules.length

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border bg-background">
        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Prototype role and module access</h2>
            <p className="text-xs text-muted-foreground">
              Server permission snapshot with optional browser rehearsal override. Runtime authorization still lives on the server.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={permissionSource === "database" ? "secondary" : "outline"} className="w-fit">
              {permissionSourceLabels[permissionSource]}
            </Badge>
            {permissionSource === "browser_override" && (
              <Button type="button" variant="ghost" size="sm" onClick={resetToServerPermissions}>
                Reset server
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[280px_1fr]">
          <div className="flex flex-col gap-2">
            <div className="rounded-lg border border-dashed px-3 py-3 text-xs leading-relaxed text-muted-foreground">
              Server source: {permissionSourceLabels[permissionSnapshot.source]}; DB rows:{" "}
              {permissionSnapshot.dbPermissionRows}; active rows: {dbPermissionRows}; unknown rows:{" "}
              {unknownModuleRows}; enabled: {enabledModules.length}; hidden: {disabledCount}.
            </div>
            {roleOptions.map((option) => {
              const active = role === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRole(option.id)}
                  className={cn(
                    "flex min-h-16 items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="text-xs leading-snug">{option.description}</span>
                  </span>
                  <StatusDot enabled={active} />
                </button>
              )
            })}
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="hidden md:table-cell">Path</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="text-right">Toggle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_MODULES.map((module) => {
                  const enabled = enabledSet.has(module.key)
                  return (
                    <TableRow key={module.key}>
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{module.name}</span>
                          <span className="max-w-xl text-xs leading-snug text-muted-foreground">
                            {module.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {module.path}
                      </TableCell>
                      <TableCell>
                        <Badge variant={enabled ? "secondary" : "outline"}>
                          {enabled ? "enabled" : "hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${enabled ? "Disable" : "Enable"} ${module.name}`}
                          title={`${enabled ? "Disable" : "Enable"} ${module.name}`}
                          onClick={() => toggleModule(module.key)}
                        >
                          {enabled ? (
                            <ToggleRightIcon className="size-4 text-emerald-600" />
                          ) : (
                            <ToggleLeftIcon className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-lg border bg-background">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Data mode boundary</h2>
              <p className="text-xs text-muted-foreground">
                Formal mode hides mock source/workflow rows where the module supports it.
              </p>
            </div>
            <DatabaseIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {isMockDataEnabled ? "Mock data is visible" : "Formal mode is active"}
                </span>
                <span className="text-xs leading-snug text-muted-foreground">
                  {isMockDataEnabled
                    ? "Use this for demo and UI rehearsal; do not treat mock rows as production data."
                    : "Mock-only source/workflow rows are hidden where formal gating is implemented."}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={toggleMockData}>
                {isMockDataEnabled ? "Switch formal" : "Show mock"}
              </Button>
            </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-900">
              This switch is a client-side readiness control. It is not a database persistence layer or a security permission source.
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-background">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Source connection boundaries</h2>
              <p className="text-xs text-muted-foreground">
                Connection placeholders remain read-only until adapter security and BFF persistence are selected.
              </p>
            </div>
            <ShieldCheckIcon className="size-4 text-muted-foreground" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Boundary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceRows.map((row) => (
                <TableRow key={row.source}>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{row.source}</span>
                      <span className="text-xs leading-snug text-muted-foreground">{row.scope}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === "DB-backed" ? "secondary" : "outline"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-lg whitespace-normal text-xs leading-relaxed text-muted-foreground lg:table-cell">
                    {row.boundary}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-lg border bg-background">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <LockIcon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Write boundaries</h2>
        </div>
        <div className="grid gap-3 p-4 text-sm md:grid-cols-3">
          <div className="rounded-lg bg-muted/40 px-3 py-3">
            <p className="font-medium">Allowed now</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Inspect auth readiness, read the server module snapshot, rehearse module visibility, and switch mock/formal display mode.
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-3">
            <p className="font-medium">Not implemented here</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              No profile edits, module permission DB writes, connector OAuth, or source sync operations from this screen.
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-3">
            <p className="font-medium">Next backend step</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Persisted writes need a separate server action with input validation, audit trail, and service authorization.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
