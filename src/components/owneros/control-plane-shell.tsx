"use client"

import * as React from "react"
import Link from "next/link"
import {
  InfoIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DetailDrawer } from "@/components/owneros/detail-drawer"
import { cn } from "@/lib/utils"

/**
 * Shared "settings-app" shell for /admin and /settings.
 *
 * Mirrors the Claude Code settings pattern: a persistent icon+label rail for
 * switching sections, a compact header (title, one-line description, status
 * badge, and an "About" popup for the longer boundary text that used to sit
 * as a permanent paragraph on the page), and a scrollable content area built
 * from short row lists instead of nested tables. See the admin/settings
 * refactor notes.
 *
 * This file also carries the small CRUD kit (`PanelHeader`, `RowActionsMenu`,
 * `ConfirmDialog`, `FormDialog`) that every add/edit/delete panel in
 * admin/settings is built from, so every panel gets the same look, the same
 * confirm-before-delete behavior, and the same pending-state affordance.
 */

export type ShellTone = "ready" | "review" | "blocked" | "proposal" | "good" | "warn" | "neutral"

export interface ShellNavItem {
  href: string
  icon: LucideIcon
  label: string
}

export interface ShellAction {
  href: string
  label: string
  icon?: LucideIcon
  variant?: "default" | "outline" | "secondary"
}

const toneDotClass: Record<string, string> = {
  ready: "bg-emerald-500",
  good: "bg-emerald-500",
  review: "bg-amber-500",
  warn: "bg-amber-500",
  proposal: "bg-sky-500",
  blocked: "bg-red-500",
  neutral: "bg-muted-foreground/40",
}

export function toneBadgeVariant(tone?: string) {
  if (tone === "ready" || tone === "good") return "secondary" as const
  if (tone === "blocked") return "destructive" as const
  return "outline" as const
}

export function ToneDot({ tone, className }: { tone?: string; className?: string }) {
  return (
    <span
      className={cn(
        "mt-1.5 size-1.5 shrink-0 rounded-full",
        toneDotClass[tone ?? "neutral"] ?? toneDotClass.neutral,
        className
      )}
    />
  )
}

function ShellActionButton({ action }: { action: ShellAction }) {
  const Icon = action.icon
  return (
    <Button variant={action.variant ?? "outline"} size="sm" render={<Link href={action.href} />}>
      {Icon && <Icon className="size-3.5" />}
      {action.label}
    </Button>
  )
}

function NavLink({ item, active, compact }: { item: ShellNavItem; active: boolean; compact?: boolean }) {
  const Icon = item.icon
  if (compact) {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
          active
            ? "border-border bg-background text-foreground"
            : "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
        )}
      >
        <Icon className="size-3.5" />
        {item.label}
      </Link>
    )
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-background font-medium text-foreground ring-1 ring-border"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  )
}

