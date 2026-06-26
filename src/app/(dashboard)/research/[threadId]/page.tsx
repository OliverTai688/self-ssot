"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeftIcon, SparklesIcon, TargetIcon, CheckSquareIcon, ArrowUpRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IdeaInbox } from "@/components/research/idea-inbox"
import { MaterialList } from "@/components/research/material-list"
import { OutputGrid } from "@/components/research/output-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const statusLabels: Record<string, string> = {
  exploring: "想法探索",
  active: "研究進行中",
  writing: "論文撰寫",
  published: "已發表",
}

export default function ThreadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const threadId = params.threadId as string

  const {
    threads,
    ideas,
    materials,
    researchers,
    publicationTargets,
    milestones,
    outputs,
    addPublicationTarget,
    addMilestone,
  } = useResearch()

  const thread = threads.find((t) => t.id === threadId)

  // Sub-forms for Publication and Milestones
  const [showAddPub, setShowAddPub] = React.useState(false)
  const [pubVenue, setPubVenue] = React.useState("")
  const [pubDeadline, setPubDeadline] = React.useState("")
  const [pubNotes, setPubNotes] = React.useState("")

  const [showAddMilestone, setShowAddMilestone] = React.useState(false)
  const [milestoneTitle, setMilestoneTitle] = React.useState("")
  const [milestoneDeliverable, setMilestoneDeliverable] = React.useState("")
  const [milestoneDue, setMilestoneDue] = React.useState("")

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">找不到該研究主軸</p>
      </div>
    )
  }

  // Filter items matching this thread
  const threadIdeas = ideas.filter((i) => i.threadId === threadId)
  const threadMaterials = materials.filter((m) => m.threadId === threadId)
  const threadTargets = publicationTargets.filter((pt) => pt.threadId === threadId)
  const threadMilestones = milestones.filter((ms) => ms.threadId === threadId)
  const threadOutputs = outputs.filter((o) => o.threadId === threadId)

  // Map researchers associated with this thread's keywords (simulate keyword lookup)
  const threadResearchers = researchers.filter((res) => {
    if (threadId === "rt-1" && res.id === "res-1") return true
    if (threadId === "rt-2" && res.id === "res-2") return true
    return false
  })

  function handleSavePublication() {
    if (!pubVenue.trim() || !pubDeadline.trim()) return
    addPublicationTarget(threadId, pubVenue.trim(), "conference", pubDeadline, pubNotes.trim() || undefined)
    setPubVenue("")
    setPubDeadline("")
    setPubNotes("")
    setShowAddPub(false)
  }

  function handleSaveMilestone() {
    if (!milestoneTitle.trim() || !milestoneDue.trim()) return
    addMilestone(threadId, milestoneTitle.trim(), milestoneDeliverable.trim() || "N/A", milestoneDue)
    setMilestoneTitle("")
    setMilestoneDeliverable("")
    setMilestoneDue("")
    setShowAddMilestone(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Legacy upgrade Banner */}
      <div className="flex items-center justify-between gap-3 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <span className="font-bold">此頁面為舊版研究主軸視圖。</span> 新版「研究議題」已支援跨議題自由關聯，建議升級至新版工作台。
        </p>
        <button
          onClick={() => router.push(`/research/issues`)}
          className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline shrink-0"
        >
          前往新版 <ArrowUpRightIcon className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden bg-background">
        <AppHeader title={`研究沙盒: ${thread.title}`} description="想法、文獻、發表三軸深度並行空間" />

        {/* Back Button and Overview */}
        <div className="border-b px-6 py-4 flex flex-col gap-4">
          <div>
            <button
              onClick={() => router.push("/research")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <ArrowLeftIcon className="size-3.5" />
              返回研究工作台
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-foreground">{thread.title}</h2>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {statusLabels[thread.status] || "規劃中"}
              </Badge>
            </div>
            {thread.description && (
              <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                {thread.description}
              </p>
            )}

            {/* Work Linkage */}
            {thread.workLinkage && (
              <div className="inline-flex items-start gap-2 rounded-lg bg-primary/[0.03] border border-primary/10 px-3 py-1.5 max-w-2xl mt-1">
                <SparklesIcon className="size-3.5 text-primary shrink-0 mt-0.5 animate-pulse" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-primary leading-none">跨界連結：工作證據層</span>
                  <span className="text-[10px] text-muted-foreground leading-relaxed">
                    {thread.workLinkage}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs area */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-4xl">
            <Tabs defaultValue="ideas" className="space-y-6">
              <TabsList variant="line">
                <TabsTrigger value="ideas">
                  ✦ 想法與靈感 ({threadIdeas.length})
                </TabsTrigger>
                <TabsTrigger value="materials">
                  📚 文獻與學者 ({threadMaterials.length + threadResearchers.length})
                </TabsTrigger>
                <TabsTrigger value="milestones">
                  🎯 發表與里程碑 ({threadTargets.length + threadMilestones.length})
                </TabsTrigger>
                <TabsTrigger value="outputs">
                  📤 成果轉化 ({threadOutputs.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Ideas Inbox */}
              <TabsContent value="ideas" className="pt-2">
                <IdeaInbox threadId={threadId} ideas={threadIdeas} />
              </TabsContent>

              {/* Tab 2: Materials & Researchers */}
              <TabsContent value="materials" className="pt-2">
                <MaterialList
                  threadId={threadId}
                  materials={threadMaterials}
                  researchers={threadResearchers}
                />
              </TabsContent>

              {/* Tab 3: Milestones and Publication Targets */}
              <TabsContent value="milestones" className="space-y-6 pt-2">
                {/* Section A: Milestones */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <CheckSquareIcon className="size-4 text-emerald-500" />
                      里程碑進度條 (Milestones)
                    </h4>
                    <button
                      onClick={() => setShowAddMilestone((v) => !v)}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      + 新增里程碑
                    </button>
                  </div>

                  {/* Add Milestone Form */}
                  {showAddMilestone && (
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                      <span className="text-xs font-semibold text-foreground block">建立里程碑節點</span>
                      <div className="space-y-2">
                        <input
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50"
                          placeholder="里程碑目標描述 (如：完成研究成果海報排版)"
                          value={milestoneTitle}
                          onChange={(e) => setMilestoneTitle(e.target.value)}
                        />
                        <input
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50"
                          placeholder="預期成果/交付物說明 (例如: SG_Summit_Poster.pdf)"
                          value={milestoneDeliverable}
                          onChange={(e) => setMilestoneDeliverable(e.target.value)}
                        />
                        <input
                          type="date"
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50"
                          value={milestoneDue}
                          onChange={(e) => setMilestoneDue(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddMilestone(false)}>取消</Button>
                        <Button size="sm" className="h-7 text-xs" disabled={!milestoneTitle.trim() || !milestoneDue} onClick={handleSaveMilestone}>儲存</Button>
                      </div>
                    </div>
                  )}

                  {/* Milestones Flow */}
                  {threadMilestones.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border px-6 py-6 text-center text-xs text-muted-foreground">
                      尚無設定里程碑。
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60">
                      {threadMilestones.map((ms) => (
                        <div key={ms.id} className="p-3.5 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-semibold leading-none", ms.status === "done" && "line-through text-muted-foreground")}>
                                {ms.title}
                              </span>
                              <Badge variant={ms.status === "done" ? "outline" : ms.status === "in_progress" ? "default" : "secondary"} className="text-[8px] py-0 px-1">
                                {ms.status === "done" ? "完成" : ms.status === "in_progress" ? "進行中" : "待辦"}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground block">
                              成果物: {ms.deliverable}
                            </span>
                          </div>

                          <span className="text-[10px] text-muted-foreground/80 font-mono shrink-0">
                            截止日: {new Date(ms.dueAt).toLocaleDateString("zh-TW")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section B: Targets */}
                <div className="space-y-4 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <TargetIcon className="size-4 text-rose-500" />
                      論文發表 Venues (投稿目標)
                    </h4>
                    <button
                      onClick={() => setShowAddPub((v) => !v)}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      + 新增投稿目標
                    </button>
                  </div>

                  {/* Add Pub Form */}
                  {showAddPub && (
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                      <span className="text-xs font-semibold text-foreground block">登記投稿 Venue 與截止</span>
                      <div className="space-y-2">
                        <input
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50"
                          placeholder="研討會或期刊名稱 (例如: CHI 2026)"
                          value={pubVenue}
                          onChange={(e) => setPubVenue(e.target.value)}
                        />
                        <input
                          type="date"
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50"
                          value={pubDeadline}
                          onChange={(e) => setPubDeadline(e.target.value)}
                        />
                        <textarea
                          className="w-full h-14 bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50 resize-none"
                          placeholder="期刊限制字數、特定領域 Track 或其他說明…"
                          value={pubNotes}
                          onChange={(e) => setPubNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddPub(false)}>取消</Button>
                        <Button size="sm" className="h-7 text-xs" disabled={!pubVenue.trim() || !pubDeadline} onClick={handleSavePublication}>儲存</Button>
                      </div>
                    </div>
                  )}

                  {/* Venue target list */}
                  {threadTargets.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border px-6 py-6 text-center text-xs text-muted-foreground">
                      尚無設定投稿目標。
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60">
                      {threadTargets.map((pt) => {
                        const days = Math.ceil((new Date(pt.deadline).getTime() - Date.now()) / 86400000)
                        return (
                          <div key={pt.id} className="p-3.5 flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-foreground block">
                                {pt.venueName}
                              </span>
                              <p className="text-[10px] text-muted-foreground">{pt.notes || "無特別註記"}</p>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                              <span className="text-[10px] text-muted-foreground/80">
                                截止日: {new Date(pt.deadline).toLocaleDateString("zh-TW")}
                              </span>
                              <span className={cn("text-[9px] px-1.5 py-0.2 rounded font-bold font-mono", days < 0 ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20")}>
                                {days < 0 ? "已截止" : `剩 ${days} 天`}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 4: Converted Outputs */}
              <TabsContent value="outputs" className="pt-2">
                <OutputGrid threadId={threadId} outputs={threadOutputs} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
