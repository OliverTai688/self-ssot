import { AppHeader } from "@/components/layout/app-header"
import { getDailyCommandCenter } from "@/lib/services/admin-readiness.service"
import { TodayClient } from "./today-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const commandCenter = await getDailyCommandCenter()
  const today = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date())

  const actionQueue = commandCenter.actions.map((action) => ({
    id: action.id,
    lane: action.lane,
    title: action.title,
    status: action.status,
    signal: action.signal,
    nextAction: action.nextAction,
    href: action.href,
    hrefLabel: action.hrefLabel,
    tone: action.tone,
  }))

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppHeader title="今日" description={today} />

      <TodayClient
        generatedAt={commandCenter.generatedAt}
        summary={{
          actionCount: commandCenter.summary.actionCount,
          blockedCount: commandCenter.summary.blockedCount,
          warningCount: commandCenter.summary.warningCount,
          primaryAction: commandCenter.summary.primaryAction,
        }}
        actionQueue={actionQueue}
      />
    </div>
  )
}
