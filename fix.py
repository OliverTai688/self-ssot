import re
import sys

# Fix agent-command.ts
with open('src/app/actions/agent-command.ts', 'r') as f:
    content = f.read()
content = content.replace('import { prisma } from "@/lib/db"', 'import { db as prisma } from "@/lib/db"')
with open('src/app/actions/agent-command.ts', 'w') as f:
    f.write(content)

# Fix agent-command-center.service.ts
with open('src/lib/services/agent-command-center.service.ts', 'r') as f:
    content = f.read()
content = content.replace('import { prisma } from "@/lib/db"', 'import { db as prisma } from "@/lib/db"')
content = content.replace('commands.filter((command)', 'commands.filter((command: AgentCommandCenterCommandRow)')
content = content.replace('moduleKey: command.moduleKey,', 'moduleKey: command.moduleKey as any,')
content = content.replace('riskLevel: command.riskLevel,', 'riskLevel: command.riskLevel as any,')
content = content.replace('approvalLevel: command.approvalLevel,', 'approvalLevel: command.approvalLevel as any,')
with open('src/lib/services/agent-command-center.service.ts', 'w') as f:
    f.write(content)

# Fix agent-operation.service.ts
with open('src/lib/services/agent-operation.service.ts', 'r') as f:
    content = f.read()
content = content.replace('import { prisma } from "@/lib/db"', 'import { db as prisma } from "@/lib/db"')
content = content.replace('c => c.operationId', '(c: any) => c.operationId')
with open('src/lib/services/agent-operation.service.ts', 'w') as f:
    f.write(content)

# Fix agent-command-center-client.tsx
with open('src/app/(dashboard)/agents/agent-command-center-client.tsx', 'r') as f:
    content = f.read()
content = content.replace('uiEntrySurface: "/agents",', 'uiEntrySurface: "/agents",\n                scopes: [], allowedModes: ["dry_run"], proposalOutputs: [], agentProposalOutputs: [], blockedWrites: [], agentBlockedWrites: [], sourceRefs: [], participantAgents: [], promptTemplate: null,')
with open('src/app/(dashboard)/agents/agent-command-center-client.tsx', 'w') as f:
    f.write(content)

