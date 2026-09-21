"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useOperating } from "@/lib/context/yuanzhan-ui-context"
import { canEdit } from "@/lib/ui-data/yuanzhan/commands"
import type { OperatingRecord } from "@/types/yuanzhan-ui"
import { actorName, DateControl, Empty, Field, NewRecordButton, Reference, Select, Tabs } from "./primitives"
import { FilePreview } from "./files"

export function CommitmentLog({ record }: { record: OperatingRecord }) {
  const { actor, save, state } = useOperating()
  const [actual, setActual] = React.useState(String(record.actual ?? 0))
  const [text, setText] = React.useState("")
  const [date, setDate] = React.useState(state.referenceDate)
  const editable = canEdit(record, actor)
  return <div className="yz-detail-section"><h3>月度確認紀錄</h3>{record.logs?.map(log => <div className="yz-comment" key={log.id}><span className="yz-eyebrow">{log.date} · {actorName(log.author)}</span><p>{log.text}</p><strong>確認值 {log.actual} {record.unit}</strong></div>)}{!record.logs?.length && <p className="text-muted-foreground text-sm">尚未留下人工確認紀錄。</p>}{editable && <form onSubmit={e => { e.preventDefault(); const value = Number(actual); if (!text.trim() || !Number.isFinite(value)) return; if (save({ ...record, actual: value, logs: [...(record.logs ?? []), { id: crypto.randomUUID(), author: actor, date, actual: value, text: text.trim() }] })) setText("") }}><div className="yz-form-grid"><DateControl label="確認日期" value={date} onChange={setDate} /><Field label="本次確認值"><Input type="number" required value={actual} onChange={e => setActual(e.target.value)} /></Field></div><Field label="確認說明"><Textarea required value={text} onChange={e => setText(e.target.value)} placeholder="這個月實際完成了什麼，依據在哪裡？" /></Field><Button type="submit" disabled={!text.trim()}>加入確認紀錄</Button></form>}</div>
}
export function Commitments() {
  const { records, actor, save, tab, setTab, open } = useOperating()
  const [selected, setSelected] = React.useState("")
  const direction = tab || "外部"
  const commitments = records.filter(r => r.kind === "commitment" && r.direction === direction)
  const record = commitments.find(r => r.id === selected) ?? commitments[0]
  const source = record?.refs?.map(id => records.find(r => r.id === id)).find(r => r?.kind === "file")
  return <><Tabs items={["外部", "內部"]} value={direction} onChange={v => { setTab(v); setSelected("") }} /><div className="yz-toolbar"><p className="flex-1 text-sm text-muted-foreground">把說過的話，對照可觀察的進展與確認紀錄。</p><NewRecordButton kind="commitment" defaults={{ direction: direction as "內部" | "外部", status: "進行中", logs: [] }} /></div>{!record ? <Empty title="從第一份承諾開始追蹤" text="選擇來源文件，寫下目標、期限與觀察方式。" /> : <><div className="yz-commitment-list" aria-label="承諾列表">{commitments.map(c => <button key={c.id} aria-pressed={c.id === record.id} onClick={() => setSelected(c.id)}>{c.title}<span>{c.due ?? "未設定期限"}</span></button>)}</div><div className="yz-commitment-split"><section><span className="yz-eyebrow">來源文件</span><h3>{source?.title ?? "尚未選擇文件"}</h3>{canEdit(record, actor) && <Select label="承諾來源文件" value={source?.id ?? ""} onChange={e => save({ ...record, refs: [...(record.refs ?? []).filter(id => records.find(r => r.id === id)?.kind !== "file"), ...(e.target.value ? [e.target.value] : [])] })}><option value="">選擇來源</option>{records.filter(r => r.kind === "file").map(f => <option key={f.id} value={f.id}>{f.title}</option>)}</Select>}{source ? <FilePreview version={source.versions?.at(-1)} /> : <Empty title="需要一份可回溯的來源" text="可先到文件庫建立文件，再回來加入引用。" />}</section><section><span className="yz-eyebrow">可觀察的履行紀錄</span><div className="flex gap-3 justify-between items-start"><h3>{record.title}</h3><Button variant="outline" size="sm" onClick={() => open(record.id)}>編輯詳情</Button><NewRecordButton kind="event" label="安排承諾事件" defaults={{ title: record.title, date: record.due || record.date, projectId: record.projectId, commitmentId: record.id, refs: [record.id], layer: record.direction === "內部" ? "行政" : "專案", logs: [] }} /></div><p className="my-4 whitespace-pre-wrap">{record.body}</p><div className="yz-metrics"><div><span>目前 / 目標</span><strong>{record.actual ?? 0} / {record.target ?? "—"}</strong><small>{record.unit}</small></div><div><span>期限</span><strong className="!text-lg">{record.due ?? "未設定"}</strong><small>{record.status}</small></div></div>{record.refs?.filter(id => id !== source?.id).map(id => <Reference key={id} id={id} />)}<CommitmentLog key={record.id} record={record} /></section></div></>}</>
}
