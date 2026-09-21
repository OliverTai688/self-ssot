"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  BotIcon,
  CheckCircle2Icon,
  FileClockIcon,
  FolderIcon,
  ImageIcon,
  LockIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { DetailDrawer } from "@/components/owneros/detail-drawer"
import { InsightRail } from "@/components/owneros/insight-rail"
import { ProjectCard } from "@/components/work/project/project-card"
import { ProjectFocusCard } from "@/components/work/project/project-focus-card"
import { ProjectFilterBar } from "@/components/work/project/project-filter-bar"
import { AddProjectDialog } from "@/components/work/project/add-project-dialog"
import {
  acceptTeamWorkspaceInvitation,
  createTeamWorkspaceInvitation,
  revokeTeamWorkspaceInvitation,
} from "@/app/actions/team-workspace-invitation"
import {
  CreateTeamWorkspaceDialog,
  TeamWorkspaceCreationReadinessNotice,
} from "@/components/work/workspace/create-team-workspace-dialog"
import {
  TeamCollaborationSheet,
  WorkspaceInvitationAcceptanceCard,
  type InvitationActionState,
  type InvitationFormAction,
  type TeamCollaborationPanelViewModel,
} from "@/components/work/workspace/team-collaboration-sheet"
import { Badge } from "@/components/ui/badge"
import { useProductLanguage } from "@/lib/context/product-language-context"
import { cn } from "@/lib/utils"
import type { ProjectStatus } from "@/types/work"
import type { WorkspaceProjectIndexDto } from "@/types/workspace-project-index"
import {
  INITIAL_ACCEPT_TEAM_WORKSPACE_INVITATION_ACTION_STATE,
  INITIAL_CREATE_TEAM_WORKSPACE_INVITATION_ACTION_STATE,
  INITIAL_REVOKE_TEAM_WORKSPACE_INVITATION_ACTION_STATE,
  type AcceptTeamWorkspaceInvitationActionState,
  type CreateTeamWorkspaceInvitationActionState,
  type RevokeTeamWorkspaceInvitationActionState,
  type TeamWorkspaceInvitationFieldErrors,
} from "@/types/team-workspace-invitation"
import { FileLibraryPage } from "@/components/ai/file-library/file-library-page"
import { MediaLibraryPage } from "@/components/ai/media-library/media-library-page"

type StatusFilter = ProjectStatus | "all"
type SortKey = "updatedAt" | "dueAt" | "name"
type WorkView = "projects" | "library" | "agent" | "records" | "settings"

type ProjectIndexItem = WorkspaceProjectIndexDto["projects"][number]

function sortProjects(projects: ProjectIndexItem[], key: SortKey) {
  return [...projects].sort((a, b) => {
    if (key === "name") return a.project.name.localeCompare(b.project.name, "zh-TW")
    if (key === "dueAt") {
      if (!a.project.dueAt && !b.project.dueAt) return 0
      if (!a.project.dueAt) return 1
      if (!b.project.dueAt) return -1
      return new Date(a.project.dueAt).getTime() - new Date(b.project.dueAt).getTime()
    }
    return new Date(b.project.updatedAt).getTime() - new Date(a.project.updatedAt).getTime()
  })
}

type WorkCopy = ReturnType<typeof useProductLanguage>["copy"]["work"]

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}

function formatShortDate(value: string | null | undefined, locale: string, emptyLabel: string) {
  if (!value) return emptyLabel
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return emptyLabel
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date)
}

function getWorkspaceRoleLabel(workCopy: WorkCopy, role: string) {
  return workCopy.roles[role as keyof WorkCopy["roles"]] ?? role
}

function toUiFieldErrors(fieldErrors?: TeamWorkspaceInvitationFieldErrors) {
  if (!fieldErrors) return undefined
  return {
    email: fieldErrors.email,
    workspaceRole: fieldErrors.workspaceRole,
    projectId: fieldErrors.projectId,
    projectRole: fieldErrors.projectRole,
    token: fieldErrors.token,
  }
}

