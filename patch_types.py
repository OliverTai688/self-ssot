import re

with open("src/types/agent-command-center.ts", "r") as f:
    content = f.read()

# Add commandType and stages
content = content.replace(
    'operationId: string',
    'operationId: string\n  commandType: "SINGLE_AGENT" | "TEAM_GROUP"\n  stages: any[]'
)

with open("src/types/agent-command-center.ts", "w") as f:
    f.write(content)
