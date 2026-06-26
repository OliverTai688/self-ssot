# D-PROPOSAL-003: WorkflowRule and AgentMessage DB Usage

**Task:** INGEST-002
**Date:** 2026-06-09
**Status:** PROPOSAL — no migration until AGENT-002 schema is approved and AUTH-001 complete

---

## Context

The Workflow module currently stores rules in memory (`src/lib/workflow/`). Agent Team OS messages are documented in AGENT-002 (`AgentMessage` table). This document proposes how `WorkflowRule` and `AgentMessage` should be persisted, and how they relate to the `AgentRun` and `AgentApprovalRequest` tables from D-PROPOSAL-001.

---

## WorkflowRule Persistence

```prisma
model WorkflowRule {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String   @db.Uuid  @map("owner_id")
  name            String
  description     String?
  triggerType     String             @map("trigger_type")   // "SOURCE_RECEIVED", "SCHEDULE", "MODULE_EVENT", "MANUAL"
  triggerConfig   Json               @map("trigger_config") // event filter, cron expression, module + event type
  conditionExpr   Json?              @map("condition_expr") // optional filter conditions
  actions         Json               // ordered list of action steps
  status          String  @default("ACTIVE")               // ACTIVE, PAUSED, ARCHIVED
  lastRunAt       DateTime?          @map("last_run_at")
  runCount        Int     @default(0) @map("run_count")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt      @map("updated_at")

  runs            WorkflowRuleRun[]
}

model WorkflowRuleRun {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ruleId          String   @db.Uuid  @map("rule_id")
  rule            WorkflowRule @relation(fields: [ruleId], references: [id])
  ownerId         String   @db.Uuid  @map("owner_id")
  agentRunId      String?  @db.Uuid  @map("agent_run_id")  // FK to AgentRun if agent-triggered
  status          String             // PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
  inputContext    Json?              @map("input_context")
  outputSummary   String?            @map("output_summary")
  errorMessage    String?            @map("error_message")
  startedAt       DateTime?          @map("started_at")
  completedAt     DateTime?          @map("completed_at")
  createdAt       DateTime @default(now()) @map("created_at")
}
```

---

## AgentMessage and WorkflowRule Coordination

The `AgentMessage` table (from AGENT-002) handles agent-to-human and agent-to-agent communication. Workflow rules may generate agent messages as side effects:

```
WorkflowRule trigger
  → WorkflowRuleRun (execution log)
  → AgentRun (if agent capability is invoked)
  → Proposal (if agent generates a suggestion)
  → AgentMessage (notify human or next agent)
  → AgentApprovalRequest (if action requires approval)
```

This chain ensures all automated work is traceable and requires human confirmation for high-risk actions.

---

## Migration Impact

| Table | New | Risk | Dependencies |
|---|---|---|---|
| `workflow_rules` | Yes | MEDIUM | `profiles` |
| `workflow_rule_runs` | Yes | LOW | `workflow_rules`, `agent_runs` (AGENT-002) |

The `AgentMessage` table is proposed in AGENT-002 (D-PROPOSAL-001). `WorkflowRule` + `WorkflowRuleRun` are standalone additions that reference `AgentRun` optionally.

---

## Current Mock State

`src/lib/workflow/` currently holds:
- `workflow-engine.ts` — in-memory rule matching
- `types.ts` — `WorkflowRule`, `TriggerType`, `ActionType` TypeScript types

These types should be aligned with the Prisma proposal before migration. Specifically:
- `triggerConfig` and `actions` are currently typed structs — they should remain typed at the TypeScript layer and stored as validated JSON in DB
- The existing UI (workflow/page.tsx) renders rules from mock context — no DB reads are needed until WORK-007 is resolved

---

## Acceptance Criteria

- [x] WorkflowRule and WorkflowRuleRun schema proposed
- [x] Coordination with AgentRun / AgentMessage chain documented
- [x] Migration impact table included
- [ ] Prisma models added (follow-on after AGENT-002 Prisma models are added)
- [ ] TypeScript type alignment with Prisma schema (follow-on)
