"use client"

import * as React from "react"
import { Star, ArrowLeft, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useOperating, useOperatingDraft } from "@/lib/context/yuanzhan-ui-context"
import { ACTORS, WORK_STATUSES, type ActorId } from "@/types/yuanzhan-ui"
import { canEdit } from "@/lib/ui-data/yuanzhan/commands"
import { signalsFor, weekOf, workMetrics } from "@/lib/ui-data/yuanzhan/metrics"
import { actorName, DateControl, Empty, NewRecordButton, RecordRows, Reference, SearchField, Select, Tabs } from "./primitives"
import { Files, FileUpload } from "./files"
import { Finance } from "./finance"

export function WorkList({ projectId }: { projectId?: string }) {
  const { records, actor, progress } = useOperating()
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("open")
  const rows = records.filter(r => r.kind === "task" && (!projectId || r.projectId === projectId) && (status === "all" || status === "open" ? status === "all" || r.status !== "完成" : r.status === status) && r.title.toLowerCase().includes(query.toLowerCase()))
  return <><div className="yz-toolbar"><SearchField value={query} onChange={setQuery} /><Select label="工作狀態" value={status} onChange={e => setStatus(e.target.value)}><option value="open">未完成</option><option value="all">全部</option>{WORK_STATUSES.map(s => <option key={s}>{s}</option>)}</Select><NewRecordButton kind="task" defaults={{ projectId }} /></div><RecordRows rows={rows} empty={<Empty title={query ? "找不到符合的工作" : "安排下一個工作"} text="從待辦、議題或決定開始，指派負責人並安排日期。" />} extra={r => <Select label={`更新進度：${r.title}`} value={r.status} disabled={r.author !== actor && r.assignee !== actor} onChange={e => progress(r.id, e.target.value)}>{WORK_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>} /></>
}
export function Comments({ parentId, projectId }: { parentId: string; projectId?: string }) {
  const { records, make, save, actor, remove } = useOperating()
  const [body, setBody] = useOperatingDraft(`comment:${parentId}:body`)
  const [fileId, setFileId] = useOperatingDraft(`comment:${parentId}:file`)
  const comments = records.filter(r => r.kind === "comment" && r.parentId === parentId)
  const parent = records.find(r => r.id === parentId)
  return <section className="yz-comments"><h3><MessageSquare size={15} />留言與協作</h3>{comments.map(c => <div key={c.id} className="yz-comment"><span className="yz-eyebrow">{actorName(c.author)} · {c.date}</span><p>{c.title}</p>{c.refs?.map(id => <Reference key={id} id={id} />)}{c.author === actor && <Button variant="ghost" size="xs" onClick={() => remove(c.id)}>刪除留言</Button>}</div>)}{!comments.length && <p className="text-muted-foreground text-sm my-3">還沒有留言。</p>}<form onSubmit={e => { e.preventDefault(); if (body.trim() && save(make("comment", { title: body.trim(), parentId, projectId, visibility: parent?.visibility ?? "team", refs: fileId ? [fileId] : [] }))) { setBody(""); setFileId("") } }}><Textarea aria-label="留言內容" placeholder="留下你的回覆…" value={body} onChange={e => setBody(e.target.value)} /><div className="flex gap-2 mt-2 items-end"><Select label="附上文件" value={fileId} onChange={e => setFileId(e.target.value)}><option value="">不附檔案</option>{records.filter(r => r.kind === "file").map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</Select><Button type="submit" disabled={!body.trim()}>送出留言</Button><FileUpload projectId={projectId} onCreated={file => setFileId(file.id)} /></div></form></section>
}
export function Projects() {
  const { records, tab, setTab, open } = useOperating()
  const [projectId, setProjectId] = React.useState("")
  const [query, setQuery] = React.useState("")
  const projects = records.filter(r => r.kind === "project")
  const project = projects.find(r => r.id === projectId)
  const activeTab = tab || "總覽"
  if (!project) return <><div className="yz-toolbar"><SearchField value={query} onChange={setQuery} /><NewRecordButton kind="project" onCreated={r => setProjectId(r.id)} /></div>{!projects.length ? <Empty title="第一個專案，從目標開始。" text="建立專案、加入成員，接著安排工作與討論。" /> : <div className="yz-project-index">{projects.filter(r => r.title.includes(query)).map(p => { const tasks = records.filter(r => r.kind === "task" && r.projectId === p.id); const done = tasks.filter(t => t.status === "完成").length; return <button className="yz-project-row" key={p.id} onClick={() => { setProjectId(p.id); setTab("總覽") }}><span className="yz-eyebrow">{p.status} · {p.restricted ? "限定成員" : "團隊專案"}</span><h3>{p.title}</h3><p>{p.body}</p><div className="flex gap-5 text-xs text-muted-foreground"><span>{done} / {tasks.length} 工作完成</span><span>預計 {p.due ?? "尚未安排"}</span><span>{p.members?.map(actorName).join("、")}</span></div><div className="yz-progress"><span style={{ width: `${tasks.length ? done / tasks.length * 100 : 0}%` }} /></div></button> })}</div>}</>
  return <><div className="yz-project-heading"><Button size="sm" variant="ghost" onClick={() => setProjectId("")}><ArrowLeft size={14} />全部專案</Button><h2>{project.title}</h2><Button variant="outline" size="sm" onClick={() => open(project.id)}>專案詳情</Button></div><Tabs items={["總覽", "工作", "對話", "Evidence Repo", "財務"]} value={activeTab} onChange={setTab} />
    {activeTab === "總覽" && <div className="yz-prose"><h3>這個專案要完成什麼</h3><p>{project.body || "尚未填寫交付說明。"}</p>{project.goalId && <Reference id={project.goalId} />}<h3>最近工作</h3><RecordRows rows={records.filter(r => r.kind === "task" && r.projectId === project.id && r.status !== "完成")} /><h3>交付時間</h3><RecordRows rows={records.filter(r => r.kind === "event" && r.projectId === project.id)} /><h3>專案成員</h3><p>{project.members?.map(actorName).join("、")}</p></div>}
    {activeTab === "工作" && <WorkList projectId={project.id} />}
    {activeTab === "對話" && <Threads projectId={project.id} />}
    {activeTab === "Evidence Repo" && <Files projectId={project.id} evidenceOnly />}
    {activeTab === "財務" && <Finance projectId={project.id} />}
  </>
}
function Threads({ projectId }: { projectId: string }) {
  const { records, open } = useOperating()
  const threads = records.filter(r => r.kind === "thread" && r.projectId === projectId)
  return <><div className="yz-toolbar"><p className="text-sm text-muted-foreground flex-1">把討論放在對應階段，讓決策留在脈絡裡。</p><NewRecordButton kind="thread" defaults={{ projectId }} /></div>{!threads.length ? <Empty title="開啟專案的第一段對話" /> : threads.map(t => <section key={t.id} className="yz-thread"><div className="flex gap-2 items-center"><button className="font-semibold flex-1 text-left" onClick={() => open(t.id)}>{t.parentId ? "↳ " : ""}{t.title}</button><NewRecordButton kind="thread" label="子對話" defaults={{ projectId, parentId: t.id }} /><NewRecordButton kind="task" label="建立工作" defaults={{ projectId, refs: [t.id] }} /></div><p className="text-sm text-muted-foreground my-3">{t.body}</p><Comments parentId={t.id} projectId={projectId} /></section>)}</>
}
export function Timeline() {
  const { records, actor, save, state, tab, setTab } = useOperating()
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [query, setQuery] = React.useState("")
  const activeTab = tab || "全部"
  const dated = records.filter(r => r.kind === "event" || (r.kind === "task" && r.due)).map(r => r.kind === "task" ? { ...r, date: r.due!, layer: (r.projectId ? "專案" : "日常") as "專案" | "日常" } : r)
  const events = dated.filter(r => (activeTab === "全部" || r.layer === activeTab) && (!from || r.date >= from) && (!to || r.date <= to) && r.title.includes(query)).sort((a, b) => a.date.localeCompare(b.date))
  return <><Tabs items={["全部", "專案", "日常", "行政"]} value={activeTab} onChange={setTab} /><div className="yz-toolbar"><SearchField value={query} onChange={setQuery} /><DateControl label="開始範圍" value={from} onChange={setFrom} /><DateControl label="結束範圍" value={to} onChange={setTo} /><NewRecordButton kind="event" defaults={{ layer: activeTab === "全部" ? "日常" : activeTab as "專案" | "日常" | "行政" }} /></div>{from && to && from > to ? <p role="alert" className="text-destructive">日期範圍的結束日不能早於開始日。</p> : !events.length ? <Empty title="把下一個重要時間放上來。" text="專案交付、cowork、學習日與行政提醒，都能放在同一條時間線。" /> : <div className="yz-timeline">{[...new Set(events.map(e => e.date))].map(date => <section key={date}><div className="yz-time-date"><strong>{date.slice(5).replace("-", ".")}</strong><span>{date < state.referenceDate ? "過去" : date === state.referenceDate ? "今天" : "接下來"}</span></div><RecordRows rows={events.filter(e => e.date === date)} extra={r => <Button size="icon-sm" variant="ghost" aria-label={`${r.starred ? "取消重要" : "設為重要"}：${r.title}`} disabled={!canEdit(r, actor)} onClick={() => { const source = records.find(item => item.id === r.id); if (source) save({ ...source, starred: !source.starred }) }}><Star size={16} fill={r.starred ? "currentColor" : "none"} /></Button>} /></section>)}</div>}</>
}
export function Today() {
  const { records, actor, state, tab, setTab } = useOperating()
  const today = state.referenceDate
  const lastWeek = new Date(Date.parse(today) - 7 * 86400000).toISOString().slice(0, 10)
  const tasks = records.filter(r => r.kind === "task" && r.assignee === actor)
  const activeTab = tab || "時序"
  return <><Tabs items={["時序", "流程健康", "目標對齊"]} value={activeTab} onChange={setTab} />{activeTab === "時序" && <div className="yz-narrative">{[
    { title: "過去 · 從上週到昨天", subtitle: "已經走過的路，成為今天的起點。", rows: records.filter(r => (r.kind === "journal" && r.author === actor && r.date < today && r.date >= lastWeek) || (r.kind === "task" && r.assignee === actor && r.completed && r.completed < today && r.completed >= lastWeek)).map(r => ({ ...r, date: r.completed ?? r.date })).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8) },
    { title: "今天 · 我正在推進", subtitle: "把注意力留給真正要完成的事情。", rows: tasks.filter(r => r.status !== "完成" && (!r.due || r.due <= today)) },
    { title: "未來 · 記得要做", subtitle: "預留時間，讓重要承諾有位置。", rows: [...tasks.filter(r => r.status !== "完成" && r.due && r.due > today), ...records.filter(r => r.kind === "event" && r.date >= today)] },
  ].map(column => <section key={column.title}><h3>{column.title}</h3><p className="text-sm text-muted-foreground">{column.subtitle}</p><RecordRows rows={column.rows} empty={<p className="text-sm text-muted-foreground py-8">目前沒有相關紀錄。</p>} /></section>)}</div>}
    {activeTab === "流程健康" && <><h3 className="yz-section-title">需要協助的工作</h3><RecordRows rows={tasks.filter(r => r.status === "受阻")} /><h3 className="yz-section-title">進行中的工作</h3><RecordRows rows={tasks.filter(r => r.status === "進行中")} /></>}
    {activeTab === "目標對齊" && <><div className="yz-toolbar"><p className="flex-1 text-muted-foreground text-sm">公司方向 → 專案目標 → 每日行動</p><NewRecordButton kind="goal" /></div>{records.filter(r => r.kind === "goal").map(goal => <section key={goal.id} className="yz-goal"><Reference id={goal.id} /><p>{goal.actual ?? 0} / {goal.target ?? "—"} {goal.unit}</p><RecordRows rows={records.filter(r => r.kind === "project" && r.goalId === goal.id)} /></section>)}{!records.some(r => r.kind === "goal") && <Empty title="先留下這個階段的目標" />}</>}
  </>
}
export function Capacity() {
  const { records, state, tab, setTab } = useOperating()
  const [who, setWho] = React.useState<ActorId>("yuxing")
  const [week, setWeek] = React.useState(weekOf(state.referenceDate))
  const [size, setSize] = React.useState("M")
  const [remaining, setRemaining] = React.useState(state.mode === "empty" ? 0 : 5)
  const activeTab = tab || "週配置"
  const allocations = records.filter(r => r.kind === "capacity" && r.assignee === who && weekOf(r.date) === weekOf(week || state.referenceDate))
  const total = allocations.reduce((n, r) => n + (r.allocation ?? 0), 0)
  const metrics = workMetrics(records, who, size)
  return <><Tabs items={["週配置", "流量指標", "預測"]} value={activeTab} onChange={setTab} /><div className="yz-toolbar"><Select label="成員" value={who} onChange={e => setWho(e.target.value as ActorId)}>{ACTORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>{activeTab === "週配置" ? <DateControl label="配置週" value={week} onChange={setWeek} /> : <Select label="工作 Size" value={size} onChange={e => setSize(e.target.value)}>{["S", "M", "L"].map(s => <option key={s}>{s}</option>)}</Select>}{activeTab === "週配置" && <NewRecordButton kind="capacity" defaults={{ assignee: who, date: week, allocation: 0 }} />}</div>
    {activeTab === "週配置" && <><div className="yz-stat-line"><strong>本週配置 {total}%</strong><span className={total > 100 ? "text-destructive" : "text-muted-foreground"}>{total > 100 ? `超出 ${total - 100}%，請調整配置。` : total === 100 ? "配置完整，包含緩衝。" : `尚有 ${100 - total}% 可安排。`}</span></div>{allocations.length ? allocations.map(r => <div key={r.id} className="yz-allocation"><Reference id={r.id} /><div className="yz-progress"><span style={{ width: `${Math.min(100, r.allocation ?? 0)}%` }} /></div><strong>{r.allocation}%</strong></div>) : <Empty title="先安排這一週的容量" text="配置交付、產品、研究、管理與緩衝的比例，不要求每項任務填寫預估與實際工時。" />}</>}
    {activeTab === "流量指標" && <><div className="yz-metrics"><div><span>WIP</span><strong>{metrics.wip}</strong><small>進行中與受阻</small></div><div><span>Throughput</span><strong>{metrics.throughput?.toFixed(1) ?? "—"}</strong><small>每週完成 {size} 工作</small></div><div><span>Cycle Time P50</span><strong>{metrics.p50 ?? "—"}</strong><small>日</small></div><div><span>Cycle Time P85</span><strong>{metrics.p85 ?? "—"}</strong><small>日</small></div></div><p className="yz-caption">{metrics.count} 筆完成紀錄，涵蓋 {metrics.weeks} 週。任務歷時不等於出勤工時。</p><div className="yz-bars">{Object.entries(metrics.weekCounts).sort().map(([week, count]) => <div key={week}><span>{week}</span><i style={{ width: `${count / Math.max(...Object.values(metrics.weekCounts)) * 70}%` }} /><strong>{count} 件</strong></div>)}</div>{!metrics.count && <Empty title="累積完成紀錄後，就能看見自己的節奏" />}</>}
    {activeTab === "預測" && <div className="yz-prose"><h3>以自己的交付紀錄估算</h3><label className="yz-field"><span>剩餘 {size} 工作數</span><Input type="number" min={0} value={remaining} onChange={e => setRemaining(Math.max(0, Number(e.target.value) || 0))} /></label>{metrics.forecastReady && metrics.throughput ? <><p className="yz-forecast">約 {Math.ceil(remaining / metrics.throughput)} 週</p><p>依 {metrics.weeks} 週、{metrics.count} 筆 {size} 工作的平均流量 {metrics.throughput.toFixed(1)} 件／週估算。工作組成與容量改變時需重新評估。</p><p className="text-sm text-muted-foreground">這是情境估算，沒有保證日期或信心機率；P85 是單件歷時分位數，並非里程碑的 85% 完成機率。</p></> : <Empty title="樣本還不足以估算" text="至少累積 4 週及 8 筆同 Size 的完成工作，才呈現粗略估算。" />}</div>}
  </>
}
export function Signals() {
  const { records, state, transact, tab, setTab, open, space } = useOperating()
  const activeTab = tab || "待處理"
  const all = signalsFor(records, state.referenceDate)
  const rows = all.filter(s => activeTab === "已處理" ? state.dismissedSignals.includes(s.id) : !state.dismissedSignals.includes(s.id))
  return <><Tabs items={["待處理", "已處理", "修改紀錄"]} value={activeTab} onChange={setTab} />{activeTab === "修改紀錄" ? <div>{state.activity.filter(a => a.space === space && records.some(r => r.id === a.recordId)).slice(-50).reverse().map(a => <div className="yz-row" key={a.id}><button onClick={() => open(a.recordId)}>{a.text}</button><span className="yz-eyebrow">{actorName(a.actor)} · {a.at.slice(0, 16).replace("T", " ")}</span></div>)}{!state.activity.some(a => records.some(r => r.id === a.recordId)) && <Empty title="操作後，變更會留在這裡" text="此工作階段的修改紀錄，重新整理後重置。" />}</div> : rows.length ? rows.map(s => <div className="yz-row" key={s.id}><button className="yz-row-main" onClick={() => open(s.recordId)}><strong>{s.title}</strong><span>{s.reason}</span></button><Button variant="outline" onClick={() => transact(previous => ({ ...previous, dismissedSignals: activeTab === "已處理" ? previous.dismissedSignals.filter(id => id !== s.id) : [...previous.dismissedSignals, s.id] }))}>{activeTab === "已處理" ? "重新開啟" : "標記已處理"}</Button></div>) : <Empty title="這裡沒有待處理的訊號" text="期限、阻礙與缺少憑證會從工作紀錄中整理出來。" />}</>
}
