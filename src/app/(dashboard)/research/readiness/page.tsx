import Link from "next/link"
import type { ReactNode } from "react"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BanIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  GitBranchIcon,
  LockIcon,
  RouteIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import {
  buildResearchFormalReadinessSurface,
  type ResearchFormalReadinessTone,
} from "@/lib/services/research-formal-readiness.service"
import {
  buildResearchOwnerReadDtoSurface,
  type ResearchOwnerReadDtoServiceTone,
} from "@/lib/services/research-owner-read-dto.service"
import {
  buildResearchOwnerReadIssuesServiceAuthzRuntimeProof,
  type ResearchOwnerReadIssuesServiceAuthzRuntimeTone,
} from "@/lib/services/research-owner-read-issues-runtime-readiness.service"
import type { ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterTone } from "@/lib/services/research-owner-read-issues-selected-field-runtime-adapter.service"
import type { ResearchOwnerReadIssuesLiveReadProofRunnerTone } from "@/lib/services/research-owner-read-issues-live-read-proof-runner.service"

type ReadinessTone =
  | ResearchFormalReadinessTone
  | ResearchOwnerReadDtoServiceTone
  | ResearchOwnerReadIssuesServiceAuthzRuntimeTone
  | ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterTone
  | ResearchOwnerReadIssuesLiveReadProofRunnerTone

const toneClasses: Record<ReadinessTone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
  warn: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
  blocked: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
  neutral: "border-border bg-muted/40 text-muted-foreground",
}

const ownerReadDtoServiceTaskId = "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE"
const ownerReadDtoAuthzTaskId = "RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON"
const ownerReadDtoMapperTaskId = "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE"
const ownerReadQueryPlanTaskId = "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT"
const ownerReadQueryPlanLoaderTaskId = "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON"
const ownerReadRuntimeAdapterTaskId =
  "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE"
const ownerReadIssuesAdapterTaskId =
  "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF"
const ownerReadIssuesRuntimeReadinessTaskId =
  "RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE"
const ownerReadIssuesServiceAuthzRuntimeTaskId =
  "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF"
const ownerReadIssuesSelectedFieldRuntimeAdapterTaskId =
  "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF"
