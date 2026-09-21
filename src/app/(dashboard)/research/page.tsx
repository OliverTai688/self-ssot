"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarIcon,
  FlaskConicalIcon,
  LightbulbIcon,
  NetworkIcon,
  PenLineIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { InsightRail } from "@/components/owneros/insight-rail"
import { cn } from "@/lib/utils"
import { useResearch } from "@/lib/context/research-context"

const statusColors: Record<string, string> = {
  exploring: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  writing: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  submitted: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  published: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  paused: "border-border bg-muted text-muted-foreground",
}

const statusLabels: Record<string, string> = {
  exploring: "探索",
  active: "進行",
  writing: "撰寫",
  submitted: "投稿",
  published: "發表",
  paused: "暫停",
}

interface CommandLink {
  label: string
  href: string
  icon: React.ReactNode
  tone: "primary" | "secondary"
}

interface ResearchQueueRow {
  label: string
  detail: string
  count: number
  href: string
  state: string
  icon: React.ReactNode
}

function CommandButton({ command }: { command: CommandLink }) {
  return (
    <Link
      href={command.href}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors",
        command.tone === "primary"
          ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {command.icon}
      {command.label}
    </Link>
  )
}

function ResearchQueueItem({ row }: { row: ResearchQueueRow }) {
  return (
    <Link
      href={row.href}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40"
    >
      <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
        {row.icon}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{row.label}</p>
          <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {row.state}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.detail}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="min-w-8 text-right text-sm font-semibold tabular-nums text-foreground">{row.count}</span>
        <ArrowRightIcon className="size-4 text-muted-foreground/50" />
      </div>
    </Link>
  )
}

export default function ResearchPage() {
  const { issues, ideasV2, sources, writingProjects, events, people, links, questions, concepts } = useResearch()
  const nowMs = new Date().getTime()

  const upcomingEvents = events
    .filter((event) => event.submissionDeadline && new Date(event.submissionDeadline) > new Date())
    .sort((a, b) => new Date(a.submissionDeadline!).getTime() - new Date(b.submissionDeadline!).getTime())
    .slice(0, 3)

  const activeIssues = issues.filter((issue) => issue.status === "exploring" || issue.status === "active")
  const inboxIdeas = ideasV2.filter((idea) => idea.status === "inbox")
  const recentIssues = [...issues].slice(0, 4)
  const openQuestionCount = questions.filter((question) => question.status === "open").length
  const draftWritingCount = writingProjects.filter(
    (project) => project.status === "drafting" || project.status === "reviewing"
  ).length
  const urgentCfps = events.filter((event) => {
    if (!event.submissionDeadline) return false
    const days = Math.ceil((new Date(event.submissionDeadline).getTime() - nowMs) / 86400000)
    return days > 0 && days <= 14
  })

  const commands: CommandLink[] = [
    {
      label: "New research",
      href: "/research/exploration",
      icon: <LightbulbIcon className="size-4" />,
      tone: "primary",
    },
    {
      label: "Readiness",
      href: "/research/readiness",
      icon: <ShieldCheckIcon className="size-4" />,
      tone: "secondary",
    },
  ]

  const queueRows: ResearchQueueRow[] = [
    {
      label: "Research Queue",
      detail: "Open issues, questions, and inbox ideas waiting for owner triage.",
      count: activeIssues.length + openQuestionCount + inboxIdeas.length,
      href: "/research/issues",
      state: "Prototype state",
      icon: <FlaskConicalIcon className="size-4" />,
    },
    {
      label: "Source Evidence",
      detail: "Papers, reports, interviews, concepts, and source-grounded notes.",
      count: sources.length + concepts.length,
      href: "/research/sources",
      state: "Local/mock fallback",
      icon: <BookOpenIcon className="size-4" />,
    },
    {
      label: "Writing Outputs",
      detail: "Draft manuscripts, review cycles, target venues, and AI feedback.",
      count: writingProjects.length,
      href: "/research/writing",
      state: `${draftWritingCount} active`,
      icon: <PenLineIcon className="size-4" />,
    },
    {
      label: "Events / CFP",
      detail: "Submission deadlines and academic event opportunities.",
      count: events.length,
      href: "/research/events",
      state: `${urgentCfps.length} urgent`,
      icon: <CalendarIcon className="size-4" />,
    },
    {
      label: "Scholar Network",
      detail: "Academic people, relationships, and collaboration openings.",
      count: people.length + links.length,
      href: "/research/people",
      state: "Relationship map",
      icon: <UsersIcon className="size-4" />,
    },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppHeader title="研究" description="追蹤研究議題、來源與寫作進度。" />

      <main className="flex-1 overflow-y-auto bg-background px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {commands.map((command) => (
              <CommandButton key={command.label} command={command} />
            ))}
          </div>

          <InsightRail
            items={[
              { label: "議題", value: issues.length },
              { label: "來源", value: sources.length },
              { label: "輸出", value: writingProjects.length },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <section data-owneros-slot="resource-index research-queue" className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">研究佇列</h2>
                  <p className="text-xs text-muted-foreground">集中查看議題、來源、寫作、活動與人物。</p>
                </div>
                <Link href="/research/graph" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Graph
                  <NetworkIcon className="size-3.5" />
                </Link>
              </div>
              <div>
                {queueRows.map((row) => (
                  <ResearchQueueItem key={row.label} row={row} />
                ))}
              </div>
            </section>

            <section data-owneros-slot="detail-pane research-recent" className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">近期議題</h2>
              </div>
              <div>
                {recentIssues.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-muted-foreground">尚無研究議題。</p>
                ) : (
                  recentIssues.map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/research/issues/${issue.id}`}
                      className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0 hover:bg-muted/35"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{issue.title}</p>
                        {issue.mainResearchQuestion ? (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {issue.mainResearchQuestion}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
                          statusColors[issue.status]
                        )}
                      >
                        {statusLabels[issue.status] ?? issue.status}
                      </span>
                    </Link>
                  ))
                )}
              </div>

              {upcomingEvents.length > 0 && (
                <div className="border-t border-border">
                  <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">即將截止</h2>
                  </div>
                  <div className="divide-y divide-border/70">
                    {upcomingEvents.map((event) => {
                      const days = Math.ceil((new Date(event.submissionDeadline!).getTime() - nowMs) / 86400000)
                      return (
                        <Link
                          key={event.id}
                          href="/research/events"
                          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/35"
                        >
                          <p className="truncate text-xs font-semibold text-foreground">{event.name}</p>
                          <span className="shrink-0 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            {days} 天
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
