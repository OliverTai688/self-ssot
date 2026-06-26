"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeftIcon, PlusIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SourceCard } from "@/components/research/source-card"
import { ConceptCard } from "@/components/research/concept-card"
import { WritingProjectCard } from "@/components/research/writing-project-card"
import { EventCard } from "@/components/research/event-card"
import { AcademicPersonCard } from "@/components/research/academic-person-card"
import { ResearchObjectLinkList } from "@/components/research/research-object-link-list"

const statusLabels: Record<string, string> = {
  exploring: "探索中", active: "進行中", writing: "撰寫中",
  submitted: "已投稿", published: "已發表", paused: "暫停",
}

export default function IssueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const issueId = params.issueId as string

  const { issues, questions, concepts, sources, writingProjects, events, people, links, feedbackRuns, getLinkedEntities, addQuestion } = useResearch()

  const issue = issues.find((i) => i.id === issueId)
  const issueLinks = getLinkedEntities("issue", issueId)

  const issueQuestions = questions.filter((q) => q.issueId === issueId)
  const issueWriting = writingProjects.filter((w) => w.issueId === issueId)

  const linkedSourceIds = new Set(
    links.filter((l) => (l.fromType === "issue" && l.fromId === issueId && l.toType === "source") ||
      (l.toType === "issue" && l.toId === issueId && l.fromType === "source"))
      .map((l) => l.fromType === "source" ? l.fromId : l.toId)
  )
  const linkedConceptIds = new Set(
    links.filter((l) => (l.fromType === "issue" && l.fromId === issueId && l.toType === "concept") ||
      (l.toType === "issue" && l.toId === issueId && l.fromType === "concept"))
      .map((l) => l.fromType === "concept" ? l.fromId : l.toId)
  )

  const issueSources = sources.filter((s) => linkedSourceIds.has(s.id))
  const issueConcepts = concepts.filter((c) => linkedConceptIds.has(c.id))
  const issueEvents = events.filter((e) =>
    links.some((l) => (l.fromType === "event" && l.fromId === e.id) || (l.toType === "event" && l.toId === e.id))
  )
  const issuePeople = people.filter((p) =>
    links.some((l) => (l.fromType === "person" && l.fromId === p.id) || (l.toType === "person" && l.toId === p.id))
  )

  const [newQuestion, setNewQuestion] = React.useState("")
  const [showAddQ, setShowAddQ] = React.useState(false)

  if (!issue) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">找不到此研究議題</p>
      </div>
    )
  }

  function handleAddQuestion() {
    if (!newQuestion.trim()) return
    addQuestion(newQuestion.trim(), issueId)
    setNewQuestion("")
    setShowAddQ(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <AppHeader title={issue.title} description="研究議題詳情 — 多維物件視角" />

      <div className="border-b px-6 py-4 space-y-3">
        <button
          onClick={() => router.push("/research/issues")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" /> 返回研究議題
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{statusLabels[issue.status]}</Badge>
          {issue.disciplines.map((d) => (
            <span key={d} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{d}</span>
          ))}
        </div>
        {issue.mainResearchQuestion && (
          <p className="text-xs text-muted-foreground italic max-w-3xl">&ldquo;{issue.mainResearchQuestion}&rdquo;</p>
        )}
        <div className="flex flex-wrap gap-1">
          {issue.keywords.map((kw) => (
            <span key={kw} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{kw}</span>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList variant="line">
              <TabsTrigger value="overview">概覽</TabsTrigger>
              <TabsTrigger value="questions">問題 ({issueQuestions.length})</TabsTrigger>
              <TabsTrigger value="concepts">概念 ({issueConcepts.length})</TabsTrigger>
              <TabsTrigger value="sources">來源 ({issueSources.length})</TabsTrigger>
              <TabsTrigger value="writing">寫作 ({issueWriting.length})</TabsTrigger>
              <TabsTrigger value="events">研討會 ({issueEvents.length})</TabsTrigger>
              <TabsTrigger value="people">學者 ({issuePeople.length})</TabsTrigger>
              <TabsTrigger value="links">關聯 ({issueLinks.length})</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4 pt-2">
              {issue.description && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">議題描述</p>
                  <p className="text-sm text-foreground leading-relaxed">{issue.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "研究問題", value: issueQuestions.length },
                  { label: "相關來源", value: issueSources.length },
                  { label: "寫作專案", value: issueWriting.length },
                  { label: "物件關聯", value: issueLinks.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Questions */}
            <TabsContent value="questions" className="space-y-3 pt-2">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddQ((v) => !v)}>
                  <PlusIcon className="size-3" /> 新增問題
                </Button>
              </div>
              {showAddQ && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50"
                    placeholder="輸入研究問題…"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddQ(false)}>取消</Button>
                    <Button size="sm" className="h-7 text-xs" disabled={!newQuestion.trim()} onClick={handleAddQuestion}>新增</Button>
                  </div>
                </div>
              )}
              {issueQuestions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">尚無研究問題</div>
              ) : (
                <div className="divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
                  {issueQuestions.map((q) => (
                    <div key={q.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <p className="text-xs text-foreground leading-relaxed">{q.question}</p>
                      <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded ${q.status === "answered" ? "bg-emerald-500/10 text-emerald-600" : q.status === "clarifying" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                        {q.status === "open" ? "開放" : q.status === "clarifying" ? "釐清中" : q.status === "answered" ? "已解答" : "暫停"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Concepts */}
            <TabsContent value="concepts" className="pt-2">
              {issueConcepts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">尚無關聯概念</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {issueConcepts.map((c) => <ConceptCard key={c.id} concept={c} />)}
                </div>
              )}
            </TabsContent>

            {/* Sources */}
            <TabsContent value="sources" className="pt-2">
              {issueSources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">尚無關聯來源</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {issueSources.map((s) => <SourceCard key={s.id} source={s} />)}
                </div>
              )}
            </TabsContent>

            {/* Writing */}
            <TabsContent value="writing" className="pt-2">
              {issueWriting.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">尚無寫作專案</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {issueWriting.map((w) => {
                    const fb = feedbackRuns.find((f) => f.targetId === w.id)
                    return <WritingProjectCard key={w.id} project={w} latestFeedbackSummary={fb?.summary} />
                  })}
                </div>
              )}
            </TabsContent>

            {/* Events */}
            <TabsContent value="events" className="pt-2">
              {issueEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">尚無關聯研討會</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {issueEvents.map((e) => <EventCard key={e.id} event={e} />)}
                </div>
              )}
            </TabsContent>

            {/* People */}
            <TabsContent value="people" className="pt-2">
              {issuePeople.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">尚無關聯學者</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {issuePeople.map((p) => <AcademicPersonCard key={p.id} person={p} />)}
                </div>
              )}
            </TabsContent>

            {/* Links */}
            <TabsContent value="links" className="pt-2">
              <ResearchObjectLinkList links={issueLinks} entityType="issue" entityId={issueId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
