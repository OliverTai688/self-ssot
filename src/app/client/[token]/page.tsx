import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleIcon,
  FileTextIcon,
  LockIcon,
  PackageIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { getClientPortalViewByToken, type ClientPortalView } from "@/lib/services/client-portal.service"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"

export const metadata: Metadata = {
  title: "Client Portal | Personal OS",
  description: "Client-visible project status and deliverables from Personal OS.",
  robots: {
    index: false,
    follow: false,
  },
}

type ClientPublicPageProps = {
  params: Promise<{
    token: string
  }>
}

export default async function ClientPublicPage({ params }: ClientPublicPageProps) {
  await connection()
  const { token } = await params
  const result = await getClientPortalViewByToken(token)

  if (result.status !== "ready") {
    notFound()
  }

  return <ClientPortalViewPage view={result.view} />
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled"

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

function statusLabel(value: string) {
  return value.replace(/_/g, " ")
}

function ClientPortalViewPage({ view }: { view: ClientPortalView }) {
  const done = view.project.progress.done
  const total = view.project.progress.total
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">Personal OS Client Portal</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-balance">
              {view.project.name}
            </h1>
            {view.project.clientName && (
              <p className="mt-1 text-sm text-muted-foreground">{view.project.clientName}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{statusLabel(view.project.status)}</Badge>
            <Badge variant="outline">{statusLabel(view.project.phase)}</Badge>
            <Badge variant={view.project.health === "risk" ? "destructive" : "outline"}>
              {statusLabel(view.project.health)}
            </Badge>
          </div>
        </div>
      </header>

      <section className="border-b bg-muted/20">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-5 md:grid-cols-3">
          <div className="rounded-lg border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <CheckCircle2Icon className="size-4 text-emerald-600" />
              Client-visible tasks
            </div>
            <p className="mt-2 text-2xl font-semibold">{done}/{total}</p>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="rounded-lg border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <PackageIcon className="size-4 text-blue-600" />
              Deliverables
            </div>
            <p className="mt-2 text-2xl font-semibold">{view.deliverables.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Only client-visible records are listed.</p>
          </div>
          <div className="rounded-lg border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <CalendarClockIcon className="size-4 text-amber-600" />
              Due date
            </div>
            <p className="mt-2 text-lg font-semibold">{formatDate(view.project.dueAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Updated {formatDate(view.project.updatedAt)}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-6">
          {view.project.description && (
            <div className="rounded-lg border bg-background px-4 py-4">
              <h2 className="text-sm font-semibold">Project summary</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{view.project.description}</p>
            </div>
          )}

          <div className="rounded-lg border bg-background">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Visible tasks</h2>
              </div>
              <Badge variant="outline">{view.tasks.length}</Badge>
            </div>
            <div className="divide-y">
              {view.tasks.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No client-visible tasks have been published yet.
                </div>
              ) : (
                view.tasks.map((task) => (
                  <div key={`${task.title}-${task.dueAt ?? "none"}`} className="flex gap-3 px-4 py-3">
                    {task.status === "done" ? (
                      <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", task.status === "done" && "text-muted-foreground line-through")}>
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {statusLabel(task.status)} · priority {task.priority} · due {formatDate(task.dueAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-background">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <PackageIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Visible deliverables</h2>
              </div>
              <Badge variant="outline">{view.deliverables.length}</Badge>
            </div>
            <div className="divide-y">
              {view.deliverables.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No client-visible deliverables have been published yet.
                </div>
              ) : (
                view.deliverables.map((deliverable) => (
                  <div key={`${deliverable.title}-${deliverable.deliveredAt ?? "none"}`} className="flex gap-3 px-4 py-3">
                    <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{deliverable.title}</p>
                        <Badge variant="outline">{statusLabel(deliverable.status)}</Badge>
                      </div>
                      {deliverable.description && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {deliverable.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {deliverable.type} · delivered {formatDate(deliverable.deliveredAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-background px-4 py-4">
            <div className="flex items-center gap-2">
              <LockIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Visibility boundary</h2>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>Internal notes are excluded by default.</li>
              <li>Internal tasks and deliverables are excluded.</li>
              <li>File URLs are excluded until public storage review is complete.</li>
              <li>The token and internal record IDs are never displayed.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4" />
              <h2 className="text-sm font-semibold">Client-safe output</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed">
              This page is generated from persisted Work records and only renders fields explicitly selected for
              client visibility.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
