import re

with open('src/app/(dashboard)/agents/agent-command-center-client.tsx', 'r') as f:
    content = f.read()

# Remove AgentCommandCenterHeader
pattern = r"export function AgentCommandCenterHeader\(\) \{[\s\S]*?\}\n\n"
content = re.sub(pattern, "", content)

with open('src/app/(dashboard)/agents/agent-command-center-client.tsx', 'w') as f:
    f.write(content)
