"use client"

import * as React from "react"
import { ArrowDownUp, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useOperating } from "@/lib/context/yuanzhan-ui-context"
import { canEdit, putRecord, reconcileRecords } from "@/lib/ui-data/yuanzhan/commands"
import { evaluateFormula, type CellMap } from "@/lib/ui-data/yuanzhan/formulas"
import type { OperatingRecord } from "@/types/yuanzhan-ui"
import { actorName, Empty, money, NewRecordButton, RecordRows, Reference, SearchField, Select, Tabs } from "./primitives"
import { FilePreview, FileUpload } from "./files"

export function ledgerCells(records: OperatingRecord[]): CellMap {
  const cells: CellMap = {}
  for (const r of records.filter(r => r.kind === "transaction")) {
    if (!r.ledgerRow) continue
    cells[`B${r.ledgerRow}`] = r.quantity ?? ""
    cells[`C${r.ledgerRow}`] = r.unitPrice ?? ""
    cells[`D${r.ledgerRow}`] = r.amount ?? ""
  }
  return cells
}
export function amountOf(record: OperatingRecord, records: OperatingRecord[]) {
  return evaluateFormula(record.amount ?? "", ledgerCells(records))
}
export function Finance({ projectId }: { projectId?: string }) {
  const { records, actor, make, save, transact, notify, open } = useOperating()
  const [tab, setTab] = React.useState("帳本")
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [sort, setSort] = React.useState(false)
  const [selected, setSelected] = React.useState<string[]>([])
  const [paste, setPaste] = React.useState<string | null>(null)
  const [bankId, setBankId] = React.useState("")
  const [transactionId, setTransactionId] = React.useState("")
  const [report, setReport] = React.useState<OperatingRecord | null>(null)
  const base = records.filter(r => r.kind === "transaction" && (!projectId || r.projectId === projectId))
  const rows = base.filter(r => (!category || r.category === category) && `${r.title} ${r.category}`.includes(query)).sort((a, b) => sort ? a.title.localeCompare(b.title, "zh-TW") : (a.ledgerRow ?? 0) - (b.ledgerRow ?? 0))
  const total = base.length && base.every(r => amountOf(r, records).value !== null) ? base.reduce((n, r) => n + (amountOf(r, records).value ?? 0), 0) : null
  const visibleTotal = rows.length && rows.every(r => amountOf(r, records).value !== null) ? rows.reduce((n, r) => n + (amountOf(r, records).value ?? 0), 0) : null
  const fileRecords = records.filter(r => r.kind === "file" && (r.category === "voucher" || base.some(t => t.fileIds?.includes(r.id))))
  const banks = records.filter(r => r.kind === "bank")
  const bank = banks.find(r => r.id === bankId), txn = base.find(r => r.id === transactionId)
  const bankAmount = bank ? amountOf(bank, records) : null, txnAmount = txn ? amountOf(txn, records) : null
  const difference = bankAmount?.value != null && txnAmount?.value != null ? bankAmount.value - txnAmount.value : null
  function cellSave(record: OperatingRecord, field: "title" | "category" | "quantity" | "unitPrice" | "amount", value: string) {
    const next = { ...record, [field]: field === "quantity" || field === "unitPrice" ? Number(value) : value }
    save(next)
  }
  function addPasted(text: string) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (!lines.length || lines.length > 200) { notify("請貼上 1 至 200 列。每列：名稱、分類、數量、單價、金額／公式。"); return }
    const first = Math.max(0, ...records.filter(r => r.kind === "transaction").map(r => r.ledgerRow ?? 0)) + 1
    const created = lines.map((line, i) => { const [title, category = "", quantity = "1", unitPrice = "0", amount = ""] = line.split("\t"); return make("transaction", { title, projectId, category, quantity: Number(quantity), unitPrice: Number(unitPrice), amount: amount || `=B${first + i}*C${first + i}`, ledgerRow: first + i, status: "待對帳" }) })
    if (transact(previous => created.reduce((s, r) => putRecord(s, r, actor, new Date().toISOString()), previous))) { setPaste(null); notify(`已新增 ${created.length} 筆帳目。`) }
  }
  return <><Tabs items={["帳本", "憑證庫", "洞察", "對帳", "報帳", "人事", "專案預算"]} value={tab} onChange={setTab} />
    {tab === "帳本" && <><div className="yz-toolbar"><SearchField value={query} onChange={setQuery} /><Select label="帳目分類" value={category} onChange={e => setCategory(e.target.value)}><option value="">全部分類</option>{[...new Set(base.map(r => r.category).filter(Boolean))].map(c => <option key={c}>{c}</option>)}</Select><Button variant="outline" onClick={() => setSort(!sort)}><ArrowDownUp size={14} />{sort ? "列號排序" : "名稱排序"}</Button><Button variant="outline" onClick={() => setPaste("")}>批次貼上</Button><NewRecordButton kind="transaction" defaults={{ projectId, status: "待對帳", quantity: 1, unitPrice: 0 }} /></div>
      <p className="yz-caption">直接編輯儲存格；Enter 儲存、Tab 移動。B＝數量、C＝單價、D＝金額。列號固定，排序不改變公式引用。支出填正數、收入填負數；合計為淨支出。</p>
      {selected.length > 0 && <div className="yz-bulk"><span>已選 {selected.length} 筆</span><Button size="sm" variant="outline" onClick={() => { if (transact(previous => previous.records.filter(r => selected.includes(r.id)).reduce((s, r) => putRecord(s, { ...r, status: "待複核" }, actor, new Date().toISOString()), previous))) setSelected([]) }}>批次標記待複核</Button><Button size="sm" variant="ghost" onClick={() => setSelected([])}>取消選取</Button></div>}
      {!rows.length ? <Empty title="第一筆帳，從清楚的來源開始。" text="新增交易，再附上憑證。也可以從試算表複製多列資料貼上。" /> : <div className="yz-table-scroll" tabIndex={0} role="region" aria-label="財務帳本"><table className="yz-table"><caption className="sr-only">帳目可直接編輯，包含公式與憑證連結</caption><thead><tr><th>選取</th><th>列</th><th>日期</th><th>A · 名稱</th><th>分類</th><th>B · 數量</th><th>C · 單價</th><th>D · 金額／公式</th><th>計算結果</th><th>憑證</th><th>狀態</th></tr></thead><tbody>{rows.map(r => { const result = amountOf(r, records); const editable = canEdit(r, actor); return <tr key={r.id}><td><input type="checkbox" aria-label={`選取帳目：${r.title}`} disabled={!editable} checked={selected.includes(r.id)} onChange={e => setSelected(s => e.target.checked ? [...s, r.id] : s.filter(id => id !== r.id))} /></td><th scope="row">{r.ledgerRow}</th><td>{r.date.slice(5)}</td>{(["title", "category", "quantity", "unitPrice", "amount"] as const).map(field => <td key={field}><Input key={`${r.id}-${field}-${r[field]}`} className={field === "amount" ? "font-mono w-36" : field === "title" ? "min-w-44" : "w-24"} aria-label={`${r.ledgerRow} 列 ${field}`} readOnly={!editable} defaultValue={r[field] ?? ""} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur() }} onBlur={e => { if (String(r[field] ?? "") !== e.target.value) cellSave(r, field, e.target.value) }} onPaste={e => { const text = e.clipboardData.getData("text"); if (editable && /[\t\n]/.test(text)) { e.preventDefault(); setPaste(text) } }} /></td>)}<td className={result.error ? "text-destructive" : "font-mono"}>{result.error ?? money(result.value)}</td><td><Button variant="ghost" size="sm" onClick={() => open(r.id)}><Paperclip size={12} />{r.fileIds?.length ?? 0}</Button></td><td><button onClick={() => open(r.id)} className="text-xs underline underline-offset-4">{r.status ?? "待對帳"}</button></td></tr> })}</tbody><tfoot><tr><th colSpan={8}>{rows.length === base.length ? "合計" : "篩選合計"}</th><td colSpan={3}>{money(visibleTotal)}{rows.some(r => amountOf(r, records).error) && " · 請先修正公式錯誤"}</td></tr></tfoot></table></div>}
      <details className="yz-help"><summary>可使用的公式</summary><p>算術 + − * /、括號、儲存格 B1/C1/D1、同欄範圍 D1:D3，與 SUM、AVERAGE、MIN、MAX。例如 =B1*C1 或 =SUM(D1:D2)。不支援跨檔案公式。#REF! 表示來源不存在；#CYCLE! 表示循環引用。</p></details></>}
    {tab === "憑證庫" && <><div className="yz-toolbar"><p className="flex-1 text-sm text-muted-foreground">從憑證回到帳目，也能從帳目找到多份附件。</p><FileUpload projectId={projectId} onCreated={r => save({ ...r, category: "voucher" })} /></div>{fileRecords.length ? <div className="yz-vouchers">{fileRecords.map(file => <article key={file.id}><button className="text-left w-full" onClick={() => open(file.id)}><h3>{file.title}</h3><FilePreview version={file.versions?.at(-1)} /></button><div className="yz-references">{base.filter(t => t.fileIds?.includes(file.id)).map(t => <Reference key={t.id} id={t.id} />)}</div></article>)}</div> : <Empty title="還沒有憑證" text="加入本機文件，再到帳目詳情建立對應。" />}</>}
    {tab === "洞察" && <div className="yz-prose"><h3>目前的花費集中在哪裡？</h3><p>已記錄 {base.length} 筆帳目，合計 {money(total)}。{total === null ? "資料不足或含無法計算的帳目，暫不推論。" : "以下依分類整理，點入帳目可以核對憑證。"}</p>{[...new Set(base.map(r => r.category || "未分類"))].map(c => { const group = base.filter(r => (r.category || "未分類") === c); const valid = group.every(r => amountOf(r, records).value != null); const value = group.reduce((s, r) => s + (amountOf(r, records).value ?? 0), 0); return <div key={c} className="yz-insight"><div><strong>{c}</strong><span>{valid ? money(value) : "需修正金額"}</span></div><div className="yz-progress"><span style={{ width: total && valid ? `${Math.min(100, Math.abs(value / total) * 100)}%` : "0%" }} /></div><p>{group.length} 筆；{group.filter(r => !r.fileIds?.length).length} 筆尚未附上憑證。</p></div> })}{!base.length && <Empty title="記錄第一筆帳目後，再開始觀察" />}</div>}
    {tab === "對帳" && <><div className="yz-toolbar"><p className="flex-1 text-sm">逐筆比對銀行明細與帳本，保留差異。</p><NewRecordButton kind="bank" /></div><div className="yz-reconcile"><section><h3>銀行明細</h3><RecordRows rows={banks} extra={r => <span>{money(amountOf(r, records).value)}{r.matchedId && " · 已配對"}</span>} /></section><section><h3>帳本配對</h3><Select label="選擇銀行明細" value={bankId} onChange={e => setBankId(e.target.value)}><option value="">請選擇</option>{banks.filter(r => !r.matchedId).map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</Select><Select label="選擇帳目" value={transactionId} onChange={e => setTransactionId(e.target.value)}><option value="">請選擇</option>{base.filter(r => !r.matchedId).map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</Select><p className="my-5">差額：<strong className={difference ? "text-destructive" : ""}>{money(difference)}</strong></p><Button disabled={!bank || !txn || difference === null || actor !== "yuxing"} onClick={() => { if (!bank || !txn) return; if (transact(previous => { return reconcileRecords(previous, bank.id, txn.id, actor, difference === 0 ? "已對帳" : "差異待查", new Date().toISOString()) })) { setBankId(""); setTransactionId(""); notify(difference === 0 ? "已完成配對。" : "已保留配對與差異，待後續確認。") } }}>確認配對</Button></section></div></>}
    {tab === "報帳" && <><div className="yz-toolbar"><p className="flex-1 text-muted-foreground text-sm">填寫、補件與確認；報帳單提供本機預覽。</p><NewRecordButton kind="reimbursement" defaults={{ projectId, status: "草稿" }} /></div><RecordRows rows={records.filter(r => r.kind === "reimbursement" && (!projectId || r.projectId === projectId))} extra={r => <><span>{money(amountOf(r, records).value)}</span><Button variant="outline" size="sm" onClick={() => setReport(r)}>預覽報帳單</Button></>} /></>}
    {tab === "人事" && <><div className="yz-toolbar"><p className="flex-1 text-sm text-muted-foreground">本薪與獎金試算 · 不包含法定扣繳計算或實際付款</p><NewRecordButton kind="payroll" defaults={{ assignee: actor, status: "草稿" }} /></div><div className="yz-table-scroll"><table className="yz-table"><thead><tr><th>月份與人員</th><th>本薪</th><th>獎金</th><th>試算合計</th><th>狀態</th></tr></thead><tbody>{records.filter(r => r.kind === "payroll").map(r => <tr key={r.id}><td><button onClick={() => open(r.id)} className="underline">{r.title} · {actorName(r.assignee)}</button></td><td>{money(r.basePay)}</td><td>{money(r.bonus)}</td><td>{money((r.basePay ?? 0) + (r.bonus ?? 0))}</td><td>{r.status}</td></tr>)}</tbody></table></div>{!records.some(r => r.kind === "payroll") && <Empty title="尚未建立人事試算" />}</>}
    {tab === "專案預算" && <><div className="yz-toolbar"><p className="flex-1 text-sm text-muted-foreground">依專案與分類比較預算和帳本支出。</p><NewRecordButton kind="budget" defaults={{ projectId }} /></div>{records.filter(r => r.kind === "budget" && (!projectId || r.projectId === projectId)).map(r => { const related = base.filter(t => t.projectId === r.projectId && (!r.category || t.category === r.category)); const budget = amountOf(r, records).value; const valid = related.every(t => amountOf(t, records).value != null); const spent = valid ? related.reduce((n, t) => n + (amountOf(t, records).value ?? 0), 0) : null; return <section key={r.id} className="yz-budget"><Reference id={r.id} /><div className="yz-metrics"><div><span>預算</span><strong>{money(budget)}</strong></div><div><span>實際支出</span><strong>{money(spent)}</strong></div><div><span>差額</span><strong>{budget !== null && spent !== null ? money(budget - spent) : "—"}</strong></div></div><div className="yz-references">{related.map(t => <Reference id={t.id} key={t.id} />)}</div></section> })}{!records.some(r => r.kind === "budget") && <Empty title="先為專案安排預算" />}</>}
    <Dialog open={paste !== null} onOpenChange={v => { if (!v) setPaste(null) }}><DialogContent className="yz-dialog"><DialogHeader><DialogTitle>從試算表貼上帳目</DialogTitle><DialogDescription>每列依序為：名稱、分類、數量、單價、金額／公式，以 Tab 分隔。會新增紀錄，不覆蓋原列。</DialogDescription></DialogHeader><Textarea aria-label="貼上帳目資料" value={paste ?? ""} rows={8} onChange={e => setPaste(e.target.value)} /><Button disabled={!paste?.trim()} onClick={() => addPasted(paste ?? "")}>加入帳本</Button></DialogContent></Dialog>
    <Dialog open={!!report} onOpenChange={v => { if (!v) setReport(null) }}><DialogContent><DialogHeader><DialogTitle>報帳單預覽</DialogTitle><DialogDescription>僅本機預覽，尚未產生對外提交連結。</DialogDescription></DialogHeader>{report && <div className="yz-prose"><h3>{report.title}</h3><p>{actorName(report.author)} · {report.date}</p><p>{money(amountOf(report, records).value)} · {report.status}</p>{report.fileIds?.map(id => <Reference key={id} id={id} />)}</div>}</DialogContent></Dialog>
  </>
}
export function TransactionDetail({ record }: { record: OperatingRecord }) {
  const { records, actor, save, transact } = useOperating()
  const [fileId, setFileId] = React.useState("")
  const editable = canEdit(record, actor)
  return <><p className="yz-forecast">{amountOf(record, records).error ?? money(amountOf(record, records).value)}</p>{record.matchedId && <div className="py-3"><span className="text-sm">配對來源：</span><Reference id={record.matchedId} />{actor === "yuxing" && <Button size="xs" variant="outline" onClick={() => transact(previous => reconcileRecords(previous, record.kind === "bank" ? record.id : record.matchedId!, record.kind === "bank" ? record.matchedId! : record.id, actor, "待對帳", new Date().toISOString()))}>解除配對</Button>}</div>}<h3 className="yz-section-title">對應憑證</h3>{record.fileIds?.map(id => { const file = records.find(r => r.id === id); return <div key={id} className="yz-detail-section"><Reference id={id} />{file && <FilePreview version={file.versions?.at(-1)} />}{editable && <Button size="xs" variant="ghost" onClick={() => save({ ...record, fileIds: record.fileIds?.filter(f => f !== id) })}>解除對應</Button>}</div> })}{editable && <div className="yz-detail-section"><Select label="選擇憑證" value={fileId} onChange={e => setFileId(e.target.value)}><option value="">選擇文件</option>{records.filter(r => r.kind === "file" && !record.fileIds?.includes(r.id)).map(r => <option value={r.id} key={r.id}>{r.title}</option>)}</Select><Button disabled={!fileId} onClick={() => { if (save({ ...record, fileIds: [...(record.fileIds ?? []), fileId] })) setFileId("") }}>建立憑證對應</Button><FileUpload projectId={record.projectId} onCreated={file => save({ ...record, fileIds: [...(record.fileIds ?? []), file.id] })} /></div>}</>
}
