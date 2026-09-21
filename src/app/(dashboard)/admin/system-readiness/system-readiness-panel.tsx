"use client"

import * as React from "react"
import { RefreshCwIcon, UserCogIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type GateStatus = "ready" | "review" | "blocked"

interface ReadinessGate {
  id: string
  area: string
  status: GateStatus
  signal: string
  owner: string
  custom: boolean
}

const statusLabel: Record<GateStatus, string> = { ready: "就緒", review: "檢查中", blocked: "封鎖" }

const seedGates: ReadinessGate[] = [
  {
    id: "supabase-auth",
    area: "Supabase auth",
    status: "review",
    signal: "需要 signed-in `/auth/status`、Profile mapping、owner scoped read proof。",
    owner: "Oliver",
    custom: false,
  },
  {
    id: "work-proof-target",
    area: "Work proof target",
    status: "review",
    signal: "需要明確 local/disposable target 後才能跑資料寫入 proof。",
    owner: "Oliver",
    custom: false,
  },
  {
    id: "provider-runtime",
    area: "Provider runtime",
    status: "blocked",
    signal: "Gmail/LINE/Drive/AI provider 啟用需要 secret、OAuth、revoke、audit 與 owner approval。",
    owner: "未指派",
    custom: false,
  },
  {
    id: "vercel-deploy",
    area: "Vercel deploy",
    status: "review",
    signal: "build memory、env、Prisma generate、runtime routes 要分開追蹤。",
    owner: "Oliver",
    custom: false,
  },
]

interface GateFormState {
  area: string
  signal: string
  owner: string
}

const emptyForm: GateFormState = { area: "", signal: "", owner: "" }

/**
 * System readiness gates. The four built-in gates are computed checks, so
 * they get real "re-run" (re-check, simulated) and "assign owner" actions
 * rather than arbitrary add/delete — you can't invent or delete a
 * deployment gate. Owners can additionally track their own manual
 * checklist items alongside the system gates, and those custom rows are
 * fully removable.
 */
export function SystemReadinessPanel() {
  const gates = useLocalEntities<ReadinessGate>(seedGates, { storageKey: "admin-system-readiness-gates" })
  const [recheckingId, setRecheckingId] = React.useState<string | null>(null)
  const [ownerTarget, setOwnerTarget] = React.useState<ReadinessGate | null>(null)
  const [ownerValue, setOwnerValue] = React.useState("")
  const [addOpen, setAddOpen] = React.useState(false)
  const [addForm, setAddForm] = React.useState<GateFormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = React.useState<ReadinessGate | null>(null)

  async function rerun(gate: ReadinessGate) {
    setRecheckingId(gate.id)
    await gates.update(gate.id, { status: "ready", signal: "最近一次重新檢查通過。" })
    setRecheckingId(null)
  }

  return (
    <section className="rounded-lg border bg-background">
      <PanelHeader
        title="就緒閘門"
        description="重新檢查、標記已解決或指派負責人；系統閘門本身不能刪除，只有自訂人工項目可以。"
        count={gates.items.length}
        action={<AddButton label="新增人工檢查項" onClick={() => { setAddForm(emptyForm); setAddOpen(true) }} />}
      />

      {gates.items.length === 0 ? (
        <EmptyRow label="沒有就緒項目。" />
      ) : (
        <DetailList className="border-none">
          {gates.items.map((gate) => (
            <DetailListRow
              key={gate.id}
              label={gate.area}
              status={statusLabel[gate.status]}
              tone={gate.status}
              summary={`${gate.signal} · 負責人：${gate.owner || "未指派"}`}
              detailTitle={gate.area}
              detail={<p className="text-xs leading-relaxed text-muted-foreground">{gate.signal}</p>}
              trailing={
                <div className="flex shrink-0 items-center gap-1">
                  {gate.status !== "blocked" && gate.status !== "ready" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={recheckingId === gate.id}
                      onClick={() => void rerun(gate)}
                    >
                      <RefreshCwIcon className={recheckingId === gate.id ? "size-3.5 animate-spin" : "size-3.5"} />
                      重新檢查
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="指派負責人"
                    title="指派負責人"
                    onClick={() => { setOwnerTarget(gate); setOwnerValue(gate.owner) }}
                  >
                    <UserCogIcon className="size-4 text-muted-foreground" />
                  </Button>
                  {gate.custom && (
                    <RowActionsMenu onDelete={() => setDeleteTarget(gate)} deleteLabel="移除項目" />
                  )}
                </div>
              }
            />
          ))}
        </DetailList>
      )}

      <FormDialog
        open={ownerTarget !== null}
        onOpenChange={(open) => !open && setOwnerTarget(null)}
        title={ownerTarget ? `指派「${ownerTarget.area}」負責人` : "指派負責人"}
        submitLabel="儲存"
        isPending={gates.isPending}
        onSubmit={() => {
          if (!ownerTarget) return
          void gates.update(ownerTarget.id, { owner: ownerValue.trim() }).then(() => setOwnerTarget(null))
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="gate-owner">負責人</Label>
          <Input id="gate-owner" value={ownerValue} onChange={(event) => setOwnerValue(event.target.value)} />
        </div>
      </FormDialog>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="新增人工檢查項"
        description="給自己的手動待辦，不影響系統計算的閘門。"
        submitLabel="新增"
        isPending={gates.isPending}
        submitDisabled={!addForm.area.trim()}
        onSubmit={() => {
          void gates
            .create({
              id: `gate-${Date.now()}`,
              area: addForm.area.trim(),
              signal: addForm.signal.trim(),
              owner: addForm.owner.trim(),
              status: "review",
              custom: true,
            })
            .then(() => setAddOpen(false))
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="gate-area">項目名稱</Label>
          <Input
            id="gate-area"
            placeholder="例如：手動核對備份"
            value={addForm.area}
            onChange={(event) => setAddForm({ ...addForm, area: event.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="gate-signal">說明</Label>
          <Input
            id="gate-signal"
            placeholder="要檢查什麼"
            value={addForm.signal}
            onChange={(event) => setAddForm({ ...addForm, signal: event.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="gate-add-owner">負責人</Label>
          <Input
            id="gate-add-owner"
            value={addForm.owner}
            onChange={(event) => setAddForm({ ...addForm, owner: event.target.value })}
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `移除「${deleteTarget.area}」？` : "移除項目？"}
        confirmLabel="移除"
        isPending={gates.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          void gates.remove(deleteTarget.id).then(() => setDeleteTarget(null))
        }}
      />
    </section>
  )
}
