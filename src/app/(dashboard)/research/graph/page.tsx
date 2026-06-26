"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, NetworkIcon, InfoIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { ResearchNetworkGraph } from "@/components/research/research-network-graph"

export default function GraphPage() {
  const router = useRouter()
  const { issues, concepts, sources, ideasV2, writingProjects, events, people, links } = useResearch()

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader
        title="研究物件關聯圖"
        description="Research Object Network — 節點關聯視覺化"
      />

      {/* Sub-nav */}
      <div className="border-b px-6 py-2.5 flex items-center justify-between gap-4">
        <button
          onClick={() => router.push("/research")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" /> 返回工作台
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <NetworkIcon className="size-3.5 text-primary" />
          <span>{issues.length + concepts.length + sources.length + ideasV2.length + writingProjects.length + events.length + people.length} 個節點</span>
          <span>·</span>
          <span>{links.length} 條關聯</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg">
          <InfoIcon className="size-3 shrink-0" />
          可拖曳節點、滾輪縮放、點擊節點查看詳情
        </div>
      </div>

      {/* Graph — needs explicit height, not overflow-hidden */}
      <div className="flex-1 overflow-hidden">
        {mounted ? (
          <ResearchNetworkGraph
            issues={issues}
            concepts={concepts}
            sources={sources}
            ideasV2={ideasV2}
            writingProjects={writingProjects}
            events={events}
            people={people}
            links={links}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground animate-pulse">載入關聯圖…</div>
          </div>
        )}
      </div>
    </div>
  )
}
