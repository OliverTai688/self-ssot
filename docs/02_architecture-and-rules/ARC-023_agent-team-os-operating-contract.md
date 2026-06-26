# Agent Team OS Contract

**Status:** Proposal / governance contract  
**Runtime implementation:** Not yet  
**Rule:** Do not build full runtime agent UI or external interoperability until local governance and Work v0.1 are stable.

## 1. Purpose

Agent Team OS manages virtual team governance for Personal OS:

- Internal agent identities.
- AGENTS.md-style instruction sets.
- SKILL.md-style workflows.
- Agent capabilities.
- Boundary policies.
- Human approvals and rejections.
- Agent messages and collaboration requests.
- Future external agent interoperability through bounded adapters.

It does not replace Workflow. Workflow executes rules; Agent Team OS governs who can act, what they can use, and what requires approval.

## 2. Instruction Boundaries

| Artifact | Source of truth now | Future DB snapshot | Purpose |
|---|---|---|---|
| `AGENTS.md` | Repository | `AgentInstructionSet` | Project-level rules for Codex and agents. |
| `.codex/skills/*/SKILL.md` | Repository | `AgentSkill` | Reusable workflows for development cycles. |
| `docs/agents/internal_agents.md` | Repository | `AgentProfile` | Initial virtual team definitions. |
| `docs/agents/boundary_policy.md` | Repository | `AgentBoundaryPolicy` | Approval and risk policy. |

No hidden sync is allowed. Import/export must be explicit and auditable.

## 3. Approval Levels

| Level | Meaning |
|---|---|
| `AUTO_READ` | Agent may read scoped context needed for the task. |
| `AUTO_PROPOSE` | Agent may draft plans, summaries, suggestions, or proposals. |
| `HUMAN_APPROVAL_REQUIRED` | Agent must ask before final write, public exposure, schema migration, or high-risk action. |
| `BLOCKED` | Agent may not perform the action. |

## 4. Risk Levels

| Level | Meaning |
|---|---|
| `LOW` | Documentation, low-risk UI copy, isolated review notes. |
| `MEDIUM` | App behavior, module logic, non-public persistence. |
| `HIGH` | Auth, permissions, finance/life/company/client-visible data. |
| `CRITICAL` | Public exposure, destructive DB changes, external agent sharing, irreversible financial decisions. |

## 5. High-Risk Modules

- Finance
- Client Portal
- Life
- Company Strategy
- Auth / Permission
- Public output
- External agent collaboration

## 6. Prisma Schema Proposal

Do not implement these models until DB-001 is complete and migration impact is reviewed.

```prisma
model AgentProfile {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key                  String   @unique
  name                 String
  description          String?
  moduleKey            String?
  agentType            String
  status               String   @default("ACTIVE")
  ownerProfileId       String?  @db.Uuid
  defaultModelProvider String?
  defaultModelName     String?
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")
}

model AgentCapability {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agentId               String   @db.Uuid
  capabilityKey         String
  description           String?
  riskLevel             String
  requiresHumanApproval Boolean  @default(false)
  allowedTargetModules  String[] @default([])
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
}

model AgentSkill {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key           String   @unique
  name          String
  description   String?
  skillPath     String
  skillMarkdown String
  version       String
  status        String   @default("ACTIVE")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
}

model AgentInstructionSet {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key                String
  name               String
  scope              String
  markdownContent    String
  version            String
  appliesToModuleKey String?
  sourceType         String
  sourcePath         String?
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
}

model AgentBoundaryPolicy {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key                 String   @unique
  name                String
  description         String?
  sourceAgentId       String?  @db.Uuid
  targetModuleKey     String?
  targetAgentId       String?  @db.Uuid
  allowedActions      String[] @default([])
  blockedActions      String[] @default([])
  requiresApprovalFor String[] @default([])
  dataVisibilityLevel String
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
}

model AgentCollaborationRequest {
  id                     String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sourceAgentId          String?  @db.Uuid
  targetAgentId          String?  @db.Uuid
  targetExternalAgentRef String?
  requestType            String
  status                 String
  inputSummary           String?
  outputSummary          String?
  riskLevel              String
  approvalStatus         String
  approvedByProfileId    String?  @db.Uuid
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")
}

model ExternalAgentRegistry {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  provider           String
  externalAgentKey   String
  displayName        String
  endpoint           String?
  protocolType       String
  capabilityManifest Json
  trustLevel         String
  status             String
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
}

model NandaBridgeConfig {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  registryEndpoint    String?
  localAgentNamespace String
  enabled             Boolean  @default(false)
  trustPolicy         Json
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
}
```

## 7. Existing AgentMessage Reuse

Current `AgentMessage` already exists for Workflow. Preferred early strategy:

1. Reuse it for workflow audit while documenting gaps.
2. Add nullable agent identity fields later only after migration review.
3. Avoid splitting messages into many tables until Workflow persistence is active.

## 8. External Collaboration Rules

- External agents never access DB directly.
- External agents receive scoped context packages only.
- Each collaboration creates `AgentCollaborationRequest`.
- Sensitive module sharing requires human approval.
- External outputs are proposals.
- Source metadata and risk level must be preserved.

## 9. First Implementation Recommendation

Implement before/during Phase 0 only as:

- docs
- skills
- boundary policies
- backlog tasks

Do not implement runtime UI or migrations until DB-001 is resolved.
