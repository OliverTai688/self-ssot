"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, CalendarDays, BriefcaseBusiness, Files as FilesIcon, Wallet, Gauge, FileCheck2, Bell, Sun, Search, Undo2, Menu, X, ArrowUpRight, Moon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { OperatingProvider, useOperating } from "@/lib/context/yuanzhan-ui-context"
import { ACTORS, KINDS, type OperatingState, type View } from "@/types/yuanzhan-ui"
import { signalsFor } from "@/lib/ui-data/yuanzhan/metrics"
import { Journal } from "./journal"
import { Projects, Timeline, Today, Capacity, Signals } from "./work-views"
import { Files } from "./files"
import { Finance } from "./finance"
import { Commitments } from "./commitments"
import { RecordDrawer } from "./record-drawer"
import { Empty, Select } from "./primitives"
import "./operating.css"

const navigation = [
  { id: "journal", title: "工作日誌", icon: BookOpen, heading: "從這裡，開始今天的工作。", description: "記下思考，讓行動與團隊的共同脈絡連起來。" },
  { id: "today", title: "今日工作台", icon: Sun, heading: "知道自己走到哪裡，才知道下一步。", description: "從過去、現在與未來，看見行動和目標的關係。" },
  { id: "projects", title: "專案", icon: BriefcaseBusiness, heading: "一起把事情，推進到交付。", description: "工作、討論、文件與承諾，留在同一個專案裡。" },
  { id: "timeline", title: "時間線", icon: CalendarDays, heading: "讓重要的時間，有位置。", description: "專案節點、公司日常與行政節奏，在這裡對齊。" },
  { id: "files", title: "文件與 Evidence", icon: FilesIcon, heading: "把做過的事，留下可引用的依據。", description: "整理來源、版本與交付，讓團隊的知識持續累積。" },
  { id: "finance", title: "公司財務", icon: Wallet, heading: "每一筆數字，都找得到來處。", description: "帳本、憑證、對帳與預算，是同一段營運脈絡。" },
  { id: "capacity", title: "容量與流量", icon: Gauge, heading: "用自己的節奏，安排下一段路。", description: "從週配置和完成紀錄，看見能承接的工作。" },
  { id: "commitments", title: "承諾", icon: FileCheck2, heading: "說過的話，做到哪裡了？", description: "讓文件裡的承諾，對照實際進展與確認紀錄。" },
  { id: "signals", title: "訊號與紀錄", icon: Bell, heading: "把需要注意的事，接回工作。", description: "處理期限、阻礙與缺件，保留本次工作階段的修改。" },
] satisfies { id: View; title: string; icon: typeof BookOpen; heading: string; description: string }[]

