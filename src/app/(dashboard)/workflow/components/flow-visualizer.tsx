"use client"

import * as React from "react"
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  BriefcaseIcon,
  BuildingIcon,
  FlaskConicalIcon,
  HeartPulseIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
import { AGENTS, AGENT_MAP } from "@/lib/workflow/agents"
import type { AgentId, WorkflowRule, AgentMessage } from "@/lib/workflow/types"
import { countMessagesByRoute } from "@/lib/workflow/mock-data"

// ─── Custom Node ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  Briefcase: <BriefcaseIcon className="size-4" />,
  Users: <UsersIcon className="size-4" />,
  FlaskConical: <FlaskConicalIcon className="size-4" />,
  Wallet: <WalletIcon className="size-4" />,
  Building: <BuildingIcon className="size-4" />,
  HeartPulse: <HeartPulseIcon className="size-4" />,
}

type AgentNodeData = {
  label: string
  icon: string
  color: string
  bgColor: string
  msgCount: number
  isSelected: boolean
}

function AgentNode({ data }: NodeProps) {
  const d = data as AgentNodeData
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 px-5 py-3 shadow-sm transition-shadow hover:shadow-md"
      style={{
        borderColor: d.isSelected ? d.color : d.color + "50",
        background: d.bgColor,
        minWidth: 110,
      }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div
        className="flex size-9 items-center justify-center rounded-xl"
        style={{ background: d.color + "20", color: d.color }}
      >
        {ICON_MAP[d.icon]}
      </div>
      <p className="text-xs font-semibold leading-none" style={{ color: d.color }}>
        {d.label}
      </p>
      {d.msgCount > 0 && (
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ background: d.color + "20", color: d.color }}
        >
          {d.msgCount}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}

const nodeTypes = { agent: AgentNode }

// ─── Layout positions ─────────────────────────────────────────────────────────

const POSITIONS: Record<AgentId, { x: number; y: number }> = {
  work: { x: 340, y: 20 },
  chamber: { x: 60, y: 180 },
  research: { x: 620, y: 180 },
  finance: { x: 60, y: 380 },
  company: { x: 620, y: 380 },
  life: { x: 340, y: 540 },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FlowVisualizerProps {
  rules: WorkflowRule[]
  messages: AgentMessage[]
  selectedAgent: AgentId | null
  onSelectAgent: (id: AgentId | null) => void
}

export function FlowVisualizer({ rules, messages, selectedAgent, onSelectAgent }: FlowVisualizerProps) {
  const routeCounts = React.useMemo(() => countMessagesByRoute(messages), [messages])

  const nodes: Node[] = React.useMemo(
    () =>
      AGENTS.map((agent) => {
        const msgCount = messages.filter(
          (m) => m.toAgent === agent.agentId && m.fromAgent !== "user"
        ).length
        return {
          id: agent.agentId,
          type: "agent",
          position: POSITIONS[agent.agentId],
          data: {
            label: agent.displayName,
            icon: agent.icon,
            color: agent.color,
            bgColor: agent.bgColor,
            msgCount,
            isSelected: selectedAgent === agent.agentId,
          },
        }
      }),
    [messages, selectedAgent]
  )

  const edges: Edge[] = React.useMemo(() => {
    const seen = new Set<string>()
    const result: Edge[] = []

    for (const rule of rules) {
      if (!rule.enabled) continue
      if (rule.fromAgent === "*") continue
      const key = `${rule.fromAgent}->${rule.toAgent}`
      if (seen.has(key)) continue
      seen.add(key)

      const count = routeCounts.get(key) ?? 0
      const fromAgent = AGENT_MAP[rule.fromAgent as AgentId]

      result.push({
        id: key,
        source: rule.fromAgent,
        target: rule.toAgent,
        animated: count > 0,
        style: {
          stroke: fromAgent?.color ?? "#6b7280",
          strokeWidth: Math.max(1.5, Math.min(4, 1.5 + count * 0.5)),
          strokeOpacity: rule.enabled ? 0.8 : 0.3,
        },
        label: count > 0 ? `${count}` : undefined,
        labelStyle: { fontSize: 10, fill: fromAgent?.color ?? "#6b7280", fontWeight: 600 },
        labelBgStyle: { fill: "transparent" },
        markerEnd: {
          type: "arrowclosed" as const,
          color: fromAgent?.color ?? "#6b7280",
          width: 16,
          height: 16,
        },
      })
    }
    return result
  }, [rules, routeCounts])

  return (
    <div className="relative flex-1 rounded-2xl border border-border/50 overflow-hidden bg-card/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          onSelectAgent(selectedAgent === node.id ? null : (node.id as AgentId))
        }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="rgba(255,255,255,0.03)" />
        <Controls
          showInteractive={false}
          className="[&>button]:bg-card [&>button]:border-border [&>button]:text-foreground"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-12 right-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur px-3 py-2 flex flex-col gap-1.5">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">圖例</p>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] text-muted-foreground">活躍路由</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded-full bg-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">靜態規則</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-primary" />
          <span className="text-[11px] text-muted-foreground">訊息數量</span>
        </div>
      </div>
    </div>
  )
}
