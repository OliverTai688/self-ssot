"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangleIcon,
  CheckIcon,
  Clock3Icon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MailIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UserRoundPlusIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useProductLanguage } from "@/lib/context/product-language-context"
import { cn } from "@/lib/utils"

export type TeamCollaborationWorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST"
export type TeamCollaborationMembershipStatus = "ACTIVE" | "SUSPENDED" | "LEFT" | "REMOVED"
export type TeamCollaborationInvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
export type TeamCollaborationProjectRole = "VIEWER" | "COMMENTER" | "EDITOR" | "MANAGER"

export interface TeamCollaborationMemberViewModel {
  id: string
  displayName: string
  emailLabel: string | null
  role: TeamCollaborationWorkspaceRole
  status: TeamCollaborationMembershipStatus
  joinedAtLabel: string | null
  isCurrentUser: boolean
}

export interface TeamCollaborationInvitationViewModel {
  id: string
  email: string
  role: TeamCollaborationWorkspaceRole
  project: {
    name: string
    role: TeamCollaborationProjectRole
  } | null
  status: TeamCollaborationInvitationStatus
  createdAtLabel: string
  expiresAtLabel: string
  canRevoke: boolean
  deliveryMode: "MANUAL_EMAIL_LINK"
  deliveryStatus: "AWAITING_MANUAL_SEND"
}

export interface TeamCollaborationPanelViewModel {
  state: "ready" | "not_found_or_forbidden" | "unavailable"
  workspaceId: string
  workspaceName: string
  currentUserRole: TeamCollaborationWorkspaceRole
  canInvite: boolean
  projects: Array<{
    id: string
    name: string
  }>
  members: TeamCollaborationMemberViewModel[]
  invitations: TeamCollaborationInvitationViewModel[]
}

export interface ManualInvitationHandoffViewModel {
  invitationId: string
  recipientEmail: string
  workspaceName: string
  workspaceRole: TeamCollaborationWorkspaceRole
  project: {
    name: string
    role: TeamCollaborationProjectRole
  } | null
  expiresAtLabel: string
  acceptanceUrl: string
  deliveryMode: "MANUAL_EMAIL_LINK"
  deliveryStatus: "AWAITING_MANUAL_SEND"
}

export interface InvitationActionState {
  status: "idle" | "success" | "validation_error" | "blocked" | "conflict" | "error"
  code: string
  message: string | null
  fieldErrors?: Partial<
    Record<"email" | "workspaceRole" | "projectId" | "projectRole" | "token", string[]>
  >
  handoff?: ManualInvitationHandoffViewModel
  workspace?: {
    id: string
    name: string
    href: string
  }
}

export type InvitationFormAction = (
  previousState: InvitationActionState,
  formData: FormData,
) => Promise<InvitationActionState>

export const INITIAL_INVITATION_ACTION_STATE: InvitationActionState = {
  status: "idle",
  code: "idle",
  message: null,
}

function ensureIdempotencyKey(event: React.FormEvent<HTMLFormElement>) {
  const field = event.currentTarget.elements.namedItem("idempotencyKey")
  if (field instanceof HTMLInputElement && !field.value) {
    field.value = globalThis.crypto.randomUUID()
  }
}

type TeamCollaborationCopy = ReturnType<
  typeof useProductLanguage
>["copy"]["work"]["teamCollaboration"]

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) =>
      formatted.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

function workspaceRoleLabel(
  copy: TeamCollaborationCopy,
  role: TeamCollaborationWorkspaceRole,
) {
  return copy.roles[role] ?? role
}

function projectRoleLabel(
  copy: TeamCollaborationCopy,
  role: TeamCollaborationProjectRole,
) {
  return copy.projectRoles[role] ?? role
}

function getActionError(
  state: InvitationActionState,
  copy: TeamCollaborationCopy,
) {
  if (
    state.status !== "validation_error" &&
    state.status !== "blocked" &&
    state.status !== "conflict" &&
    state.status !== "error"
  ) {
    return null
  }

  return copy.actionErrors[state.code as keyof typeof copy.actionErrors] ?? copy.actionErrors.unavailable
}

