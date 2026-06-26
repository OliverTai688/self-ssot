import Link from "next/link"

import { Badge } from "@/components/ui/badge"

export const adminDetailSections = [
  {
    slug: "launch-actions",
    anchorHref: "#admin-detail-launch-actions",
    routeHref: "/admin/detail/all#admin-detail-launch-actions",
    label: "Launch actions",
    description: "Owner-run checks, approvals, and no-secret launch commands.",
    sectionRouteReady: false,
  },
  {
    slug: "backend-catalog",
    anchorHref: "#admin-detail-backend-catalog",
    routeHref: "/admin/detail/all#admin-detail-backend-catalog",
    label: "Backend catalog",
    description: "Backend, BFF, CLI, and operator action readiness.",
    sectionRouteReady: false,
  },
  {
    slug: "owner-evidence",
    anchorHref: "#admin-detail-owner-evidence",
    routeHref: "/admin/detail/owner-evidence",
    label: "Owner evidence",
    description: "AUTH-005, WORK-009, deployment, and owner proof handoff.",
    sectionRouteReady: true,
  },
  {
    slug: "launch-history",
    anchorHref: "#admin-detail-launch-history",
    routeHref: "/admin/detail/all#admin-detail-launch-history",
    label: "Launch history",
    description: "Launch level changes, blockers, and proof references.",
    sectionRouteReady: false,
  },
  {
    slug: "work-proof",
    anchorHref: "#admin-detail-work-proof",
    routeHref: "/admin/detail/all#admin-detail-work-proof",
    label: "Work proof",
    description: "DB-backed Work module evidence and owner-run checks.",
    sectionRouteReady: false,
  },
  {
    slug: "scenario-maturity",
    anchorHref: "#admin-detail-scenario-maturity",
    routeHref: "/admin/detail/all#admin-detail-scenario-maturity",
    label: "Scenario maturity",
    description: "Frontstage, member, admin, and module journey gaps.",
    sectionRouteReady: false,
  },
  {
    slug: "system-readiness",
    anchorHref: "#admin-detail-system-readiness",
    routeHref: "/admin/detail/all#admin-detail-system-readiness",
    label: "System readiness",
    description: "Module readiness rows and launch-blocking states.",
    sectionRouteReady: false,
  },
  {
    slug: "surface-maturity",
    anchorHref: "#admin-detail-surface-maturity",
    routeHref: "/admin/detail/all#admin-detail-surface-maturity",
    label: "Surface maturity",
    description: "SaaS/OS surface maturity across modules and APIs.",
    sectionRouteReady: false,
  },
  {
    slug: "ai-input-readiness",
    anchorHref: "#admin-detail-ai-input-readiness",
    routeHref: "/admin/detail/all#admin-detail-ai-input-readiness",
    label: "AI Input readiness",
    description: "Source workflow proof, dry-run boundaries, and approvals.",
    sectionRouteReady: false,
  },
  {
    slug: "owner-auth-boundary",
    anchorHref: "#admin-detail-owner-auth-boundary",
    routeHref: "/admin/detail/all#admin-detail-owner-auth-boundary",
    label: "Auth boundary",
    description: "Owner/demo auth separation and AUTH-005 gate status.",
    sectionRouteReady: false,
  },
  {
    slug: "agent-protocol",
    anchorHref: "#admin-detail-agent-protocol",
    routeHref: "/admin/detail/all#admin-detail-agent-protocol",
    label: "Agent protocol",
    description: "AgentFacts-lite, registry readiness, and NANDA boundary.",
    sectionRouteReady: false,
  },
  {
    slug: "env-evidence",
    anchorHref: "#admin-detail-env-evidence",
    routeHref: "/admin/detail/all#admin-detail-env-evidence",
    label: "Env and evidence",
    description: "Environment readiness and recent loop evidence packets.",
    sectionRouteReady: false,
  },
  {
    slug: "client-portal",
    anchorHref: "#admin-detail-client-portal",
    routeHref: "/admin/detail/all#admin-detail-client-portal",
    label: "Client Portal",
    description: "Fail-closed public route, token policy, and hardening gate.",
    sectionRouteReady: false,
  },
  {
    slug: "audit-contract",
    anchorHref: "#admin-detail-audit-contract",
    routeHref: "/admin/detail/all#admin-detail-audit-contract",
    label: "Audit contract",
    description: "Read-only audit BFF exposure and future persistence gate.",
    sectionRouteReady: false,
  },
  {
    slug: "write-boundary",
    anchorHref: "#admin-detail-write-boundary",
    routeHref: "/admin/detail/all#admin-detail-write-boundary",
    label: "Write boundary",
    description: "Admin read-only scope and mutation stop conditions.",
    sectionRouteReady: false,
  },
] as const

type AdminDetailSectionIndexProps = {
  mode?: "anchor" | "route"
}

export function AdminDetailSectionIndex({ mode = "anchor" }: AdminDetailSectionIndexProps) {
  const isRouteMode = mode === "route"

  return (
    <section
      aria-labelledby="admin-detail-section-index-title"
      className="rounded-lg border bg-background"
      data-admin-detail-section-index={isRouteMode ? "ADMIN-009" : "ADMIN-007"}
    >
      <div className="flex flex-col gap-3 border-b px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 id="admin-detail-section-index-title" className="text-sm font-semibold">
            Admin detail section index
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {isRouteMode
              ? "ADMIN-009 routes owner evidence through a lightweight section loader; unsplit sections stay on the explicit full-detail fallback."
              : "ADMIN-007 gives the protected detail route a stable operator map before the long evidence tables load."}
          </p>
        </div>
        <Badge variant="outline">{isRouteMode ? "ADMIN-009" : "ADMIN-007"}</Badge>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {adminDetailSections.map((section) => {
          const href = isRouteMode ? section.routeHref : section.anchorHref
          const body = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{section.label}</span>
                {isRouteMode && (
                  <Badge variant={section.sectionRouteReady ? "secondary" : "outline"} className="shrink-0">
                    {section.sectionRouteReady ? "section route" : "full fallback"}
                  </Badge>
                )}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {section.description}
              </span>
            </>
          )

          if (isRouteMode) {
            return (
              <Link
                key={section.slug}
                href={href}
                className="rounded-lg border bg-muted/20 px-3 py-3 text-sm transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {body}
              </Link>
            )
          }

          return (
            <a
              key={section.slug}
              href={href}
              className="rounded-lg border bg-muted/20 px-3 py-3 text-sm transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {body}
            </a>
          )
        })}
      </div>
    </section>
  )
}
