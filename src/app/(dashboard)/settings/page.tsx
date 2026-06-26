import Link from "next/link"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  GitBranchIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  buildAdminAuditBffContract,
  buildAIInputSourceWorkflowOpsReadinessContract,
  buildBackendOperationCatalogSurfaceContract,
  buildLaunchOperatorActionRegistryContract,
  buildOperatingSurfaceMaturityContract,
  buildWorkProofEvidenceSurfaceContract,
  buildScenarioJourneyContract,
  getLaunchReadinessHistoryContract,
  getOwnerEvidenceConsoleContract,
  getOwnerAuthBoundaryContract,
} from "@/lib/services/admin-readiness.service"
import type { LaunchOperatorAction } from "@/lib/contracts/launch-operator-action-registry.contract"
import { buildAgentProtocolReadinessContract } from "@/lib/services/agent-protocol-readiness.service"
import { resolveCurrentUser } from "@/lib/services/auth.service"
import { buildClientPortalReadinessContract } from "@/lib/services/client-portal-readiness.service"
import {
  getModulePermissionSnapshotForProfile,
  getUnauthenticatedModulePermissionSnapshot,
} from "@/lib/services/module-permission.service"
import { getProjectCountForProfile } from "@/lib/services/project.service"
import { SettingsClient } from "./settings-client"

export const dynamic = "force-dynamic"

const statusLabels = {
  authenticated: "Authenticated",
  mock_profile_missing: "Mock profile missing",
  supabase_config_missing: "Supabase env missing",
  supabase_session_missing: "Session missing",
  supabase_profile_missing: "Profile missing",
}

function formatAuthMode(mode: "mock" | "supabase") {
  return mode === "mock" ? "Development mock" : "Supabase SSR"
}

function actionVariant(row: LaunchOperatorAction) {
  if (row.state === "ready") return "secondary" as const
  if (row.state === "blocked" || row.state === "unavailable") return "destructive" as const
  return "outline" as const
}

