import {
  ActivityIcon,
  BotIcon,
  BriefcaseIcon,
  DatabaseIcon,
  FileTextIcon,
  FlaskConicalIcon,
  GaugeIcon,
  GitBranchIcon,
  HistoryIcon,
  KeyRoundIcon,
  LanguagesIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LockIcon,
  PlayIcon,
  ServerIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * Plain-data nav lists (no JSX). Kept dependency-free of control-plane-shell.tsx
 * so these can be imported from Server Components without ever crossing the
 * RSC boundary as a prop — only the *shell wrapper components* in
 * control-plane-shell.tsx bake these in and cross that boundary safely.
 */
interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

/** Shared left-rail nav for every /admin page (hub + rbac/ai-governance/audit/system-readiness). */
export const adminNavItems: NavItem[] = [
  { href: "/admin", icon: LayoutDashboardIcon, label: "Overview" },
  { href: "/admin/rbac", icon: ShieldCheckIcon, label: "RBAC" },
  { href: "/admin/ai-governance", icon: GitBranchIcon, label: "AI 治理" },
  { href: "/admin/audit", icon: LockIcon, label: "稽核" },
  { href: "/admin/system-readiness", icon: GaugeIcon, label: "系統就緒" },
  { href: "/admin/detail", icon: FileTextIcon, label: "完整 detail" },
]

/** Shared left-rail nav for every /settings page (hub + language/members/roles/ai-sharing). */
export const settingsNavItems: NavItem[] = [
  { href: "/settings", icon: LayoutDashboardIcon, label: "Personal Overview" },
  { href: "/settings/workspace", icon: BriefcaseIcon, label: "Workspace / Org" },
  { href: "/settings/language", icon: LanguagesIcon, label: "語言" },
  { href: "/settings/members", icon: UserRoundIcon, label: "成員" },
  { href: "/settings/roles", icon: ShieldCheckIcon, label: "角色" },
  { href: "/settings/ai-sharing", icon: SparklesIcon, label: "AI 分享" },
]

/** Left-rail nav for the /admin/detail shell: an overview entry plus one item per section. */
export const adminDetailNavItems: NavItem[] = [
  { href: "/admin/detail", icon: ActivityIcon, label: "Overview" },
  { href: "/admin/detail/all#admin-detail-launch-actions", icon: PlayIcon, label: "Launch actions" },
  { href: "/admin/detail/all#admin-detail-backend-catalog", icon: ServerIcon, label: "Backend catalog" },
  { href: "/admin/detail/owner-evidence", icon: FileTextIcon, label: "Owner evidence" },
  { href: "/admin/detail/all#admin-detail-launch-history", icon: HistoryIcon, label: "Launch history" },
  { href: "/admin/detail/all#admin-detail-work-proof", icon: BriefcaseIcon, label: "Work proof" },
  { href: "/admin/detail/all#admin-detail-scenario-maturity", icon: FlaskConicalIcon, label: "Scenario maturity" },
  { href: "/admin/detail/all#admin-detail-system-readiness", icon: GaugeIcon, label: "System readiness" },
  { href: "/admin/detail/all#admin-detail-surface-maturity", icon: LayersIcon, label: "Surface maturity" },
  { href: "/admin/detail/all#admin-detail-ai-input-readiness", icon: SparklesIcon, label: "AI Input readiness" },
  { href: "/admin/detail/all#admin-detail-owner-auth-boundary", icon: KeyRoundIcon, label: "Auth boundary" },
  { href: "/admin/detail/all#admin-detail-agent-protocol", icon: BotIcon, label: "Agent protocol" },
  { href: "/admin/detail/all#admin-detail-env-evidence", icon: DatabaseIcon, label: "Env and evidence" },
  { href: "/admin/detail/all#admin-detail-client-portal", icon: UsersIcon, label: "Client Portal" },
  { href: "/admin/detail/all#admin-detail-audit-contract", icon: LockIcon, label: "Audit contract" },
  { href: "/admin/detail/all#admin-detail-write-boundary", icon: ShieldAlertIcon, label: "Write boundary" },
]
