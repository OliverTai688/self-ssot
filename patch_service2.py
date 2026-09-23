with open("src/types/agent-command-center.ts", "r") as f:
    content = f.read()

content = content.replace('writeBlocked: true', 'writeBlocked: boolean')
content = content.replace('externalRegisterable: false', 'externalRegisterable: boolean')

with open("src/types/agent-command-center.ts", "w") as f:
    f.write(content)

with open("src/lib/services/agent-command-center.service.ts", "r") as f:
    content = f.read()

content = content.replace('writeBlocked: true,', 'writeBlocked: command.writeBlocked,')
content = content.replace('externalRegisterable: false,', 'externalRegisterable: command.externalRegisterable,')

with open("src/lib/services/agent-command-center.service.ts", "w") as f:
    f.write(content)
