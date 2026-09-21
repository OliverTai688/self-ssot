"use client"

import * as React from "react"
import { Upload, FileText, Folder, Archive, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useOperating } from "@/lib/context/yuanzhan-ui-context"
import { canEdit, freezeEvidence } from "@/lib/ui-data/yuanzhan/commands"
import type { FileVersion, OperatingRecord } from "@/types/yuanzhan-ui"
import { Empty, Field, NewRecordButton, Reference, SearchField, Select, Tabs } from "./primitives"

async function readLocalFile(file: File, date: string): Promise<FileVersion> {
  if (file.size > 5 * 1024 * 1024) throw new Error("單一示例檔案上限為 5 MB。")
  const image = ["image/png", "image/jpeg", "image/webp"].includes(file.type)
  const pdf = file.type === "application/pdf"
  const text = /\.(md|txt|csv|json)$/i.test(file.name) || file.type.startsWith("text/")
  if (!image && !pdf && !text) throw new Error("請選擇 Markdown、文字、CSV、JSON、PNG、JPG、WebP 或 PDF。")
  const version: FileVersion = { id: `version-${crypto.randomUUID()}`, name: file.name, date, text: text ? await file.text() : `${file.name} · ${Math.ceil(file.size / 1024)} KB`, mime: file.type }
  if (image || pdf) version.dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
  return version
}
export function FileUpload({ existing, projectId, onCreated }: { existing?: OperatingRecord; projectId?: string; onCreated?: (file: OperatingRecord) => void }) {
  const { state, make, save, notify } = useOperating()
  const [busy, setBusy] = React.useState(false)
  const id = React.useId()
  return <div><label htmlFor={id} className="yz-upload-button"><Upload size={14} />{busy ? "讀取中…" : existing ? "加入新版本" : "加入本機文件"}</label><input id={id} className="sr-only" aria-label={existing ? "上傳文件新版本" : "上傳本機文件"} type="file" accept=".md,.txt,.csv,.json,.png,.jpg,.jpeg,.webp,.pdf" disabled={busy} onChange={async e => {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try { const version = await readLocalFile(file, state.referenceDate); const record = existing ? { ...existing, versions: [...(existing.versions ?? []), version] } : make("file", { title: file.name, projectId, category: "material", versions: [version] }); if (save(record)) { onCreated?.(record); notify("文件已加入此工作階段；重新整理後會重置。") } } catch (error) { notify(error instanceof Error ? error.message : "無法讀取檔案。") } finally { setBusy(false); e.target.value = "" }
  }} /></div>
}
export function FilePreview({ version }: { version?: FileVersion }) {
  if (!version) return <Empty title="尚未加入文件內容" text="可加入本機檔案或文字版本。" />
  if (version.dataUrl && ["image/png", "image/jpeg", "image/webp"].includes(version.mime ?? "")) {
    // Local in-memory image, not an optimized remote image asset.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={version.dataUrl} alt={version.name} className="yz-file-image" />
  }
  if (version.dataUrl?.startsWith("data:application/pdf;")) return <iframe title={`PDF：${version.name}`} className="yz-pdf" src={version.dataUrl} />
  return <pre className="yz-document">{version.text}</pre>
}
export function Files({ projectId, evidenceOnly = false }: { projectId?: string; evidenceOnly?: boolean }) {
  const { records, open, tab, setTab } = useOperating()
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState("")
  const activeTab = evidenceOnly ? "Evidence Repo" : tab || "文件庫"
  const rows = records.filter(r => r.kind === (activeTab === "Evidence Repo" ? "evidence" : "file") && (!projectId || r.projectId === projectId) && `${r.title} ${r.tags?.join(" ") ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (!category || r.category === category))
  return <>{!evidenceOnly && <Tabs items={["文件庫", "Evidence Repo"]} value={activeTab} onChange={setTab} />}<div className="yz-toolbar"><SearchField value={query} onChange={setQuery} />{activeTab === "文件庫" && <Select label="文件分類" value={category} onChange={e => setCategory(e.target.value)}><option value="">所有分類</option>{["contract", "proposal", "material", "yzedtech_brand", "voucher"].map(c => <option key={c}>{c}</option>)}</Select>}{activeTab === "文件庫" ? <><FileUpload projectId={projectId} /><NewRecordButton kind="file" label="建立文字文件" defaults={{ projectId, versions: [] }} /></> : <NewRecordButton kind="evidence" defaults={{ projectId, entries: [], snapshots: [], readme: "" }} />}</div>
    {!rows.length ? <Empty title={activeTab === "文件庫" ? "把文件放回共同的脈絡。" : "為這個專案建立可回顧的交付版本。"} text={activeTab === "文件庫" ? "從日誌、對話或帳目引用同一份文件，保留版本與來源。" : "加入文件、整理資料夾與 README，再留下固定版本快照。"} /> : <div className="yz-file-list">{rows.map(r => <button key={r.id} className="yz-file-row" onClick={() => open(r.id)}>{r.kind === "file" ? <FileText size={22} /> : <Folder size={22} />}<div><strong>{r.title}</strong><span>{r.kind === "file" ? `${r.category || "未分類"} · ${r.versions?.length ?? 0} 個版本` : `${r.entries?.length ?? 0} 份文件 · ${r.snapshots?.length ?? 0} 次封存`}</span></div><small>{r.date}</small></button>)}</div>}
  </>
}
export function FileDetail({ record }: { record: OperatingRecord }) {
  const { records, actor, save, state } = useOperating()
  const [versionId, setVersionId] = React.useState("")
  const [text, setText] = React.useState("")
  const current = record.versions?.find(v => v.id === versionId) ?? record.versions?.at(-1)
  const backlinks = records.filter(r => r.id !== record.id && (r.refs?.includes(record.id) || r.fileIds?.includes(record.id) || r.entries?.some(e => e.fileId === record.id)))
  return <><Select label="文件版本" value={current?.id ?? ""} onChange={e => setVersionId(e.target.value)}>{!record.versions?.length && <option value="">尚無版本</option>}{record.versions?.map((v, i) => <option value={v.id} key={v.id}>v{i + 1} · {v.date} · {v.name}</option>)}</Select><FilePreview version={current} />{canEdit(record, actor) && <div className="yz-detail-section"><FileUpload existing={record} /><Field label="新增文字版本"><Textarea placeholder="輸入新版本內容…" value={text} onChange={e => setText(e.target.value)} rows={5} /></Field><Button variant="outline" disabled={!text.trim()} onClick={() => { const version: FileVersion = { id: `version-${crypto.randomUUID()}`, name: `v${(record.versions?.length ?? 0) + 1}`, text, date: state.referenceDate }; if (save({ ...record, versions: [...(record.versions ?? []), version] })) { setText(""); setVersionId(version.id) } }}>儲存新版本</Button><Field label="標籤（逗號分隔）"><Input key={record.tags?.join(", ")} defaultValue={record.tags?.join(", ") ?? ""} onBlur={e => save({ ...record, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></Field></div>}<h3 className="yz-section-title">哪些地方引用了它</h3>{backlinks.length ? backlinks.map(r => <div className="py-2" key={r.id}><Reference id={r.id} /></div>) : <p className="text-sm text-muted-foreground">目前沒有引用。</p>}</>
}
export function EvidenceDetail({ record }: { record: OperatingRecord }) {
  const { records, state, save, actor, notify } = useOperating()
  const [fileId, setFileId] = React.useState("")
  const [versionId, setVersionId] = React.useState("")
  const [path, setPath] = React.useState("")
  const [snapshot, setSnapshot] = React.useState("")
  const editable = canEdit(record, actor)
  const file = records.find(r => r.id === fileId)
  const frozen = record.snapshots?.find(s => s.id === snapshot)
  const entries = frozen?.entries ?? record.entries ?? []
  return <><Select label="Evidence 版本" value={snapshot} onChange={e => setSnapshot(e.target.value)}><option value="">工作中版本</option>{record.snapshots?.map(s => <option key={s.id} value={s.id}>{s.id} · {s.date}（固定快照）</option>)}</Select><div className="yz-evidence-tree"><h3><Folder size={16} /> / {record.title}</h3>{[...entries].sort((a, b) => a.path.localeCompare(b.path)).map(e => <div className="yz-tree-entry" key={e.path}><div style={{ paddingLeft: Math.max(0, e.path.split("/").length - 1) * 12 }}><span>{e.path}</span><small>v{(records.find(file => file.id === e.fileId)?.versions?.findIndex(version => version.id === e.versionId) ?? -1) + 1} · 固定來源版本</small></div><Reference id={e.fileId} />{!frozen && editable && <Button size="xs" variant="ghost" onClick={() => save({ ...record, entries: record.entries?.filter(x => x.path !== e.path) })}>移除</Button>}</div>)}{!entries.length && <p className="text-sm text-muted-foreground">尚未加入文件。</p>}</div>
    {!frozen && editable && <div className="yz-detail-section"><h3>加入指定文件版本</h3><Select label="來源文件" value={fileId} onChange={e => { setFileId(e.target.value); setVersionId("") }}><option value="">選擇文件</option>{records.filter(r => r.kind === "file").map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</Select><Select label="固定文件版本" value={versionId} onChange={e => setVersionId(e.target.value)}><option value="">選擇版本</option>{file?.versions?.map((v, i) => <option key={v.id} value={v.id}>v{i + 1} · {v.date}</option>)}</Select><Field label="資料夾路徑"><Input value={path} placeholder="docs/訪談整理.md" onChange={e => setPath(e.target.value)} /></Field><Button disabled={!fileId || !versionId || !path.trim()} onClick={() => { if (record.entries?.some(e => e.path === path.trim())) { notify("已有相同路徑。"); return }; if (save({ ...record, entries: [...(record.entries ?? []), { path: path.trim(), fileId, versionId }] })) { setPath(""); setFileId(""); setVersionId("") } }}><Plus size={14} />加入資料夾</Button></div>}
    <h3 className="yz-section-title">README.md</h3>{!frozen && editable ? <><Textarea rows={8} aria-label="Evidence README" value={record.readme ?? ""} onChange={e => save({ ...record, readme: e.target.value })} /><div className="flex gap-2 my-3"><Button variant="outline" onClick={() => notify("README 已即時儲存在本次工作階段。") }>儲存 README</Button><Button onClick={() => { try { const next = freezeEvidence(record, state, state.referenceDate); if (save(next)) { setSnapshot(next.snapshots.at(-1)!.id); notify("已建立固定版本快照。") } } catch (error) { notify(error instanceof Error ? error.message : "無法封存。") } }}><Archive size={14} />建立版本快照</Button></div></> : <pre className="yz-document">{frozen?.readme ?? record.readme ?? "尚未填寫"}</pre>}
    {frozen && <div className="yz-detail-section"><h3>封存的文件內容</h3>{frozen.entries.map(e => <details key={e.path}><summary>{e.path}</summary><pre className="yz-document">{e.text}</pre></details>)}</div>}
  </>
}
