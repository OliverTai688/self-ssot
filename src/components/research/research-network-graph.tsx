"use client"

import * as React from "react"
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BackgroundVariant,
  type NodeProps,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import {
  ResearchIssue,
  ResearchConcept,
  ResearchSource,
  ResearchIdeaV2,
  ResearchWritingProject,
  ResearchEvent,
  AcademicPerson,
  ResearchLink,
} from "@/types/research"

// ─── Entity config ─────────────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<string, { color: string; bg: string; label: string; angle: number }> = {
  issue:           { color: "#8b5cf6", bg: "#8b5cf615", label: "研究議題",  angle: 270 },
  concept:         { color: "#3b82f6", bg: "#3b82f615", label: "概念",      angle: 328 },
  source:          { color: "#0d9488", bg: "#0d948815", label: "來源",      angle: 26  },
  idea:            { color: "#f59e0b", bg: "#f59e0b15", label: "想法",      angle: 84  },
  writing_project: { color: "#10b981", bg: "#10b98115", label: "寫作",      angle: 142 },
  event:           { color: "#f43f5e", bg: "#f43f5e15", label: "研討會",    angle: 200 },
  person:          { color: "#a855f7", bg: "#a855f715", label: "學者",      angle: 212 },
}

const RELATION_LABELS: Record<string, string> = {
  supports: "支持", contradicts: "反駁", defines: "定義", mentions: "提及",
  inspired_by: "啟發", used_in: "用於", related_to: "相關", submitted_to: "投稿",
  authored_by: "作者", affiliated_with: "隸屬", participates_in: "參與",
  chaired_by: "主持", belongs_to: "屬於", clarifies: "釐清", extends: "延伸",
}

// ─── Layout ────────────────────────────────────────────────────────────────────

const CENTER = { x: 720, y: 360 }
const OUTER_RADIUS = 330
const NODE_SPREAD = 100

function clusterPositions(angleDeg: number, count: number): { x: number; y: number }[] {
  const rad = (angleDeg * Math.PI) / 180
  const cx = CENTER.x + Math.cos(rad) * OUTER_RADIUS
  const cy = CENTER.y + Math.sin(rad) * OUTER_RADIUS
  const perpRad = rad + Math.PI / 2
  return Array.from({ length: count }, (_, i) => {
    const offset = (i - (count - 1) / 2) * NODE_SPREAD
    return { x: cx + Math.cos(perpRad) * offset, y: cy + Math.sin(perpRad) * offset }
  })
}

// ─── Custom Node ───────────────────────────────────────────────────────────────

type ResearchNodeData = {
  label: string
  subtitle?: string
  entityType: string
}

function ResearchNode({ data }: NodeProps) {
  const d = data as ResearchNodeData
  const cfg = ENTITY_CONFIG[d.entityType] ?? { color: "#64748b", bg: "#64748b15", label: d.entityType }

  return (
    <div
      style={{
        background: cfg.bg,
        borderColor: cfg.color,
        borderWidth: 1.5,
        borderStyle: "solid",
        borderRadius: 12,
        padding: "8px 12px",
        minWidth: 120,
        maxWidth: 180,
        boxShadow: `0 2px 12px ${cfg.color}25`,
        cursor: "grab",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: cfg.color, width: 6, height: 6, border: "none" }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
        {cfg.label}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "currentColor", lineHeight: 1.35, wordBreak: "break-word" }}>
        {d.label}
      </div>
      {d.subtitle && (
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, lineHeight: 1.3 }}>{d.subtitle}</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: cfg.color, width: 6, height: 6, border: "none" }} />
    </div>
  )
}

const nodeTypes = { researchNode: ResearchNode }

// ─── Builder ───────────────────────────────────────────────────────────────────

interface GraphData {
  issues: ResearchIssue[]
  concepts: ResearchConcept[]
  sources: ResearchSource[]
  ideasV2: ResearchIdeaV2[]
  writingProjects: ResearchWritingProject[]
  events: ResearchEvent[]
  people: AcademicPerson[]
  links: ResearchLink[]
}

