import { AGENTS } from "./agents"
import type { WorkflowRule, AgentMessage, AgentId, Intent } from "./types"

function makeId() {
  return crypto.randomUUID()
}

// ─── Rule Matching ────────────────────────────────────────────────────────────

export function matchRules(
  fromAgent: AgentId,
  intent: Intent,
  rules: WorkflowRule[]
): WorkflowRule[] {
  return rules
    .filter(
      (r) =>
        r.enabled &&
        (r.fromAgent === fromAgent || r.fromAgent === "*") &&
        r.intent === intent
    )
    .sort((a, b) => a.priority - b.priority)
}

// ─── Primary Agent Resolution ─────────────────────────────────────────────────

export function resolveAgentForIntent(intent: Intent): AgentId | null {
  return AGENTS.find((a) => a.capabilities.includes(intent))?.agentId ?? null
}

// ─── Main Dispatch ────────────────────────────────────────────────────────────
//
// Called with either fromAgent="user" (direct user input) or an actual AgentId
// (cross-module trigger). Returns all generated messages for this trace.
//
// Pattern:
//   user → toAgent  (root, represents user-initiated intent)
//   toAgent → ruleTarget  (child messages, triggered by matching rules)

export function dispatchIntent(
  fromAgent: AgentId | "user",
  toAgent: AgentId,
  intent: Intent,
  payload: Record<string, unknown>,
  rules: WorkflowRule[],
  options: {
    summary?: string
    traceId?: string
    parentMessageId?: string
  } = {}
): AgentMessage[] {
  const { summary, parentMessageId } = options
  const traceId = options.traceId ?? makeId()
  const now = new Date().toISOString()
  const messages: AgentMessage[] = []

  // Root message
  const rootMsg: AgentMessage = {
    id: makeId(),
    traceId,
    ...(parentMessageId ? { parentMessageId } : {}),
    fromAgent,
    toAgent,
    intent,
    payload,
    status: "completed",
    createdAt: now,
    completedAt: now,
    summary,
  }
  messages.push(rootMsg)

  // Find rules triggered by toAgent + intent
  const matched = matchRules(toAgent, intent, rules)

  for (const rule of matched) {
    const childMsg: AgentMessage = {
      id: makeId(),
      traceId,
      parentMessageId: rootMsg.id,
      fromAgent: toAgent,
      toAgent: rule.toAgent,
      intent: rule.targetIntent,
      payload,
      status: rule.requiresApproval ? "pending" : "completed",
      ruleId: rule.id,
      createdAt: now,
      completedAt: rule.requiresApproval ? undefined : now,
      summary: rule.requiresApproval
        ? `[等待批准] ${rule.name}`
        : `[規則] ${rule.name}`,
    }
    messages.push(childMsg)
  }

  return messages
}

// ─── Describe Routing ─────────────────────────────────────────────────────────
// Returns human-readable routing preview before dispatch, used by AI Input UI.

export function describeRouting(
  toAgent: AgentId,
  intent: Intent,
  rules: WorkflowRule[]
): { primary: AgentId; secondary: Array<{ agent: AgentId; rule: string }> } {
  const matched = matchRules(toAgent, intent, rules)
  return {
    primary: toAgent,
    secondary: matched.map((r) => ({ agent: r.toAgent, rule: r.name })),
  }
}
