import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  LockIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createLoginPath } from "@/lib/auth/redirect"

export const metadata: Metadata = {
  title: "Personal OS",
  description: "A private operating surface for work, research, life context, and launch governance.",
}

const ownerLoginPath = createLoginPath("/ai-input")
const settingsLoginPath = createLoginPath("/settings")
const adminLoginPath = createLoginPath("/admin")

const boundaryRows = [
  {
    label: "Owner cockpit",
    status: "protected",
    detail: "AI Input, Work, settings, and admin routes require login before the private shell renders.",
    icon: <LockIcon className="size-4 text-sky-600" />,
  },
  {
    label: "Client portal",
    status: "token-only",
    detail: "Client pages are only reachable from private tokenized URLs; no sample token is exposed here.",
    icon: <KeyRoundIcon className="size-4 text-amber-600" />,
  },
  {
    label: "Public root",
    status: "safe",
    detail: "This page is static and does not render projects, notes, deliverables, source data, or env values.",
    icon: <ShieldCheckIcon className="size-4 text-emerald-600" />,
  },
]

const launchRows = [
  {
    label: "Protected app shell",
    value: "ready for smoke",
    detail: "Unauthenticated owner routes preserve their requested path through /login?next=...",
  },
  {
    label: "Settings and admin",
    value: "read-only ready",
    detail: "Owner settings and operator readiness exist behind the dashboard auth boundary.",
  },
  {
    label: "Next blocker",
    value: "client containment",
    detail: "Public Client Portal mock data must be gated before a private online launch.",
  },
]

function BoundaryRow({ row }: { row: (typeof boundaryRows)[number] }) {
  return (
    <div className="grid gap-3 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[180px_120px_1fr] sm:items-center">
      <div className="flex min-w-0 items-center gap-2">
        {row.icon}
        <span className="truncate text-sm font-medium">{row.label}</span>
      </div>
      <Badge variant="outline" className="w-fit">
        {row.status}
      </Badge>
      <p className="text-sm leading-relaxed text-muted-foreground">{row.detail}</p>
    </div>
  )
}

export default function RootPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 px-5 py-4">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border bg-muted/40">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Personal OS</p>
              <p className="text-xs text-muted-foreground">Private owner operating system</p>
            </div>
          </div>
          <Button variant="outline" size="sm" render={<Link href={ownerLoginPath} prefetch={false} />}>
            <LockIcon className="size-3.5" />
            Owner login
          </Button>
        </div>
      </header>

      <section className="border-b">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center lg:py-10">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4">
                Public-safe entry
              </Badge>
              <h1 className="text-4xl font-semibold tracking-normal text-balance sm:text-5xl">Personal OS</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                A private operating surface for work projects, research context, AI source workflows, owner settings,
                and launch governance.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" render={<Link href={ownerLoginPath} prefetch={false} />}>
                <LockIcon className="size-4" />
                Enter owner cockpit
                <ArrowRightIcon className="size-4" />
              </Button>
              <Button variant="outline" size="lg" render={<Link href={settingsLoginPath} prefetch={false} />}>
                <SettingsIcon className="size-4" />
                Owner settings
              </Button>
              <Button variant="outline" size="lg" render={<Link href={adminLoginPath} prefetch={false} />}>
                <ClipboardListIcon className="size-4" />
                Admin console
              </Button>
            </div>

            <div className="grid max-w-3xl gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <CheckCircle2Icon className="mt-0.5 size-4 text-emerald-600" />
                <span>Protected dashboard routes are guarded before the app shell renders.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2Icon className="mt-0.5 size-4 text-sky-600" />
                <span>Owner settings and admin readiness surfaces already exist behind login.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2Icon className="mt-0.5 size-4 text-amber-600" />
                <span>Client access stays private-token only until DB-backed filtering is complete.</span>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border bg-muted/20">
            <div className="border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Launch boundary map</h2>
                  <p className="mt-1 text-xs text-muted-foreground">What this public page can safely expose.</p>
                </div>
                <Badge variant="secondary">Loop 8</Badge>
              </div>
            </div>
            <div className="grid grid-cols-3 border-b text-center text-xs font-medium text-muted-foreground">
              <div className="border-r px-3 py-3">Public</div>
              <div className="border-r px-3 py-3">Login</div>
              <div className="px-3 py-3">Private</div>
            </div>
            <div className="grid grid-cols-3 gap-px bg-border text-center text-sm">
              <div className="bg-background px-3 py-8">
                <p className="font-medium">Root entry</p>
                <p className="mt-1 text-xs text-muted-foreground">Identity and safe boundaries</p>
              </div>
              <div className="bg-background px-3 py-8">
                <p className="font-medium">Supabase magic link</p>
                <p className="mt-1 text-xs text-muted-foreground">Existing users only</p>
              </div>
              <div className="bg-background px-3 py-8">
                <p className="font-medium">Owner surfaces</p>
                <p className="mt-1 text-xs text-muted-foreground">AI Input, Work, settings, admin</p>
              </div>
            </div>
            <div className="px-4 py-3">
              <Button variant="ghost" size="sm" render={<Link href="/auth/status" prefetch={false} />}>
                <ExternalLinkIcon className="size-3.5" />
                Auth readiness JSON
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-lg border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Public exposure boundary</h2>
          </div>
          <div>
            {boundaryRows.map((row) => (
              <BoundaryRow key={row.label} row={row} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Launch readiness</h2>
          </div>
          <div className="divide-y">
            {launchRows.map((row) => (
              <div key={row.label} className="px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{row.label}</p>
                  <Badge variant="outline">{row.value}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{row.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