function ManualInvitationHandoff({
  handoff,
  onInviteAnother,
}: {
  handoff: ManualInvitationHandoffViewModel
  onInviteAnother: () => void
}) {
  const { copy } = useProductLanguage()
  const collaborationCopy = copy.work.teamCollaboration
  const [copied, setCopied] = React.useState(false)
  const acceptanceUrl = handoff.acceptanceUrl.startsWith("/")
    ? `${globalThis.location?.origin ?? ""}${handoff.acceptanceUrl}`
    : handoff.acceptanceUrl
  const roleLabel = workspaceRoleLabel(collaborationCopy, handoff.workspaceRole)
  const mailSubject = formatCopy(
    collaborationCopy.manualHandoff.mailSubjectTemplate,
    { workspace: handoff.workspaceName },
  )
  const mailBody = [
    formatCopy(collaborationCopy.manualHandoff.mailIntroTemplate, {
      workspace: handoff.workspaceName,
      role: roleLabel,
    }),
    "",
    collaborationCopy.manualHandoff.mailInstruction,
    acceptanceUrl,
    "",
    formatCopy(collaborationCopy.manualHandoff.mailExpiresTemplate, {
      expiresAt: handoff.expiresAtLabel || collaborationCopy.unknownTime,
    }),
  ].join("\n")
  const mailtoHref = `mailto:${encodeURIComponent(handoff.recipientEmail)}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(acceptanceUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50/60 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
        <MailIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              {collaborationCopy.manualHandoff.title}
            </p>
            <Badge variant="outline" className="border-amber-300/70 text-[10px] text-amber-700 dark:border-amber-800 dark:text-amber-300">
              {collaborationCopy.manualHandoff.status}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/80">
            {collaborationCopy.manualHandoff.body}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3.5">
        <dl className="grid gap-2 text-xs sm:grid-cols-[6rem_1fr]">
          <dt className="text-muted-foreground">
            {collaborationCopy.manualHandoff.recipientEmail}
          </dt>
          <dd className="min-w-0 break-all font-medium">{handoff.recipientEmail}</dd>
          <dt className="text-muted-foreground">
            {collaborationCopy.manualHandoff.workspaceRole}
          </dt>
          <dd>{roleLabel}</dd>
          {handoff.project && (
            <>
              <dt className="text-muted-foreground">
                {collaborationCopy.manualHandoff.project}
              </dt>
              <dd>
                {handoff.project.name}
                {collaborationCopy.separator}
                {projectRoleLabel(collaborationCopy, handoff.project.role)}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">
            {collaborationCopy.manualHandoff.expiresAt}
          </dt>
          <dd>{handoff.expiresAtLabel || collaborationCopy.unknownTime}</dd>
        </dl>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`invitation-link-${handoff.invitationId}`}>
          {collaborationCopy.manualHandoff.linkLabel}
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`invitation-link-${handoff.invitationId}`}
            value={acceptanceUrl}
            readOnly
            className="font-mono text-xs"
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()} className="gap-1.5 sm:shrink-0">
            {copied ? <CheckIcon className="text-emerald-600" /> : <CopyIcon />}
            {copied
              ? collaborationCopy.manualHandoff.copied
              : collaborationCopy.manualHandoff.copyLink}
          </Button>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onInviteAnother} className="gap-1.5">
          <RotateCcwIcon />
          {collaborationCopy.manualHandoff.inviteAnother}
        </Button>
        <Button render={<a href={mailtoHref} />} size="sm" className="gap-1.5">
          <ExternalLinkIcon />
          {collaborationCopy.manualHandoff.openEmailDraft}
        </Button>
      </div>
    </div>
  )
}

function InviteMemberForm({
  workspaceId,
  workspaceName,
  projects,
  action,
}: {
  workspaceId: string
  workspaceName: string
  projects: TeamCollaborationPanelViewModel["projects"]
  action: InvitationFormAction
}) {
  const router = useRouter()
  const [cycle, setCycle] = React.useState(0)

  return (
    <InviteMemberFormCycle
      key={cycle}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      projects={projects}
      action={action}
      onInviteAnother={() => setCycle((value) => value + 1)}
      onCreated={() => router.refresh()}
    />
  )
}

function InviteMemberFormCycle({
  workspaceId,
  workspaceName,
  projects,
  action,
  onInviteAnother,
  onCreated,
}: {
  workspaceId: string
  workspaceName: string
  projects: TeamCollaborationPanelViewModel["projects"]
  action: InvitationFormAction
  onInviteAnother: () => void
  onCreated: () => void
}) {
  const { copy } = useProductLanguage()
  const collaborationCopy = copy.work.teamCollaboration
  const [projectId, setProjectId] = React.useState("")
  const [workspaceRole, setWorkspaceRole] = React.useState<TeamCollaborationWorkspaceRole>("MEMBER")
  const [state, formAction, pending] = React.useActionState(
    action,
    INITIAL_INVITATION_ACTION_STATE,
  )
  const didRefreshRef = React.useRef(false)

  React.useEffect(() => {
    if (state.status !== "success" || !state.handoff || didRefreshRef.current) return
    didRefreshRef.current = true
    onCreated()
  }, [onCreated, state.handoff, state.status])

  if (state.status === "success" && state.handoff) {
    return <ManualInvitationHandoff handoff={state.handoff} onInviteAnother={onInviteAnother} />
  }

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-amber-300/60 bg-amber-50/60 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/20" aria-live="polite">
        <div className="flex items-start gap-2.5">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              {collaborationCopy.duplicate.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/80">
              {collaborationCopy.duplicate.body}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onInviteAnother} className="self-end gap-1.5">
          <RotateCcwIcon />
          {collaborationCopy.duplicate.back}
        </Button>
      </div>
    )
  }

  const hasEmailError = Boolean(state.fieldErrors?.email?.length)
  const hasRoleError = Boolean(state.fieldErrors?.workspaceRole?.length)
  const hasProjectError = Boolean(
    state.fieldErrors?.projectId?.length || state.fieldErrors?.projectRole?.length,
  )
  const guestNeedsProject = workspaceRole === "GUEST" && !projectId
  const actionError = getActionError(state, collaborationCopy)

  return (
    <form action={formAction} onSubmit={ensureIdempotencyKey} className="flex flex-col gap-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="idempotencyKey" defaultValue="" />

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3.5 py-3">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0">
          <p className="text-xs font-medium">
            {formatCopy(collaborationCopy.form.inviteTitleTemplate, {
              workspaceName,
            })}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {collaborationCopy.form.inviteBody}
          </p>
        </div>
      </div>

      {projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-invitation-project">
              {collaborationCopy.form.projectLabel}
            </Label>
            <select
              id="workspace-invitation-project"
              name="projectId"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={pending}
              aria-invalid={hasProjectError || undefined}
              aria-describedby="workspace-invitation-project-error"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{collaborationCopy.form.workspaceOnly}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <p id="workspace-invitation-project-error" className="min-h-4 text-[11px] text-destructive">
              {hasProjectError ? collaborationCopy.fieldErrors.projectScope : ""}
            </p>
            {guestNeedsProject && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                {collaborationCopy.form.guestNeedsProject}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-invitation-project-role">
              {collaborationCopy.form.projectRole}
            </Label>
            <select
              id="workspace-invitation-project-role"
              name="projectRole"
              defaultValue="VIEWER"
              disabled={pending || !projectId}
              aria-invalid={hasProjectError || undefined}
              aria-describedby="workspace-invitation-project-error"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="VIEWER">{collaborationCopy.projectRoles.VIEWER}</option>
              <option value="COMMENTER">{collaborationCopy.projectRoles.COMMENTER}</option>
              <option value="EDITOR">{collaborationCopy.projectRoles.EDITOR}</option>
              <option value="MANAGER">{collaborationCopy.projectRoles.MANAGER}</option>
            </select>
            {!projectId && <input type="hidden" name="projectRole" value="" />}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-invitation-email">
            {collaborationCopy.form.email}
          </Label>
          <Input
            id="workspace-invitation-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="member@example.com"
            required
            disabled={pending}
            aria-invalid={hasEmailError || undefined}
            aria-describedby="workspace-invitation-email-error"
          />
          <p id="workspace-invitation-email-error" className="min-h-4 text-[11px] text-destructive">
            {hasEmailError ? collaborationCopy.fieldErrors.email : ""}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-invitation-role">
            {collaborationCopy.form.workspaceRole}
          </Label>
          <select
            id="workspace-invitation-role"
            name="workspaceRole"
            value={workspaceRole}
            onChange={(event) => setWorkspaceRole(event.target.value as TeamCollaborationWorkspaceRole)}
            disabled={pending}
            aria-invalid={hasRoleError || undefined}
            aria-describedby="workspace-invitation-role-error"
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="MEMBER">{collaborationCopy.form.memberOption}</option>
            <option value="GUEST" disabled={projects.length === 0}>
              {collaborationCopy.form.guestOption}
            </option>
            <option value="ADMIN">{collaborationCopy.form.adminOption}</option>
          </select>
          <p id="workspace-invitation-role-error" className="min-h-4 text-[11px] text-destructive">
            {hasRoleError ? collaborationCopy.fieldErrors.workspaceRole : ""}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">
          {collaborationCopy.form.deliveryTitle}
        </p>
        <p className="mt-1">
          {collaborationCopy.form.deliveryBody}
        </p>
        <p className="mt-1">
          {collaborationCopy.form.permissionBody}
        </p>
      </div>

      <div aria-live="polite">
        {actionError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {actionError}
          </div>
        )}
        {pending && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            {collaborationCopy.form.pending}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || guestNeedsProject} className="gap-1.5">
          {pending ? <Loader2Icon className="animate-spin" /> : <UserRoundPlusIcon />}
          {pending ? collaborationCopy.form.creating : collaborationCopy.form.create}
        </Button>
      </div>
    </form>
  )
}

function RevokeInvitationButton({
  invitation,
  workspaceId,
  action,
}: {
  invitation: TeamCollaborationInvitationViewModel
  workspaceId: string
  action: InvitationFormAction
}) {
  const { copy } = useProductLanguage()
  const collaborationCopy = copy.work.teamCollaboration
  const router = useRouter()
  const [state, formAction, pending] = React.useActionState(
    action,
    INITIAL_INVITATION_ACTION_STATE,
  )
  const didRefreshRef = React.useRef(false)

  React.useEffect(() => {
    if (state.status !== "success" || didRefreshRef.current) return
    didRefreshRef.current = true
    router.refresh()
  }, [router, state.status])

  return (
    <form action={formAction} onSubmit={ensureIdempotencyKey} className="flex items-center gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="invitationId" value={invitation.id} />
      <input type="hidden" name="idempotencyKey" defaultValue="" />
      {getActionError(state, collaborationCopy) && (
        <span className="max-w-36 text-right text-[10px] leading-tight text-destructive" aria-live="polite">
          {getActionError(state, collaborationCopy)}
        </span>
      )}
      <Button type="submit" variant="ghost" size="xs" disabled={pending} className="text-destructive hover:text-destructive">
        {pending ? <Loader2Icon className="animate-spin" /> : <XCircleIcon />}
        {collaborationCopy.revoke}
      </Button>
    </form>
  )
}

function MembersList({ members }: { members: TeamCollaborationMemberViewModel[] }) {
  const { copy } = useProductLanguage()
  const collaborationCopy = copy.work.teamCollaboration

  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
        {collaborationCopy.members.empty}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRoundIcon className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-xs font-medium">{member.displayName}</p>
              {member.isCurrentUser && (
                <Badge variant="outline" className="text-[9px]">
                  {collaborationCopy.members.currentUser}
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px]">
                {workspaceRoleLabel(collaborationCopy, member.role)}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {[
                member.emailLabel,
                collaborationCopy.membershipStatuses[member.status],
                member.joinedAtLabel,
              ].filter(Boolean).join(collaborationCopy.separator)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function InvitationsList({
  invitations,
  workspaceId,
  revokeAction,
}: {
  invitations: TeamCollaborationInvitationViewModel[]
  workspaceId: string
  revokeAction: InvitationFormAction
}) {
  const { copy } = useProductLanguage()
  const collaborationCopy = copy.work.teamCollaboration

  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
        <MailIcon className="mx-auto size-5 text-muted-foreground/30" />
        <p className="mt-2 text-xs font-medium">
          {collaborationCopy.invitations.emptyTitle}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {collaborationCopy.invitations.emptyBody}
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {invitations.map((invitation) => (
        <li key={invitation.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-xs font-medium">{invitation.email}</p>
              <Badge variant="outline" className={cn(
                "text-[9px]",
                invitation.status === "PENDING" && "border-amber-300/70 text-amber-700 dark:border-amber-800 dark:text-amber-300",
              )}>
                {collaborationCopy.invitationStatuses[invitation.status]}
              </Badge>
              {invitation.status === "PENDING" && (
                <Badge variant="outline" className="text-[9px] text-muted-foreground">
                  {collaborationCopy.invitations.pendingManualSend}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {[
                workspaceRoleLabel(collaborationCopy, invitation.role),
                invitation.project
                  ? formatCopy(collaborationCopy.invitations.projectRoleTemplate, {
                      project: invitation.project.name,
                      role: projectRoleLabel(collaborationCopy, invitation.project.role),
                    })
                  : collaborationCopy.invitations.workspaceInvite,
                formatCopy(collaborationCopy.invitations.createdTemplate, {
                  date: invitation.createdAtLabel || collaborationCopy.unknownTime,
                }),
                formatCopy(collaborationCopy.invitations.expiresTemplate, {
                  date: invitation.expiresAtLabel || collaborationCopy.unknownTime,
                }),
              ].join(collaborationCopy.separator)}
            </p>
          </div>
          {invitation.canRevoke && invitation.status === "PENDING" && (
            <RevokeInvitationButton
              invitation={invitation}
              workspaceId={workspaceId}
              action={revokeAction}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

export function TeamCollaborationSheet({
  model,
  inviteAction,
  revokeAction,
}: {
  model: TeamCollaborationPanelViewModel
  inviteAction: InvitationFormAction
  revokeAction: InvitationFormAction
}) {
  const { copy } = useProductLanguage()
  const collaborationCopy = copy.work.teamCollaboration
  const [tab, setTab] = React.useState<"members" | "invitations">("members")
  const pendingCount = model.invitations.filter((invitation) => invitation.status === "PENDING").length

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <UsersIcon />
        {collaborationCopy.sheet.trigger}
        {pendingCount > 0 && <Badge variant="secondary" className="ml-0.5 text-[9px]">{pendingCount}</Badge>}
      </SheetTrigger>
      <SheetContent className="w-[min(100vw,34rem)] gap-0 sm:max-w-[34rem]">
        <SheetHeader className="border-b border-border/60 px-4 py-4 sm:px-5">
          <SheetTitle className="flex items-center gap-2">
            <UsersIcon className="size-4" />
            {formatCopy(collaborationCopy.sheet.titleTemplate, {
              workspace: model.workspaceName,
            })}
          </SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            {collaborationCopy.sheet.description}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {model.state !== "ready" ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300/50 bg-amber-50/50 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-medium">
                  {model.state === "unavailable"
                    ? collaborationCopy.sheet.unavailableTitle
                    : collaborationCopy.sheet.forbiddenTitle}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {collaborationCopy.sheet.unavailableBody}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    {formatCopy(collaborationCopy.sheet.currentRoleTemplate, {
                      role: workspaceRoleLabel(collaborationCopy, model.currentUserRole),
                    })}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatCopy(collaborationCopy.sheet.memberPendingTemplate, {
                      members: model.members.length,
                      pending: pendingCount,
                    })}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 gap-1 text-[9px]">
                  <ShieldCheckIcon />
                  {collaborationCopy.sheet.formalData}
                </Badge>
              </div>

              <div className="grid grid-cols-2 rounded-lg border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setTab("members")}
                  aria-pressed={tab === "members"}
                  className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", tab === "members" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {formatCopy(collaborationCopy.sheet.membersTabTemplate, {
                    count: model.members.length,
                  })}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("invitations")}
                  aria-pressed={tab === "invitations"}
                  className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", tab === "invitations" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {formatCopy(collaborationCopy.sheet.invitationsTabTemplate, {
                    count: model.invitations.length,
                  })}
                </button>
              </div>

              {tab === "members" ? (
                <MembersList members={model.members} />
              ) : (
                <div className="flex flex-col gap-5">
                  {model.canInvite && (
                    <section aria-labelledby="invite-member-heading" className="flex flex-col gap-3">
                      <div>
                        <h3 id="invite-member-heading" className="text-xs font-semibold">
                          {collaborationCopy.sheet.inviteHeading}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {collaborationCopy.sheet.inviteDescription}
                        </p>
                      </div>
                      <InviteMemberForm
                        workspaceId={model.workspaceId}
                        workspaceName={model.workspaceName}
                        projects={model.projects}
                        action={inviteAction}
                      />
                    </section>
                  )}

                  <section aria-labelledby="invitation-history-heading" className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 id="invitation-history-heading" className="text-xs font-semibold">
                        {collaborationCopy.sheet.historyHeading}
                      </h3>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock3Icon className="size-3" />
                        {collaborationCopy.sheet.expiryServerDriven}
                      </span>
                    </div>
                    <InvitationsList
                      invitations={model.invitations}
                      workspaceId={model.workspaceId}
                      revokeAction={revokeAction}
                    />
                  </section>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border/60 px-4 py-3 sm:px-5">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {collaborationCopy.sheet.footer}
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function WorkspaceInvitationAcceptanceCard({
  token,
  action,
}: {
  token: string
  action: InvitationFormAction
}) {
  const { copy } = useProductLanguage()
  const collaborationCopy = copy.work.teamCollaboration
  const router = useRouter()
  const [state, formAction, pending] = React.useActionState(
    action,
    INITIAL_INVITATION_ACTION_STATE,
  )
  const [isNavigating, startNavigation] = React.useTransition()
  const didNavigateRef = React.useRef(false)

  React.useEffect(() => {
    if (state.status !== "success" || !state.workspace || didNavigateRef.current) return
    didNavigateRef.current = true
    startNavigation(() => {
      router.replace(state.workspace?.href ?? `/work?workspace=${encodeURIComponent(state.workspace?.id ?? "")}`)
      router.refresh()
    })
  }, [router, state.status, state.workspace])

  const actionError = getActionError(state, collaborationCopy)
  const isBusy = pending || isNavigating

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/[0.03] p-4" aria-labelledby="accept-invitation-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserRoundPlusIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 id="accept-invitation-heading" className="text-sm font-semibold">
              {collaborationCopy.accept.title}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {collaborationCopy.accept.description}
            </p>
          </div>
        </div>

        {state.status === "success" ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300" aria-live="polite">
            <CheckIcon className="size-3.5" />
            {collaborationCopy.accept.success}
          </div>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" size="sm" disabled={isBusy} className="w-full gap-1.5 sm:w-auto">
              {isBusy && <Loader2Icon className="animate-spin" />}
              {isBusy ? collaborationCopy.accept.verifying : collaborationCopy.accept.submit}
            </Button>
          </form>
        )}
      </div>

      {actionError && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" aria-live="polite">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
          <div>
            <p>{actionError}</p>
            <p className="mt-0.5 text-[11px] text-destructive/80">
              {collaborationCopy.accept.errorHint}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
