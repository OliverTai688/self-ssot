"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  LockIcon,
  PlusIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"

import { createTeamWorkspace } from "@/app/actions/team-workspace"
import { Button } from "@/components/ui/button"
import { useProductLanguage } from "@/lib/context/product-language-context"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  INITIAL_CREATE_TEAM_WORKSPACE_ACTION_STATE,
  type CreateTeamWorkspaceActionState,
  type TeamWorkspaceCreationReadinessDto,
} from "@/types/team-workspace-command"

type TeamWorkspaceCopy = ReturnType<typeof useProductLanguage>["copy"]["work"]["teamWorkspace"]

function actionErrorFallback(
  code: CreateTeamWorkspaceActionState["code"],
  copy: TeamWorkspaceCopy,
) {
  return copy.actionErrors[code] ?? copy.actionErrors.unavailable
}

function CreateTeamWorkspaceForm({
  idempotencyKey,
  onPendingChange,
}: {
  idempotencyKey: string
  onPendingChange: (pending: boolean) => void
}) {
  const router = useRouter()
  const { copy } = useProductLanguage()
  const teamCopy = copy.work.teamWorkspace
  const [name, setName] = React.useState("")
  const [state, formAction, pending] = React.useActionState(
    createTeamWorkspace,
    INITIAL_CREATE_TEAM_WORKSPACE_ACTION_STATE,
  )
  const [isNavigating, startNavigation] = React.useTransition()
  const didNavigateRef = React.useRef(false)

  React.useEffect(() => {
    onPendingChange(pending || isNavigating)
  }, [isNavigating, onPendingChange, pending])

  React.useEffect(() => {
    if (
      state.status !== "success" ||
      !state.workspaceId ||
      didNavigateRef.current
    ) {
      return
    }

    didNavigateRef.current = true
    const workspaceHref = `/work?workspace=${encodeURIComponent(state.workspaceId)}`
    startNavigation(() => {
      router.push(workspaceHref)
      router.refresh()
    })
  }, [router, state.status, state.workspaceId])

  const isBusy = pending || isNavigating
  const fieldError = state.fieldErrors?.name?.[0]
  const actionError =
    state.status === "validation_error" ||
    state.status === "blocked" ||
    state.status === "conflict" ||
    state.status === "error"
      ? actionErrorFallback(state.code, teamCopy)
      : null

  if (state.status === "success") {
    return (
      <>
        <div className="flex flex-col items-center px-5 py-8 text-center" aria-live="polite">
          <CheckCircle2Icon className="size-8 text-emerald-600 dark:text-emerald-400" />
          <p className="mt-3 text-sm font-semibold">{teamCopy.successTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {teamCopy.successBody}
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground/80">
            {teamCopy.successBoundary}
          </p>
        </div>
        <DialogFooter>
          <Button size="sm" disabled className="gap-1.5">
            <Loader2Icon className="size-3.5 animate-spin" />
            {teamCopy.navigating}
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form action={formAction}>
      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3.5 py-3">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <p className="text-xs font-medium">{teamCopy.ownerRoleTitle}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {teamCopy.ownerRoleBody}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="team-workspace-name">{teamCopy.name}</Label>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {name.length}/80
            </span>
          </div>
          <Input
            id="team-workspace-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={teamCopy.namePlaceholder}
            autoComplete="organization"
            autoFocus
            required
            minLength={2}
            maxLength={80}
            disabled={isBusy}
            aria-invalid={Boolean(fieldError) || undefined}
            aria-describedby="team-workspace-boundary team-workspace-error"
          />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        </div>

        <div
          id="team-workspace-boundary"
          className="rounded-lg border border-dashed border-border px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground"
        >
          <p>{teamCopy.boundaryLine1}</p>
          <p className="mt-1">
            {teamCopy.boundaryLine2}
          </p>
        </div>

        <div id="team-workspace-error" aria-live="polite">
          {actionError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <p>{actionError}</p>
              <p className="mt-1 text-[11px] text-destructive/80">
                {teamCopy.retryHint}
              </p>
            </div>
          )}
          {pending && (
            <p className="text-xs text-muted-foreground">
              {teamCopy.pending}
            </p>
          )}
        </div>
      </div>

      <DialogFooter>
        <DialogClose
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
            />
          }
        >
          {teamCopy.cancel}
        </DialogClose>
        <Button
          type="submit"
          size="sm"
          disabled={name.trim().length < 2 || !idempotencyKey || isBusy}
          className="gap-1.5"
        >
          {pending && <Loader2Icon className="size-3.5 animate-spin" />}
          {pending ? teamCopy.creating : teamCopy.create}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function TeamWorkspaceCreationReadinessNotice({
  readiness,
  legacyCompatibility,
}: {
  readiness: TeamWorkspaceCreationReadinessDto
  legacyCompatibility: boolean
}) {
  const { copy } = useProductLanguage()
  const teamCopy = copy.work.teamWorkspace

  if (readiness.available && readiness.code === "ready") return null

  const code = readiness.code === "ready" ? "unavailable" : readiness.code
  const message = teamCopy.readiness[code]

  return (
    <div
      id="team-workspace-creation-readiness"
      className="flex items-start gap-2.5 rounded-lg border border-amber-300/50 bg-amber-50/50 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/20"
    >
      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          {legacyCompatibility ? teamCopy.legacyCompatibility.title : message.title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700/80 dark:text-amber-400/80">
          {legacyCompatibility
            ? teamCopy.legacyCompatibility.body
            : message.body}
        </p>
      </div>
      <span className="shrink-0 rounded-md border border-amber-300/70 px-2 py-0.5 text-[10px] text-amber-700 dark:border-amber-800 dark:text-amber-400">
        {teamCopy.paused}
      </span>
    </div>
  )
}

export function CreateTeamWorkspaceDialog({
  readiness,
}: {
  readiness: TeamWorkspaceCreationReadinessDto
}) {
  const { copy } = useProductLanguage()
  const teamCopy = copy.work.teamWorkspace
  const [open, setOpen] = React.useState(false)
  const [isFormPending, setIsFormPending] = React.useState(false)
  const [idempotencyKey, setIdempotencyKey] = React.useState("")
  const canCreateTeamWorkspace = readiness.available && readiness.code === "ready"
  const handlePendingChange = React.useCallback((pending: boolean) => {
    setIsFormPending(pending)
  }, [])

  if (!canCreateTeamWorkspace) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        aria-disabled="true"
        aria-describedby="team-workspace-creation-readiness"
        className="shrink-0 gap-1.5"
      >
        <LockIcon className="size-3.5" />
        {teamCopy.trigger}
      </Button>
    )
  }

  function handleOpenChange(next: boolean) {
    if (!next && isFormPending) return
    if (next && !open) setIdempotencyKey(globalThis.crypto.randomUUID())
    if (!next) setIdempotencyKey("")
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
            <PlusIcon className="size-3.5" />
            {teamCopy.trigger}
          </Button>
        }
      />
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton={!isFormPending}
      >
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="size-4" />
            {teamCopy.title}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {teamCopy.description}
          </DialogDescription>
        </DialogHeader>
        {open && idempotencyKey && (
          <CreateTeamWorkspaceForm
            idempotencyKey={idempotencyKey}
            onPendingChange={handlePendingChange}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