export function OperatingDesktop({ initialState }: { initialState: OperatingState }) {
  return <OperatingProvider initialState={initialState}><Desktop /></OperatingProvider>
}
function Desktop() {
  const { state, records, actor, setActor, space, setSpace, view, navigate, open, notice, notify, undo, canUndo } = useOperating()
  const searchTrigger = React.useRef<HTMLButtonElement>(null)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [menuOpen, setMenuOpen] = React.useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const heading = navigation.find(n => n.id === view)!
  const signalCount = signalsFor(records, state.referenceDate).filter(s => !state.dismissedSignals.includes(s.id)).length
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true) } }
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler)
  }, [])
  const results = search.trim() ? records.filter(r => `${r.title} ${r.body ?? ""} ${r.tags?.join(" ") ?? ""}`.toLowerCase().includes(search.toLowerCase())).slice(0, 30) : []
  return <div className="yz-desktop" data-mode={state.mode} data-space={space} data-actor={actor}>
    {menuOpen && <button className="yz-mobile-shade" aria-label="關閉導覽" onClick={() => setMenuOpen(false)} />}
    <aside className={`yz-sidebar ${menuOpen ? "is-open" : ""}`}><div className="yz-brand"><span className="yz-monogram">yz</span><div><strong>Personal OS</strong><small>圓展營運工作台</small></div><Button variant="ghost" size="icon-sm" className="yz-mobile-only" aria-label="關閉選單" onClick={() => setMenuOpen(false)}><X size={16} /></Button></div>
      <div className="yz-space-switch" aria-label="切換空間"><button aria-pressed={space === "personal"} onClick={() => { setSpace("personal"); setMenuOpen(false) }}>個人空間</button><button aria-pressed={space === "team"} onClick={() => { setSpace("team"); setMenuOpen(false) }}>圓展團隊</button></div>
      <p className="yz-nav-label">{space === "team" ? "一起工作的地方" : "留給自己的空間"}</p><nav aria-label="工作台導覽">{navigation.filter(n => space === "team" || n.id === "journal").map(n => <button key={n.id} aria-current={view === n.id ? "page" : undefined} onClick={() => { navigate(n.id); setMenuOpen(false) }}><n.icon size={16} /><span>{space === "personal" && n.id === "journal" ? "私人日誌" : n.title}</span>{n.id === "signals" && signalCount > 0 && <small>{signalCount}</small>}</button>)}</nav>
      {space === "personal" && <div className="yz-personal-links"><p className="yz-nav-label">我的其他模組</p>{[["研究", "/research"], ["生活", "/life"], ["個人財務", "/finance"]].map(([label, href]) => <Link key={href} href={href}>{label}<ArrowUpRight size={12} /></Link>)}</div>}
      <div className="yz-sidebar-footer"><span className="yz-eyebrow">本機介面示例</span><p>輸入即時更新成員視角<br />重新整理會重置資料</p><Link href="/company">返回原工作空間 <ArrowUpRight size={12} /></Link></div>
    </aside>
    <div className="yz-main" inert={menuOpen}><header className="yz-header"><Button className="yz-mobile-only" size="icon-sm" variant="ghost" aria-label="開啟選單" onClick={() => setMenuOpen(true)}><Menu size={18} /></Button><span className="yz-breadcrumb">{space === "team" ? "圓展" : "個人"} <span>/</span> {space === "personal" ? "私人日誌" : heading.title}</span><div className="yz-header-actions"><Button variant="ghost" size="sm" ref={searchTrigger} aria-label="搜尋工作台" onClick={() => setSearchOpen(true)}><Search size={15} /><span className="yz-desktop-only">搜尋 <kbd>⌘ K</kbd></span></Button><Button variant="ghost" size="icon-sm" disabled={!canUndo} aria-label="復原上一步" onClick={undo}><Undo2 size={15} /></Button><Button variant="ghost" size="icon-sm" aria-label="切換明暗主題" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><Moon size={15} /></Button><Select label="預覽成員" value={actor} onChange={e => setActor(e.target.value as "yuxing" | "lily")}>{ACTORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></div></header>
      <main id="yz-main-content" className="yz-surface" key={space}><div className="yz-page-heading"><span className="yz-eyebrow">{state.referenceDate.replaceAll("-", ".")} · {space === "team" ? "TEAM WORKSPACE" : "PERSONAL SPACE"}</span><h1>{space === "personal" ? "我的私人日誌" : heading.heading}</h1><p>{space === "personal" ? "只留給自己，不會出現在團隊的工作紀錄。" : heading.description}</p></div><div className="yz-operating-surface">{view === "journal" && <Journal />}{view === "projects" && <Projects />}{view === "today" && <Today />}{view === "timeline" && <Timeline />}{view === "files" && <Files />}{view === "finance" && <Finance />}{view === "capacity" && <Capacity />}{view === "commitments" && <Commitments />}{view === "signals" && <Signals />}</div></main>
    </div>
    {notice && <div className="yz-toast" role="status"><span>{notice}</span><Button variant="ghost" size="icon-xs" aria-label="關閉提示" onClick={() => notify("")}><X size={14} /></Button></div>}
    <RecordDrawer />
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent className="yz-search-dialog" finalFocus={searchTrigger}><DialogHeader><DialogTitle>搜尋工作台</DialogTitle><DialogDescription>只搜尋目前空間與成員可見的內容。</DialogDescription></DialogHeader><Input autoFocus aria-label="跨物件搜尋" placeholder="專案、日誌、工作、文件…" value={search} onChange={e => setSearch(e.target.value)} /><div className="yz-search-results">{results.map(r => <button key={r.id} onClick={() => { setSearchOpen(false); open(r.id) }}><span>{KINDS[r.kind]}</span><strong>{r.title}</strong><ArrowUpRight size={14} /></button>)}{search && !results.length && <Empty title="沒有符合的結果" text="試試其他關鍵字，或確認目前的空間與成員。" />}</div></DialogContent></Dialog>
  </div>
}
