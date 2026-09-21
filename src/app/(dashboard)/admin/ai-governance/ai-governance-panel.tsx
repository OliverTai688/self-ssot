"use client"

import * as React from "react"
import { ToggleLeftIcon, ToggleRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AddButton,
  ConfirmDialog,
  DetailList,
  DetailListRow,
  FormDialog,
  PanelHeader,
  RowActionsMenu,
} from "@/components/owneros/control-plane-shell"
import { useLocalEntities } from "@/lib/owneros/use-local-entities"

type Risk = "low" | "medium" | "high" | "critical"
type ApprovalMode = "auto" | "owner-approve" | "disabled"

interface AiCapability {
  id: string
  name: string
  module: string
  risk: Risk
  approvalMode: ApprovalMode
  enabled: boolean
  boundary: string
}

const riskLabel: Record<Risk, string> = { low: "低", medium: "中", high: "高", critical: "極高" }
const riskTone: Record<Risk, "good" | "review" | "warn" | "blocked"> = {
  low: "good",
  medium: "review",
  high: "warn",
  critical: "blocked",
}
const approvalLabel: Record<ApprovalMode, string> = { auto: "自動", "owner-approve": "Owner 核准", disabled: "封鎖" }

const seedCapabilities: AiCapability[] = [
  {
    id: "summarize-today",
    name: "summarize.today",
    module: "Core AI / Today",
    risk: "low",
    approvalMode: "auto",
    enabled: true,
    boundary: "只整理已授權分享的模組 context，不輸出 private context 到公開路由。",
  },
  {
    id: "work-todo-draft",
    name: "work.todo.create_draft",
    module: "Work",
    risk: "medium",
    approvalMode: "owner-approve",
    enabled: true,
    boundary: "正式寫入需 approval mode、authz、audit。",
  },
  {
    id: "inbox-return-route",
    name: "inbox.return.route",
    module: "Inbox / AI Input",
    risk: "low",
    approvalMode: "auto",
    enabled: true,
    boundary: "只做來源到目的地的連結提案，不刪除 context。",
  },
  {
    id: "source-link-task",
    name: "source.link_to_task",
    module: "Source / Work",
    risk: "medium",
    approvalMode: "owner-approve",
    enabled: true,
    boundary: "須保留 source id、consent、retention 與 audit refs。",
  },
  {
    id: "external-message-send",
    name: "external.message.send",
    module: "Provider",
    risk: "high",
    approvalMode: "disabled",
    enabled: false,
    boundary: "沒有 provider setup 與 owner 明確核准前不可寄送。",
  },
  {
    id: "permission-change",
    name: "permission.change",
    module: "RBAC",
    risk: "critical",
    approvalMode: "disabled",
    enabled: false,
    boundary: "AI 不可直接改角色、成員、grant 或分享範圍。",
  },
]

interface CapabilityFormState {
  name: string
  module: string
  risk: Risk
  approvalMode: ApprovalMode
  boundary: string
}

const emptyForm: CapabilityFormState = { name: "", module: "", risk: "low", approvalMode: "owner-approve", boundary: "" }

function toForm(capability: AiCapability): CapabilityFormState {
  return {
    name: capability.name,
    module: capability.module,
    risk: capability.risk,
    approvalMode: capability.approvalMode,
    boundary: capability.boundary,
  }
}

/**
 * Capability registry: add/edit/delete registry entries and flip
 * enabled/disabled per entry. Local rehearsal store — a real registry would
 * additionally require schema, rollback, and audit wiring before any entry
 * here could actually execute.
 */
