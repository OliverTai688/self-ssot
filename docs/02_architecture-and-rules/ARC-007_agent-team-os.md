# Agent Team OS

Agent Team OS is the governance layer for internal and future external AI collaboration.

## Responsibilities

- Agent identity registry.
- Skill registry.
- Instruction set registry.
- Boundary policies.
- Approval levels.
- Audit trail for agent messages and collaboration requests.
- Future bounded adapters for NANDA/MCP/A2A/webhook-style collaboration.

## Relationship To Workflow

| System | Responsibility |
|---|---|
| Workflow | Execute rules, route messages, track automation events. |
| Agent Team OS | Define who agents are, what skills they can use, what boundaries apply, and what requires approval. |

## Early Development Strategy

1. Repo files are canonical.
2. DB stores snapshots and runtime registry only later.
3. Import/export actions must be explicit.
4. No hidden sync.
5. No external agent DB access.

## Future Adapter Interface

```ts
interface AgentInteropProvider {
  discoverAgents(): Promise<ExternalAgentManifest[]>
  getAgentManifest(externalAgentId: string): Promise<ExternalAgentManifest>
  sendCollaborationRequest(input: CollaborationRequestInput): Promise<CollaborationResponse>
  verifyCapability(externalAgentId: string, capabilityKey: string): Promise<boolean>
  verifyTrustPolicy(externalAgentId: string, policyKey: string): Promise<boolean>
  revokeAccess(externalAgentId: string): Promise<void>
}
```

This is future-facing. Do not build full external interoperability before local governance and auditability are stable.