function toUiFailureState(
  state:
    | Exclude<CreateTeamWorkspaceInvitationActionState, { status: "success" }>
    | Exclude<RevokeTeamWorkspaceInvitationActionState, { status: "success" }>
    | Exclude<AcceptTeamWorkspaceInvitationActionState, { status: "success" }>,
): InvitationActionState {
  return {
    status: state.status,
    code: state.code,
    message: state.message || null,
    fieldErrors: toUiFieldErrors(state.fieldErrors),
  }
}

function toUiCreateState(
  state: CreateTeamWorkspaceInvitationActionState,
  workspaceName: string,
): InvitationActionState {
  if (state.status !== "success") return toUiFailureState(state)

  return {
    status: "success",
    code: state.code,
    message: state.message,
    handoff: state.acceptanceUrl
      ? {
          invitationId: state.invitation.id,
          recipientEmail: state.invitation.normalizedEmail,
          workspaceName,
          workspaceRole: state.invitation.workspaceRole,
          project: state.invitation.project
            ? {
                name: state.invitation.project.name,
                role: state.invitation.project.role,
              }
            : null,
          expiresAtLabel: new Intl.DateTimeFormat("zh-TW", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(state.invitation.expiresAt)),
          acceptanceUrl: state.acceptanceUrl,
          deliveryMode: "MANUAL_EMAIL_LINK",
          deliveryStatus: "AWAITING_MANUAL_SEND",
        }
      : undefined,
  }
}

function toUiRevokeState(
  state: RevokeTeamWorkspaceInvitationActionState,
): InvitationActionState {
  if (state.status !== "success") return toUiFailureState(state)
  return {
    status: "success",
    code: state.code,
    message: state.message,
  }
}

function toUiAcceptState(
  state: AcceptTeamWorkspaceInvitationActionState,
  joinedTeamName: string,
): InvitationActionState {
  if (state.status !== "success") return toUiFailureState(state)
  return {
    status: "success",
    code: state.code,
    message: state.message,
    workspace: {
      id: state.workspaceId,
      name: joinedTeamName,
      href: state.workspaceHref,
    },
  }
}

function WorkspaceNotice({
  notice,
  labels,
}: Pick<WorkspaceProjectIndexDto, "notice"> & {
  labels: WorkCopy["workspace"]["notice"]
}) {
  if (!notice) return null

  const message = labels[notice]

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/50 bg-amber-50/50 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{message.title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700/80 dark:text-amber-400/80">{message.body}</p>
      </div>
    </div>
  )
}

// ─── Stub views ───────────────────────────────────────────────────────────────