const ownerReadIssuesLiveReadProofRunnerTaskId =
  "RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT"

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: number
  tone?: ResearchFormalReadinessTone
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClasses[tone]}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export default async function ResearchFormalReadinessPage() {
  const readiness = buildResearchFormalReadinessSurface()
  const issuesServiceAuthzRuntimeProof =
    await buildResearchOwnerReadIssuesServiceAuthzRuntimeProof()
  const ownerReadSurface = buildResearchOwnerReadDtoSurface(
    issuesServiceAuthzRuntimeProof
  )
  const issuesSelectedFieldRuntimeAdapterProof =
    ownerReadSurface.issuesSelectedFieldRuntimeAdapterProof
  const issuesLiveReadProofRunnerContract =
    ownerReadSurface.issuesLiveReadProofRunnerContract

  if (!issuesSelectedFieldRuntimeAdapterProof) {
    throw new Error("Missing Research issues selected-field runtime adapter proof")
  }

  if (!issuesLiveReadProofRunnerContract) {
    throw new Error("Missing Research issues live-read proof runner contract")
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppHeader
        title="Research formal readiness"
        description="Protected owner surface for Research BFF readiness, blocked writes, and agent boundary"
      />

      <main className="flex-1 overflow-y-auto bg-background px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/research"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5" />
              回研究工作台
            </Link>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {readiness.summary.statusLabel}
            </span>
          </div>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheckIcon className="size-5" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {readiness.summary.taskId}
                      </p>
                      <h1 className="mt-1 text-xl font-bold text-foreground">
                        Research formal readiness surface
                      </h1>
                    </div>
                    <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                      {readiness.summary.primaryBlockedReason}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                    <p className="leading-relaxed">{readiness.summary.nextOwnerAction}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metric label="Resource families" value={readiness.summary.resourceFamilyCount} tone="good" />
                <Metric label="Blocked writes" value={readiness.summary.blockedWriteCount} tone="blocked" />
                <Metric label="Partial Prisma" value={readiness.summary.partialModelCount} tone="warn" />
                <Metric label="Mock only" value={readiness.summary.mockOnlyCount} />
                <Metric label="Blocked families" value={readiness.summary.blockedResourceFamilyCount} tone="blocked" />
                <Metric label="Proposal only" value={readiness.summary.proposalOnlyCount} tone="warn" />
                <Metric label="Query plans" value={ownerReadSurface.summary.queryPlanLoaderCount} tone="good" />
                <Metric label="Plan blocked" value={ownerReadSurface.summary.queryPlanBlockedCount} tone="blocked" />
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <SectionTitle
                icon={<DatabaseIcon className="size-4" />}
                title="Current state split"
                description="Prototype UI state, partial Prisma shape, unsafe formal actions, and unresolved model boundary stay visibly separated."
              />
              <div className="space-y-3">
                {readiness.currentStateSplit.map((boundary) => (
                  <div key={boundary.id} className={`rounded-lg border p-4 ${toneClasses[boundary.tone]}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-bold">{boundary.label}</h3>
                      <span className="rounded-md bg-background/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                        {boundary.risk}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed opacity-85">{boundary.evidence}</p>
                    <p className="mt-3 text-xs leading-relaxed font-medium">{boundary.nextSafeAction}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle
                icon={<RouteIcon className="size-4" />}
                title="Future BFF path"
                description="Formal reads must move through an owner-scoped loader, service authorization, and UI-safe DTO before runtime data appears."
              />
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="grid gap-2">
                  {readiness.futureBffPath.map((step, index) => (
                    <div key={step} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background text-[10px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="text-xs font-medium text-foreground">{step}</span>
                      {index < readiness.futureBffPath.length - 1 && (
                        <ArrowRightIcon className="ml-auto size-3.5 text-muted-foreground/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle
              icon={<ShieldCheckIcon className="size-4" />}
              title="Owner read DTO service skeleton"
              description="RESEARCH-BFF-003 extends the server-only owner-read DTO service with a requireUser()-shaped service authorization skeleton before any Research adapter read."
            />
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Authz task</p>
                  <p className="mt-1 break-words font-mono text-[11px] font-semibold text-foreground">
                    {ownerReadDtoAuthzTaskId}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Service task</p>
                  <p className="mt-1 break-words font-mono text-[11px] font-semibold text-foreground">
                    {ownerReadDtoServiceTaskId}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Service mode</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{ownerReadSurface.summary.mode}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Owner identity</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {ownerReadSurface.ownerIdentity.ownerIdentitySource}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Protected route</p>
                  <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                    {ownerReadSurface.summary.protectedRoute}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <h3 className="text-sm font-bold">UI-safe DTO boundary</h3>
                  <p className="mt-2 text-xs leading-relaxed">
                    {ownerReadSurface.serviceBoundary.mapperBoundary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-md bg-background/70 px-2 py-1 text-[10px] font-semibold">
                      No runtime Research DB read
                    </span>
                    <span className="rounded-md bg-background/70 px-2 py-1 text-[10px] font-semibold">
                      no caller-supplied ownerId
                    </span>
                    <span className="rounded-md bg-background/70 px-2 py-1 text-[10px] font-semibold">
                      no direct threadId-only access
                    </span>
                    <span className="rounded-md bg-background/70 px-2 py-1 text-[10px] font-semibold">
                      requireUser()-shaped service authorization
                    </span>
                    <span className="rounded-md bg-background/70 px-2 py-1 text-[10px] font-semibold">
                      direct threadId access refusal
                    </span>
                    <span className="rounded-md bg-background/70 px-2 py-1 text-[10px] font-semibold">
                      protected-owner visible proposal-only
                    </span>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {ownerReadSurface.authorizationRows.map((row) => (
                    <div key={row.id} className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-xs font-bold text-foreground">{row.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {row.rejectedPattern}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-muted/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Owner read authorization skeleton
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-foreground">
                      Adapter reads wait for service authorization
                    </h3>
                    <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                      {ownerReadSurface.authorizationSkeleton.authorizationDecisionMode}; adapter access is gated by{" "}
                      {ownerReadSurface.authorizationSkeleton.serviceAuthorizationRequiredBeforeAdapter
                        ? "serviceAuthorizationRequiredBeforeAdapter"
                        : "missing service authorization"}
                      , and mapper output requires authorized rows only.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                      {ownerReadSurface.authorizationSkeleton.callerSuppliedOwnerIdDecision}: caller ownerId
                    </span>
                    <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                      {ownerReadSurface.authorizationSkeleton.directThreadIdAccessDecision}: threadId-only
                    </span>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-background">
                  <div className="min-w-[860px]">
                    <div className="grid grid-cols-[0.75fr_1fr_1fr_0.75fr] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      <span>Stage</span>
                      <span>Required check</span>
                      <span>Denied pattern</span>
                      <span>State</span>
                    </div>
                    {ownerReadSurface.authorizationSkeletonRows.map((stage) => (
                      <div
                        key={stage.id}
                        className="grid grid-cols-[0.75fr_1fr_1fr_0.75fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">{stage.label}</p>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{stage.inputSource}</p>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{stage.requiredCheck}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{stage.deniedPattern}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{stage.unavailableState}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {ownerReadSurface.permissionDecisionRows.map((decision) => (
                    <div key={decision.id} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-xs font-bold text-foreground">{decision.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{decision.decision}</p>
                      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                        Pass signal: {decision.passSignal}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="mt-4 rounded-lg border border-border bg-background p-4"
                data-empty-state-fallback-policy="explicit_state_only_no_mock_fallback"
                data-mapper-mode="mapper_empty_state_skeleton_no_runtime_db_read"
                data-mapper-output="ui_safe_research_owner_read_response_dto"
              >
                <SectionTitle
                  icon={<DatabaseIcon className="size-4" />}
                  title="Owner read DTO mapper and empty-state response"
                  description="RESEARCH-BFF-004 defines UI-safe response DTO shapes for authorized-empty, unavailable, partial, formal-disabled, and proposal-only states before any adapter read."
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Mapper response task
                    </p>
                    <p className="mt-1 break-words font-mono text-[11px] font-semibold text-foreground">
                      {ownerReadDtoMapperTaskId}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Mode</p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {ownerReadSurface.mapperResponseSkeleton.mode}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Output</p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {ownerReadSurface.mapperResponseSkeleton.mapperOutput}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fallback</p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {ownerReadSurface.mapperResponseSkeleton.emptyStateFallbackPolicy}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      No mock fallback in formal owner-read responses; each protected state must be explicit, UI-safe,
                      and blocked from runtime DB reads until service authorization is proven.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {ownerReadSurface.responseStateRows.map((state) => (
                      <div key={state.id} className={`rounded-lg border p-3 ${toneClasses[state.tone]}`}>
                        <p className="text-xs font-bold">{state.label}</p>
                        <p className="mt-1 font-mono text-[10px] opacity-75">{state.responseKind}</p>
                        <p className="mt-2 text-[11px] leading-relaxed opacity-85">
                          {state.clientPayloadShape}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[0.8fr_0.8fr_0.85fr_1.2fr_1fr] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      <span>Family</span>
                      <span>Response</span>
                      <span>State</span>
                      <span>Client payload</span>
                      <span>Next action</span>
                    </div>
                    {ownerReadSurface.mapperResponseRows.map((response) => (
                      <div
                        key={response.id}
                        className="grid grid-cols-[0.8fr_0.8fr_0.85fr_1.2fr_1fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">{response.label}</p>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{response.targetDto}</p>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground">{response.responseDto}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{response.responseKind}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {response.clientPayloadShape}
                        </p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{response.nextAction}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="mt-4 rounded-lg border border-border bg-background p-4"
                data-query-plan-loader-mode="query_plan_service_loader_skeleton_no_runtime_db_read"
                data-query-plan-contract-task={ownerReadQueryPlanTaskId}
                data-query-plan-loader-task={ownerReadQueryPlanLoaderTaskId}
              >
                <SectionTitle
                  icon={<RouteIcon className="size-4" />}
                  title="Owner read query-plan service loader skeleton"
                  description="RESEARCH-BFF-006 consumes the owner-read query-plan contract from the server-only Research service surface and exposes adapter readiness without executing adapter reads."
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Service loader task
                    </p>
                    <p className="mt-1 break-words font-mono text-[11px] font-semibold text-foreground">
                      {ownerReadQueryPlanLoaderTaskId}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Contract
                        </p>
                        <p className="mt-1 break-words font-mono text-[11px] text-foreground">
                          {ownerReadQueryPlanTaskId}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Mode
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {ownerReadSurface.queryPlanLoaderSkeleton.mode}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Adapter execution
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          adapterExecutionAllowed:{" "}
                          {String(ownerReadSurface.queryPlanLoaderSkeleton.adapterExecutionAllowed)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {ownerReadSurface.queryPlanLoaderSkeleton.nextSafeActionPolicy}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/10 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Loader path
                    </p>
                    <div className="mt-3 grid gap-2">
                      {ownerReadSurface.queryPlanLoaderSkeleton.loaderPath.map((step, index) => (
                        <div key={step} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/40 text-[10px] font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="text-xs font-medium text-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <div className="min-w-[1180px]">
                    <div className="grid grid-cols-[0.78fr_0.7fr_1.2fr_0.9fr_0.8fr_1.2fr_1.1fr] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      <span>Family</span>
                      <span>Adapter kind</span>
                      <span>Owner-scope predicate</span>
                      <span>Selected-field boundary</span>
                      <span>Unavailable state</span>
                      <span>Next safe loader action</span>
                      <span>Rejected unsafe patterns</span>
                    </div>
                    {ownerReadSurface.queryPlanLoaderRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[0.78fr_0.7fr_1.2fr_0.9fr_0.8fr_1.2fr_1.1fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">{row.label}</p>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{row.targetDto}</p>
                        </div>
                        <div className="min-w-0">
                          <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${toneClasses[row.tone]}`}>
                            {row.adapterKind}
                          </span>
                          <p className="mt-2 font-mono text-[10px] text-muted-foreground">{row.runtimeState}</p>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {row.ownerScopePredicate}
                        </p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {row.selectedFieldBoundary}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">{row.unavailableState}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {row.nextSafeLoaderAction}
                        </p>
                        <div className="space-y-1">
                          {row.rejectedUnsafePatterns.map((pattern) => (
                            <p key={pattern} className="text-[11px] leading-relaxed text-muted-foreground">
                              {pattern}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="mt-4 rounded-lg border border-border bg-background p-4"
                data-runtime-adapter-gate-mode="proof_gated_adapter_skeleton_no_runtime_db_read"
                data-runtime-adapter-task={ownerReadRuntimeAdapterTaskId}
                data-runtime-adapter-selected-family={ownerReadSurface.runtimeAdapterGate.selectedFamily}
              >
                <SectionTitle
                  icon={<ShieldCheckIcon className="size-4" />}
                  title="First runtime adapter gate"
                  description="RESEARCH-BFF-009 selects exactly one safest Research read family and keeps real adapter execution disabled until owner identity, service authorization, and proof-target evidence are available."
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className={`rounded-lg border p-4 ${toneClasses[ownerReadSurface.runtimeAdapterGate.tone]}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                      Runtime adapter slice
                    </p>
                    <p className="mt-1 break-words font-mono text-[11px] font-semibold">
                      {ownerReadRuntimeAdapterTaskId}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-md border border-current/20 bg-background/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                          Selected family
                        </p>
                        <p className="mt-1 text-xs font-semibold">
                          {ownerReadSurface.runtimeAdapterGate.selectedFamilyLabel} /{" "}
                          {ownerReadSurface.runtimeAdapterGate.selectedFamily}
                        </p>
                      </div>
                      <div className="rounded-md border border-current/20 bg-background/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                          Execution decision
                        </p>
                        <p className="mt-1 font-mono text-[11px]">
                          {ownerReadSurface.runtimeAdapterGate.adapterExecutionDecision}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          adapterExecutionAllowed:{" "}
                          {String(ownerReadSurface.runtimeAdapterGate.adapterExecutionAllowed)}
                        </span>
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          runtimeDbReadEnabled:{" "}
                          {String(ownerReadSurface.runtimeAdapterGate.runtimeDbReadEnabled)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/10 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Owner proof path
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-foreground">
                          {ownerReadSurface.runtimeAdapterGate.ownerScopeProofPath}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Selected fields
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-foreground">
                          {ownerReadSurface.runtimeAdapterGate.selectedFieldBoundary}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Next safe action
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground">
                        {ownerReadSurface.runtimeAdapterGate.nextSafeAction}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="mt-4 rounded-lg border border-border bg-background p-4"
                data-issues-adapter-proof-mode="issues_adapter_interface_mapper_proof_no_runtime_db_read"
                data-issues-adapter-task={ownerReadIssuesAdapterTaskId}
              >
                <SectionTitle
                  icon={<DatabaseIcon className="size-4" />}
                  title="Issues adapter interface and mapper proof"
                  description="RESEARCH-BFF-010 defines the selected issues adapter interface and proves the mapper output shape while runtime Research DB reads stay disabled."
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Adapter proof task
                    </p>
                    <p className="mt-1 break-words font-mono text-[11px] font-semibold text-foreground">
                      {ownerReadIssuesAdapterTaskId}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Future signature
                        </p>
                        <p className="mt-1 break-words font-mono text-[11px] text-foreground">
                          {ownerReadSurface.issuesAdapterProof.futureAdapterSignature}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border border-border bg-background px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            Mapper input
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-foreground">
                            {ownerReadSurface.issuesAdapterProof.mapperInputBoundary}
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-background px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            Mapper output
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-foreground">
                            {ownerReadSurface.issuesAdapterProof.mapperOutputBoundary}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                        adapterExecutionAllowed:{" "}
                        {String(ownerReadSurface.issuesAdapterProof.safety.adapterExecutionAllowed)}
                      </span>
                      <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                        runtimeDbReadEnabled:{" "}
                        {String(ownerReadSurface.issuesAdapterProof.safety.runtimeDbReadEnabled)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/10 p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Family
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {ownerReadSurface.issuesAdapterProof.selectedFamily} /{" "}
                          {ownerReadSurface.issuesAdapterProof.selectedModel}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Proof rows
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {ownerReadSurface.issuesAdapterProof.proofFixtureRowCount} row to{" "}
                          {ownerReadSurface.issuesAdapterProof.proofDtoCount} DTO
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Fallback
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {ownerReadSurface.issuesAdapterProof.unavailableResponse.state}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Blocked fields
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ownerReadSurface.issuesAdapterProof.blockedFields.map((field) => (
                          <span key={field} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Proof DTO
                      </p>
                      {ownerReadSurface.issuesAdapterProof.proofDtos.map((dto) => (
                        <div key={dto.id} className="mt-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                          <p className="text-xs font-bold text-foreground">{dto.title}</p>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {dto.auditRef}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            sources {dto.counts.sources} · concepts {dto.counts.concepts} · writing{" "}
                            {dto.counts.writingProjects}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="mt-4 rounded-lg border border-border bg-background p-4"
                data-issues-runtime-readiness-mode="issues_runtime_readiness_preflight_no_runtime_db_read"
                data-issues-runtime-readiness-task={ownerReadIssuesRuntimeReadinessTaskId}
              >
                <SectionTitle
                  icon={<ShieldCheckIcon className="size-4" />}
                  title="Issues runtime-readiness preflight gate"
                  description="RESEARCH-BFF-011 records the future owner-scoped Prisma read shape, mapper handoff, readiness checks, and disabled runtime flags before any Research issues runtime DB read."
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Runtime-readiness task
                    </p>
                    <p className="mt-1 break-words font-mono text-[11px] font-semibold text-foreground">
                      {ownerReadIssuesRuntimeReadinessTaskId}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Owner predicate
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-foreground">
                          {ownerReadSurface.issuesRuntimeReadinessGate.ownerScopePredicate}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Future read operation
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {ownerReadSurface.issuesRuntimeReadinessGate.futurePrismaReadShape.operation}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                          adapterExecutionAllowed:{" "}
                          {String(ownerReadSurface.issuesRuntimeReadinessGate.safety.adapterExecutionAllowed)}
                        </span>
                        <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                          runtimeDbReadEnabled:{" "}
                          {String(ownerReadSurface.issuesRuntimeReadinessGate.safety.runtimeDbReadEnabled)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/10 p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Identity
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {ownerReadSurface.issuesRuntimeReadinessGate.ownerIdentitySource}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Sort / limit
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {ownerReadSurface.issuesRuntimeReadinessGate.futurePrismaReadShape.stableSort} ·{" "}
                          {ownerReadSurface.issuesRuntimeReadinessGate.futurePrismaReadShape.defaultLimit}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Fallback
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {ownerReadSurface.issuesRuntimeReadinessGate.unavailableFallback.state}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Selected scalar fields
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ownerReadSurface.issuesRuntimeReadinessGate.futurePrismaReadShape.selectScalarFields.map((field) => (
                          <span key={field} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Relation counts
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ownerReadSurface.issuesRuntimeReadinessGate.relationCountKeys.map((key) => (
                            <span key={key} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                              _count.{key}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Mapper
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {ownerReadSurface.issuesRuntimeReadinessGate.mapperOutputBoundary}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[0.85fr_1.05fr_1.05fr_0.75fr] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      <span>Check</span>
                      <span>Required signal</span>
                      <span>Blocked pattern</span>
                      <span>State</span>
                    </div>
                    {ownerReadSurface.issuesRuntimeReadinessGate.readinessChecks.map((check) => (
                      <div
                        key={check.id}
                        className="grid grid-cols-[0.85fr_1.05fr_1.05fr_0.75fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                      >
                        <p className="text-xs font-bold text-foreground">{check.label}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {check.requiredSignal}
                        </p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {check.blockedPattern}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">{check.passState}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="mt-4 rounded-lg border border-border bg-background p-4"
                data-issues-service-authz-runtime-mode={issuesServiceAuthzRuntimeProof.mode}
                data-issues-service-authz-runtime-task={ownerReadIssuesServiceAuthzRuntimeTaskId}
                data-owner-profile-id-redacted={String(
                  issuesServiceAuthzRuntimeProof.ownerProfileIdRedacted
                )}
              >
                <SectionTitle
                  icon={<LockIcon className="size-4" />}
                  title="Issues service-authz runtime proof"
                  description="RESEARCH-BFF-012 calls requireUser() in the protected server path, returns only a no-secret owner preflight packet, and still keeps Research Prisma reads disabled."
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className={`rounded-lg border p-4 ${toneClasses[issuesServiceAuthzRuntimeProof.tone]}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                      Service-authz runtime task
                    </p>
                    <p className="mt-1 break-words font-mono text-[11px] font-semibold">
                      {ownerReadIssuesServiceAuthzRuntimeTaskId}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-md border border-current/20 bg-background/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                          Status
                        </p>
                        <p className="mt-1 font-mono text-[11px]">
                          {issuesServiceAuthzRuntimeProof.status}
                        </p>
                      </div>
                      <div className="rounded-md border border-current/20 bg-background/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                          Identity source
                        </p>
                        <p className="mt-1 font-mono text-[11px]">
                          {issuesServiceAuthzRuntimeProof.ownerIdentitySource}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          ownerAuthenticated: {String(issuesServiceAuthzRuntimeProof.ownerAuthenticated)}
                        </span>
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          ownerProfileIdRedacted: {String(issuesServiceAuthzRuntimeProof.ownerProfileIdRedacted)}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          adapterExecutionAllowed:{" "}
                          {String(issuesServiceAuthzRuntimeProof.adapterExecutionAllowed)}
                        </span>
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          runtimeDbReadEnabled:{" "}
                          {String(issuesServiceAuthzRuntimeProof.runtimeDbReadEnabled)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/10 p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Family
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {issuesServiceAuthzRuntimeProof.selectedFamily} /{" "}
                          {issuesServiceAuthzRuntimeProof.selectedModel}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Service authz
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {issuesServiceAuthzRuntimeProof.serviceAuthorizationMode}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          DB scope
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {issuesServiceAuthzRuntimeProof.runtimeDbReadScope}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Auth lookup boundary
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground">
                        {issuesServiceAuthzRuntimeProof.authProfileLookupBoundary}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Mapper output
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {issuesServiceAuthzRuntimeProof.mapperOutputBoundary}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Next safe action
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-foreground">
                          {issuesServiceAuthzRuntimeProof.nextSafeAction}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[0.85fr_1.15fr_1.15fr_1fr] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      <span>Runtime check</span>
                      <span>Signal</span>
                      <span>Decision</span>
                      <span>Blocked pattern</span>
                    </div>
                    {issuesServiceAuthzRuntimeProof.rows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[0.85fr_1.15fr_1.15fr_1fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">{row.label}</p>
                          <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${toneClasses[row.tone]}`}>
                            {row.id}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{row.signal}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{row.decision}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{row.blockedPattern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="mt-4 rounded-lg border border-border bg-background p-4"
                data-issues-selected-field-runtime-adapter-mode={
                  issuesSelectedFieldRuntimeAdapterProof.mode
                }
                data-issues-selected-field-runtime-adapter-task={
                  ownerReadIssuesSelectedFieldRuntimeAdapterTaskId
                }
                data-live-prisma-read-allowed={String(
                  issuesSelectedFieldRuntimeAdapterProof.livePrismaReadAllowed
                )}
                data-proof-target-ready={String(
                  issuesSelectedFieldRuntimeAdapterProof.proofTargetReady
                )}
              >
                <SectionTitle
                  icon={<RouteIcon className="size-4" />}
                  title="Issues selected-field runtime adapter proof"
                  description="RESEARCH-BFF-013 turns the future owner-scoped read shape into a disabled proof gate: selected scalar fields, relation counts, mapper handoff, owner-run criteria, and live-read stop conditions are all visible before any Prisma read runs."
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                  <div
                    className={`rounded-lg border p-4 ${toneClasses[issuesSelectedFieldRuntimeAdapterProof.tone]}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                      Selected-field runtime adapter task
                    </p>
                    <p className="mt-1 break-words font-mono text-[11px] font-semibold">
                      {ownerReadIssuesSelectedFieldRuntimeAdapterTaskId}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-md border border-current/20 bg-background/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                          Status
                        </p>
                        <p className="mt-1 font-mono text-[11px]">
                          {issuesSelectedFieldRuntimeAdapterProof.status}
                        </p>
                      </div>
                      <div className="rounded-md border border-current/20 bg-background/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                          Planned operation
                        </p>
                        <p className="mt-1 font-mono text-[11px]">
                          {issuesSelectedFieldRuntimeAdapterProof.plannedPrismaOperation}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          serviceAuthzPreflightReady:{" "}
                          {String(issuesSelectedFieldRuntimeAdapterProof.serviceAuthzPreflightReady)}
                        </span>
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          livePrismaReadAllowed:{" "}
                          {String(issuesSelectedFieldRuntimeAdapterProof.livePrismaReadAllowed)}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          proofTargetReady:{" "}
                          {String(issuesSelectedFieldRuntimeAdapterProof.proofTargetReady)}
                        </span>
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          adapterExecutionAllowed:{" "}
                          {String(issuesSelectedFieldRuntimeAdapterProof.adapterExecutionAllowed)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/10 p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Owner predicate
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-foreground">
                          {issuesSelectedFieldRuntimeAdapterProof.ownerScopePredicate}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Where
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {issuesSelectedFieldRuntimeAdapterProof.plannedWhere}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Sort / limit
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {issuesSelectedFieldRuntimeAdapterProof.stableSort} ·{" "}
                          {issuesSelectedFieldRuntimeAdapterProof.defaultLimit}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Selected scalar fields
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {issuesSelectedFieldRuntimeAdapterProof.selectedScalarFields.map((field) => (
                          <span key={field} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Relation counts
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {issuesSelectedFieldRuntimeAdapterProof.relationCountKeys.map((key) => (
                            <span key={key} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                              _count.{key}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Mapper handoff
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {issuesSelectedFieldRuntimeAdapterProof.mapperFunction}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {issuesSelectedFieldRuntimeAdapterProof.mapperOutputBoundary}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-muted/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Owner-run criteria
                  </p>
                  <div className="mt-2 grid gap-2">
                    {issuesSelectedFieldRuntimeAdapterProof.ownerRunCriteria.map((criterion) => (
                      <div
                        key={criterion}
                        className="rounded-md border border-border bg-background px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
                      >
                        {criterion}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[0.8fr_1fr_1fr_1fr] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      <span>Adapter proof row</span>
                      <span>Proof signal</span>
                      <span>Pass criteria</span>
                      <span>Blocked pattern</span>
                    </div>
                    {issuesSelectedFieldRuntimeAdapterProof.rows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[0.8fr_1fr_1fr_1fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">{row.label}</p>
                          <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${toneClasses[row.tone]}`}>
                            {row.id}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{row.proofSignal}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{row.passCriteria}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{row.blockedPattern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="mt-4 rounded-lg border border-border bg-background p-4"
                data-issues-live-read-proof-runner-mode={
                  issuesLiveReadProofRunnerContract.mode
                }
                data-issues-live-read-proof-runner-task={
                  ownerReadIssuesLiveReadProofRunnerTaskId
                }
                data-live-read-execution-allowed={String(
                  issuesLiveReadProofRunnerContract.liveReadExecutionAllowed
                )}
                data-owner-run-ready={String(
                  issuesLiveReadProofRunnerContract.ownerRunReady
                )}
              >
                <SectionTitle
                  icon={<LockIcon className="size-4" />}
                  title="Issues live-read proof runner contract"
                  description="RESEARCH-BFF-014 defines the owner-run, dry-run-first contract for a future owner-scoped Research issues live read while keeping DB reads, public output, writes, and external agent access disabled."
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                  <div
                    className={`rounded-lg border p-4 ${toneClasses[issuesLiveReadProofRunnerContract.tone]}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                      Proof-runner task
                    </p>
                    <p className="mt-1 break-words font-mono text-[11px] font-semibold">
                      {ownerReadIssuesLiveReadProofRunnerTaskId}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-md border border-current/20 bg-background/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                          Status
                        </p>
                        <p className="mt-1 font-mono text-[11px]">
                          {issuesLiveReadProofRunnerContract.status}
                        </p>
                      </div>
                      <div className="rounded-md border border-current/20 bg-background/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">
                          Owner-run command
                        </p>
                        <p className="mt-1 font-mono text-[11px]">
                          {issuesLiveReadProofRunnerContract.ownerRunCommand}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          dryRunOnly: {String(issuesLiveReadProofRunnerContract.dryRunOnly)}
                        </span>
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          liveReadExecutionAllowed:{" "}
                          {String(issuesLiveReadProofRunnerContract.liveReadExecutionAllowed)}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          proofTargetReady:{" "}
                          {String(issuesLiveReadProofRunnerContract.proofTargetReady)}
                        </span>
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          ownerRunReady:{" "}
                          {String(issuesLiveReadProofRunnerContract.ownerRunReady)}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          allowFlagCollected:{" "}
                          {String(issuesLiveReadProofRunnerContract.allowLiveReadFlagCollected)}
                        </span>
                        <span className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[10px] font-bold">
                          confirmationCollected:{" "}
                          {String(issuesLiveReadProofRunnerContract.confirmationCollected)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/10 p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Identity source
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {issuesLiveReadProofRunnerContract.ownerIdentitySource}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Proof target
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-foreground">
                          {issuesLiveReadProofRunnerContract.proofTargetClassification}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Target input
                        </p>
                        <p className="mt-1 break-words font-mono text-[11px] text-foreground">
                          {issuesLiveReadProofRunnerContract.proofTargetEnvName}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Allow flag
                        </p>
                        <p className="mt-1 break-words font-mono text-[11px] text-foreground">
                          {issuesLiveReadProofRunnerContract.allowLiveReadFlagName}=
                          {issuesLiveReadProofRunnerContract.allowLiveReadRequiredValue}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Confirmation
                        </p>
                        <p className="mt-1 break-words font-mono text-[11px] text-foreground">
                          {issuesLiveReadProofRunnerContract.confirmationEnvName}
                        </p>
                        <p className="mt-1 break-words font-mono text-[10px] text-muted-foreground">
                          {issuesLiveReadProofRunnerContract.confirmationPhrase}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Owner-run command template
                      </p>
                      <div className="mt-2 grid gap-2">
                        {issuesLiveReadProofRunnerContract.ownerRunCommandTemplate.map((commandPart) => (
                          <div
                            key={commandPart}
                            className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground"
                          >
                            {commandPart}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Required owner inputs
                    </p>
                    <div className="mt-2 grid gap-2">
                      {issuesLiveReadProofRunnerContract.requiredInputs.map((input) => (
                        <div
                          key={input.id}
                          className="rounded-md border border-border bg-background px-3 py-2"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-xs font-bold text-foreground">{input.label}</p>
                            <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                              {input.currentState}
                            </span>
                          </div>
                          <p className="mt-1 break-words font-mono text-[11px] text-muted-foreground">
                            {input.inputName}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            requiredForLiveRead: {String(input.requiredForLiveRead)} ·
                            safeToPrintValue: {String(input.safeToPrintValue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Owner-run criteria
                    </p>
                    <div className="mt-2 grid gap-2">
                      {issuesLiveReadProofRunnerContract.ownerRunCriteria.map((criterion) => (
                        <div
                          key={criterion}
                          className="rounded-md border border-border bg-background px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
                        >
                          {criterion}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[0.8fr_1fr_1fr_1fr] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      <span>Proof-runner row</span>
                      <span>Readiness signal</span>
                      <span>Pass criteria</span>
                      <span>Blocked pattern</span>
                    </div>
                    {issuesLiveReadProofRunnerContract.rows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[0.8fr_1fr_1fr_1fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">{row.label}</p>
                          <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${toneClasses[row.tone]}`}>
                            {row.id}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{row.readinessSignal}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{row.passCriteria}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{row.blockedPattern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <div className="min-w-[920px]">
                  <div className="grid grid-cols-[0.85fr_0.8fr_0.95fr_1fr_1.3fr] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <span>Family</span>
                    <span>DTO</span>
                    <span>Empty state</span>
                    <span>Authorization</span>
                    <span>Blocked writes</span>
                  </div>
                  {ownerReadSurface.readFamilyRows.map((family) => (
                    <div
                      key={family.id}
                      className="grid grid-cols-[0.85fr_0.8fr_0.95fr_1fr_1.3fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <p className="text-xs font-bold text-foreground">{family.label}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{family.targetDto}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{family.emptyState}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{family.authorization}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{family.blockedWrites}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {ownerReadSurface.emptyStateRows.map((state) => (
                  <div key={state.id} className={`rounded-lg border p-3 ${toneClasses[state.tone]}`}>
                    <p className="text-xs font-bold">{state.label}</p>
                    <p className="mt-1 font-mono text-[10px] opacity-75">{state.id}</p>
                    <p className="mt-2 text-[11px] leading-relaxed opacity-85">{state.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle
              icon={<GitBranchIcon className="size-4" />}
              title="Resource-family readiness"
              description="The Research surface shows all formal families while preserving the mock/formal split and blocked write boundary."
            />
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[1.1fr_0.85fr_0.9fr_1.35fr] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <span>Family</span>
                  <span>Readiness</span>
                  <span>Future DTO</span>
                  <span>Write boundary</span>
                </div>
                {readiness.resourceFamilies.map((family) => (
                  <div
                    key={family.id}
                    className="grid grid-cols-[1.1fr_0.85fr_0.9fr_1.35fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">{family.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{family.currentSource}</p>
                    </div>
                    <div className="min-w-0">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${toneClasses[family.tone]}`}>
                        {family.readinessLabel}
                      </span>
                      <p className="mt-2 text-[11px] text-muted-foreground">{family.displayLabel}</p>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{family.futureDto}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{family.writeBoundary}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <SectionTitle
                icon={<BanIcon className="size-4" />}
                title="Blocked writes"
                description="No Research persistence, graph promotion, public output, or final agent write is unlocked by this surface."
              />
              <div className="space-y-3">
                {readiness.blockedWriteOperations.map((operation) => (
                  <div key={operation.id} className="rounded-lg border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground">{operation.label}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{operation.reason}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {operation.requiredBeforeUnlock.map((item) => (
                        <span key={item} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle
                icon={<LockIcon className="size-4" />}
                title="Agent and safety boundary"
                description="Research agents stay as protected owner-visible proposals and remain non-registerable for external collaboration."
              />
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Surface type</p>
                    <p className="mt-1 text-xs font-semibold text-foreground">{readiness.agentBoundary.surfaceType}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Protocol status</p>
                    <p className="mt-1 text-xs font-semibold text-foreground">{readiness.agentBoundary.protocolStatus}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {readiness.safety.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                        <CheckCircle2Icon className="size-3" />
                        Blocked
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
                <div className="flex items-start gap-2">
                  <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 space-y-2">
                    <h3 className="text-sm font-bold text-foreground">Next executable task</h3>
                    <div className="flex flex-wrap gap-2">
                      {readiness.nextTasks.map((task) => (
                        <span key={task} className="rounded-md border border-primary/20 bg-background px-2 py-1 text-[10px] font-semibold text-primary">
                          {task}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