function buildGraph(data: GraphData, hiddenTypes: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []

  function addNodes<T>(
    items: T[],
    entityType: string,
    getId: (item: T) => string,
    getLabel: (item: T) => string,
    getSubtitle?: (item: T) => string | undefined,
  ) {
    if (hiddenTypes.has(entityType)) return
    const cfg = ENTITY_CONFIG[entityType]
    const positions = clusterPositions(cfg?.angle ?? 0, items.length)
    items.forEach((item, i) => {
      nodes.push({
        id: getId(item),
        type: "researchNode",
        position: positions[i],
        data: {
          label: getLabel(item),
          subtitle: getSubtitle?.(item),
          entityType,
        } as ResearchNodeData,
      })
    })
  }

  addNodes(data.issues, "issue",
    (i) => i.id,
    (i) => i.title,
    (i) => i.status,
  )
  addNodes(data.concepts, "concept",
    (c) => c.id,
    (c) => c.name,
    (c) => c.shortDefinition?.slice(0, 40),
  )
  addNodes(data.sources, "source",
    (s) => s.id,
    (s) => s.title.length > 40 ? s.title.slice(0, 40) + "…" : s.title,
    (s) => s.authors?.[0] ?? s.sourceType,
  )
  addNodes(data.ideasV2, "idea",
    (i) => i.id,
    (i) => i.title,
    (i) => i.ideaType,
  )
  addNodes(data.writingProjects, "writing_project",
    (w) => w.id,
    (w) => w.title.length > 40 ? w.title.slice(0, 40) + "…" : w.title,
    (w) => w.status,
  )
  addNodes(data.events, "event",
    (e) => e.id,
    (e) => e.name.length > 40 ? e.name.slice(0, 40) + "…" : e.name,
    (e) => e.eventType,
  )
  addNodes(data.people, "person",
    (p) => p.id,
    (p) => p.name,
    (p) => p.affiliation?.slice(0, 30),
  )

  const nodeIds = new Set(nodes.map((n) => n.id))

  const edges: Edge[] = data.links
    .filter((l) => nodeIds.has(l.fromId) && nodeIds.has(l.toId))
    .map((l) => {
      const fromCfg = ENTITY_CONFIG[l.fromType]
      return {
        id: l.id,
        source: l.fromId,
        target: l.toId,
        label: RELATION_LABELS[l.relationType] ?? l.relationType,
        type: "smoothstep",
        animated: l.confidence === "high",
        style: {
          stroke: fromCfg?.color ?? "#64748b",
          strokeWidth: l.confidence === "high" ? 2 : 1,
          strokeOpacity: l.confidence === "low" ? 0.4 : 0.75,
        },
        labelStyle: { fontSize: 10, fill: "currentColor", fontWeight: 600 },
        labelBgStyle: { fill: "transparent" },
        markerEnd: { type: "arrowclosed" as const, color: fromCfg?.color ?? "#64748b" },
      }
    })

  return { nodes, edges }
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface ResearchNetworkGraphProps {
  issues: ResearchIssue[]
  concepts: ResearchConcept[]
  sources: ResearchSource[]
  ideasV2: ResearchIdeaV2[]
  writingProjects: ResearchWritingProject[]
  events: ResearchEvent[]
  people: AcademicPerson[]
  links: ResearchLink[]
}

export function ResearchNetworkGraph(props: ResearchNetworkGraphProps) {
  const [hiddenTypes, setHiddenTypes] = React.useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)

  const { nodes: initNodes, edges: initEdges } = React.useMemo(
    () => buildGraph(props, hiddenTypes),
    [props, hiddenTypes],
  )

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, , onEdgesChange] = useEdgesState(initEdges)

  // Re-sync when hiddenTypes changes
  const { nodes: freshNodes, edges: freshEdges } = React.useMemo(
    () => buildGraph(props, hiddenTypes),
    [props, hiddenTypes],
  )

  function toggleType(type: string) {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
    setSelectedNode(null)
  }

  const totalNodes = freshNodes.length
  const totalEdges = freshEdges.length

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r border-border bg-card flex flex-col overflow-y-auto">
        <div className="px-3 py-3 border-b border-border/50 space-y-0.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">圖層篩選</p>
          <p className="text-[10px] text-muted-foreground">{totalNodes} 節點 · {totalEdges} 關聯</p>
        </div>

        <div className="p-3 space-y-1.5">
          {Object.entries(ENTITY_CONFIG).map(([type, cfg]) => {
            const hidden = hiddenTypes.has(type)
            const count = {
              issue: props.issues.length,
              concept: props.concepts.length,
              source: props.sources.length,
              idea: props.ideasV2.length,
              writing_project: props.writingProjects.length,
              event: props.events.length,
              person: props.people.length,
            }[type] ?? 0
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${hidden ? "opacity-40" : "opacity-100"} hover:bg-muted/50`}
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
                <span className="text-xs text-foreground flex-1">{cfg.label}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="px-3 py-3 border-t border-border/50 mt-auto space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">關係圖例</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-muted-foreground/50" style={{ backgroundImage: "none" }} />
              <span className="text-[10px] text-muted-foreground">一般關聯</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 border-t-2 border-dashed border-primary/60" />
              <span className="text-[10px] text-muted-foreground">高信心 (動態)</span>
            </div>
          </div>
        </div>

        {/* Selected node info */}
        {selectedNode && (
          <div className="px-3 py-3 border-t border-border/50 space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">選中節點</p>
            <div
              className="rounded-lg p-2.5"
              style={{ background: ENTITY_CONFIG[(selectedNode.data as ResearchNodeData).entityType]?.bg ?? "#64748b15" }}
            >
              <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
                style={{ color: ENTITY_CONFIG[(selectedNode.data as ResearchNodeData).entityType]?.color }}>
                {ENTITY_CONFIG[(selectedNode.data as ResearchNodeData).entityType]?.label}
              </p>
              <p className="text-[11px] text-foreground font-semibold leading-snug">
                {(selectedNode.data as ResearchNodeData).label}
              </p>
              {(selectedNode.data as ResearchNodeData).subtitle && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {(selectedNode.data as ResearchNodeData).subtitle}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={freshNodes}
          edges={freshEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNode(node)}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            style={{ bottom: 16, right: 16, left: "auto" }}
            showInteractive={false}
          />
          <MiniMap
            style={{ bottom: 100, right: 16, borderRadius: 8, width: 140, height: 90 }}
            nodeColor={(n) => {
              const cfg = ENTITY_CONFIG[(n.data as ResearchNodeData)?.entityType]
              return cfg?.color ?? "#64748b"
            }}
            maskColor="transparent"
            pannable
            zoomable
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="currentColor" style={{ opacity: 0.08 }} />
        </ReactFlow>
      </div>
    </div>
  )
}
