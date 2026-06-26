"use client"

import * as React from "react"
import { UsersIcon, PlusIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { AcademicPersonCard } from "@/components/research/academic-person-card"
import { Button } from "@/components/ui/button"
import { AcademicRole } from "@/types/research"

const roleOptions: { value: AcademicRole | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "author", label: "作者" },
  { value: "chair", label: "主席" },
  { value: "session_chair", label: "場次主席" },
  { value: "keynote", label: "主題演講" },
  { value: "editor", label: "編輯" },
  { value: "reviewer", label: "審稿人" },
]

export default function PeoplePage() {
  const { people, addPerson } = useResearch()

  const [isAdding, setIsAdding] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newRole, setNewRole] = React.useState<AcademicRole>("author")
  const [newAffiliation, setNewAffiliation] = React.useState("")
  const [filterRole, setFilterRole] = React.useState("all")

  function handleCreate() {
    if (!newName.trim()) return
    addPerson(newName.trim(), newRole, newAffiliation.trim() || undefined)
    setNewName("")
    setNewAffiliation("")
    setIsAdding(false)
  }

  const grouped = roleOptions
    .filter((r) => r.value !== "all")
    .map((r) => ({
      role: r.value as AcademicRole,
      label: r.label,
      persons: people.filter((p) => p.role === r.value),
    }))
    .filter((g) => g.persons.length > 0)

  const noRole = people.filter((p) => !p.role)
  const filtered = filterRole === "all" ? people : people.filter((p) => p.role === filterRole)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title="學者網絡" description="追蹤作者、主席與合作夥伴，管理交流切入點" />

      <main className="flex-1 overflow-y-auto px-6 py-8 bg-background">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="size-4 text-teal-500" />
              <span className="text-sm font-semibold text-foreground">{people.length} 位學者</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                {roleOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setFilterRole(opt.value)}
                    className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${filterRole === opt.value ? "bg-background text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setIsAdding((v) => !v)}>
                <PlusIcon className="size-3.5" /> 新增學者
              </Button>
            </div>
          </div>

          {/* Create Form */}
          {isAdding && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-semibold">新增學者</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">姓名 *</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="例如: Dr. Elena Rostova"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">身份</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as AcademicRole)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-xs outline-none mt-1">
                    {roleOptions.filter((r) => r.value !== "all").map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">機構</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="例如: 國立台灣大學"
                    value={newAffiliation}
                    onChange={(e) => setNewAffiliation(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAdding(false)}>取消</Button>
                <Button size="sm" className="h-7 text-xs" disabled={!newName.trim()} onClick={handleCreate}>新增</Button>
              </div>
            </div>
          )}

          {/* Cards — grouped when showing all, flat when filtering */}
          {filterRole !== "all" ? (
            <div>
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                  此角色暫無學者記錄
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered.map((p) => <AcademicPersonCard key={p.id} person={p} />)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map((g) => (
                <section key={g.role} className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{g.label} ({g.persons.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {g.persons.map((p) => <AcademicPersonCard key={p.id} person={p} />)}
                  </div>
                </section>
              ))}
              {noRole.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">未分類 ({noRole.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {noRole.map((p) => <AcademicPersonCard key={p.id} person={p} />)}
                  </div>
                </section>
              )}
              {people.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                  尚無學者記錄，點擊「新增學者」開始建立網絡。
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
