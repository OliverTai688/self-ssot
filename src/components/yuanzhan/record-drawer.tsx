"use client"

import * as React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useOperating } from "@/lib/context/yuanzhan-ui-context"
import { canEdit } from "@/lib/ui-data/yuanzhan/commands"
import { KINDS, WORK_STATUSES } from "@/types/yuanzhan-ui"
import { actorName, RecordForm, Reference, Select } from "./primitives"
import { Comments } from "./work-views"
import { FileDetail, EvidenceDetail } from "./files"
import { TransactionDetail } from "./finance"
import { CommitmentLog } from "./commitments"
import { RichEditor } from "./journal"

export function RecordDrawer() {
  const { records, selected, open, actor, save, remove, progress, state } = useOperating()
  const record = records.find(r => r.id === selected)
  const [editing, setEditing] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [refId, setRefId] = React.useState("")
  const [resolution, setResolution] = React.useState("")
  const [previousSelection, setPreviousSelection] = React.useState(selected)
  if (previousSelection !== selected) { setPreviousSelection(selected); setEditing(false); setDeleting(false); setRefId(""); setResolution("") }
  const allowed = !!record && canEdit(record, actor)
  function close() { open(null); setEditing(false); setDeleting(false); setRefId("") }
  return <><Sheet open={!!record} onOpenChange={value => { if (!value) close() }}><SheetContent className="yz-sheet"><SheetHeader><SheetTitle>{record?.title ?? "紀錄詳情"}</SheetTitle><SheetDescription>{record && `${KINDS[record.kind]} · ${actorName(record.author)} · ${record.date}`}</SheetDescription></SheetHeader>{record && <div className="yz-sheet-body" key={record.id}>
    {editing ? <RecordForm record={record} onDone={() => setEditing(false)} /> : <>
      <div className="yz-detail-meta"><span>{record.visibility === "private" ? "僅作者" : record.visibility === "project" ? "專案成員" : "團隊可見"}</span><span>{record.status}</span>{allowed && record.kind !== "journal" && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>編輯內容</Button>}{allowed && !record.commitmentId && <Button variant="ghost" size="sm" onClick={() => setDeleting(true)}>刪除</Button>}</div>
      {record.projectId && <div className="my-4"><Reference id={record.projectId} /></div>}
      {record.kind === "journal" ? <RichEditor record={record} editable={allowed} /> : record.body && <p className="whitespace-pre-wrap text-sm leading-7 my-5">{record.body}</p>}
      {record.kind === "task" && <div className="yz-detail-section"><Select label="工作進度" value={record.status ?? "待開始"} disabled={record.author !== actor && record.assignee !== actor} onChange={e => progress(record.id, e.target.value)}>{WORK_STATUSES.map(s => <option key={s}>{s}</option>)}</Select><p className="text-sm">{actorName(record.assignee)} · Size {record.size ?? "—"} · 截止 {record.due ?? "未安排"}</p><p className="text-xs text-muted-foreground">開始 {record.started ?? "—"} → 完成 {record.completed ?? "—"}</p></div>}
      {record.kind === "event" && record.commitmentId && <section className="yz-detail-section"><h3>承諾來源與履行</h3><Reference id={record.commitmentId} />{record.logs?.map(log => <p key={log.id} className="text-sm my-3">{log.date} · {actorName(log.author)} · {log.text}</p>)}{allowed && <><Textarea aria-label="履行或變更說明" value={resolution} onChange={e => setResolution(e.target.value)} placeholder="留下履行依據，或雙方協議變更的原因。" /><div className="flex gap-2 mt-3">{["已履行", "已協議變更"].map(status => <Button key={status} disabled={!resolution.trim()} variant="outline" onClick={() => { if (save({ ...record, status, logs: [...(record.logs ?? []), { id: crypto.randomUUID(), date: state.referenceDate, author: actor, actual: 1, text: `${status}：${resolution.trim()}` }] })) setResolution("") }}>{status}</Button>)}</div></>}</section>}
      {record.kind === "file" && <FileDetail record={record} />}
      {record.kind === "evidence" && <EvidenceDetail record={record} />}
      {["transaction", "reimbursement", "bank"].includes(record.kind) && <TransactionDetail record={record} />}
      {record.kind === "commitment" && <CommitmentLog record={record} />}
      {record.kind !== "file" && <><h3 className="yz-section-title">關聯與來源</h3><div className="yz-references">{record.refs?.map(id => <div key={id} className="flex gap-2 items-center"><Reference id={id} />{allowed && <Button variant="ghost" size="xs" aria-label={`解除引用 ${id}`} onClick={() => save({ ...record, refs: record.refs?.filter(r => r !== id) })}>×</Button>}</div>)}</div>{allowed && <div className="flex gap-2 items-end my-3"><Select label="引用來源" value={refId} onChange={e => setRefId(e.target.value)}><option value="">選擇物件</option>{records.filter(r => r.id !== record.id && r.kind !== "comment" && !record.refs?.includes(r.id)).map(r => <option value={r.id} key={r.id}>{KINDS[r.kind]} · {r.title}</option>)}</Select><Button size="sm" disabled={!refId} onClick={() => { if (save({ ...record, refs: [...(record.refs ?? []), refId] })) setRefId("") }}>加入引用</Button></div>}</>}
      <Comments key={record.id} parentId={record.id} projectId={record.projectId} />
    </>}
  </div>}</SheetContent></Sheet><Dialog open={deleting} onOpenChange={setDeleting}><DialogContent><DialogHeader><DialogTitle>刪除這筆{record ? KINDS[record.kind] : "紀錄"}？</DialogTitle><DialogDescription>仍被其他內容引用的紀錄會先要求解除關聯。刪除後可復原上一步。</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleting(false)}>取消</Button><Button variant="destructive" onClick={() => { if (record && remove(record.id)) close(); else setDeleting(false) }}>確認刪除</Button></div></DialogContent></Dialog></>
}
