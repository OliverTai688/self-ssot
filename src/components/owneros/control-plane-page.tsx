"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ControlPlaneShell,
  DetailList,
  DetailListRow,
  toneBadgeVariant,
} from "@/components/owneros/control-plane-shell"
import { adminNavItems, settingsNavItems } from "@/components/owneros/control-plane-nav"
import { Badge } from "@/components/ui/badge"
import type {
  ControlPlaneMatrixSection,
  ControlPlanePageContent,
  ControlPlanePageModel,
  ControlPlaneRow,
  ControlPlaneSection,
  ControlPlaneTone,
} from "@/lib/owneros/control-plane-pages"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProductLocale } from "@/lib/i18n/product-copy"

const uiLabels: Record<
  ProductLocale,
  {
    about: string
    boundary: string
    finalNote: string
    tones: Record<ControlPlaneTone, string>
  }
> = {
  "zh-TW": {
    about: "關於這個頁面",
    boundary: "邊界",
    finalNote:
      "目前頁面是 UI-L4 收斂用的可審核控制面。它可以整理狀態、邊界與下一步，但不會啟用 provider、權限寫入、公開輸出或外部 agent 註冊。",
    tones: {
      ready: "就緒",
      review: "檢查中",
      blocked: "封鎖",
      proposal: "提案中",
    },
  },
  "en-US": {
    about: "About this page",
    boundary: "Boundary",
    finalNote:
      "This is a reviewable UI-L4 control plane. It organizes state, boundaries, and next steps without enabling providers, permission writes, public output, or external agent registration.",
    tones: {
      ready: "Ready",
      review: "Review",
      blocked: "Blocked",
      proposal: "Proposal",
    },
  },
}

/** One `sections[n]` entry rendered as a row list instead of a <table>. */
function BoundaryRowList({ rows, locale }: { rows: ControlPlaneRow[]; locale: ProductLocale }) {
  const labels = uiLabels[locale]
  return (
    <DetailList>
      {rows.map((row) => (
        <DetailListRow
          key={row.label}
          label={row.label}
          status={row.status}
          summary={row.description}
          detailTitle={row.label}
          detail={
            <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
              <p>{row.description}</p>
              <p>
                <span className="font-medium text-foreground">{labels.boundary}</span>: {row.boundary}
              </p>
            </div>
          }
        />
      ))}
    </DetailList>
  )
}

/** One `matrixSections[n]` entry rendered as a row list; the per-column
 * values that used to spread across a wide table live behind the row's
 * detail popup instead. */
function MatrixRowList({ section, locale }: { section: ControlPlaneMatrixSection; locale: ProductLocale }) {
  const labels = uiLabels[locale]
  return (
    <DetailList>
      {section.rows.map((row) => (
        <DetailListRow
          key={row.label}
          label={row.label}
          status={row.tone ? labels.tones[row.tone] : undefined}
          tone={row.tone}
          summary={row.values[0]}
          detailTitle={row.label}
          detail={
            <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
              {section.columns.map((column, index) => (
                <p key={column}>
                  <span className="font-medium text-foreground">{column}</span>: {row.values[index] ?? "—"}
                </p>
              ))}
            </div>
          }
        />
      ))}
    </DetailList>
  )
}

function StatStrip({ model }: { model: ControlPlanePageContent }) {
  return (
    <section className="grid overflow-hidden rounded-lg border bg-background sm:grid-cols-3">
      {model.stats.map((stat) => (
        <div
          key={stat.label}
          className="border-b px-3 py-2.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
            <Badge variant={toneBadgeVariant(stat.tone)} className="text-[10px]">
              {stat.value}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{stat.detail}</p>
        </div>
      ))}
    </section>
  )
}

export function ControlPlanePage({
  model,
  children,
}: {
  model: ControlPlanePageModel
  children?: React.ReactNode
}) {
  const { locale } = useProductLanguage()
  const pathname = usePathname()
  const visibleModel: ControlPlanePageContent = model.locales?.[locale] ?? model
  const labels = uiLabels[locale]

  const navItems = pathname?.startsWith("/admin") ? adminNavItems : settingsNavItems
  const activeHref = navItems.find((item) => item.href === pathname)?.href ?? navItems[0].href

  const tabEntries: Array<{ key: string; title: string; description: string; content: React.ReactNode }> = [
    ...visibleModel.sections.map((section: ControlPlaneSection) => ({
      key: `section-${section.title}`,
      title: section.title,
      description: section.description,
      content: <BoundaryRowList rows={section.rows} locale={locale} />,
    })),
    ...(visibleModel.matrixSections ?? []).map((section) => ({
      key: `matrix-${section.title}`,
      title: section.title,
      description: section.description,
      content: <MatrixRowList section={section} locale={locale} />,
    })),
  ]

  const actions = (
    <>
      {visibleModel.secondaryActions?.map((action) => (
        <Button key={action.href} variant="outline" size="sm" render={<Link href={action.href} />}>
          {action.label}
        </Button>
      ))}
      {visibleModel.primaryAction && (
        <Button size="sm" render={<Link href={visibleModel.primaryAction.href} />}>
          {visibleModel.primaryAction.label}
        </Button>
      )}
    </>
  )

  return (
    <ControlPlaneShell
      title={visibleModel.title}
      description={visibleModel.description}
      eyebrow={visibleModel.eyebrow}
      stateLabel={visibleModel.stateLabel}
      stateTone={visibleModel.stateTone}
      navItems={navItems}
      activeHref={activeHref}
      actions={actions}
      aboutTitle={labels.about}
      aboutContent={<p className="text-xs leading-relaxed text-muted-foreground">{labels.finalNote}</p>}
    >
      <StatStrip model={visibleModel} />

      {tabEntries.length > 1 ? (
        <Tabs defaultValue={tabEntries[0].key}>
          <TabsList>
            {tabEntries.map((entry) => (
              <TabsTrigger key={entry.key} value={entry.key}>
                {entry.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabEntries.map((entry) => (
            <TabsContent key={entry.key} value={entry.key} className="flex flex-col gap-1.5">
              <p className="px-0.5 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
              {entry.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        tabEntries.map((entry) => (
          <section key={entry.key} className="flex flex-col gap-1.5">
            <div className="px-0.5">
              <h2 className="text-sm font-semibold">{entry.title}</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
            </div>
            {entry.content}
          </section>
        ))
      )}

      {children}
    </ControlPlaneShell>
  )
}
