import Link from "next/link"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileTextIcon,
  GaugeIcon,
  GitBranchIcon,
  KeyRoundIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getAdminLaunchConsole,
  getAdminLaunchOverview,
  type AdminAuditBffRow,
  type AdminLaunchConsole,
  type AIInputSourceWorkflowOpsReadinessRow,
  type AdminReadinessRow,
  type AdminReadinessTone,
  type BackendOperationCatalogSurfaceRow,
  type OperatingSurfaceMaturityRow,
  type OwnerEvidenceConsoleRow,
  type ScenarioJourneyRow,
  type WorkProofEvidenceSurfaceRow,
} from "@/lib/services/admin-readiness.service"
import type { LaunchReadinessHistoryRow } from "@/lib/contracts/launch-readiness-history.contract"
import type { LaunchOperatorAction } from "@/lib/contracts/launch-operator-action-registry.contract"
import type { ClientPortalReadinessRow } from "@/lib/services/client-portal-readiness.service"
import type { AgentProtocolReadinessRow } from "@/lib/services/agent-protocol-readiness.service"
import { cn } from "@/lib/utils"
import { AdminDetailSectionIndex } from "./detail/section-index"

export const dynamic = "force-dynamic"

type AdminPageSearchParams = {
  detail?: string | string[]
}

type AdminPageProps = {
  searchParams?: Promise<AdminPageSearchParams>
}

const toneLabel: Record<AdminReadinessTone, string> = {
  good: "ready",
  warn: "review",
  blocked: "blocked",
  neutral: "watch",
}

function badgeVariant(tone: AdminReadinessTone) {
  if (tone === "good") return "secondary" as const
  if (tone === "blocked") return "destructive" as const
  return "outline" as const
}

