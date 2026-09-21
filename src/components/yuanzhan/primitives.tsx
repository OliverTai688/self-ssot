"use client"

import * as React from "react"
import { DateField, DateInput, DateSegment, I18nProvider, Label as AriaLabel, NumberField, Group, Input as AriaInput, Button as AriaButton } from "react-aria-components"
import { parseDate } from "@internationalized/date"
import { Plus, ArrowUpRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useOperating } from "@/lib/context/yuanzhan-ui-context"
import { ACTORS, KINDS, WORK_STATUSES, type Kind, type OperatingRecord } from "@/types/yuanzhan-ui"
import { cn } from "@/lib/utils"

export const money = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(value)
export const actorName = (id?: string) => ACTORS.find(a => a.id === id)?.name ?? "未指派"
export function Select({ label, children, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label className={cn("yz-field", className)}><span>{label}</span><select aria-label={label} {...props}>{children}</select></label>
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="yz-field"><span>{label}</span>{children}</label> }
export function DateControl({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  let date = null
  try { date = value ? parseDate(value) : null } catch { /* invalid input remains blank */ }
  return <I18nProvider locale="zh-TW"><DateField value={date} onChange={v => onChange(v?.toString() ?? "")} className="yz-field"><AriaLabel>{label}</AriaLabel><DateInput className="yz-date-input">{segment => <DateSegment segment={segment} className="rounded px-0.5 outline-none focus:bg-primary focus:text-primary-foreground" />}</DateInput></DateField></I18nProvider>
}
export function NumberControl({ label, value, onChange, minValue, maxValue }: { label: string; value: number; onChange: (n: number) => void; minValue?: number; maxValue?: number }) {
  return <I18nProvider locale="zh-TW"><NumberField value={value} onChange={onChange} minValue={minValue} maxValue={maxValue} className="yz-field"><AriaLabel>{label}</AriaLabel><Group className="yz-number"><AriaButton slot="decrement" aria-label={`減少${label}`}>−</AriaButton><AriaInput /><AriaButton slot="increment" aria-label={`增加${label}`}>＋</AriaButton></Group></NumberField></I18nProvider>
}
export function Empty({ title = "從第一筆開始", text = "這裡還沒有紀錄。新增後就可以開始整理與協作。", children }: { title?: string; text?: string; children?: React.ReactNode }) {
  return <div className="yz-empty"><div className="yz-empty-line" /><h3>{title}</h3><p>{text}</p>{children}</div>
}
export function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  const effective = items.includes(value) ? value : items[0]
  return <div className="yz-tabs" role="tablist" aria-label="工作台分頁">{items.map((item, i) => <button key={item} role="tab" type="button" aria-selected={effective === item} tabIndex={effective === item ? 0 : -1} onClick={() => onChange(item)} onKeyDown={e => {
    const index = e.key === "ArrowRight" ? (i + 1) % items.length : e.key === "ArrowLeft" ? (i - 1 + items.length) % items.length : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : -1
    if (index >= 0) { e.preventDefault(); onChange(items[index]); (e.currentTarget.parentElement?.children[index] as HTMLElement)?.focus() }
  }}>{item}</button>)}</div>
}
export function Reference({ id }: { id: string }) {
  const { records, open } = useOperating(); const record = records.find(r => r.id === id)
  return record ? <button type="button" className="yz-reference" onClick={() => open(id)}><span>{KINDS[record.kind]}</span> {record.title}<ArrowUpRight size={12} /></button> : <span className="text-xs text-muted-foreground">來源不可用</span>
}
export function RecordRows({ rows, empty, extra }: { rows: OperatingRecord[]; empty?: React.ReactNode; extra?: (r: OperatingRecord) => React.ReactNode }) {
  const { open } = useOperating()
  if (!rows.length) return empty ?? <Empty />
  return <div className="yz-records">{rows.map(r => <div className="yz-row" key={r.id} data-record-id={r.id}><button className="yz-row-main" onClick={() => open(r.id)}><span className="yz-eyebrow">{KINDS[r.kind]} · {r.date} · {actorName(r.author)}</span><strong>{r.title}</strong>{r.body && <span className="line-clamp-2 text-muted-foreground text-sm">{r.body}</span>}</button><div className="yz-row-meta">{r.status && <Badge variant="secondary">{r.status}</Badge>}{r.assignee && <span>{actorName(r.assignee)}</span>}{r.size && <span className="yz-size">{r.size}</span>}{extra?.(r)}</div></div>)}</div>
}
export function SearchField({ value, onChange, label = "搜尋目前紀錄" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return <div className="relative min-w-40 flex-1 max-w-sm"><Search className="absolute left-2 top-2.5 text-muted-foreground" size={14} /><Input aria-label={label} placeholder={label} className="pl-7" value={value} onChange={e => onChange(e.target.value)} /></div>
}

export function RecordForm({ record, onDone, onSaved }: { record: OperatingRecord; onDone: () => void; onSaved?: (record: OperatingRecord) => void }) {
  const { records, actor, save, notify } = useOperating()
  const [draft, setDraft] = React.useState(record)
  const [error, setError] = React.useState("")
  const set = <K extends keyof OperatingRecord>(key: K, value: OperatingRecord[K]) => setDraft(d => ({ ...d, [key]: value }))
  const is = (...kinds: Kind[]) => kinds.includes(record.kind)
  return <form className="yz-form" onSubmit={e => {
    e.preventDefault(); setError("")
    if (!draft.title.trim()) { setError("請填寫名稱。"); return }
    let next = draft
    if (is("task") && draft.status === "完成") next = { ...draft, started: draft.started || draft.date, completed: draft.completed || draft.date }
    if (is("transaction") && !draft.ledgerRow) next = { ...next, ledgerRow: Math.max(0, ...records.filter(r => r.kind === "transaction").map(r => r.ledgerRow ?? 0)) + 1 }
    if (save(next)) { notify("已更新。"); onSaved?.(next); onDone() }
  }}>
    <Field label="名稱"><Input autoFocus required value={draft.title} onChange={e => set("title", e.target.value)} /></Field>
    {!is("capacity", "payroll", "bank", "budget") && <Field label="說明"><Textarea value={draft.body ?? ""} rows={3} onChange={e => set("body", e.target.value)} /></Field>}
    <div className="yz-form-grid"><DateControl label={is("capacity") ? "週起始日" : "日期"} value={draft.date} onChange={v => set("date", v)} />
      {!is("project", "capacity", "payroll", "bank", "goal") && <Select label="專案" value={draft.projectId ?? ""} onChange={e => set("projectId", e.target.value || undefined)}><option value="">公司日常</option>{records.filter(r => r.kind === "project").map(r => <option value={r.id} key={r.id}>{r.title}</option>)}</Select>}
      {is("task", "project", "reimbursement", "payroll", "commitment") && <Select label="狀態" value={draft.status ?? "待開始"} onChange={e => set("status", e.target.value)}>{(is("reimbursement") ? ["草稿", "待確認", "已確認", "需補件"] : is("payroll") ? ["草稿", "已確認"] : WORK_STATUSES).map(s => <option key={s}>{s}</option>)}</Select>}
      {is("task", "payroll", "capacity") && <Select label="負責人" value={draft.assignee ?? actor} onChange={e => set("assignee", e.target.value as "yuxing" | "lily")}>{ACTORS.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</Select>}
      {is("task") && <><Select label="工作類型" value={draft.category ?? "Todo"} onChange={e => set("category", e.target.value)}>{["Todo", "Issue", "Decision"].map(s => <option key={s}>{s}</option>)}</Select><Select label="Size" value={draft.size ?? "M"} onChange={e => set("size", e.target.value as "S" | "M" | "L")}><option>S</option><option>M</option><option>L</option></Select><DateControl label="開始日期" value={draft.started ?? ""} onChange={v => set("started", v || undefined)} /><DateControl label="完成日期" value={draft.completed ?? ""} onChange={v => set("completed", v || undefined)} /></>}
      {is("task", "project", "goal", "commitment") && <DateControl label="截止日期" value={draft.due ?? ""} onChange={v => set("due", v || undefined)} />}
      {is("event") && <><Select label="時間線層級" value={draft.layer ?? "日常"} onChange={e => set("layer", e.target.value as OperatingRecord["layer"])}>{["專案", "日常", "行政"].map(s => <option key={s}>{s}</option>)}</Select><DateControl label="結束日期" value={draft.end ?? ""} onChange={v => set("end", v || undefined)} /><label className="yz-check"><input type="checkbox" checked={!!draft.starred} onChange={e => set("starred", e.target.checked)} />重要事件</label></>}
      {is("file", "transaction", "budget", "capacity") && <Field label="分類"><Input value={draft.category ?? ""} onChange={e => set("category", e.target.value)} /></Field>}
      {is("transaction", "bank", "reimbursement", "budget") && <Field label="金額或公式"><Input value={draft.amount ?? ""} placeholder="例如 1200 或 =600*2" onChange={e => set("amount", e.target.value)} /></Field>}
      {is("transaction") && <><NumberControl label="數量" value={draft.quantity ?? 1} onChange={v => set("quantity", v)} minValue={0} /><NumberControl label="單價" value={draft.unitPrice ?? 0} onChange={v => set("unitPrice", v)} minValue={0} /></>}
      {is("payroll") && <><NumberControl label="本薪（示例）" value={draft.basePay ?? 0} onChange={v => set("basePay", v)} minValue={0} /><NumberControl label="獎金（示例）" value={draft.bonus ?? 0} onChange={v => set("bonus", v)} minValue={0} /></>}
      {is("capacity") && <NumberControl label="容量百分比" value={draft.allocation ?? 0} onChange={v => set("allocation", v)} minValue={0} maxValue={100} />}
      {is("goal", "commitment") && <><NumberControl label="目標值" value={draft.target ?? 1} onChange={v => set("target", v)} minValue={0} /><NumberControl label="目前值" value={draft.actual ?? 0} onChange={v => set("actual", v)} minValue={0} /><Field label="單位"><Input value={draft.unit ?? ""} onChange={e => set("unit", e.target.value)} /></Field></>}
      {is("commitment") && <Select label="承諾方向" value={draft.direction ?? "外部"} onChange={e => set("direction", e.target.value as "內部" | "外部")}><option>內部</option><option>外部</option></Select>}
      {is("project") && <Select label="對齊目標" value={draft.goalId ?? ""} onChange={e => set("goalId", e.target.value || undefined)}><option value="">尚未選擇</option>{records.filter(r => r.kind === "goal").map(r => <option value={r.id} key={r.id}>{r.title}</option>)}</Select>}
    </div>
    {is("project") && <fieldset><legend className="text-sm mb-2">專案成員</legend>{ACTORS.map(a => <label className="yz-check" key={a.id}><input type="checkbox" checked={draft.members?.includes(a.id) ?? false} disabled={a.id === record.author} onChange={e => set("members", e.target.checked ? [...(draft.members ?? []), a.id] : (draft.members ?? []).filter(id => id !== a.id))} />{a.name}</label>)}<label className="yz-check"><input type="checkbox" checked={!!draft.restricted} onChange={e => set("restricted", e.target.checked)} />限制為專案成員可見</label></fieldset>}
    {record.space === "team" && !is("payroll", "capacity", "bank", "budget", "project") && <Select label="可見範圍" value={draft.visibility} onChange={e => set("visibility", e.target.value as OperatingRecord["visibility"])}><option value="team">圓展成員</option><option value="project">專案成員</option><option value="private">僅自己</option></Select>}
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={onDone}>取消</Button><Button type="submit">儲存{KINDS[record.kind]}</Button></div>
  </form>
}
export function NewRecordButton({ kind, defaults, label, onCreated }: { kind: Kind; defaults?: Partial<OperatingRecord>; label?: string; onCreated?: (record: OperatingRecord) => void }) {
  const { make, actor } = useOperating()
  const [draft, setDraft] = React.useState<OperatingRecord | null>(null)
  const allowed = !["payroll", "budget", "bank"].includes(kind) || actor === "yuxing"
  return <><Button disabled={!allowed} onClick={() => setDraft(make(kind, { status: ["task", "project"].includes(kind) ? "待開始" : undefined, ...(kind === "project" ? { members: [actor] } : {}), ...(kind === "task" ? { assignee: actor, size: "M", category: "Todo" } : {}), ...defaults }))}><Plus size={14} />{label ?? `新增${KINDS[kind]}`}</Button><Dialog open={!!draft} onOpenChange={v => { if (!v) setDraft(null) }}><DialogContent className="yz-dialog"><DialogHeader><DialogTitle>新增{KINDS[kind]}</DialogTitle><DialogDescription>填寫內容並建立關聯。</DialogDescription></DialogHeader>{draft && <RecordForm key={draft.id} record={draft} onDone={() => setDraft(null)} onSaved={onCreated} />}</DialogContent></Dialog></>
}
