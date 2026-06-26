"use client"

import * as React from "react"
import Link from "next/link"
import {
  FlaskConicalIcon,
  LightbulbIcon,
  BookOpenIcon,
  PenLineIcon,
  CalendarIcon,
  UsersIcon,
  NetworkIcon,
  SparklesIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"

const statusColors: Record<string, string> = {
  exploring: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  writing: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  submitted: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  published: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  paused: "bg-muted text-muted-foreground border-border",
}

const statusLabels: Record<string, string> = {
  exploring: "探索中",
  active: "進行中",
  writing: "撰寫中",
  submitted: "已投稿",
  published: "已發表",
  paused: "暫停",
}

interface WorkspaceCardProps {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  stats: { label: string; value: number }[]
  accentColor: string
}

function WorkspaceCard({ title, description, href, icon, stats, accentColor }: WorkspaceCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 hover:border-${accentColor}-500/40 hover:shadow-lg hover:shadow-${accentColor}-500/5 transition-all duration-200 overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-${accentColor}-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-start justify-between">
        <div className={`flex size-10 items-center justify-center rounded-xl bg-${accentColor}-500/10 text-${accentColor}-600 dark:text-${accentColor}-400`}>
          {icon}
        </div>
        <ArrowRightIcon className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
      </div>
      <div className="relative space-y-1">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="relative flex items-center gap-4 pt-1 border-t border-border/50">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1">
            <span className="text-base font-bold text-foreground tabular-nums">{s.value}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </Link>
  )
}