export function ControlPlaneShell({
  title,
  description,
  eyebrow,
  stateLabel,
  stateTone = "neutral",
  navItems,
  activeHref,
  actions,
  aboutTitle,
  aboutContent,
  children,
}: {
  title: string
  description?: string
  eyebrow?: string
  stateLabel?: string
  stateTone?: string
  navItems: ShellNavItem[]
  activeHref: string
  actions?: React.ReactNode
  aboutTitle?: string
  aboutContent?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppHeader title={title} description={description} />

      <div className="flex flex-1 overflow-hidden">
        <nav
          className="hidden w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r bg-muted/20 p-2 sm:flex"
          aria-label="Section navigation"
        >
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} active={activeHref === item.href} />
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto">
          <nav
            className="flex gap-1.5 overflow-x-auto border-b bg-muted/10 px-3 py-2 sm:hidden"
            aria-label="Section navigation"
          >
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} active={activeHref === item.href} compact />
            ))}
          </nav>

          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  {eyebrow && (
                    <Badge variant="outline" className="text-[10px]">
                      {eyebrow}
                    </Badge>
                  )}
                  {stateLabel && (
                    <Badge variant={toneBadgeVariant(stateTone)} className="gap-1.5 text-[10px]">
                      <ToneDot tone={stateTone} className="mt-0" />
                      {stateLabel}
                    </Badge>
                  )}
                  {aboutContent && (
                    <DetailDrawer
                      title={aboutTitle ?? title}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground"
                          aria-label="About this page"
                        >
                          <InfoIcon className="size-3.5" />
                        </Button>
                      }
                    >
                      {aboutContent}
                    </DetailDrawer>
                  )}
                </div>
                <h1 className="mt-2 text-lg font-semibold tracking-tight">{title}</h1>
                {description && (
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
                )}
              </div>

              {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export { ShellActionButton }

/** A single compact row: dot + label + optional inline status badge, with an
 * optional trailing slot (toggle, popup trigger, row-actions menu, etc).
 * Replaces raw <table> rows used across admin/settings for boundary,
 * matrix, and blocker data. */
export function DetailListRow({
  label,
  status,
  tone,
  summary,
  trailing,
  detailTitle,
  detail,
}: {
  label: string
  status?: string
  tone?: string
  summary?: string
  trailing?: React.ReactNode
  detailTitle?: string
  detail?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <ToneDot tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {status && (
            <Badge variant={toneBadgeVariant(tone)} className="text-[10px]">
              {status}
            </Badge>
          )}
        </div>
        {summary && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{summary}</p>}
      </div>
      {trailing}
      {detail && (
        <DetailDrawer
          title={detailTitle ?? label}
          trigger={
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 text-muted-foreground"
              aria-label={`${label} detail`}
            >
              <InfoIcon className="size-3.5" />
            </Button>
          }
        >
          {detail}
        </DetailDrawer>
      )}
    </div>
  )
}

export function DetailList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("divide-y rounded-lg border bg-background", className)}>{children}</div>
}

// ─── CRUD kit ────────────────────────────────────────────────────────────
// Shared building blocks so every add/edit/delete panel in admin/settings
// looks and behaves the same way, and so wiring a real API later only means
// swapping what each panel's `useLocalEntities` store does under the hood.

/** Section header for a CRUD panel: title, optional row-count badge, and an
 * "Add" action (or any other trailing control) on the right. */
export function PanelHeader({
  title,
  description,
  count,
  action,
}: {
  title: string
  description?: string
  count?: number
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {typeof count === "number" && (
            <Badge variant="outline" className="text-[10px]">
              {count}
            </Badge>
          )}
        </div>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" size="sm" onClick={onClick}>
      <PlusIcon className="size-3.5" />
      {label}
    </Button>
  )
}

/** Row-trailing "..." menu with Edit / Delete (either can be omitted). */
export function RowActionsMenu({
  onEdit,
  onDelete,
  editLabel = "編輯",
  deleteLabel = "刪除",
  disabled,
}: {
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
  deleteLabel?: string
  disabled?: boolean
}) {
  if (!onEdit && !onDelete) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground"
            aria-label="More actions"
            disabled={disabled}
          >
            <MoreHorizontalIcon className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            {editLabel}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon />
            {deleteLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Confirm-before-delete popup. There's no dedicated alert-dialog primitive
 * in this design system, so this wraps the plain Dialog with a destructive
 * confirm button and a pending state while the (simulated) delete runs. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "刪除",
  cancelLabel = "取消",
  onConfirm,
  isPending,
  destructive = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  isPending?: boolean
  destructive?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2Icon className="size-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Generic add/edit form popup shell: header + scrollable field area (passed
 * as children) + Cancel/Save footer. Panels supply their own fields since
 * shapes differ (member vs. role vs. grant), but every dialog gets the same
 * chrome and the same "saving…" affordance. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitLabel = "儲存",
  cancelLabel = "取消",
  isPending,
  submitDisabled,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  onSubmit: () => void
  submitLabel?: string
  cancelLabel?: string
  isPending?: boolean
  submitDisabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto">{children}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={isPending || submitDisabled}>
              {isPending && <Loader2Icon className="size-3.5 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EmptyRow({ label }: { label: string }) {
  return <p className="px-3 py-8 text-center text-xs text-muted-foreground">{label}</p>
}
