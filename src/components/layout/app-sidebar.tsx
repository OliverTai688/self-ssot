"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BriefcaseIcon,
  BuildingIcon,
  BotIcon,
  DatabaseIcon,
  FlaskConicalIcon,
  GitBranchIcon,
  HeartPulseIcon,
  InboxIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useIngestion } from "@/lib/context/ingestion-context"
import { useMockDataMode } from "@/lib/context/mock-data-mode-context"
import { useModulePermissions } from "@/lib/context/module-permissions-context"
import { ModuleKey } from "@/types/module-permission"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  showBadge?: boolean
}

export function AppSidebar() {
  const pathname = usePathname()
  const { pendingProposalCount: pendingCount } = useIngestion()
  const { isMockDataEnabled, toggleMockData } = useMockDataMode()
  const { isModuleEnabled } = useModulePermissions()

  const navItems: NavItem[] = [
    {
      label: "AI 匯入",
      href: "/ai-input",
      icon: <SparklesIcon className="size-4" />,
    },
    {
      label: "早安簡報",
      href: "/dashboard",
      icon: <LayoutDashboardIcon className="size-4" />,
    },
    {
      label: "收件匣",
      href: "/inbox",
      icon: <InboxIcon className="size-4" />,
      showBadge: true,
    },
    {
      label: "工作",
      href: "/work",
      icon: <BriefcaseIcon className="size-4" />,
    },
    {
      label: "研究",
      href: "/research",
      icon: <FlaskConicalIcon className="size-4" />,
    },
    {
      label: "商會",
      href: "/chamber",
      icon: <UsersIcon className="size-4" />,
    },
    {
      label: "財務",
      href: "/finance",
      icon: <WalletIcon className="size-4" />,
    },
    {
      label: "生活",
      href: "/life",
      icon: <HeartPulseIcon className="size-4" />,
    },
    {
      label: "公司",
      href: "/company",
      icon: <BuildingIcon className="size-4" />,
    },
    {
      label: "AI 指令",
      href: "/agents",
      icon: <BotIcon className="size-4" />,
    },
    {
      label: "Workflow",
      href: "/workflow",
      icon: <GitBranchIcon className="size-4" />,
    },
    {
      label: "設定",
      href: "/settings",
      icon: <SettingsIcon className="size-4" />,
    },
    {
      label: "管理",
      href: "/admin",
      icon: <ShieldCheckIcon className="size-4" />,
    },
  ]

  const keyMap: Record<string, ModuleKey> = {
    "/ai-input": "ai-input",
    "/dashboard": "dashboard",
    "/inbox": "inbox",
    "/work": "work",
    "/research": "research",
    "/chamber": "chamber",
    "/finance": "finance",
    "/life": "life",
    "/company": "company",
    "/workflow": "workflow",
  }

  // Filter navigation items dynamically based on module permissions
  const filteredNavItems = navItems.filter((item) => {
    const key = keyMap[item.href]
    return key ? isModuleEnabled(key) : true
  })

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center px-4 border-b">
        <span className="font-semibold text-sm text-sidebar-foreground tracking-tight">Personal OS</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {filteredNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.showBadge && pendingCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer hint */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-sidebar-foreground/40">⌘K 快速擷取</p>
          <button
            type="button"
            onClick={toggleMockData}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors",
              isMockDataEnabled
                ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            )}
            title={isMockDataEnabled ? "關閉 mock data，切到正式模式" : "重新開啟 mock data demo"}
          >
            <DatabaseIcon className="size-3" />
            {isMockDataEnabled ? "Mock" : "正式"}
          </button>
        </div>
      </div>
    </aside>
  )
}