export default function ResearchPage() {
  const { issues, ideasV2, sources, writingProjects, events, people, links, questions, concepts } = useResearch()

  const upcomingEvents = events
    .filter((e) => e.submissionDeadline && new Date(e.submissionDeadline) > new Date())
    .sort((a, b) => new Date(a.submissionDeadline!).getTime() - new Date(b.submissionDeadline!).getTime())
    .slice(0, 3)

  const recentIssues = [...issues].slice(0, 3)
  const recentSources = [...sources].slice(0, 3)

  const inboxIdeas = ideasV2.filter((i) => i.status === "inbox").length
  const urgentCfps = events.filter((e) => {
    if (!e.submissionDeadline) return false
    const days = Math.ceil((new Date(e.submissionDeadline).getTime() - Date.now()) / 86400000)
    return days > 0 && days <= 14
  }).length
  const openIssues = issues.filter((i) => i.status === "exploring" || i.status === "active").length

  const attentionItems = [
    urgentCfps > 0 && { label: `${urgentCfps} CFP 14天內截止`, href: "/research/events", variant: "risk" as const },
    inboxIdeas > 0 && { label: `${inboxIdeas} 想法待歸屬`, href: "/research/exploration", variant: "watch" as const },
    openIssues > 0 && { label: `${openIssues} 議題進行中`, href: "/research/issues", variant: "neutral" as const },
  ].filter(Boolean) as { label: string; href: string; variant: "risk" | "watch" | "neutral" }[]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title="學術研究工作台" description="Research Object Network — 跨議題、跨物件的開放式學術研究空間" />

      <main className="flex-1 overflow-y-auto px-6 py-8 bg-background">
        <div className="mx-auto max-w-5xl space-y-10">

          {/* Attention strip */}
          {attentionItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {attentionItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors",
                    item.variant === "risk"
                      ? "border-rose-300/40 bg-rose-50/40 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 hover:bg-rose-50/60"
                      : item.variant === "watch"
                        ? "border-amber-300/40 bg-amber-50/40 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 hover:bg-amber-50/60"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "size-1.5 rounded-full shrink-0",
                    item.variant === "risk" ? "bg-rose-500" : item.variant === "watch" ? "bg-amber-400" : "bg-muted-foreground/40"
                  )} />
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Workspace Hub */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <NetworkIcon className="size-4 text-primary" />
                六大研究工作區
              </h2>
              <p className="text-xs text-muted-foreground">研究物件自由跨議題關聯，不再被強制父子結構約束</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <WorkspaceCard
                title="研究議題"
                description="定義研究命題與主要問題，作為研究物件的組織標籤"
                href="/research/issues"
                icon={<FlaskConicalIcon className="size-5" />}
                stats={[
                  { label: "議題", value: issues.length },
                  { label: "問題", value: questions.length },
                ]}
                accentColor="violet"
              />
              <WorkspaceCard
                title="想法探索"
                description="無需預先歸屬議題，自由捕捉靈感、假設與觀察"
                href="/research/exploration"
                icon={<LightbulbIcon className="size-5" />}
                stats={[
                  { label: "想法", value: ideasV2.length },
                  { label: "待處理", value: ideasV2.filter((i) => i.status === "inbox").length },
                ]}
                accentColor="amber"
              />
              <WorkspaceCard
                title="資料來源"
                description="文獻、論文、訪談紀錄、機構報告，不強制綁定議題"
                href="/research/sources"
                icon={<BookOpenIcon className="size-5" />}
                stats={[
                  { label: "來源", value: sources.length },
                  { label: "概念", value: concepts.length },
                ]}
                accentColor="blue"
              />
              <WorkspaceCard
                title="研究撰寫"
                description="論文、研究計劃、海報，含三欄式寫作視圖與 AI 評審"
                href="/research/writing"
                icon={<PenLineIcon className="size-5" />}
                stats={[
                  { label: "寫作專案", value: writingProjects.length },
                  { label: "進行中", value: writingProjects.filter((w) => w.status === "drafting" || w.status === "reviewing").length },
                ]}
                accentColor="emerald"
              />
              <WorkspaceCard
                title="研討會 & CFP"
                description="追蹤研討會截止日倒數與 AI 推薦投稿模式"
                href="/research/events"
                icon={<CalendarIcon className="size-5" />}
                stats={[
                  { label: "活動", value: events.length },
                  { label: "即將截止", value: upcomingEvents.length },
                ]}
                accentColor="rose"
              />
              <WorkspaceCard
                title="學者網絡"
                description="追蹤作者、主席與合作夥伴，管理交流切入點"
                href="/research/people"
                icon={<UsersIcon className="size-5" />}
                stats={[
                  { label: "學者", value: people.length },
                  { label: "關聯", value: links.length },
                ]}
                accentColor="teal"
              />
            </div>

            {/* Formal readiness entry */}
            <Link
              href="/research/readiness"
              className="group relative flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-5 py-4 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div className="relative flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheckIcon className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">Research formal readiness</h3>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      FORMAL
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    查看 11 個 resource family、Issue/Thread blocker、BFF path、Owner read DTO skeleton、blocked writes 與 proposal-only agent boundary
                  </p>
                </div>
              </div>
              <div className="relative flex shrink-0 items-center gap-4">
                <div className="hidden sm:flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground tabular-nums">11</span>
                  <span className="text-[10px] text-muted-foreground">families</span>
                </div>
                <div className="hidden sm:flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground tabular-nums">5</span>
                  <span className="text-[10px] text-muted-foreground">blocked</span>
                </div>
                <ArrowRightIcon className="size-4 text-muted-foreground/40 transition-colors group-hover:text-emerald-600" />
              </div>
            </Link>

            {/* Network Graph Entry — full-width banner */}
            <Link
              href="/research/graph"
              className="group relative flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.04] to-violet-500/[0.04] px-5 py-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <NetworkIcon className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">研究物件關聯圖</h3>
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">NEW</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    力導向圖視覺化 — 一次看清所有議題、文獻、概念、寫作專案之間的 many-to-many 關聯網絡
                  </p>
                </div>
              </div>
              <div className="relative flex items-center gap-4 shrink-0">
                <div className="hidden sm:flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    {issues.length + concepts.length + sources.length + ideasV2.length + writingProjects.length + events.length + people.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground">節點</span>
                </div>
                <div className="hidden sm:flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground tabular-nums">{links.length}</span>
                  <span className="text-[10px] text-muted-foreground">關聯</span>
                </div>
                <ArrowRightIcon className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          </section>

          {/* Recent issues */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">近期研究議題</h3>
              <Link href="/research/issues" className="text-xs text-primary hover:underline">
                查看全部
              </Link>
            </div>
            <div className="grid gap-3">
              {recentIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/research/issues/${issue.id}`}
                  className="flex items-start justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/20 hover:bg-muted/30 transition-all"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusColors[issue.status]}`}>
                        {statusLabels[issue.status]}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{issue.title}</p>
                    {issue.mainResearchQuestion && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{issue.mainResearchQuestion}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {issue.keywords.slice(0, 4).map((kw) => (
                        <span key={kw} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRightIcon className="size-4 text-muted-foreground/40 shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upcoming CFPs */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">即將截止 CFP</h3>
                <Link href="/research/events" className="text-xs text-primary hover:underline">查看全部</Link>
              </div>
              <div className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">暫無即將截止的 CFP</p>
                ) : upcomingEvents.map((ev) => {
                  const days = Math.ceil((new Date(ev.submissionDeadline!).getTime() - Date.now()) / 86400000)
                  return (
                    <Link
                      key={ev.id}
                      href="/research/events"
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-muted/30 transition-all"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0 pr-3">
                        <p className="text-xs font-semibold text-foreground truncate">{ev.name}</p>
                        <p className="text-[10px] text-muted-foreground">{ev.fields.slice(0, 2).join(" · ")}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${days <= 14 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                          {days} 天
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>

            {/* Recent sources */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">最近新增來源</h3>
                <Link href="/research/sources" className="text-xs text-primary hover:underline">查看全部</Link>
              </div>
              <div className="space-y-2">
                {recentSources.map((src) => (
                  <Link
                    key={src.id}
                    href="/research/sources"
                    className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-muted/30 transition-all"
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{src.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">
                          {src.sourceType.replace(/_/g, " ")}
                        </span>
                        {src.year && <span className="text-[10px] text-muted-foreground">{src.year}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* AI next step suggestions */}
          <section className="rounded-2xl border border-primary/10 bg-primary/[0.02] px-5 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-primary animate-pulse" />
              <h3 className="text-xs font-bold text-primary">AI 建議下一步</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                {
                  title: "補充 ZKP 對比分析",
                  body: "wp-1 的 method reviewer 建議在 Related Work 增加與零知識證明方案的對比章節。",
                  href: "/research/writing",
                },
                {
                  title: "聯繫 Elena Rostova",
                  body: "距離 SIGCHI 2026 投稿截止剩 26 天，應確認共同投稿的合作意願。",
                  href: "/research/people",
                },
                {
                  title: "意圖漂移想法待歸屬",
                  body: "idea2-5「研究者寫作中的意圖漂移現象」尚在 Inbox，考慮連結至 iss-2 或 iss-3。",
                  href: "/research/exploration",
                },
              ].map((tip) => (
                <Link
                  key={tip.title}
                  href={tip.href}
                  className="flex flex-col gap-1.5 rounded-lg border border-primary/10 bg-card px-3 py-2.5 hover:border-primary/25 hover:bg-muted/30 transition-all"
                >
                  <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{tip.body}</p>
                </Link>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
