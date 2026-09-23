with open("src/lib/services/agent-command-center.service.ts", "r") as f:
    content = f.read()

content = content.replace(
    'operationId: command.operationId,',
    'operationId: command.operationId,\n    commandType: command.commandType as "SINGLE_AGENT" | "TEAM_GROUP",\n    stages: command.stages as any[],'
)

with open("src/lib/services/agent-command-center.service.ts", "w") as f:
    f.write(content)
