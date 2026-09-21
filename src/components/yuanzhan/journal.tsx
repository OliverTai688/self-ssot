"use client"

import * as React from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Heading2, List, ListOrdered, Undo2, Redo2, Plus, Link2, MessageSquare, IndentIncrease, IndentDecrease } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useOperating } from "@/lib/context/yuanzhan-ui-context"
import type { Kind, OperatingRecord, RichDoc } from "@/types/yuanzhan-ui"
import { FileUpload } from "./files"
import { ACTORS } from "@/types/yuanzhan-ui"
import { actorName, DateControl, Empty, Reference, RecordForm, Select, Tabs } from "./primitives"

export function RichEditor({ record, editable, onCommand }: { record: OperatingRecord; editable: boolean; onCommand?: (kind: Kind | "reference") => void }) {
  const { save } = useOperating()
  const latest = React.useRef({ record, save, onCommand })
  React.useEffect(() => { latest.current = { record, save, onCommand } }, [record, save, onCommand])
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } })], immediatelyRender: false,
    content: record.document ?? { type: "doc", content: [{ type: "paragraph", ...(record.body ? { content: [{ type: "text", text: record.body }] } : {}) }] },
    editable,
    editorProps: {
      attributes: { class: "yz-editor", role: "textbox", "aria-label": `日誌正文：${actorName(record.author)}`, "aria-multiline": "true" },
      handleKeyDown: (_view, event) => {
        if (event.isComposing) return false
        if (event.key === "/" && latest.current.onCommand) latest.current.onCommand("task")
        if (event.key === "@" && latest.current.onCommand) latest.current.onCommand("reference")
        return false
      },
    },
    onUpdate: ({ editor }) => {
      const { record: current, save: persist } = latest.current
      const body = editor.getText()
      persist({ ...current, body, document: editor.getJSON() as RichDoc, tags: Array.from(body.matchAll(/#([^\s#]+)/g), m => m[1]) })
    },
  }, [record.id])
  React.useEffect(() => { editor?.setEditable(editable) }, [editor, editable])
  React.useEffect(() => { if (editor && record.document && JSON.stringify(editor.getJSON()) !== JSON.stringify(record.document)) editor.commands.setContent(record.document, { emitUpdate: false }) }, [editor, record.document])
  return <div className="yz-writing">{editable && <div className="yz-editor-tools" aria-label="文字格式">
    {[
      ["粗體", Bold, () => editor?.chain().focus().toggleBold().run()],
      ["標題", Heading2, () => editor?.chain().focus().toggleHeading({ level: 2 }).run()],
      ["項目清單", List, () => editor?.chain().focus().toggleBulletList().run()],
      ["編號清單", ListOrdered, () => editor?.chain().focus().toggleOrderedList().run()],
      ["增加縮排", IndentIncrease, () => editor?.chain().focus().sinkListItem("listItem").run()],
      ["減少縮排", IndentDecrease, () => editor?.chain().focus().liftListItem("listItem").run()],
      ["撤銷文字", Undo2, () => editor?.chain().focus().undo().run()],
      ["重做文字", Redo2, () => editor?.chain().focus().redo().run()],
    ].map(([name, Icon, action]) => { const Component = Icon as typeof Bold; return <Button key={name as string} variant="ghost" size="icon-sm" title={name as string} aria-label={name as string} onClick={action as () => void}><Component size={14} /></Button> })}
    <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().insertContent({ type: "bulletList", content: ["昨天完成：", "今天預計：", "需要協助："].map(text => ({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text }] }] })) }).run()}>＋ Standup</Button>
  </div>}<EditorContent editor={editor} />{editable && <div className="yz-editor-foot"><span>直接書寫，即時更新 · / 工作元件 · @ 引用 · #標籤</span><span>{record.body?.length ?? 0} 字</span></div>}</div>
}

