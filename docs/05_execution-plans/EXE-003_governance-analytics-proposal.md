# D-PROPOSAL-004: Governance Event and Operation Habit Analytics Contract

**Task:** DATA-004
**Date:** 2026-06-09
**Status:** PROPOSAL — owner-first analytics; no runtime until AUTH-001 + DATA-002 complete

---

## Purpose

Track how the user actually uses their Personal OS — not for external analytics, but for self-insight and agent calibration. The goal is to surface:
1. Which modules and data zones the user engages with most
2. How proposals and approvals flow through the system
3. Agent behavior and boundary adherence over time
4. Habit rhythms (when decisions are made, what gets approved vs rejected)

All analytics are owner-first: the data never leaves the system, and agents may only read aggregate patterns (not raw event logs).

---

## Entity Types

### GovernanceEvent
Records every significant system action that crosses a module or permission boundary.

```prisma
model GovernanceEvent {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String   @db.Uuid  @map("owner_id")
  eventType       String             @map("event_type")
  // EVENT TYPES:
  // "MODULE_ACCESS" — user or agent read a module
  // "PROPOSAL_CREATED" — agent created a proposal
  // "PROPOSAL_APPROVED" — human approved a proposal
  // "PROPOSAL_REJECTED" — human rejected a proposal
  // "WRITE_COMMITTED" — ModuleWriteIntent committed
  // "SOURCE_INGESTED" — new RawIntakeItem received
  // "AGENT_RUN_COMPLETED" — AgentRun finished
  // "BOUNDARY_VIOLATION_BLOCKED" — agent attempted blocked action
  // "AUTH_EVENT" — login, token refresh, permission change
  actorType       String             @map("actor_type")  // "human", "agent", "system"
  actorRef        String?            @map("actor_ref")   // profile ID or agent key
  moduleKey       String?            @map("module_key")
  targetEntityType String?           @map("target_entity_type")
  targetEntityId  String?  @db.Uuid  @map("target_entity_id")
  metadata        Json?
  riskLevel       String?            @map("risk_level")
  createdAt       DateTime @default(now()) @map("created_at")
}
```

### OperationHabitSignal
Aggregated daily/weekly summaries for habit analytics (derived from GovernanceEvents, not raw logs).

```prisma
model OperationHabitSignal {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String   @db.Uuid  @map("owner_id")
  periodType      String             @map("period_type")  // "daily", "weekly"
  periodStart     DateTime           @map("period_start")
  moduleKey       String?            @map("module_key")
  metricType      String             @map("metric_type")
  // METRIC TYPES:
  // "MODULE_ACCESS_COUNT"
  // "PROPOSAL_APPROVAL_RATE"
  // "WRITE_COMMIT_COUNT"
  // "SOURCE_INGESTION_COUNT"
  // "AGENT_RUN_COUNT"
  // "PEAK_ACTIVITY_HOUR"
  metricValue     Float              @map("metric_value")
  metricMeta      Json?              @map("metric_meta")
  computedAt      DateTime @default(now()) @map("computed_at")
}
```

---

## Analytics Use Cases

| Use Case | Source Events | Agent Access |
|---|---|---|
| Which module do I use most? | `MODULE_ACCESS` by moduleKey | Aggregate count only |
| What % of proposals do I approve? | `PROPOSAL_APPROVED` / `PROPOSAL_CREATED` | Aggregate rate only |
| How many writes per week by module? | `WRITE_COMMITTED` by moduleKey | Aggregate count |
| When do I make decisions? | `PROPOSAL_APPROVED` hour distribution | Aggregate histogram |
| Agent boundary adherence | `BOUNDARY_VIOLATION_BLOCKED` by agentRef | Aggregate count by agent |
| Source ingestion rhythm | `SOURCE_INGESTED` by sourceKind, by hour | Aggregate pattern |

---

## Access Rules

| Who | May access | Constraint |
|---|---|---|
| Owner | Full `GovernanceEvent` log | Own events only |
| Internal agents | `OperationHabitSignal` aggregates | Aggregate only; no raw event log |
| External agents | None | Blocked |
| Client Portal | None | Blocked |

Agents may use habit signals to suggest better timing (e.g., "you tend to approve proposals in the morning — try scheduling review sessions then") but must not manipulate routing or decision timing based on patterns without human consent.

---

## Boundary Violation Logging

When an agent attempts a blocked action (e.g., reading Finance data, writing directly to Life module, bypassing `requireUser()`), a `BOUNDARY_VIOLATION_BLOCKED` event is recorded. This is critical for auditability of the Agent Team OS.

---

## Migration Impact

| Table | New | Risk | Dependencies |
|---|---|---|---|
| `governance_events` | Yes | MEDIUM | `profiles`, optional FKs |
| `operation_habit_signals` | Yes | LOW | `profiles` |

---

## Acceptance Criteria

- [x] Governance event types defined
- [x] Agent access rules documented (aggregate only)
- [x] Boundary violation logging described
- [x] Habit analytics use cases listed
- [ ] Prisma models added (follow-on after AUTH-001 + DATA-002)
- [ ] Event emission wired into Work CRUD actions (follow-on after WORK-007)
- [ ] Habit signal computation job defined (follow-on)
