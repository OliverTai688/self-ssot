# D-PROPOSAL-001: Agent Team OS Prisma Schema Additions

**Task:** AGENT-002
**Date:** 2026-06-09
**Status:** PROPOSAL — do not migrate until DB-001 + AUTH-001 are both complete

---

## Context

`D-CONTRACT-001-agent-team-os.md` defines the governance model and lists initial Prisma models for `AgentProfile`. This document proposes the full schema addition covering all Agent Team OS entities needed for v0.1 governance tracking.

---

## Proposed Prisma Models

```prisma
// Agent identity and capability registration
model AgentProfile {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key                  String   @unique  // e.g. "WorkAgent", "UIUXAgent"
  name                 String
  description          String?
  moduleKey            String?           // null = cross-module
  agentType            String            // "development", "governance", "analysis", "advisory"
  status               String   @default("ACTIVE")  // ACTIVE, SUSPENDED, ARCHIVED
  ownerProfileId       String?  @db.Uuid
  defaultModelProvider String?           // "anthropic", "openai", "local", "mock"
  defaultModelName     String?
  createdAt            DateTime @default(now())  @map("created_at")
  updatedAt            DateTime @updatedAt       @map("updated_at")

  runs                 AgentRun[]
  approvalRequests     AgentApprovalRequest[]
  messages             AgentMessage[]
}

// A bounded execution context for an agent working on a scoped task
model AgentRun {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agentProfileId  String   @db.Uuid
  agentProfile    AgentProfile @relation(fields: [agentProfileId], references: [id])
  taskRef         String?           // e.g. "UIUX-001", "WORK-007"
  contextPackage  Json?             // scoped read context provided to agent
  status          String            // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
  startedAt       DateTime?         @map("started_at")
  completedAt     DateTime?         @map("completed_at")
  outputSummary   String?           @map("output_summary")
  outputArtifacts Json?             @map("output_artifacts")  // list of file paths / record IDs proposed
  riskLevel       String?           @map("risk_level")  // LOW, MEDIUM, HIGH, CRITICAL
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt      @map("updated_at")

  approvalRequests AgentApprovalRequest[]
}

// Human approval gate for high-risk agent proposals
model AgentApprovalRequest {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agentRunId      String   @db.Uuid
  agentRun        AgentRun @relation(fields: [agentRunId], references: [id])
  agentProfileId  String   @db.Uuid
  agentProfile    AgentProfile @relation(fields: [agentProfileId], references: [id])
  requestedBy     String   @db.Uuid  // profile ID of requestor (may be the agent's ownerProfileId)
  approvedBy      String?  @db.Uuid  @map("approved_by")
  moduleKey       String?             // which module this approval concerns
  actionType      String              // e.g. "DB_WRITE", "PUBLIC_EXPOSE", "SCHEMA_MIGRATE"
  proposalSummary String              @map("proposal_summary")
  proposalDetail  Json?               @map("proposal_detail")
  status          String   @default("PENDING")  // PENDING, APPROVED, REJECTED, EXPIRED
  riskLevel       String              @map("risk_level")
  reviewNote      String?             @map("review_note")
  createdAt       DateTime @default(now()) @map("created_at")
  resolvedAt      DateTime?           @map("resolved_at")
}

// Agent-to-agent or agent-to-human communication record
model AgentMessage {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  fromAgentId     String?  @db.Uuid  @map("from_agent_id")
  fromAgent       AgentProfile? @relation(fields: [fromAgentId], references: [id])
  toProfileId     String?  @db.Uuid  @map("to_profile_id")   // human recipient
  toAgentKey      String?             @map("to_agent_key")    // agent recipient key
  runId           String?  @db.Uuid  @map("run_id")
  messageType     String              @map("message_type")    // "PROPOSAL", "STATUS", "REVIEW_REQUEST", "ALERT"
  subject         String?
  body            String
  metadata        Json?
  read            Boolean  @default(false)
  createdAt       DateTime @default(now()) @map("created_at")
}

// Instruction set snapshot (DB mirror of AGENTS.md / SKILL.md for audit)
model AgentInstructionSnapshot {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  artifactType  String              // "AGENTS_MD", "SKILL_MD", "BOUNDARY_POLICY"
  artifactRef   String              // e.g. "AGENTS.md", "closed-loop-sprint/SKILL.md"
  contentHash   String              @map("content_hash")
  content       String              // full text snapshot
  capturedAt    DateTime @default(now()) @map("captured_at")
  capturedBy    String?  @db.Uuid  @map("captured_by")  // profile ID
}
```

---

## Migration Impact

| Table | New | Risk | Dependencies |
|---|---|---|---|
| `agent_profiles` | Yes | LOW | None (no FK to Work tables) |
| `agent_runs` | Yes | LOW | `agent_profiles` |
| `agent_approval_requests` | Yes | MEDIUM | `agent_profiles`, `agent_runs` |
| `agent_messages` | Yes | LOW | `agent_profiles` (optional FK) |
| `agent_instruction_snapshots` | Yes | LOW | None |

No existing tables are modified. This is a greenfield addition.

---

## Seed Strategy

- Insert one `AgentProfile` row per agent from `AG-002-internal-agents.md` (15 agents)
- No `AgentRun`, `AgentApprovalRequest`, or `AgentMessage` seed rows — these accumulate from usage
- Snapshot of `AGENTS.md` at seed time as the first `AgentInstructionSnapshot`

---

## What Is NOT Included

- Realtime pub/sub or WebSocket push for agent messages (deferred)
- External agent adapter (ExternalAgentAdapter, scoped context package delivery) — deferred to Agent Team OS v2
- Agent capability registry / skill-to-agent mapping (deferred)
- Automatic AGENTS.md → DB sync (must remain explicit and auditable per governance rule)

---

## Acceptance Criteria

- [x] Schema proposal and migration impact documented
- [x] No runtime implementation required for this task
- [ ] Prisma models added to `schema.prisma` (follow-on after AUTH-001)
- [ ] Seed updated with 15 agent profile rows (follow-on)
- [ ] `pnpm db:validate` + `pnpm db:generate` pass (follow-on)