export function Journal() {
  const { state, records, actor, space, make, save, open, tab, setTab } = useOperating()
  const [date, setDate] = React.useState(state.referenceDate)
  const [author, setAuthor] = React.useState("mine")
  const [tag, setTag] = React.useState("")
  const [insert, setInsert] = React.useState<{ journalId: string; record: OperatingRecord } | null>(null)
  const [referenceFor, setReferenceFor] = React.useState<string | null>(null)
  const [refId, setRefId] = React.useState("")
  const [commandFor, setCommandFor] = React.useState<OperatingRecord | null>(null)
  const activeTab = tab || "今天"
  const journals = records.filter(r => r.kind === "journal" && (activeTab !== "今天" || r.date === date) && (author === "all" || r.author === (author === "mine" ? actor : author)) && (!tag || r.tags?.some(t => t.includes(tag)))).sort((a, b) => b.date.localeCompare(a.date))
  function start() {
    save(make("journal", { title: `${date} 的工作日誌`, date, body: "", document: { type: "doc", content: [{ type: "paragraph" }] } })); setAuthor("mine")
  }
  function command(record: OperatingRecord, kind: Kind | "reference") {
    if (kind === "reference") { setReferenceFor(record.id); setRefId(""); return }
    setInsert({ journalId: record.id, record: make(kind, { projectId: record.projectId, visibility: record.visibility, status: "待開始", assignee: actor, category: "Todo", size: "M" }) })
  }
  return <>
    <Tabs items={["今天", "回顧", "標籤流"]} value={activeTab} onChange={setTab} />
    <div className="yz-toolbar"><DateControl label="日誌日期" value={date} onChange={setDate} /><Select label="作者" value={author} onChange={e => setAuthor(e.target.value)}><option value="mine">我的</option>{space === "team" && <><option value="all">全部成員</option>{ACTORS.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</>}</Select>{activeTab === "標籤流" && <Input aria-label="篩選標籤" placeholder="搜尋 #標籤" value={tag} onChange={e => setTag(e.target.value)} />}<Button onClick={start}><Plus size={14} />開始書寫</Button></div>
    <div className="yz-journal-layout"><div className="min-w-0">{!journals.length ? <Empty title={activeTab === "今天" ? "今天，從一段文字開始。" : "這個範圍尚無日誌"} text="寫下正在思考的事，沿著工作脈絡建立待辦、議題與決定。"><Button onClick={start}>開始今天的日誌</Button></Empty> : journals.map(record => <article key={record.id} className="yz-journal-entry" data-journal-id={record.id}>
      <div className="yz-entry-heading"><div><span className="yz-eyebrow">{record.date} · {actorName(record.author)}</span><h3>{record.title}</h3></div><span className="yz-visibility">{space === "personal" || record.visibility === "private" ? "僅自己" : record.visibility === "project" ? "專案成員可見" : "圓展成員即時可見"}</span></div>
      {record.author === actor && <div className="yz-entry-meta"><Select label="日誌專案" value={record.projectId ?? ""} onChange={e => save({ ...record, projectId: e.target.value || undefined, visibility: e.target.value ? record.visibility : (space === "personal" ? "private" : "team") })}><option value="">公司日常</option>{records.filter(r => r.kind === "project").map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>{space === "team" && <Select label="日誌可見範圍" value={record.visibility} onChange={e => save({ ...record, visibility: e.target.value as OperatingRecord["visibility"] })}><option value="team">圓展成員</option><option value="project" disabled={!record.projectId}>專案成員</option><option value="private">僅自己</option></Select>}</div>}
      <RichEditor record={record} editable={record.author === actor} onCommand={kind => kind === "reference" ? command(record, kind) : setCommandFor(record)} />
      <div className="yz-references">{record.refs?.map(id => <Reference id={id} key={id} />)}</div>
      <div className="yz-entry-actions">{record.author === actor && <><Button variant="outline" size="sm" onClick={() => command(record, "task")}><Plus size={12} />加入工作元件</Button><Button variant="ghost" size="sm" onClick={() => command(record, "transaction")}>記錄支出</Button><FileUpload projectId={record.projectId} onCreated={file => save({ ...record, refs: [...(record.refs ?? []), file.id] })} /><Button variant="ghost" size="sm" onClick={() => command(record, "reference")}><Link2 size={12} />引用物件</Button></>}<Button variant="ghost" size="sm" onClick={() => open(record.id)}><MessageSquare size={12} />留言與詳情</Button></div>
    </article>)}</div><aside className="yz-context-rail"><span className="yz-eyebrow">把行動放回脈絡</span><h3>我的進行中工作</h3>{records.filter(r => r.kind === "task" && r.assignee === actor && r.status !== "完成").map(r => <div key={r.id} className="py-3 border-b"><Reference id={r.id} /><small>{r.status} · {r.due ?? "尚未安排日期"}</small></div>)}{!records.some(r => r.kind === "task" && r.assignee === actor && r.status !== "完成") && <p className="text-sm text-muted-foreground">目前沒有進行中的工作。</p>}<h3 className="mt-8">對齊目標</h3>{records.filter(r => r.kind === "goal").map(r => <div key={r.id} className="py-3"><Reference id={r.id} /></div>)}</aside></div>
    <Dialog open={!!commandFor} onOpenChange={value => { if (!value) setCommandFor(null) }}><DialogContent><DialogHeader><DialogTitle>選擇工作元件</DialogTitle><DialogDescription>把正在記錄的情境接到可追蹤的工作。</DialogDescription></DialogHeader><div className="grid gap-2">{["Todo", "Issue", "Decision", "Expense"].map(category => <Button key={category} variant="outline" onClick={() => { if (!commandFor) return; setInsert({ journalId: commandFor.id, record: make(category === "Expense" ? "transaction" : "task", { projectId: commandFor.projectId, visibility: commandFor.visibility, category, status: "待開始", ...(category !== "Expense" ? { assignee: actor, size: "M" as const } : {}) }) }); setCommandFor(null) }}>{category}</Button>)}</div></DialogContent></Dialog>
    <Dialog open={!!insert} onOpenChange={v => { if (!v) setInsert(null) }}><DialogContent className="yz-dialog"><DialogHeader><DialogTitle>{insert?.record.kind === "transaction" ? "從日誌記錄支出" : "從日誌建立工作"}</DialogTitle><DialogDescription>待辦、議題與決定都會引用同一筆工作。</DialogDescription></DialogHeader>{insert && <RecordForm key={insert.record.id} record={insert.record} onDone={() => setInsert(null)} onSaved={created => { const journal = records.find(r => r.id === insert.journalId); if (journal) save({ ...journal, refs: [...(journal.refs ?? []), created.id] }) }} />}</DialogContent></Dialog>
    <Dialog open={!!referenceFor} onOpenChange={v => { if (!v) setReferenceFor(null) }}><DialogContent><DialogHeader><DialogTitle>引用既有物件</DialogTitle><DialogDescription>引用保留來源，狀態更新會在每個工作面同步。</DialogDescription></DialogHeader><Select label="選擇引用" value={refId} onChange={e => setRefId(e.target.value)}><option value="">請選擇</option>{records.filter(r => r.id !== referenceFor && r.kind !== "comment").map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</Select><Button disabled={!refId} onClick={() => { const journal = records.find(r => r.id === referenceFor); if (journal && save({ ...journal, refs: [...new Set([...(journal.refs ?? []), refId])] })) setReferenceFor(null) }}>加入引用</Button></DialogContent></Dialog>
  </>
}