export function AiGovernancePanel() {
  const capabilities = useLocalEntities<AiCapability>(seedCapabilities, { storageKey: "admin-ai-capabilities" })
  const [addOpen, setAddOpen] = React.useState(false)
  const [addForm, setAddForm] = React.useState<CapabilityFormState>(emptyForm)
  const [editTarget, setEditTarget] = React.useState<AiCapability | null>(null)
  const [editForm, setEditForm] = React.useState<CapabilityFormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = React.useState<AiCapability | null>(null)

  return (
    <section className="rounded-lg border bg-background">
      <PanelHeader
        title="能力登錄（Capability registry）"
        description="新增、編輯、啟用/停用或移除能力；externalRegisterable 一律維持 false。"
        count={capabilities.items.length}
        action={<AddButton label="新增能力" onClick={() => { setAddForm(emptyForm); setAddOpen(true) }} />}
      />
      <DetailList className="border-none">
        {capabilities.items.map((capability) => (
          <DetailListRow
            key={capability.id}
            label={capability.name}
            status={capability.enabled ? approvalLabel[capability.approvalMode] : "已停用"}
            tone={capability.enabled ? riskTone[capability.risk] : "neutral"}
            summary={`${capability.module} · 風險 ${riskLabel[capability.risk]}`}
            detailTitle={capability.name}
            detail={
              <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">模組</span>: {capability.module}
                </p>
                <p>
                  <span className="font-medium text-foreground">風險</span>: {riskLabel[capability.risk]}
                </p>
                <p>
                  <span className="font-medium text-foreground">Approval mode</span>: {approvalLabel[capability.approvalMode]}
                </p>
                <p>
                  <span className="font-medium text-foreground">邊界</span>: {capability.boundary}
                </p>
              </div>
            }
            trailing={
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={capability.enabled ? "停用" : "啟用"}
                  title={capability.enabled ? "停用" : "啟用"}
                  onClick={() => void capabilities.update(capability.id, { enabled: !capability.enabled })}
                >
                  {capability.enabled ? (
                    <ToggleRightIcon className="size-4 text-emerald-600" />
                  ) : (
                    <ToggleLeftIcon className="size-4 text-muted-foreground" />
                  )}
                </Button>
                <RowActionsMenu
                  onEdit={() => { setEditTarget(capability); setEditForm(toForm(capability)) }}
                  onDelete={() => setDeleteTarget(capability)}
                  editLabel="編輯"
                  deleteLabel="移除"
                />
              </div>
            }
          />
        ))}
      </DetailList>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="新增能力"
        description="新能力預設為停用，需另外開啟。"
        submitLabel="新增"
        isPending={capabilities.isPending}
        submitDisabled={!addForm.name.trim()}
        onSubmit={() => {
          void capabilities
            .create({ id: `cap-${Date.now()}`, enabled: false, ...addForm, name: addForm.name.trim() })
            .then(() => setAddOpen(false))
        }}
      >
        <CapabilityFormFields form={addForm} onChange={setAddForm} />
      </FormDialog>

      <FormDialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="編輯能力"
        submitLabel="儲存"
        isPending={capabilities.isPending}
        submitDisabled={!editForm.name.trim()}
        onSubmit={() => {
          if (!editTarget) return
          void capabilities.update(editTarget.id, { ...editForm, name: editForm.name.trim() }).then(() => setEditTarget(null))
        }}
      >
        <CapabilityFormFields form={editForm} onChange={setEditForm} />
      </FormDialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `移除「${deleteTarget.name}」？` : "移除能力？"}
        description="移除後 Core AI／模組 AI 無法再提案此能力（本機狀態）。"
        confirmLabel="移除"
        isPending={capabilities.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          void capabilities.remove(deleteTarget.id).then(() => setDeleteTarget(null))
        }}
      />
    </section>
  )
}

function CapabilityFormFields({
  form,
  onChange,
}: {
  form: CapabilityFormState
  onChange: (next: CapabilityFormState) => void
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="capability-name">能力 id</Label>
        <Input
          id="capability-name"
          placeholder="例如：work.todo.create_draft"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="capability-module">所屬模組</Label>
        <Input
          id="capability-module"
          placeholder="例如：Work"
          value={form.module}
          onChange={(event) => onChange({ ...form, module: event.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="capability-risk">風險</Label>
          <Select value={form.risk} onValueChange={(value) => onChange({ ...form, risk: value as Risk })}>
            <SelectTrigger id="capability-risk" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["low", "medium", "high", "critical"] as Risk[]).map((risk) => (
                <SelectItem key={risk} value={risk}>
                  {riskLabel[risk]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="capability-approval">Approval mode</Label>
          <Select value={form.approvalMode} onValueChange={(value) => onChange({ ...form, approvalMode: value as ApprovalMode })}>
            <SelectTrigger id="capability-approval" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["auto", "owner-approve", "disabled"] as ApprovalMode[]).map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {approvalLabel[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="capability-boundary">Runtime 邊界</Label>
        <Textarea
          id="capability-boundary"
          placeholder="這個能力不能做什麼"
          value={form.boundary}
          onChange={(event) => onChange({ ...form, boundary: event.target.value })}
        />
      </div>
    </>
  )
}