export default async function SettingsPage() {
  const auth = await resolveCurrentUser()
  const [projectCount, modulePermissionSnapshot] = auth.user
    ? await Promise.all([
        getProjectCountForProfile(auth.user.id),
        getModulePermissionSnapshotForProfile({
          profileId: auth.user.id,
          role: auth.user.role,
        }),
      ])
    : [null, getUnauthenticatedModulePermissionSnapshot()]

  const isAuthenticated = auth.status === "authenticated" && auth.user
  const clientPortalContract = buildClientPortalReadinessContract()
  const operatingSurfaceMaturityContract = buildOperatingSurfaceMaturityContract()
  const scenarioJourneyContract = buildScenarioJourneyContract()
  const backendOperationCatalogSurfaceContract = buildBackendOperationCatalogSurfaceContract()
  const [
    agentProtocolContract,
    ownerAuthBoundaryContract,
    ownerEvidenceConsoleContract,
    launchReadinessHistoryContract,
    workProofEvidenceSurfaceContract,
  ] = await Promise.all([
    buildAgentProtocolReadinessContract(),
    getOwnerAuthBoundaryContract(),
    getOwnerEvidenceConsoleContract(),
    getLaunchReadinessHistoryContract(),
    buildWorkProofEvidenceSurfaceContract(),
  ])
  const aiInputSourceWorkflowOpsReadinessContract = await buildAIInputSourceWorkflowOpsReadinessContract({
    canRunAuth005: ownerAuthBoundaryContract.proof.canRunAuth005,
  })
  const launchOperatorActionRegistryContract = buildLaunchOperatorActionRegistryContract({
    ownerAuthBoundaryContract,
    ownerEvidenceConsoleContract,
    launchReadinessHistoryContract,
  })
  const auditContract = buildAdminAuditBffContract({
    authStatus: auth.status,
    hasSupabaseConfig: auth.hasSupabaseConfig,
    permissionSnapshot: modulePermissionSnapshot,
    loopNextRecommendedTask: "settings-readiness",
  })
  const attentionItems = [
    {
      label: "Auth runtime",
      value: formatAuthMode(auth.mode),
      tone: auth.mode === "mock" ? "warn" : "neutral",
    },
    {
      label: "Supabase config",
      value: auth.hasSupabaseConfig ? "Configured" : "Missing",
      tone: auth.hasSupabaseConfig ? "good" : "warn",
    },
    {
      label: "Profile mapping",
      value: statusLabels[auth.status],
      tone: isAuthenticated ? "good" : "warn",
    },
    {
      label: "Owner boundary",
      value: ownerAuthBoundaryContract.proof.boundaryStatus,
      tone: ownerAuthBoundaryContract.proof.canRunAuth005 ? "good" : "warn",
    },
    {
      label: "Surface maturity",
      value: `${operatingSurfaceMaturityContract.summary.dbBackedCount}/${operatingSurfaceMaturityContract.summary.moduleCount} DB-backed`,
      tone: "warn",
    },
    {
      label: "Scenarios",
      value: `${scenarioJourneyContract.summary.partialCount} partial`,
      tone: "warn",
    },
    {
      label: "AI Input source",
      value: `${aiInputSourceWorkflowOpsReadinessContract.summary.completeCount} complete`,
      tone: aiInputSourceWorkflowOpsReadinessContract.summary.blockedCount > 0 ? "warn" : "good",
    },
    {
      label: "Owner evidence",
      value: `${ownerEvidenceConsoleContract.summary.blockedCount} blocked`,
      tone: ownerEvidenceConsoleContract.summary.blockedCount > 0 ? "warn" : "good",
    },
    {
      label: "Readiness history",
      value: `${launchReadinessHistoryContract.summary.readyCount}/${launchReadinessHistoryContract.summary.surfaceCount} ready`,
      tone: launchReadinessHistoryContract.summary.blockedCount > 0 ? "warn" : "good",
    },
    {
      label: "Operator actions",
      value: `${launchOperatorActionRegistryContract.summary.actionCount} tracked`,
      tone: launchOperatorActionRegistryContract.summary.blockedCount > 0 ? "warn" : "good",
    },
    {
      label: "Backend ops",
      value: `${backendOperationCatalogSurfaceContract.summary.operationCount} operations`,
      tone: backendOperationCatalogSurfaceContract.summary.blockedCount > 0 ? "warn" : "good",
    },
    {
      label: "Work proof",
      value: workProofEvidenceSurfaceContract.summary.freshness,
      tone: workProofEvidenceSurfaceContract.summary.workProofPassed
        ? "good"
        : workProofEvidenceSurfaceContract.summary.blockedLikeCount > 0
          ? "warn"
          : "neutral",
    },
  ] as const

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppHeader title="設定" description="Owner profile, auth readiness, module boundaries" />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
          <section className="rounded-lg border bg-background">
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              {attentionItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                  {item.tone === "good" ? (
                    <CheckCircle2Icon className="size-4 text-emerald-600" />
                  ) : (
                    <AlertTriangleIcon className="size-4 text-amber-600" />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-lg border bg-background">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <UserRoundIcon className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Owner profile</h2>
                </div>
                <Badge variant={isAuthenticated ? "secondary" : "outline"}>
                  {isAuthenticated ? "mapped" : "not mapped"}
                </Badge>
              </div>
              <dl className="grid gap-0 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="min-w-0 truncate font-medium">
                    {auth.user?.email ?? auth.verifiedEmail ?? "Unavailable"}
                  </dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-medium">{auth.user?.role ?? "Unavailable"}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Work projects</dt>
                  <dd className="font-medium">{projectCount ?? "Not available"}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3">
                  <dt className="text-muted-foreground">Runtime</dt>
                  <dd className="font-medium">{formatAuthMode(auth.mode)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border bg-background">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Auth readiness contract</h2>
                </div>
                <Button variant="outline" size="sm" render={<Link href="/auth/status" />}>
                  <ExternalLinkIcon className="size-3.5" />
                  JSON status
                </Button>
              </div>
              <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 px-3 py-3">
                  <p className="font-medium">Current blocker</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {auth.hasSupabaseConfig
                      ? "Supabase env exists; a real browser session is still required for AUTH-005."
                      : "Supabase public env is missing, so real-session AUTH-005 cannot complete yet."}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-3">
                  <p className="font-medium">Protected shell</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Dashboard pages render only after the server layout resolves a current user.
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-3">
                  <p className="font-medium">Profile rule</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Supabase email must map to an existing `Profile`; automatic provisioning is still out of scope.
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-3">
                  <p className="font-medium">Work boundary</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Work reads and writes continue through `requireUser()` and owner-scoped services.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Owner evidence console</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{ownerEvidenceConsoleContract.id}</Badge>
                <Badge variant="outline">{ownerEvidenceConsoleContract.summary.rowCount} checks</Badge>
                <Badge variant="outline">{ownerEvidenceConsoleContract.summary.ownerRunCount} owner-run</Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-2">
              {ownerEvidenceConsoleContract.rows.slice(0, 4).map((row) => (
                <div key={row.id} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{row.priority}. {row.surface}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.linkedTask} · {row.blocker}</p>
                    </div>
                    <Badge
                      variant={row.tone === "good" ? "secondary" : row.tone === "blocked" ? "destructive" : "outline"}
                      className="shrink-0"
                    >
                      {row.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.ownerAction}</p>
                  <p className="mt-2 break-all rounded-md bg-background/70 px-2 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                    {row.command}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Pass: {row.passSignal}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-2">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Primary owner action</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {ownerEvidenceConsoleContract.summary.primaryOwnerAction}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret exclusions</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {ownerEvidenceConsoleContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Launch readiness history</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{launchReadinessHistoryContract.id}</Badge>
                <Badge variant="outline">
                  {launchReadinessHistoryContract.summary.readyCount} ready
                </Badge>
                <Badge variant="outline">
                  {launchReadinessHistoryContract.summary.blockedCount} blocked
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-2">
              {launchReadinessHistoryContract.rows.map((row) => (
                <div key={row.surface} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{row.label}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {row.latestProofPath} · {row.linkedTask}
                      </p>
                    </div>
                    <Badge
                      variant={row.tone === "good" ? "secondary" : row.tone === "blocked" ? "destructive" : "outline"}
                      className="shrink-0"
                    >
                      {row.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {row.blockers.length > 0 ? row.blockers[0] : "No blocker recorded"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.nextAction}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Primary blocker</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {launchReadinessHistoryContract.summary.primaryBlocker}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Latest reports</p>
                <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                  {launchReadinessHistoryContract.evidenceSource.latestReportPaths.join(" / ") || "No reports found"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret exclusions</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {launchReadinessHistoryContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Work proof evidence</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{workProofEvidenceSurfaceContract.id}</Badge>
                <Badge variant="outline">{workProofEvidenceSurfaceContract.summary.freshness}</Badge>
                <Badge variant="outline">
                  WORK-009 {workProofEvidenceSurfaceContract.summary.canRunWork009 ? "ready" : "blocked"}
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-2">
              {workProofEvidenceSurfaceContract.rows.slice(0, 4).map((row) => (
                <div key={row.family} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{row.label}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">{row.path}</p>
                    </div>
                    <Badge
                      variant={row.tone === "good" ? "secondary" : row.tone === "blocked" ? "destructive" : "outline"}
                      className="shrink-0"
                    >
                      {row.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.signal}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.nextAction}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Latest status</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {workProofEvidenceSurfaceContract.summary.latestOverallStatus}; age{" "}
                  {workProofEvidenceSurfaceContract.summary.latestAgeMinutes ?? "unknown"} minutes.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next owner action</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {workProofEvidenceSurfaceContract.summary.nextOwnerAction}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-claim boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This surface reads evidence only; it does not run commands, write DB rows, claim WORK-009, or upgrade launch level.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Launch operator actions</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{launchOperatorActionRegistryContract.id}</Badge>
                <Badge variant="outline">
                  {launchOperatorActionRegistryContract.summary.ownerRunCount} owner-run
                </Badge>
                <Badge variant="outline">
                  {launchOperatorActionRegistryContract.summary.approvalRequiredCount} approvals
                </Badge>
                <Badge variant="outline">
                  {launchOperatorActionRegistryContract.summary.blockedCount} blocked
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-2">
              {launchOperatorActionRegistryContract.rows.slice(0, 6).map((row) => (
                <div key={row.id} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{row.priority}. {row.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.area} · {row.linkedTasks.join(" / ")}
                      </p>
                    </div>
                    <Badge variant={actionVariant(row)} className="shrink-0">
                      {row.state.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.nextAction}</p>
                  <p className="mt-2 break-all rounded-md bg-background/70 px-2 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                    {row.command}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Pass: {row.passSignal}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Primary blocker</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {launchOperatorActionRegistryContract.summary.primaryBlocker}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next task</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {launchOperatorActionRegistryContract.summary.nextTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret exclusions</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {launchOperatorActionRegistryContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Backend operation controls</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{backendOperationCatalogSurfaceContract.id}</Badge>
                <Badge variant="outline">
                  {backendOperationCatalogSurfaceContract.summary.readyLikeCount} ready-like
                </Badge>
                <Badge variant="outline">
                  {backendOperationCatalogSurfaceContract.summary.blockedCount} blocked
                </Badge>
                <Badge variant="outline">
                  external registration disabled
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-2">
              {backendOperationCatalogSurfaceContract.rows
                .filter((row) => row.tone !== "good" || row.requiresHumanApproval)
                .slice(0, 6)
                .map((row) => (
                  <div key={row.id} className="rounded-lg bg-muted/40 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{row.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.id} · {row.module} · {row.kind.replace(/_/g, " ")}
                        </p>
                      </div>
                      <Badge
                        variant={row.tone === "blocked" ? "destructive" : "outline"}
                        className="shrink-0"
                      >
                        {row.currentState.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.stopCondition}</p>
                    <p className="mt-2 break-all rounded-md bg-background/70 px-2 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                      {row.verificationCommand}
                    </p>
                  </div>
                ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Operation mix</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {backendOperationCatalogSurfaceContract.summary.cliCheckCommandCount} CLI checks,{" "}
                  {backendOperationCatalogSurfaceContract.summary.ownerRunProofCommandCount} owner-run proof commands,{" "}
                  {backendOperationCatalogSurfaceContract.summary.agentDryRunCount} agent dry-run operation.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Owner control</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {backendOperationCatalogSurfaceContract.ownerActions[1]}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret exclusions</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {backendOperationCatalogSurfaceContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <KeyRoundIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Owner/demo auth boundary</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{ownerAuthBoundaryContract.id}</Badge>
                <Badge variant="outline">{ownerAuthBoundaryContract.proof.overallStatus}</Badge>
                <Badge variant={ownerAuthBoundaryContract.proof.canRunAuth005 ? "secondary" : "outline"}>
                  AUTH-005 {ownerAuthBoundaryContract.proof.canRunAuth005 ? "ready" : "blocked"}
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-3">
              {ownerAuthBoundaryContract.rows.map((row) => (
                <div key={row.area} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{row.area}</p>
                    <Badge
                      variant={row.tone === "good" ? "secondary" : row.tone === "blocked" ? "destructive" : "outline"}
                      className="shrink-0"
                    >
                      {row.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.signal}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.nextAction}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-2">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Latest proof</p>
                <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                  {ownerAuthBoundaryContract.source.latestProofPath}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret exclusions</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {ownerAuthBoundaryContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Scenario journey maturity</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{scenarioJourneyContract.id}</Badge>
                <Badge variant="outline">
                  {scenarioJourneyContract.summary.scenarioCount} scenarios
                </Badge>
                <Badge variant="outline">
                  {scenarioJourneyContract.summary.blockedCount} blocked
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-2">
              {scenarioJourneyContract.rows.slice(0, 6).map((row) => (
                <div key={row.scenario} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{row.scenario}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.actor} · {row.entrySurface}</p>
                    </div>
                    <Badge
                      variant={row.tone === "good" ? "secondary" : row.tone === "blocked" ? "destructive" : "outline"}
                      className="shrink-0"
                    >
                      {row.state.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.currentExperience}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.missingExperience}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Next: <span className="font-medium text-foreground">{row.linkedTask}</span> - {row.nextAction}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-2">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Primary experience gap</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {scenarioJourneyContract.summary.primaryExperienceGap}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next task</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {scenarioJourneyContract.summary.nextTask}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Operating surface maturity</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{operatingSurfaceMaturityContract.id}</Badge>
                <Badge variant="outline">
                  {operatingSurfaceMaturityContract.summary.moduleCount} modules
                </Badge>
                <Badge variant="outline">
                  {operatingSurfaceMaturityContract.summary.highRiskCount} high-risk
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-2">
              {operatingSurfaceMaturityContract.rows.slice(0, 6).map((row) => (
                <div key={row.module} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{row.module}</p>
                    <Badge
                      variant={row.tone === "good" ? "secondary" : row.tone === "blocked" ? "destructive" : "outline"}
                      className="shrink-0"
                    >
                      {row.surfaceState.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.dbState}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {row.apiCli} Next: {row.nextTask}.
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Maturity mix</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {operatingSurfaceMaturityContract.summary.dbBackedCount} DB-backed,{" "}
                  {operatingSurfaceMaturityContract.summary.formalReadinessCount} formal-readiness,{" "}
                  {operatingSurfaceMaturityContract.summary.mockOrShellCount} mock/shell.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next task</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {operatingSurfaceMaturityContract.summary.nextTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret exclusions</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {operatingSurfaceMaturityContract.prohibitedExposure.slice(0, 4).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <GitBranchIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">AI Input source workflow readiness</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{aiInputSourceWorkflowOpsReadinessContract.id}</Badge>
                <Badge variant="outline">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.completeCount} complete
                </Badge>
                <Badge variant="outline">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.dryRunOnlyCount} dry-run
                </Badge>
                <Badge variant="outline">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.humanApprovalRequiredCount} approvals
                </Badge>
                <Badge variant="outline">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.localProofPacketStatus}
                </Badge>
                <Badge variant="outline">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetHandoffStatus}
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-2">
              {aiInputSourceWorkflowOpsReadinessContract.rows.map((row) => (
                <div key={row.area} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{row.area}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.state.replace(/_/g, " ")}</p>
                    </div>
                    <Badge
                      variant={row.tone === "good" ? "secondary" : row.tone === "blocked" ? "destructive" : "outline"}
                      className="shrink-0"
                    >
                      {row.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.signal}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.nextAction}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.boundary}</p>
                  {row.ownerRunCommand && (
                    <p className="mt-2 break-all rounded-md bg-background/70 px-2 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                      {row.ownerRunCommand}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-5">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Required objects</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {aiInputSourceWorkflowOpsReadinessContract.requiredObjects.join(" / ")}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next gate</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.nextTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Proof handoff</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetHandoffStatus};{" "}
                  {aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetHandoffMissingCount} missing.
                </p>
                <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetHandoffEvidenceTarget}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Local proof packet</p>
                <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.latestLocalProofPacketPath}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {aiInputSourceWorkflowOpsReadinessContract.summary.localProofCheckerStatus}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret exclusions</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {aiInputSourceWorkflowOpsReadinessContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <GitBranchIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Agent protocol readiness</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{agentProtocolContract.id}</Badge>
                <Badge variant="outline">{agentProtocolContract.status.replace(/_/g, " ")}</Badge>
                <Badge variant="outline">
                  {agentProtocolContract.summary.manifestCount}/{agentProtocolContract.summary.sourceAgentCount}
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-3">
              {agentProtocolContract.rows.slice(0, 6).map((row) => (
                <div key={row.area} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{row.area}</p>
                    <Badge
                      variant={row.tone === "good" ? "secondary" : row.tone === "blocked" ? "destructive" : "outline"}
                      className="shrink-0"
                    >
                      {row.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.signal}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.nextGate}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-2">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Protected-only visibility</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Surfaces: {agentProtocolContract.visibility.surfaces.join(" and ")}. Public directory, runtime endpoint,
                  external registry write, and provider access remain disabled.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">External registration blockers</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {agentProtocolContract.missingRegistrationReadinessFields
                    .slice(0, 5)
                    .map((field) => field.field)
                    .join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Read-only settings contract</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{auditContract.id}</Badge>
                <Badge variant="outline">{auditContract.status.replace(/_/g, " ")}</Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-3">
              {auditContract.rows.slice(0, 3).map((row) => (
                <div key={row.area} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{row.area}</p>
                    <Badge variant={row.tone === "good" ? "secondary" : "outline"} className="shrink-0">
                      {row.tone}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.safeExposure}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.writeBoundary}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <KeyRoundIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Client Portal readiness</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{clientPortalContract.id}</Badge>
                <Badge variant="outline">{clientPortalContract.currentGate.behavior.replace(/_/g, " ")}</Badge>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm lg:grid-cols-3">
              {clientPortalContract.rows.slice(0, 6).map((row) => (
                <div key={row.area} className="rounded-lg bg-muted/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{row.area}</p>
                    <Badge
                      variant={row.tone === "good" ? "secondary" : row.tone === "blocked" ? "destructive" : "outline"}
                      className="shrink-0"
                    >
                      {row.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.signal}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.launchGate}</p>
                </div>
              ))}
            </div>
          </section>

          <SettingsClient permissionSnapshot={modulePermissionSnapshot} />
        </div>
      </main>
    </div>
  )
}
