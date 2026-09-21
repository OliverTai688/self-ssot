"use client"

import * as React from "react"
import { MailIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
  EmptyRow,
  FormDialog,
  PanelHeader,
  RowActionsMenu,
} from "@/components/owneros/control-plane-shell"
import { useLocalEntities } from "@/lib/owneros/use-local-entities"

type MemberRole = "OWNER" | "MANAGER" | "EDITOR" | "VIEWER" | "GUEST"

interface Member {
  id: string
  name: string
  email: string
  role: MemberRole
  status: "active" | "invited"
  isOwner?: boolean
}

const roleLabels: Record<MemberRole, string> = {
  OWNER: "擁有者",
  MANAGER: "管理者",
  EDITOR: "編輯者",
  VIEWER: "檢視者",
  GUEST: "外部訪客",
}

const seedMembers: Member[] = [
  {
    id: "owner",
    name: "Oliver",
    email: "taioliver688@gmail.com",
    role: "OWNER",
    status: "active",
    isOwner: true,
  },
]

interface MemberFormState {
  name: string
  email: string
  role: MemberRole
}

const emptyForm: MemberFormState = { name: "", email: "", role: "EDITOR" }

function MemberFormFields({
  form,
  onChange,
}: {
  form: MemberFormState
  onChange: (next: MemberFormState) => void
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="member-name">姓名</Label>
        <Input
          id="member-name"
          placeholder="例如：陳研究"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="member-email">Email</Label>
        <Input
          id="member-email"
          type="email"
          placeholder="name@example.com"
          value={form.email}
          onChange={(event) => onChange({ ...form, email: event.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="member-role">角色</Label>
        <Select value={form.role} onValueChange={(value) => onChange({ ...form, role: value as MemberRole })}>
          <SelectTrigger id="member-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(roleLabels) as MemberRole[])
              .filter((role) => role !== "OWNER")
              .map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabels[role]}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

/**
 * Real add / edit-role / remove UI for workspace members. Backed by
 * `useLocalEntities`, a browser-local store shaped like a future API call —
 * every action here already returns a Promise and carries a pending state,
 * so swapping in `POST/PATCH/DELETE /api/members` later only touches the
 * store, not this component. Sits under the read-only member lifecycle
 * copy that `ControlPlanePage` renders above it.
 */
export function MembersPanel() {
  const members = useLocalEntities<Member>(seedMembers, { storageKey: "settings-members" })
  const [addOpen, setAddOpen] = React.useState(false)
  const [addForm, setAddForm] = React.useState<MemberFormState>(emptyForm)
  const [editTarget, setEditTarget] = React.useState<Member | null>(null)
  const [editRole, setEditRole] = React.useState<MemberRole>("EDITOR")
  const [deleteTarget, setDeleteTarget] = React.useState<Member | null>(null)

  return (
    <section className="rounded-lg border bg-background">
      <PanelHeader
        title="成員清單"
        description="這是本機 rehearsal 清單；正式寫入仍需 service-layer authorization 與 audit。"
        count={members.items.length}
        action={<AddButton label="邀請成員" onClick={() => { setAddForm(emptyForm); setAddOpen(true) }} />}
      />

      {members.items.length === 0 ? (
        <EmptyRow label="還沒有成員，點右上角「邀請成員」新增一位。" />
      ) : (
        <DetailList className="border-none">
          {members.items.map((member) => (
            <DetailListRow
              key={member.id}
              label={member.name}
              status={member.status === "invited" ? "已邀請" : "使用中"}
              tone={member.status === "invited" ? "review" : "good"}
              summary={member.email}
              trailing={
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {roleLabels[member.role]}
                  </Badge>
                  <RowActionsMenu
                    disabled={member.isOwner}
                    onEdit={
                      member.isOwner
                        ? undefined
                        : () => {
                            setEditTarget(member)
                            setEditRole(member.role)
                          }
                    }
                    onDelete={member.isOwner ? undefined : () => setDeleteTarget(member)}
                    editLabel="變更角色"
                    deleteLabel="移除成員"
                  />
                </div>
              }
            />
          ))}
        </DetailList>
      )}

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="邀請成員"
        description="建立一筆本機邀請紀錄；Email 寄送與正式寫入仍待 BFF。"
        submitLabel="送出邀請"
        isPending={members.isPending}
        submitDisabled={!addForm.name.trim() || !addForm.email.trim()}
        onSubmit={() => {
          void members
            .create({
              id: `member-${Date.now()}`,
              name: addForm.name.trim(),
              email: addForm.email.trim(),
              role: addForm.role,
              status: "invited",
            })
            .then(() => setAddOpen(false))
        }}
      >
        <MemberFormFields form={addForm} onChange={setAddForm} />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MailIcon className="size-3.5" />
          邀請會先顯示為「已邀請」，尚未真的寄出 email。
        </p>
      </FormDialog>

      <FormDialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title={editTarget ? `變更 ${editTarget.name} 的角色` : "變更角色"}
        submitLabel="儲存"
        isPending={members.isPending}
        onSubmit={() => {
          if (!editTarget) return
          void members.update(editTarget.id, { role: editRole }).then(() => setEditTarget(null))
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="member-edit-role">角色</Label>
          <Select value={editRole} onValueChange={(value) => setEditRole(value as MemberRole)}>
            <SelectTrigger id="member-edit-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(roleLabels) as MemberRole[])
                .filter((role) => role !== "OWNER")
                .map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `移除 ${deleteTarget.name}？` : "移除成員？"}
        description="這只會從本機清單移除；正式移除仍需先看受影響的專案、來源與 AI 記憶。"
        confirmLabel="移除"
        isPending={members.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          void members.remove(deleteTarget.id).then(() => setDeleteTarget(null))
        }}
      />
    </section>
  )
}
