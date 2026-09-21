"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

interface RoleDefinition {
  id: string
  name: string
  description: string
  capabilities: string[]
  builtin: boolean
}

const seedRoles: RoleDefinition[] = [
  {
    id: "owner",
    name: "擁有者 / OWNER",
    description: "可管理 workspace、成員、模組、AI policy；所有敏感操作仍需 audit。",
    capabilities: ["管理成員", "管理模組", "審核 AI capability", "Owner transfer（另走高風險流程）"],
    builtin: true,
  },
  {
    id: "manager",
    name: "管理者 / MANAGER",
    description: "可管理被授權 workspace/module 操作，不預設能轉移 owner。",
    capabilities: ["管理被授權模組", "審核低風險 proposal"],
    builtin: true,
  },
  {
    id: "editor",
    name: "編輯者 / EDITOR",
    description: "可編輯被授權模組資料，適合共同工作者。",
    capabilities: ["新增/更新被授權 records", "產生草稿"],
    builtin: true,
  },
  {
    id: "viewer",
    name: "檢視者 / VIEWER",
    description: "可看被授權資源，不可改資料或觸發 AI execution。",
    capabilities: ["唯讀被授權資源"],
    builtin: true,
  },
  {
    id: "guest",
    name: "外部訪客 / GUEST",
    description: "只看明確分享的 client-safe 或 external-safe context。",
    capabilities: ["僅明確授權範圍"],
    builtin: true,
  },
]

interface RoleFormState {
  name: string
  description: string
  capabilities: string
}

const emptyForm: RoleFormState = { name: "", description: "", capabilities: "" }

function toForm(role: RoleDefinition): RoleFormState {
  return { name: role.name, description: role.description, capabilities: role.capabilities.join(", ") }
}

function fromForm(form: RoleFormState): Pick<RoleDefinition, "name" | "description" | "capabilities"> {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    capabilities: form.capabilities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

/**
 * Built-in roles (OWNER…GUEST) are editable but not deletable — the app's
 * navigation and RBAC copy assume they exist. Custom roles can be added and
 * removed freely. All of it is a local rehearsal store; real enforcement
 * still lives in service-layer authorization.
 */
export function RolesPanel() {
  const roles = useLocalEntities<RoleDefinition>(seedRoles, { storageKey: "settings-roles" })
  const [addOpen, setAddOpen] = React.useState(false)
  const [addForm, setAddForm] = React.useState<RoleFormState>(emptyForm)
  const [editTarget, setEditTarget] = React.useState<RoleDefinition | null>(null)
  const [editForm, setEditForm] = React.useState<RoleFormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = React.useState<RoleDefinition | null>(null)

  return (
    <section className="rounded-lg border bg-background">
      <PanelHeader
        title="角色清單"
        description="內建角色可編輯說明與能力標籤，但不能刪除；自訂角色可自由新增/刪除。"
        count={roles.items.length}
        action={<AddButton label="新增自訂角色" onClick={() => { setAddForm(emptyForm); setAddOpen(true) }} />}
      />

      <DetailList className="border-none">
        {roles.items.map((role) => (
          <DetailListRow
            key={role.id}
            label={role.name}
            status={role.builtin ? "內建" : "自訂"}
            tone={role.builtin ? "neutral" : "proposal"}
            summary={role.description}
            detailTitle={role.name}
            detail={
              <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
                <p>{role.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.capabilities.map((cap) => (
                    <Badge key={cap} variant="outline" className="text-[10px]">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>
            }
            trailing={
              <RowActionsMenu
                onEdit={() => {
                  setEditTarget(role)
                  setEditForm(toForm(role))
                }}
                onDelete={role.builtin ? undefined : () => setDeleteTarget(role)}
                editLabel="編輯"
                deleteLabel="刪除角色"
              />
            }
          />
        ))}
      </DetailList>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="新增自訂角色"
        description="自訂角色只存在本機瀏覽器；正式生效仍需接上 service-layer authorization。"
        submitLabel="新增"
        isPending={roles.isPending}
        submitDisabled={!addForm.name.trim()}
        onSubmit={() => {
          void roles
            .create({ id: `role-${Date.now()}`, builtin: false, ...fromForm(addForm) })
            .then(() => setAddOpen(false))
        }}
      >
        <RoleFormFields form={addForm} onChange={setAddForm} />
      </FormDialog>

      <FormDialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title={editTarget ? `編輯「${editTarget.name}」` : "編輯角色"}
        submitLabel="儲存"
        isPending={roles.isPending}
        submitDisabled={!editForm.name.trim()}
        onSubmit={() => {
          if (!editTarget) return
          void roles.update(editTarget.id, fromForm(editForm)).then(() => setEditTarget(null))
        }}
      >
        <RoleFormFields form={editForm} onChange={setEditForm} nameDisabled={editTarget?.builtin} />
      </FormDialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `刪除「${deleteTarget.name}」？` : "刪除角色？"}
        description="仍指派此角色的成員需要另外改派，本機 rehearsal 不會自動處理。"
        confirmLabel="刪除"
        isPending={roles.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          void roles.remove(deleteTarget.id).then(() => setDeleteTarget(null))
        }}
      />
    </section>
  )
}

function RoleFormFields({
  form,
  onChange,
  nameDisabled,
}: {
  form: RoleFormState
  onChange: (next: RoleFormState) => void
  nameDisabled?: boolean
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="role-name">名稱</Label>
        <Input
          id="role-name"
          placeholder="例如：財務協作者"
          value={form.name}
          disabled={nameDisabled}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="role-description">說明</Label>
        <Textarea
          id="role-description"
          placeholder="這個角色可以做什麼、不能做什麼"
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="role-capabilities">能力標籤（逗號分隔）</Label>
        <Input
          id="role-capabilities"
          placeholder="例如：檢視財務報表, 匯出對帳單"
          value={form.capabilities}
          onChange={(event) => onChange({ ...form, capabilities: event.target.value })}
        />
      </div>
    </>
  )
}
