"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BriefcaseIcon,
  BuildingIcon,
  BotIcon,
  ChevronDownIcon,
  FlaskConicalIcon,
  GitBranchIcon,
  HeartPulseIcon,
  InboxIcon,
  LayoutDashboardIcon,
  PanelLeftIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
  UserIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useIngestion } from "@/lib/context/ingestion-context"
import { useModulePermissions } from "@/lib/context/module-permissions-context"
import { useProductLanguage } from "@/lib/context/product-language-context"
import { ModuleKey } from "@/types/module-permission"

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  showBadge?: boolean
  moduleKey?: ModuleKey
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
  collapsible?: boolean
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = "owneros-sidebar-collapsed"

export function AppSidebar({
  currentUser,
}: {
  currentUser?: { email: string; role: string }
}) {
  const pathname = usePathname()
  const { pendingProposalCount: pendingCount } = useIngestion()
  const { isModuleEnabled } = useModulePermissions()
  const { copy } = useProductLanguage()

  const [collapsed, setCollapsed] = React.useState(false)
  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1")
    } catch {
      // localStorage unavailable (e.g. private mode) — keep default expanded state
    }
  }, [])

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? "1" : "0")
      } catch {
        // ignore persistence failure, state still updates for this session
      }
      return next
    })
  }, [])

  const navGroups: NavGroup[] = [
    {
      id: "today",
      label: copy.nav.today,
      items: [
        {
          id: "today",
          label: copy.nav.today,
          href: "/dashboard",
          icon: <LayoutDashboardIcon className="size-4" />,
          moduleKey: "dashboard",
        },
      ],
    },
    {
      id: "ai-work",
      label: copy.navGroups.aiWork,
      items: [
        {
          id: "ai-workbench",
          label: copy.nav.aiWorkbench,
          href: "/ai-input",
          icon: <SparklesIcon className="size-4" />,
          moduleKey: "ai-input",
        },
        {
          id: "inbox",
          label: copy.nav.inbox,
          href: "/inbox",
          icon: <InboxIcon className="size-4" />,
          showBadge: true,
          moduleKey: "inbox",
        },
        {
          id: "agents",
          label: copy.nav.agents,
          href: "/agents",
          icon: <BotIcon className="size-4" />,
        },
      ],
    },
    {
      id: "core-ops",
      label: copy.navGroups.coreOps,
      items: [
        {
          id: "work",
          label: copy.nav.work,
          href: "/work",
          icon: <BriefcaseIcon className="size-4" />,
          moduleKey: "work",
        },
        {
          id: "research",
          label: copy.nav.research,
          href: "/research",
          icon: <FlaskConicalIcon className="size-4" />,
          moduleKey: "research",
        },
        {
          id: "yuanzhan-operating",
          label: "圓展工作台",
          href: "/company/operating",
          icon: <BuildingIcon className="size-4" />,
        },
        {
          id: "company",
          label: copy.nav.company,
          href: "/company",
          icon: <BuildingIcon className="size-4" />,
          moduleKey: "company",
        },
        {
          id: "workflow",
          label: copy.nav.workflow,
          href: "/workflow",
          icon: <GitBranchIcon className="size-4" />,
          moduleKey: "workflow",
        },
      ],
    },
    {
      id: "system",
      label: copy.navGroups.system,
      items: [
        {
          id: "settings",
          label: copy.nav.settings,
          href: "/settings",
          icon: <SettingsIcon className="size-4" />,
        },
        {
          id: "admin",
          label: copy.nav.admin,
          href: "/admin",
          icon: <ShieldCheckIcon className="size-4" />,
        },
      ],
    },
    {
      id: "more",
      label: copy.navGroups.more,
      collapsible: true,
      items: [
        {
          id: "self",
          label: copy.nav.self,
          href: "/self",
          icon: <UserIcon className="size-4" />,
          moduleKey: "self",
        },
        {
          id: "chamber",
          label: copy.nav.chamber,
          href: "/chamber",
          icon: <UsersIcon className="size-4" />,
          moduleKey: "chamber",
        },
        {
          id: "life",
          label: copy.nav.life,
          href: "/life",
          icon: <HeartPulseIcon className="size-4" />,
          moduleKey: "life",
        },
        {
          id: "finance",
          label: copy.nav.finance,
          href: "/finance",
          icon: <WalletIcon className="size-4" />,
          moduleKey: "finance",
        },
      ],
    },
  ]

  const isActive = React.useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname]
  )

  const filteredNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (item.moduleKey ? isModuleEnabled(item.moduleKey) : true)),
    }))
    .filter((group) => group.items.length > 0)

  const moreGroupActive = filteredNavGroups
    .find((group) => group.id === "more")
    ?.items.some((item) => isActive(item.href))

  const [expandedGroupIds, setExpandedGroupIds] = React.useState<Set<string>>(() => new Set())
  React.useEffect(() => {
    if (!moreGroupActive) return
    setExpandedGroupIds((current) => {
      const next = new Set(current)
      next.add("more")
      return next
    })
  }, [moreGroupActive])

  function toggleGroup(groupId: string) {
    setExpandedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const memberInitial = currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "?"
  const memberName = currentUser?.email ? currentUser.email.split("@")[0] : null

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-sidebar transition-[width] duration-200",
        collapsed ? "w-14" : "w-56"
      )}
      data-owneros-surface="OWNEROS-NAV-001-SIDEBAR"
    >
      {/* Brand */}
      <div className={cn("flex h-14 items-center border-b", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed && (
          <span className="min-w-0 truncate font-semibold text-sm text-sidebar-foreground tracking-tight">{copy.productName}</span>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "展開側欄" : "收縮側欄"}
          title={collapsed ? "展開側欄" : "收縮側欄"}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <PanelLeftIcon className="size-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {filteredNavGroups.map((group) => {
          const groupActive = group.items.some((item) => isActive(item.href))
          const expanded = !group.collapsible || expandedGroupIds.has(group.id)

          return (
            <div key={group.id} className="space-y-0.5">
              {group.id !== "today" && !collapsed &&
                (group.collapsible ? (
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium transition-colors",
                      groupActive
                        ? "bg-sidebar-accent/70 text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <span className="flex-1">{group.label}</span>
                    <ChevronDownIcon
                      className={cn("size-3 transition-transform", expanded ? "rotate-180" : "rotate-0")}
                    />
                  </button>
                ) : (
                  <p className="px-3 pt-2 text-[10px] font-medium text-sidebar-foreground/40">{group.label}</p>
                ))}

              {(expanded || collapsed) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg py-2 text-sm transition-colors",
                          collapsed ? "justify-center px-0" : "px-3",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        {item.icon}
                        {!collapsed && (
                          <>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.showBadge && pendingCount > 0 && (
                              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                                {pendingCount > 99 ? "99+" : pendingCount}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer: member card */}
      <div className={cn("border-t", collapsed ? "p-2" : "p-3")}>
        {currentUser && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg py-1.5",
              collapsed ? "justify-center" : "px-1 mb-2"
            )}
            title={collapsed ? `${memberName ?? currentUser.email} · ${copy.productName}` : undefined}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground">
              {memberInitial}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-sidebar-foreground">{memberName ?? currentUser.email}</p>
                <p className="truncate text-[10px] text-sidebar-foreground/50">{copy.productName} · {currentUser.role}</p>
              </div>
            )}
          </div>
        )}

        {!collapsed && (
          <p className="text-[11px] text-sidebar-foreground/40">{copy.state.quickCapture}</p>
        )}
      </div>
    </aside>
  )
}