/** RES-016 §6.1/ARC-012 §5A: read-only, filtered to assets classified to `work`. */
function LibraryModuleView() {
  const { copy } = useProductLanguage()
  const workCopy = copy.work
  const [kind, setKind] = React.useState<"file" | "media">("file")
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        <button
          type="button"
          onClick={() => setKind("file")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            kind === "file" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FolderIcon className="size-3.5" />
          {workCopy.library.files}
        </button>
        <button
          type="button"
          onClick={() => setKind("media")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            kind === "media" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ImageIcon className="size-3.5" />
          {workCopy.library.media}
        </button>
      </div>
      {kind === "file" ? (
        <FileLibraryPage
          referencedTitles={new Set()}
          onReferenceAsset={() => {}}
          mode="module_readonly"
          filterModuleKey="work"
        />
      ) : (
        <MediaLibraryPage
          referencedTitles={new Set()}
          onReferenceAsset={() => {}}
          mode="module_readonly"
          filterModuleKey="work"
        />
      )}
    </div>
  )
}

function AgentModuleView() {
  const { copy } = useProductLanguage()
  const workCopy = copy.work

  return (
    <div
      data-owneros-slot="agent-proposal-pane proposal-review"
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]"
    >
      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold">{workCopy.agent.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {workCopy.agent.description}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">{workCopy.agent.badge}</Badge>
        </div>

        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {workCopy.agent.cards.map(({ title, body, state }) => (
            <div key={title} className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
              <span className="self-start rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
                {state}
              </span>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-lg border border-border bg-muted/20 px-4 py-4">
        <p className="text-xs font-semibold">{workCopy.agent.boundaryTitle}</p>
        <dl className="mt-3 space-y-2 text-[11px]">
          {workCopy.agent.boundaryRows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  )
}

function RecordsModuleView() {
  const { copy } = useProductLanguage()
  const workCopy = copy.work

  return (
    <div data-owneros-slot="records-audit work-audit" className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 w-fit">
        {workCopy.records.tabs.map((label, i) => (
          <button
            key={i}
            disabled
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              i === 0 ? "bg-background text-foreground shadow-sm" : "text-muted-foreground/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {workCopy.records.rows.map(([title, source, detail]) => (
          <div key={title} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
            </div>
            <span className="text-[11px] text-muted-foreground">{source}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkSettingsModuleView({
  selectedWorkspace,
  source,
  canUseLegacyPersonalWrites,
}: {
  selectedWorkspace: WorkspaceProjectIndexDto["selectedWorkspace"]
  source: WorkspaceProjectIndexDto["source"]
  canUseLegacyPersonalWrites: boolean
}) {
  const { copy } = useProductLanguage()
  const workCopy = copy.work

  return (
    <div
      data-owneros-slot="settings-boundaries work-boundary"
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]"
    >
      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <p className="text-xs font-semibold">{workCopy.settings.title}</p>
        <div className="mt-3 divide-y divide-border rounded-lg border border-border">
          {[
            [
              workCopy.settings.labels.workspace,
              selectedWorkspace
                ? `${selectedWorkspace.name} · ${getWorkspaceRoleLabel(workCopy, selectedWorkspace.role)}`
                : workCopy.settings.unavailable,
            ],
            [
              workCopy.settings.labels.projectWrites,
              canUseLegacyPersonalWrites
                ? workCopy.settings.personalCreateEnabled
                : workCopy.settings.teamWritesGated,
            ],
            [workCopy.settings.labels.source, source],
            [workCopy.settings.labels.clientOutput, workCopy.settings.noPublicOutput],
            [workCopy.settings.labels.companyPublication, workCopy.settings.noCompanyPublication],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <span className="text-[11px] text-muted-foreground">{label}</span>
              <span className="min-w-0 text-xs font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </section>
      <aside className="rounded-lg border border-border bg-muted/20 px-4 py-4">
        <p className="text-xs font-semibold">{workCopy.settings.manualOps}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {workCopy.settings.manualOpsBody}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {workCopy.operatingDesk.proofSteps.map((step) => (
            <Badge key={step} variant="outline" className="text-[10px]">
              {step}
            </Badge>
          ))}
        </div>
      </aside>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WorkClient({
  initialIndex,
  initialTeamCollaboration,
  initialInvitationToken,
}: {
  initialIndex: WorkspaceProjectIndexDto
  initialTeamCollaboration: TeamCollaborationPanelViewModel | null
  initialInvitationToken: string | null
}) {
  const { locale, copy } = useProductLanguage()
  const workCopy = copy.work
  const [workView, setWorkView] = React.useState<WorkView>("projects")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [sortKey, setSortKey] = React.useState<SortKey>("updatedAt")
  const initialProjects = initialIndex.projects.map((item) => item.project)

  const riskCount = initialProjects.filter(
    (p) => p.status === "active" && p.health === "risk"
  ).length

  const overdueCount = initialProjects.filter(
    (p) => p.dueAt && new Date(p.dueAt) < new Date() && p.status !== "archived"
  ).length

  const focusProjects = initialIndex.projects
    .filter(({ project }) => project.status === "active" && (project.health === "risk" || project.health === "watch"))
    .sort((a, b) => {
      if (a.project.health === "risk" && b.project.health !== "risk") return -1
      if (a.project.health !== "risk" && b.project.health === "risk") return 1
      return 0
    })
    .slice(0, 2)

  const filtered = initialIndex.projects.filter(
    ({ project }) => statusFilter === "all" || project.status === statusFilter
  )
  const sorted = sortProjects(filtered, sortKey)
  const selectedWorkspace = initialIndex.selectedWorkspace
  const hasWorkspaceAccess = initialIndex.state === "ready" || initialIndex.state === "empty"
  const isUnavailable = initialIndex.state === "unavailable"
  const isForbidden = initialIndex.state === "not_found_or_forbidden"
  const activeProjectCount = initialProjects.filter((project) => project.status === "active").length
  const clientSharedCount = initialProjects.filter((project) => project.visibility === "client_shared").length
  const workspaceModeLabel = selectedWorkspace
    ? selectedWorkspace.type === "TEAM"
      ? `${selectedWorkspace.name} · ${getWorkspaceRoleLabel(workCopy, selectedWorkspace.role)}`
      : workCopy.operatingDesk.personalWorkspaceOwner
    : workCopy.operatingDesk.workspaceUnavailable
  const moduleViews: { key: WorkView; icon: React.ElementType; label: string; available: boolean }[] = [
    { key: "projects", icon: BriefcaseIcon, label: workCopy.moduleViews.projects, available: true },
    { key: "library", icon: FolderIcon, label: workCopy.moduleViews.library, available: true },
    { key: "agent", icon: BotIcon, label: workCopy.moduleViews.agent, available: true },
    { key: "records", icon: FileClockIcon, label: workCopy.moduleViews.records, available: true },
    { key: "settings", icon: SettingsIcon, label: workCopy.moduleViews.settings, available: true },
  ]
  const inviteAction = React.useCallback<InvitationFormAction>(
    async (_previousState, formData) => {
      const state = await createTeamWorkspaceInvitation(
        INITIAL_CREATE_TEAM_WORKSPACE_INVITATION_ACTION_STATE,
        formData,
      )
      return toUiCreateState(
        state,
        initialTeamCollaboration?.workspaceName ?? workCopy.workspace.fallbackTeamName,
      )
    },
    [initialTeamCollaboration?.workspaceName, workCopy.workspace.fallbackTeamName],
  )
  const revokeAction = React.useCallback<InvitationFormAction>(
    async (_previousState, formData) => {
      const state = await revokeTeamWorkspaceInvitation(
        INITIAL_REVOKE_TEAM_WORKSPACE_INVITATION_ACTION_STATE,
        formData,
      )
      return toUiRevokeState(state)
    },
    [],
  )
  const acceptAction = React.useCallback<InvitationFormAction>(
    async (_previousState, formData) => {
      const state = await acceptTeamWorkspaceInvitation(
        INITIAL_ACCEPT_TEAM_WORKSPACE_INVITATION_ACTION_STATE,
        formData,
      )
      return toUiAcceptState(state, workCopy.workspace.joinedTeamName)
    },
    [workCopy.workspace.joinedTeamName],
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader
        title={workCopy.title}
        description={workCopy.description}
      />

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <InsightRail
              items={[
                { label: workCopy.moduleViews.projects, value: activeProjectCount },
                { label: workCopy.readiness.labels.health, value: riskCount, tone: riskCount > 0 ? "warn" : "default" },
                { label: "客戶共享", value: clientSharedCount },
              ]}
              className="flex-1"
            />
            <div className="flex shrink-0 items-center gap-2">
              <DetailDrawer title={workCopy.boundary.clientBoundary}>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold">{workCopy.boundary.clientBoundary}</p>
                    <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex gap-2">
                        <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                        {workCopy.boundary.noPublicOutput}
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                        {workCopy.boundary.noExternalAgent}
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                        {workCopy.boundary.teamWritesGated}
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{workCopy.boundary.aiProposal}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {workCopy.boundary.aiProposalBody}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">{workspaceModeLabel}</p>
                    <p className="mt-1">{workCopy.operatingDesk.manualProof}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {workCopy.operatingDesk.proofSteps.map((step) => (
                        <Badge key={step} variant="outline" className="text-[10px]">
                          {step}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </DetailDrawer>
              {initialIndex.canUseLegacyPersonalWrites ? (
                <AddProjectDialog />
              ) : (
                <span className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                  {workCopy.commands.createGated}
                </span>
              )}
            </div>
          </div>

          {/* Module-level attention strip */}
          {(riskCount > 0 || overdueCount > 0) && workView === "projects" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 px-4 py-2.5">
              <AlertTriangleIcon className="size-3.5 text-amber-600 shrink-0" />
              <span className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                {[
                  riskCount > 0 &&
                    formatCopy(workCopy.attention.highRiskTemplate, { count: riskCount }),
                  overdueCount > 0 &&
                    formatCopy(workCopy.attention.overdueTemplate, { count: overdueCount }),
                ].filter(Boolean).join(" · ")} {workCopy.attention.needsAttention}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 border-b border-border pb-0 -mb-1">
            {moduleViews.map(({ key, icon: Icon, label, available }) => (
              <button
                key={key}
                onClick={() => available && setWorkView(key)}
                disabled={!available}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                  workView === key
                    ? "border-foreground text-foreground font-medium"
                    : available
                      ? "border-transparent text-muted-foreground hover:text-foreground"
                      : "border-transparent text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                <Icon className="size-3.5" />
                {label}
                {!available && (
                  <span className="text-[10px] text-muted-foreground/40 ml-0.5">
                    {workCopy.moduleViews.soon}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* View content */}
          {workView === "library" && <LibraryModuleView />}
          {workView === "agent" && <AgentModuleView />}
          {workView === "records" && <RecordsModuleView />}
          {workView === "settings" && (
            <WorkSettingsModuleView
              selectedWorkspace={selectedWorkspace}
              source={initialIndex.source}
              canUseLegacyPersonalWrites={initialIndex.canUseLegacyPersonalWrites}
            />
          )}

          {workView === "projects" && (
            <div className="flex flex-col gap-8">
              {initialInvitationToken && (
                <WorkspaceInvitationAcceptanceCard
                  token={initialInvitationToken}
                  action={acceptAction}
                />
              )}

              {/* Work-scoped workspace selection. Authorization is resolved by the server loader. */}
              <section className="flex flex-col gap-3" aria-labelledby="workspace-heading">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id="workspace-heading" className="text-sm font-semibold">
                      {workCopy.workspace.title}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {workCopy.workspace.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {selectedWorkspace && (
                      <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                        <LockIcon className="size-2.5" />
                        {workCopy.workspace.readonlyIndex}
                      </Badge>
                    )}
                    {selectedWorkspace?.type === "PERSONAL" && (
                      <CreateTeamWorkspaceDialog
                        readiness={initialIndex.teamWorkspaceCreation}
                      />
                    )}
                    {selectedWorkspace?.type === "TEAM" && initialTeamCollaboration && (
                      <TeamCollaborationSheet
                        model={initialTeamCollaboration}
                        inviteAction={inviteAction}
                        revokeAction={revokeAction}
                      />
                    )}
                  </div>
                </div>

                {initialIndex.workspaces.length > 0 ? (
                  <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={workCopy.workspace.navAriaLabel}>
                    {initialIndex.workspaces.map((workspace) => (
                      <Link
                        key={workspace.id}
                        href={{ pathname: "/work", query: { workspace: workspace.id } }}
                        aria-current={workspace.isSelected ? "page" : undefined}
                        className={cn(
                          "flex min-w-36 shrink-0 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                          workspace.isSelected
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-foreground hover:border-ring/50 hover:bg-muted/40",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-xs font-medium">
                            {workspace.type === "PERSONAL" ? (
                              <BriefcaseIcon className="size-3.5 shrink-0" />
                            ) : (
                              <UsersIcon className="size-3.5 shrink-0" />
                            )}
                            <span className="truncate">
                              {workspace.type === "PERSONAL" ? workCopy.workspace.personal : workspace.name}
                            </span>
                          </span>
                          <span className={cn(
                            "mt-1 block text-[10px]",
                            workspace.isSelected ? "text-background/70" : "text-muted-foreground",
                          )}>
                            {workspace.type === "TEAM" && `${workCopy.workspace.teamPrefix} · `}
                            {getWorkspaceRoleLabel(workCopy, workspace.role)} ·{" "}
                            {formatCopy(workCopy.workspace.projectCountTemplate, {
                              count: workspace.projectCount,
                            })}
                          </span>
                        </span>
                        {workspace.type === "TEAM" && (
                          <span className={cn(
                            "shrink-0 text-[10px] tabular-nums",
                            workspace.isSelected ? "text-background/70" : "text-muted-foreground",
                          )}>
                            {formatCopy(workCopy.workspace.memberCountTemplate, {
                              count: workspace.memberCount,
                            })}
                          </span>
                        )}
                      </Link>
                    ))}
                  </nav>
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-4 py-5">
                    <p className="text-xs font-medium">{workCopy.workspace.emptyTitle}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {workCopy.workspace.emptyBody}
                    </p>
                  </div>
                )}

                <WorkspaceNotice
                  notice={initialIndex.notice}
                  labels={workCopy.workspace.notice}
                />

                {selectedWorkspace?.type === "PERSONAL" && (
                  <TeamWorkspaceCreationReadinessNotice
                    readiness={initialIndex.teamWorkspaceCreation}
                    legacyCompatibility={initialIndex.source === "legacy_personal_compatibility"}
                  />
                )}

                {selectedWorkspace && hasWorkspaceAccess && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/20 px-3.5 py-2.5 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {selectedWorkspace.type === "PERSONAL"
                        ? workCopy.workspace.personalWorkspace
                        : selectedWorkspace.name}
                    </span>
                    <span>{getWorkspaceRoleLabel(workCopy, selectedWorkspace.role)}</span>
                    {selectedWorkspace.type === "TEAM" && (
                      <span>
                        {formatCopy(workCopy.workspace.memberSummaryTemplate, {
                          count: selectedWorkspace.memberCount,
                        })}
                      </span>
                    )}
                    <span>
                      {formatCopy(workCopy.workspace.visibleProjectCountTemplate, {
                        count: selectedWorkspace.projectCount,
                      })}
                    </span>
                    <span className="ml-auto">
                      {selectedWorkspace.type === "TEAM"
                        ? workCopy.workspace.teamSharedProjects
                        : workCopy.workspace.privateProjects}
                    </span>
                  </div>
                )}
              </section>

              {(isUnavailable || isForbidden) && (
                <section className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
                  <LockIcon className="mx-auto size-6 text-muted-foreground/30" />
                  <p className="mt-3 text-sm font-medium">
                    {isForbidden
                      ? workCopy.workspace.forbiddenTitle
                      : workCopy.workspace.unavailableTitle}
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                    {isForbidden
                      ? workCopy.workspace.forbiddenBody
                      : workCopy.workspace.unavailableBody}
                  </p>
                </section>
              )}

              {/* Today's focus */}
              {hasWorkspaceAccess && focusProjects.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {workCopy.projectList.focusTitle}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {focusProjects.map((item) => (
                      <ProjectFocusCard
                        key={item.project.id}
                        project={item.project}
                        detailHref={item.detailHref}
                        projectRole={item.projectRole}
                        accessSource={item.accessSource}
                        isReadOnly={item.workspaceType === "TEAM" && item.isReadOnly}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Project list */}
              {hasWorkspaceAccess && <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground">
                      {workCopy.projectList.allTitle}
                    </h2>
                    {selectedWorkspace?.type === "TEAM" && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {workCopy.projectList.teamReadOnlyHint}
                      </p>
                    )}
                  </div>
                  {initialIndex.canUseLegacyPersonalWrites && <AddProjectDialog />}
                </div>

                <ProjectFilterBar
                  statusFilter={statusFilter}
                  sortKey={sortKey}
                  onStatusChange={setStatusFilter}
                  onSortChange={setSortKey}
                />

                {sorted.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {initialIndex.projects.length === 0
                        ? selectedWorkspace?.type === "TEAM"
                          ? workCopy.projectList.emptyTeam
                          : workCopy.projectList.emptyPersonal
                        : workCopy.projectList.emptyFiltered}
                    </p>
                    {initialIndex.projects.length === 0 && selectedWorkspace?.type === "TEAM" && (
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {workCopy.projectList.teamCreationPending}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sorted.map((item) => (
                      <ProjectCard
                        key={item.project.id}
                        project={item.project}
                        detailHref={item.detailHref}
                        projectRole={item.projectRole}
                        accessSource={item.accessSource}
                        isReadOnly={item.workspaceType === "TEAM" && item.isReadOnly}
                      />
                    ))}
                  </div>
                )}
              </section>}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
