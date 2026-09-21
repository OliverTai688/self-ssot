"use client"

import * as React from "react"
import {
  CheckCircle2Icon,
  CircleIcon,
  LinkIcon,
  ShieldCheckIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailList,
  DetailListRow,
  FormDialog,
} from "@/components/owneros/control-plane-shell"
import { useLocalEntities } from "@/lib/owneros/use-local-entities"
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

interface SourceConnection {
  id: string
  source: string
  scope: string
  status: string
  boundary: string
  connected: boolean
  connectable: boolean
}

const seedSourceConnections: SourceConnection[] = [
  {
    id: "supabase-auth",
    source: "Supabase Auth",
    scope: "Email magic link session",
    status: "等待環境",
    boundary: "只允許既有使用者登入，不自動建立 Profile。",
    connected: false,
    connectable: false,
  },
  {
    id: "work-postgres",
    source: "Work PostgreSQL",
    scope: "Projects, tasks, notes, deliverables",
    status: "DB-backed",
    boundary: "所有讀寫仍經由 requireUser 與 Work service ownership checks。",
    connected: true,
    connectable: false,
  },
  {
    id: "line-telegram",
    source: "LINE / Telegram",
    scope: "Messaging source intake",
    status: "未連線",
    boundary: "來源連線核准前不可建立 webhook、背景抓取或正式寫入。",
    connected: false,
    connectable: true,
  },
  {
    id: "google-drive",
    source: "Google Drive / Docs",
    scope: "Document source intake",
    status: "未連線",
    boundary: "目前只保留 UI placeholder，不讀取外部文件。",
    connected: false,
    connectable: true,
  },
  {
    id: "gmail-rss-github",
    source: "Gmail / RSS / GitHub",
    scope: "Future source adapters",
    status: "未連線",
    boundary: "需先完成 SourceConnection BFF 與隱私策略。",
    connected: false,
    connectable: true,
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

/** Placeholder "connect a source" popup. Nothing here reaches a real
 * provider yet — it just records a local-only pending/connected status so
 * the row is genuinely operable while the adapter + BFF are built. */
function ConnectSourceDialog({
  source,
  open,
  onOpenChange,
  onConnect,
  isPending,
}: {
  source: SourceConnection | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnect: (id: string, label: string) => void
  isPending: boolean
}) {
  const [label, setLabel] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    // Deferred to a microtask so this doesn't setState synchronously inside
    // the effect body (react-hooks/set-state-in-effect).
    window.queueMicrotask(() => setLabel(""))
  }, [open])

  if (!source) return null

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`連接 ${source.source}`}
      description="這是本機 rehearsal 用的 placeholder；正式連線需要 adapter 安全審查與 BFF persistence。"
      submitLabel="儲存並標記待審"
      isPending={isPending}
      onSubmit={() => onConnect(source.id, label.trim() || source.source)}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="source-connection-label">連線備註 / API key 佔位</Label>
        <Input
          id="source-connection-label"
          placeholder="例如：workspace webhook URL 或 OAuth client 名稱"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{source.boundary}</p>
    </FormDialog>
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
  const connections = useLocalEntities<SourceConnection>(seedSourceConnections, {
    storageKey: "settings-source-connections",
  })
  const [connectTarget, setConnectTarget] = React.useState<SourceConnection | null>(null)

  const enabledSet = React.useMemo(() => new Set<ModuleKey>(enabledModules), [enabledModules])
  const disabledCount = ALL_MODULES.length - enabledModules.length

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className="rounded-lg border bg-background">
        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">角色與模組存取</h3>
            <p className="text-xs text-muted-foreground">
              伺服器權限快照，可用瀏覽器 rehearsal 覆寫；正式授權仍在伺服器端。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={permissionSource === "database" ? "secondary" : "outline"} className="text-[10px]">
              {permissionSourceLabels[permissionSource]}
            </Badge>
            {permissionSource === "browser_override" && (
              <Button type="button" variant="ghost" size="sm" onClick={resetToServerPermissions}>
                重設為伺服器值
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col gap-2">
            <div className="rounded-lg border border-dashed px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              DB rows: {permissionSnapshot.dbPermissionRows}；啟用: {dbPermissionRows}；未知: {unknownModuleRows}；
              已啟用模組: {enabledModules.length}；隱藏: {disabledCount}。
            </div>
            {roleOptions.map((option) => {
              const active = role === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRole(option.id)}
                  className={cn(
                    "flex min-h-14 items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="text-xs leading-snug">{option.description}</span>
                  </span>
                  <StatusDot enabled={active} />
                </button>
              )
            })}
          </div>

          <DetailList>
            {ALL_MODULES.map((module) => {
              const enabled = enabledSet.has(module.key)
              return (
                <DetailListRow
                  key={module.key}
                  label={module.name}
                  status={enabled ? "enabled" : "hidden"}
                  tone={enabled ? "good" : "neutral"}
                  summary={module.description}
                  trailing={
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
                  }
                />
              )
            })}
          </DetailList>
        </div>
      </section>

      <section className="rounded-lg border bg-background">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">來源連接</h3>
            <p className="text-xs text-muted-foreground">按「連接」建立待審請求。</p>
          </div>
          <ShieldCheckIcon className="size-4 text-muted-foreground" />
        </div>
        <DetailList className="border-none">
          {connections.items.map((row) => (
            <DetailListRow
              key={row.id}
              label={row.source}
              status={row.status}
              tone={row.connected ? "good" : row.connectable ? "neutral" : "blocked"}
              summary={row.scope}
              detailTitle={row.source}
              detail={
                <p className="text-xs leading-relaxed text-muted-foreground">{row.boundary}</p>
              }
              trailing={
                row.connectable && !row.connected ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setConnectTarget(row)}
                  >
                    <LinkIcon className="size-3.5" />
                    連接
                  </Button>
                ) : undefined
              }
            />
          ))}
        </DetailList>
      </section>

      <ConnectSourceDialog
        source={connectTarget}
        open={connectTarget !== null}
        onOpenChange={(open) => !open && setConnectTarget(null)}
        isPending={connections.isPending}
        onConnect={(id, label) => {
          void connections
            .update(id, { status: `待審 · ${label}`, connected: false })
            .then(() => setConnectTarget(null))
        }}
      />
    </div>
  )
}
