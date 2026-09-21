"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type Role = "OWNER" | "MANAGER" | "EDITOR" | "VIEWER" | "GUEST"
type Permission = "read" | "write" | "admin"
type Decision = "allow" | "conditional" | "deny"

interface RbacGrant {
  id: string
  role: Role
  resource: string
  permission: Permission
  decision: Decision
  note: string
}

const decisionLabel: Record<Decision, string> = { allow: "允許", conditional: "有條件", deny: "拒絕" }
const decisionTone: Record<Decision, "good" | "review" | "blocked"> = {
  allow: "good",
  conditional: "review",
  deny: "blocked",
}
const permissionLabel: Record<Permission, string> = { read: "讀取", write: "寫入", admin: "管理" }

const seedGrants: RbacGrant[] = [
  {
    id: "grant-owner-admin",
    role: "OWNER",
    resource: "/admin/* read surfaces",
    permission: "admin",
    decision: "allow",
    note: "Owner protected route after requireUser；mutation still audited。",
  },
  {
    id: "grant-manager-module",
    role: "MANAGER",
    resource: "Granted workspace / module",
    permission: "write",
    decision: "conditional",
    note: "需要 scoped grant 與 audit refs 才能執行管理動作。",
  },
  {
    id: "grant-editor-work",
    role: "EDITOR",
    resource: "Granted Work project",
    permission: "write",
    decision: "conditional",
    note: "可草稿/更新；final high-risk writes 仍受模組 policy 檢查。",
  },
  {
    id: "grant-viewer-write",
    role: "VIEWER",
    resource: "Any module record",
    permission: "write",
    decision: "deny",
    note: "唯讀角色；拒絕訊息不得洩漏隱藏資源。",
  },
  {
    id: "grant-guest-private",
    role: "GUEST",
    resource: "Private source / AI memory",
    permission: "read",
    decision: "deny",
    note: "沒有 explicit external-safe grant，預設拒絕。",
  },
]

interface GrantFormState {
  role: Role
  resource: string
  permission: Permission
  decision: Decision
  note: string
}

const emptyForm: GrantFormState = { role: "EDITOR", resource: "", permission: "read", decision: "allow", note: "" }

function toForm(grant: RbacGrant): GrantFormState {
  return { role: grant.role, resource: grant.resource, permission: grant.permission, decision: grant.decision, note: grant.note }
}

/**
 * Role × resource × permission grant list. This is the UI-side shape of what
 * a real RBAC policy engine would serve; today it's a local rehearsal store
 * so operators can add/edit/revoke grants and see the effect immediately,
 * ready to be pointed at `/api/rbac/grants` later.
 */
export function RbacPanel() {
  const grants = useLocalEntities<RbacGrant>(seedGrants, { storageKey: "admin-rbac-grants" })
  const [addOpen, setAddOpen] = React.useState(false)
  const [addForm, setAddForm] = React.useState<GrantFormState>(emptyForm)
  const [editTarget, setEditTarget] = React.useState<RbacGrant | null>(null)
  const [editForm, setEditForm] = React.useState<GrantFormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = React.useState<RbacGrant | null>(null)

  return (
    <section className="rounded-lg border bg-background">
      <PanelHeader
        title="權限授予（Grants）"
        description="新增、編輯或撤銷角色對資源的權限；本機 rehearsal，正式判定仍由 service-layer policy engine 決定。"
        count={grants.items.length}
        action={<AddButton label="新增授予" onClick={() => { setAddForm(emptyForm); setAddOpen(true) }} />}
      />
      <DetailList className="border-none">
        {grants.items.map((grant) => (
          <DetailListRow
            key={grant.id}
            label={`${grant.role} → ${grant.resource}`}
            status={decisionLabel[grant.decision]}
            tone={decisionTone[grant.decision]}
            summary={`${permissionLabel[grant.permission]} · ${grant.note}`}
            detailTitle={`${grant.role} · ${grant.resource}`}
            detail={
              <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">權限</span>: {permissionLabel[grant.permission]}
                </p>
                <p>
                  <span className="font-medium text-foreground">判定</span>: {decisionLabel[grant.decision]}
                </p>
                <p>
                  <span className="font-medium text-foreground">備註</span>: {grant.note}
                </p>
              </div>
            }
            trailing={
              <RowActionsMenu
                onEdit={() => { setEditTarget(grant); setEditForm(toForm(grant)) }}
                onDelete={() => setDeleteTarget(grant)}
                editLabel="編輯"
                deleteLabel="撤銷"
              />
            }
          />
        ))}
      </DetailList>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="新增權限授予"
        submitLabel="新增"
        isPending={grants.isPending}
        submitDisabled={!addForm.resource.trim()}
        onSubmit={() => {
          void grants
            .create({ id: `grant-${Date.now()}`, ...addForm, resource: addForm.resource.trim() })
            .then(() => setAddOpen(false))
        }}
      >
        <GrantFormFields form={addForm} onChange={setAddForm} />
      </FormDialog>

      <FormDialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="編輯權限授予"
        submitLabel="儲存"
        isPending={grants.isPending}
        submitDisabled={!editForm.resource.trim()}
        onSubmit={() => {
          if (!editTarget) return
          void grants.update(editTarget.id, { ...editForm, resource: editForm.resource.trim() }).then(() => setEditTarget(null))
        }}
      >
        <GrantFormFields form={editForm} onChange={setEditForm} />
      </FormDialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `撤銷「${deleteTarget.role} → ${deleteTarget.resource}」？` : "撤銷授予？"}
        description="撤銷後此角色將不再有此資源的權限（本機狀態）。"
        confirmLabel="撤銷"
        isPending={grants.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          void grants.remove(deleteTarget.id).then(() => setDeleteTarget(null))
        }}
      />
    </section>
  )
}

function GrantFormFields({
  form,
  onChange,
}: {
  form: GrantFormState
  onChange: (next: GrantFormState) => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="grant-role">角色</Label>
          <Select value={form.role} onValueChange={(value) => onChange({ ...form, role: value as Role })}>
            <SelectTrigger id="grant-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["OWNER", "MANAGER", "EDITOR", "VIEWER", "GUEST"] as Role[]).map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="grant-permission">權限</Label>
          <Select value={form.permission} onValueChange={(value) => onChange({ ...form, permission: value as Permission })}>
            <SelectTrigger id="grant-permission" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["read", "write", "admin"] as Permission[]).map((permission) => (
                <SelectItem key={permission} value={permission}>
                  {permissionLabel[permission]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="grant-resource">資源</Label>
        <Input
          id="grant-resource"
          placeholder="例如：/work/* 或某個 module path"
          value={form.resource}
          onChange={(event) => onChange({ ...form, resource: event.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="grant-decision">判定</Label>
        <Select value={form.decision} onValueChange={(value) => onChange({ ...form, decision: value as Decision })}>
          <SelectTrigger id="grant-decision" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["allow", "conditional", "deny"] as Decision[]).map((decision) => (
              <SelectItem key={decision} value={decision}>
                {decisionLabel[decision]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="grant-note">備註 / audit note</Label>
        <Input
          id="grant-note"
          placeholder="為什麼允許或拒絕"
          value={form.note}
          onChange={(event) => onChange({ ...form, note: event.target.value })}
        />
      </div>
    </>
  )
}