function toneIcon(tone: AdminReadinessTone) {
  if (tone === "good") return <CheckCircle2Icon className="size-4 text-emerald-600" />
  if (tone === "blocked") return <AlertTriangleIcon className="size-4 text-red-600" />
  return <AlertTriangleIcon className="size-4 text-amber-600" />
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function StatusBadge({ tone, label }: { tone: AdminReadinessTone; label?: string }) {
  return (
    <Badge variant={badgeVariant(tone)} className="w-fit">
      {label ?? toneLabel[tone]}
    </Badge>
  )
}

function AuditContractTable({ rows }: { rows: AdminAuditBffRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Area</th>
            <th className="px-4 py-3 text-left font-medium">Source</th>
            <th className="px-4 py-3 text-left font-medium">Safe exposure</th>
            <th className="px-4 py-3 text-left font-medium">Write boundary</th>
            <th className="px-4 py-3 text-left font-medium">Next gate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <span className="font-medium">{row.area}</span>
                  <StatusBadge tone={row.tone} />
                </div>
              </td>
              <td className="max-w-sm whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.source}
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.safeExposure}
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.writeBoundary}
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.nextGate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientPortalReadinessTable({ rows }: { rows: ClientPortalReadinessRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Area</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Signal</th>
            <th className="px-4 py-3 text-left font-medium">Launch gate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area} className="border-b last:border-0">
              <td className="px-4 py-3 align-top font-medium">{row.area}</td>
              <td className="px-4 py-3 align-top">
                <StatusBadge tone={row.tone} label={row.status} />
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.signal}
              </td>
              <td className="max-w-lg whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.launchGate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AgentProtocolReadinessTable({ rows }: { rows: AgentProtocolReadinessRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Area</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Signal</th>
            <th className="px-4 py-3 text-left font-medium">Next gate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area} className="border-b last:border-0">
              <td className="px-4 py-3 align-top font-medium">{row.area}</td>
              <td className="px-4 py-3 align-top">
                <StatusBadge tone={row.tone} label={row.status} />
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.signal}
              </td>
              <td className="max-w-lg whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.nextGate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AIInputSourceWorkflowOpsReadinessTable({
  rows,
}: {
  rows: AIInputSourceWorkflowOpsReadinessRow[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Area</th>
            <th className="px-4 py-3 text-left font-medium">State</th>
            <th className="px-4 py-3 text-left font-medium">Signal</th>
            <th className="px-4 py-3 text-left font-medium">Next / boundary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area} className="border-b last:border-0">
              <td className="px-4 py-3 align-top font-medium">{row.area}</td>
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <StatusBadge tone={row.tone} label={row.status} />
                  <span className="text-xs text-muted-foreground">{row.state.replace(/_/g, " ")}</span>
                </div>
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.signal}
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">{row.nextAction}</span>
                <br />
                {row.boundary}
                {row.ownerRunCommand && (
                  <span className="mt-2 block break-all rounded-md bg-muted/60 px-2 py-1 font-mono text-xs">
                    {row.ownerRunCommand}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OwnerEvidenceConsoleTable({ rows }: { rows: OwnerEvidenceConsoleRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Check</th>
            <th className="px-4 py-3 text-left font-medium">Owner action</th>
            <th className="px-4 py-3 text-left font-medium">Command / evidence</th>
            <th className="px-4 py-3 text-left font-medium">Pass / fail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <span className="font-medium">{row.priority}. {row.surface}</span>
                  <StatusBadge tone={row.tone} label={row.status} />
                  <span className="text-xs text-muted-foreground">{row.linkedTask}</span>
                </div>
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.ownerAction}
                <br />
                <span className="text-xs">Blocker: {row.blocker}</span>
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="break-all font-mono text-xs">{row.command}</span>
                <br />
                <span className="break-all text-xs">{row.evidenceTarget}</span>
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">Pass:</span> {row.passSignal}
                <br />
                <span className="font-medium text-foreground">Fail:</span> {row.failSignal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LaunchReadinessHistoryTable({ rows }: { rows: readonly LaunchReadinessHistoryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Surface</th>
            <th className="px-4 py-3 text-left font-medium">Latest proof</th>
            <th className="px-4 py-3 text-left font-medium">Blocker / next</th>
            <th className="px-4 py-3 text-left font-medium">Pass / fail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.surface} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <span className="font-medium">{row.label}</span>
                  <StatusBadge tone={row.tone} label={row.status.replace(/_/g, " ")} />
                  <span className="text-xs text-muted-foreground">{row.linkedTask}</span>
                </div>
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="break-all font-mono text-xs">{row.latestProofPath}</span>
                <br />
                <span className="text-xs">
                  {row.latestGeneratedAt === "not_collected" ? "not collected" : formatDate(row.latestGeneratedAt)}
                  {" "}· {row.attemptCount} attempts
                </span>
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">
                  {row.blockers.length > 0 ? row.blockers[0] : "No blocker recorded"}
                </span>
                <br />
                {row.nextAction}
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">Pass:</span> {row.passSignal}
                <br />
                <span className="font-medium text-foreground">Fail:</span> {row.failSignal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function operatorActionTone(row: LaunchOperatorAction): AdminReadinessTone {
  if (row.state === "ready") return "good"
  if (row.state === "blocked" || row.state === "unavailable") return "blocked"
  return "warn"
}

function boolLabel(value: boolean) {
  return value ? "yes" : "no"
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function LaunchOperatorActionRegistryTable({ rows }: { rows: readonly LaunchOperatorAction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Action</th>
            <th className="px-4 py-3 text-left font-medium">Mode / state</th>
            <th className="px-4 py-3 text-left font-medium">Command / evidence</th>
            <th className="px-4 py-3 text-left font-medium">Boundary</th>
            <th className="px-4 py-3 text-left font-medium">Pass / fail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <span className="font-medium">
                    {row.priority}. {row.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.area} · {row.actor} · {row.linkedTasks.join(" / ")}
                  </span>
                  <StatusBadge tone={operatorActionTone(row)} label={row.state.replace(/_/g, " ")} />
                </div>
              </td>
              <td className="max-w-sm whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">{row.mode.replace(/_/g, " ")}</span>
                <br />
                Blocker: {row.blocker}
                <br />
                Next: {row.nextAction}
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="break-all font-mono text-xs">{row.command}</span>
                <br />
                <span className="break-all text-xs">{row.evidenceTarget}</span>
              </td>
              <td className="max-w-lg whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">Risk:</span> {row.risk}
                <br />
                DB write: {boolLabel(row.writesDatabase)} · External:{" "}
                {boolLabel(row.mutatesExternalProvider)} · Public: {boolLabel(row.exposesPublicOutput)}
                <br />
                Approval: {boolLabel(row.requiresHumanApproval)}
                <br />
                {row.noSecretBoundary}
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">Pass:</span> {row.passSignal}
                <br />
                <span className="font-medium text-foreground">Fail:</span> {row.failSignal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BackendOperationCatalogSurfaceTable({
  rows,
}: {
  rows: readonly BackendOperationCatalogSurfaceRow[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Operation</th>
            <th className="px-4 py-3 text-left font-medium">Kind / state</th>
            <th className="px-4 py-3 text-left font-medium">Auth / data boundary</th>
            <th className="px-4 py-3 text-left font-medium">Audit / retry</th>
            <th className="px-4 py-3 text-left font-medium">Verification / stop</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <span className="font-medium">{row.label}</span>
                  <span className="break-all text-xs text-muted-foreground">{row.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.module} · {row.ownerSurface} · {row.linkedTasks.join(" / ")}
                  </span>
                </div>
              </td>
              <td className="max-w-sm whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <div className="grid gap-2">
                  <StatusBadge tone={row.tone} label={row.currentState.replace(/_/g, " ")} />
                  <span>{row.kind.replace(/_/g, " ")}</span>
                  <span className="text-xs">Risk: {row.risk}</span>
                  <span className="text-xs">{row.safetySummary}</span>
                </div>
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">Auth:</span> {row.authBoundary}
                <br />
                <span className="font-medium text-foreground">Data:</span> {row.dataBoundary}
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">Audit:</span> {row.auditNeed}
                <br />
                <span className="font-medium text-foreground">Retry:</span> {row.idempotencyOrRetry}
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="break-all font-mono text-xs">{row.verificationCommand}</span>
                <br />
                <span className="font-medium text-foreground">Stop:</span> {row.stopCondition}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WorkProofEvidenceSurfaceTable({
  rows,
}: {
  rows: readonly WorkProofEvidenceSurfaceRow[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Evidence</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Packet path</th>
            <th className="px-4 py-3 text-left font-medium">Signal / next</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.family} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-xs text-muted-foreground">{row.family.replace(/-/g, " ")}</span>
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge tone={row.tone} label={row.status.replace(/_/g, " ")} />
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="break-all font-mono text-xs">{row.path}</span>
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">{row.signal}</span>
                <br />
                {row.nextAction}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OperatingSurfaceMaturityTable({ rows }: { rows: OperatingSurfaceMaturityRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Module</th>
            <th className="px-4 py-3 text-left font-medium">Mode / DB</th>
            <th className="px-4 py-3 text-left font-medium">Agent / API</th>
            <th className="px-4 py-3 text-left font-medium">Records / settings</th>
            <th className="px-4 py-3 text-left font-medium">Next</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.module} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <span className="font-medium">{row.module}</span>
                  <StatusBadge tone={row.tone} label={row.surfaceState.replace(/_/g, " ")} />
                </div>
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">{row.mode}</span>
                <br />
                {row.dbState}
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.agentWorkspace}
                <br />
                {row.apiCli}
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.recordsAudit}
                <br />
                {row.settingsBoundary}
              </td>
              <td className="max-w-sm whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">{row.nextTask}</span>
                <br />
                {row.risk}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScenarioJourneyTable({ rows }: { rows: ScenarioJourneyRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Scenario</th>
            <th className="px-4 py-3 text-left font-medium">Current experience</th>
            <th className="px-4 py-3 text-left font-medium">Missing experience</th>
            <th className="px-4 py-3 text-left font-medium">Next</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.scenario} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="grid gap-2">
                  <span className="font-medium">{row.scenario}</span>
                  <span className="text-xs text-muted-foreground">{row.actor}</span>
                  <StatusBadge tone={row.tone} label={row.state.replace(/_/g, " ")} />
                </div>
              </td>
              <td className="max-w-lg whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">{row.entrySurface}</span>
                <br />
                {row.currentExperience}
              </td>
              <td className="max-w-lg whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.missingExperience}
              </td>
              <td className="max-w-md whitespace-normal px-4 py-3 align-top text-muted-foreground">
                <span className="font-medium text-foreground">{row.linkedTask}</span>
                <br />
                {row.nextAction}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReadinessTable({
  rows,
  compact = false,
}: {
  rows: AdminReadinessRow[]
  compact?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Area</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Signal</th>
            {!compact && <th className="px-4 py-3 text-left font-medium">Next action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area} className="border-b last:border-0">
              <td className="px-4 py-3 align-top font-medium">{row.area}</td>
              <td className="px-4 py-3 align-top">
                <StatusBadge tone={row.tone} label={row.status} />
              </td>
              <td className="max-w-xl whitespace-normal px-4 py-3 align-top text-muted-foreground">
                {row.signal}
              </td>
              {!compact && (
                <td className="max-w-lg whitespace-normal px-4 py-3 align-top text-muted-foreground">
                  {row.nextAction}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const query = await searchParams
  const showFullDetails = firstQueryValue(query?.detail) === "all"
  const consoleState: AdminLaunchConsole = showFullDetails
    ? await getAdminLaunchConsole()
    : ((await getAdminLaunchOverview()) as AdminLaunchConsole)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppHeader title="管理" description="Launch readiness, agent loop status, system boundaries" />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
          <section className="rounded-lg border bg-background">
            <div className="flex flex-col gap-4 border-b px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <GaugeIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Operator attention</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Read-only launch console for auth, loop, module, data, and evidence readiness. Generated{" "}
                    {formatDate(consoleState.generatedAt)}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" render={<Link href="/auth/status" />}>
                  <ExternalLinkIcon className="size-3.5" />
                  Auth JSON
                </Button>
                <Button variant="outline" size="sm" render={<Link href="/settings" />}>
                  <ShieldCheckIcon className="size-3.5" />
                  Owner settings
                </Button>
                <Button
                  variant={showFullDetails ? "secondary" : "outline"}
                  size="sm"
                  render={<Link href={showFullDetails ? "/admin" : "/admin/detail"} />}
                >
                  <FileTextIcon className="size-3.5" />
                  {showFullDetails ? "Overview" : "Full details"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              {consoleState.summaryItems.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex min-h-24 items-start justify-between gap-3 rounded-lg border px-3 py-3",
                    item.tone === "blocked"
                      ? "border-red-200 bg-red-50"
                      : item.tone === "good"
                        ? "border-emerald-200 bg-emerald-50"
                        : "bg-muted/30"
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-semibold">{item.value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                  {toneIcon(item.tone)}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="rounded-lg border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <AlertTriangleIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Launch blockers</h2>
              </div>
              <ReadinessTable rows={consoleState.launchBlockers} />
            </div>

            <div className="rounded-lg border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <LockIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Loop state</h2>
              </div>
              <dl className="grid gap-0 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Automation</dt>
                  <dd className="min-w-0 truncate font-medium">{consoleState.loop.automationId}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Cadence</dt>
                  <dd className="font-medium">{consoleState.loop.cadence}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Current loop</dt>
                  <dd className="font-medium">{consoleState.loop.currentLoop}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Next loop</dt>
                  <dd className="font-medium">{consoleState.loop.nextLoop}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3 border-b px-4 py-3">
                  <dt className="text-muted-foreground">Next task</dt>
                  <dd className="font-medium">{consoleState.loop.nextRecommendedTask}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3 px-4 py-3">
                  <dt className="text-muted-foreground">Last task</dt>
                  <dd className="font-medium">{consoleState.loop.lastCompletedTask}</dd>
                </div>
              </dl>
            </div>
          </section>

          {showFullDetails && (
            <section className="rounded-lg border bg-background">
              <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Full launch console detail</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Protected detail route for deep operator evidence, readiness tables, and launch proof review.
                    Overview remains available at /admin.
                  </p>
                </div>
                <Badge variant="outline">read-only</Badge>
              </div>
            </section>
          )}

          {showFullDetails && <AdminDetailSectionIndex />}

          {!showFullDetails && (
            <section className="rounded-lg border bg-background">
              <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Overview mode</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Initial admin render is bounded for browser stability. Deep operator tables remain available
                    on the dedicated detail route without changing launch or write boundaries.
                  </p>
                </div>
                <Button variant="outline" size="sm" render={<Link href="/admin/detail" />}>
                  <FileTextIcon className="size-3.5" />
                  Full details
                </Button>
              </div>
            </section>
          )}

          {showFullDetails && (
            <>
          <section id="admin-detail-launch-actions" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Launch operator actions</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.launchOperatorActionRegistryContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.launchOperatorActionRegistryContract.summary.readyCount} ready
                </Badge>
                <Badge variant="outline">
                  {consoleState.launchOperatorActionRegistryContract.summary.ownerRunCount} owner-run
                </Badge>
                <Badge variant="outline">
                  {consoleState.launchOperatorActionRegistryContract.summary.approvalRequiredCount} approvals
                </Badge>
              </div>
            </div>
            <LaunchOperatorActionRegistryTable rows={consoleState.launchOperatorActionRegistryContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Primary blocker</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.launchOperatorActionRegistryContract.summary.primaryBlocker}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next task</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.launchOperatorActionRegistryContract.summary.nextTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.launchOperatorActionRegistryContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-backend-catalog" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Backend operation catalog</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.backendOperationCatalogSurfaceContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.backendOperationCatalogSurfaceContract.summary.operationCount} operations
                </Badge>
                <Badge variant="outline">
                  {consoleState.backendOperationCatalogSurfaceContract.summary.readyLikeCount} ready-like
                </Badge>
                <Badge variant="outline">
                  {consoleState.backendOperationCatalogSurfaceContract.summary.blockedCount} blocked
                </Badge>
              </div>
            </div>
            <BackendOperationCatalogSurfaceTable rows={consoleState.backendOperationCatalogSurfaceContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Page understanding gate</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Score {consoleState.backendOperationCatalogSurfaceContract.pageRequirementUnderstanding.score}/100,{" "}
                  {consoleState.backendOperationCatalogSurfaceContract.pageRequirementUnderstanding.level};{" "}
                  {consoleState.backendOperationCatalogSurfaceContract.pageRequirementUnderstanding.completedResearchRounds}/
                  {consoleState.backendOperationCatalogSurfaceContract.pageRequirementUnderstanding.requiredResearchRounds} research rounds complete.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Owner actions</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.backendOperationCatalogSurfaceContract.ownerActions.join(" / ")}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.backendOperationCatalogSurfaceContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-owner-evidence" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Owner evidence console</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.ownerEvidenceConsoleContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.ownerEvidenceConsoleContract.summary.rowCount} checks
                </Badge>
                <Badge variant="outline">
                  {consoleState.ownerEvidenceConsoleContract.summary.blockedCount} blocked
                </Badge>
              </div>
            </div>
            <OwnerEvidenceConsoleTable rows={consoleState.ownerEvidenceConsoleContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Primary owner action</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.ownerEvidenceConsoleContract.summary.primaryOwnerAction}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next task</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.ownerEvidenceConsoleContract.summary.nextTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.ownerEvidenceConsoleContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-launch-history" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Launch readiness history</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.launchReadinessHistoryContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.launchReadinessHistoryContract.summary.readyCount} ready
                </Badge>
                <Badge variant="outline">
                  {consoleState.launchReadinessHistoryContract.summary.blockedCount} blocked
                </Badge>
                <Badge variant="outline">
                  {consoleState.launchReadinessHistoryContract.summary.latestProofCount} refs
                </Badge>
              </div>
            </div>
            <LaunchReadinessHistoryTable rows={consoleState.launchReadinessHistoryContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Primary blocker</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.launchReadinessHistoryContract.summary.primaryBlocker}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next task</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.launchReadinessHistoryContract.summary.nextTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.launchReadinessHistoryContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-work-proof" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Work proof evidence</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.workProofEvidenceSurfaceContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.workProofEvidenceSurfaceContract.summary.freshness}
                </Badge>
                <Badge variant="outline">
                  WORK-009 {consoleState.workProofEvidenceSurfaceContract.summary.canRunWork009 ? "ready" : "blocked"}
                </Badge>
                <Badge variant="outline">
                  source {consoleState.workProofEvidenceSurfaceContract.summary.sourceStaticReady ? "ready" : "review"}
                </Badge>
              </div>
            </div>
            <WorkProofEvidenceSurfaceTable rows={consoleState.workProofEvidenceSurfaceContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-4">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Latest packet</p>
                <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                  {consoleState.workProofEvidenceSurfaceContract.summary.latestOverallPacketPath}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next owner action</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.workProofEvidenceSurfaceContract.summary.nextOwnerAction}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Page understanding gate</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Score {consoleState.workProofEvidenceSurfaceContract.pageRequirementUnderstanding.score}/100,{" "}
                  {consoleState.workProofEvidenceSurfaceContract.pageRequirementUnderstanding.level};{" "}
                  {consoleState.workProofEvidenceSurfaceContract.pageRequirementUnderstanding.completedResearchRounds}/
                  {consoleState.workProofEvidenceSurfaceContract.pageRequirementUnderstanding.requiredResearchRounds} rounds complete.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-claim boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  WORK-009 claimed: {consoleState.workProofEvidenceSurfaceContract.summary.work009Claimed ? "yes" : "no"}; launch upgrade claimed:{" "}
                  {consoleState.workProofEvidenceSurfaceContract.summary.launchLevelUpgradeClaimed ? "yes" : "no"}.
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-scenario-maturity" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <GitBranchIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Scenario journey maturity</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.scenarioJourneyContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.scenarioJourneyContract.summary.partialCount} partial
                </Badge>
                <Badge variant="outline">
                  {consoleState.scenarioJourneyContract.summary.blockedCount} blocked
                </Badge>
                <Badge variant="outline">
                  Next {consoleState.scenarioJourneyContract.summary.nextTask}
                </Badge>
              </div>
            </div>
            <ScenarioJourneyTable rows={consoleState.scenarioJourneyContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-2">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Primary experience gap</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.scenarioJourneyContract.summary.primaryExperienceGap}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Source basis</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.scenarioJourneyContract.source.situationPrd} /{" "}
                  {consoleState.scenarioJourneyContract.source.operatingSurfaceResearch}
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-system-readiness" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">System readiness</h2>
            </div>
            <ReadinessTable rows={consoleState.moduleRows} />
          </section>

          <section id="admin-detail-surface-maturity" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <GaugeIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Operating surface maturity</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.operatingSurfaceMaturityContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.operatingSurfaceMaturityContract.summary.moduleCount} modules
                </Badge>
                <Badge variant="outline">
                  {consoleState.operatingSurfaceMaturityContract.summary.apiCliReadyCount} API/CLI ready
                </Badge>
              </div>
            </div>
            <OperatingSurfaceMaturityTable rows={consoleState.operatingSurfaceMaturityContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Maturity mix</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.operatingSurfaceMaturityContract.summary.dbBackedCount} DB-backed,{" "}
                  {consoleState.operatingSurfaceMaturityContract.summary.formalReadinessCount} formal-readiness,{" "}
                  {consoleState.operatingSurfaceMaturityContract.summary.mockOrShellCount} mock/shell surfaces.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next executable task</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.operatingSurfaceMaturityContract.summary.nextTask}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.operatingSurfaceMaturityContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-ai-input-readiness" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <GitBranchIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">AI Input source workflow readiness</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.aiInputSourceWorkflowOpsReadinessContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.completeCount} complete
                </Badge>
                <Badge variant="outline">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.dryRunOnlyCount} dry-run
                </Badge>
                <Badge variant="outline">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.blockedCount} blocked
                </Badge>
                <Badge variant="outline">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.humanApprovalRequiredCount} approvals
                </Badge>
                <Badge variant="outline">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.localProofPacketStatus}
                </Badge>
                <Badge variant="outline">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetHandoffStatus}
                </Badge>
              </div>
            </div>
            <AIInputSourceWorkflowOpsReadinessTable
              rows={consoleState.aiInputSourceWorkflowOpsReadinessContract.rows}
            />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-5">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Required objects</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.requiredObjects.join(" / ")}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Proof status</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetStatus}. Next{" "}
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.nextTask}.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Proof handoff</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetHandoffStatus};{" "}
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetHandoffMissingCount} missing.
                </p>
                <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetHandoffEvidenceTarget}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Local proof packet</p>
                <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.latestLocalProofPacketPath}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.summary.localProofCheckerStatus}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.aiInputSourceWorkflowOpsReadinessContract.prohibitedExposure
                    .slice(0, 5)
                    .join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-owner-auth-boundary" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <KeyRoundIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Owner/demo auth boundary</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.ownerAuthBoundaryContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.ownerAuthBoundaryContract.proof.boundaryStatus}
                </Badge>
                <Badge
                  variant={consoleState.ownerAuthBoundaryContract.proof.canRunAuth005 ? "secondary" : "outline"}
                >
                  AUTH-005 {consoleState.ownerAuthBoundaryContract.proof.canRunAuth005 ? "ready" : "blocked"}
                </Badge>
              </div>
            </div>
            <ReadinessTable rows={consoleState.ownerAuthBoundaryContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Proof source</p>
                <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                  {consoleState.ownerAuthBoundaryContract.source.latestProofPath}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Command</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.ownerAuthBoundaryContract.source.command}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">No-secret boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.ownerAuthBoundaryContract.prohibitedExposure.slice(0, 5).join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-agent-protocol" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <GitBranchIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Agent protocol readiness</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.agentProtocolContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.agentProtocolContract.status.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline">
                  {consoleState.agentProtocolContract.summary.manifestCount} manifests
                </Badge>
              </div>
            </div>
            <AgentProtocolReadinessTable rows={consoleState.agentProtocolContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Protected visibility</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Visible on {consoleState.agentProtocolContract.visibility.surfaces.join(" and ")} only.
                  Public directory: {consoleState.agentProtocolContract.visibility.publicDirectory ? "yes" : "no"}.
                  Runtime endpoint: {consoleState.agentProtocolContract.visibility.publicEndpointCreated ? "yes" : "no"}.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Missing registration fields</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.agentProtocolContract.missingRegistrationReadinessFields
                    .slice(0, 4)
                    .map((field) => `${field.field} (${field.agentCount})`)
                    .join(" / ")}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next task split</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.agentProtocolContract.nextTaskCandidates.join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section
            id="admin-detail-env-evidence"
            className="scroll-mt-24 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div className="rounded-lg border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <LockIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Environment boundary</h2>
              </div>
              <ReadinessTable rows={consoleState.environmentRows} compact />
            </div>

            <div className="rounded-lg border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <FileTextIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Recent loop evidence</h2>
              </div>
              <div className="divide-y">
                {consoleState.recentEvidence.length > 0 ? (
                  consoleState.recentEvidence.map((report) => (
                    <div key={report.path} className="grid gap-1 px-4 py-3 text-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">{report.title}</p>
                        <Badge variant="outline">{formatDate(report.updatedAt)}</Badge>
                      </div>
                      <p className="break-all text-xs text-muted-foreground">{report.path}</p>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-sm text-muted-foreground">No evidence reports found.</p>
                )}
              </div>
            </div>
          </section>

          <section id="admin-detail-client-portal" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <KeyRoundIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Client Portal launch hardening</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.clientPortalContract.id}</Badge>
                <Badge variant="outline">
                  {consoleState.clientPortalContract.currentGate.behavior.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline">
                  {consoleState.clientPortalContract.currentGate.env}
                </Badge>
              </div>
            </div>
            <ClientPortalReadinessTable rows={consoleState.clientPortalContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Schema readiness</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Current token storage is{" "}
                  {consoleState.clientPortalContract.schemaReadiness.currentTokenStorage.replace(/_/g, " ")}.
                  Proposed storage is{" "}
                  {consoleState.clientPortalContract.schemaReadiness.proposedTokenStorage.replace(/_/g, " ")}.
                  Status:{" "}
                  {consoleState.clientPortalContract.schemaReadiness.implementationStatus.replace(/_/g, " ")}.
                  Storage policy is{" "}
                  {consoleState.clientPortalContract.storageReadiness.currentPublicDto.replace(/_/g, " ")}; status:{" "}
                  {consoleState.clientPortalContract.storageReadiness.implementationStatus.replace(/_/g, " ")}.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next task split</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.clientPortalContract.nextTaskCandidates.join(" / ")}
                </p>
              </div>
            </div>
          </section>

          <section id="admin-detail-audit-contract" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Read-only audit BFF contract</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{consoleState.auditContract.id}</Badge>
                <Badge variant="outline">{consoleState.auditContract.status.replace(/_/g, " ")}</Badge>
                <Badge variant="outline">{consoleState.auditContract.evidenceSource.recentCount} reports</Badge>
              </div>
            </div>
            <AuditContractTable rows={consoleState.auditContract.rows} />
            <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-2">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Persistence state</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.auditContract.persistence.current.replace(/_/g, " ")}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Future gate</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {consoleState.auditContract.persistence.futureGate}
                </p>
              </div>
            </div>
          </section>

            </>
          )}

          <section id="admin-detail-write-boundary" className="scroll-mt-24 rounded-lg border bg-background">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <LockIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Admin write boundary</h2>
            </div>
            <div className="grid gap-3 p-4 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Allowed now</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Inspect launch blockers, auth readiness, environment presence, loop state, and evidence reports.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Not implemented here</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  No admin mutations, production env editing, user management, connector sync, deployment writes, or DB migrations.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-3">
                <p className="font-medium">Next backend step</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Define an audit/readiness BFF contract before persisting operator checks or launch review records.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
