with open("prisma/schema.prisma", "r") as f:
    content = f.read()

content = content.replace(
    'participantAgents      String[]         @default([]) @map("participant_agents")',
    'participantAgents      String[]         @default([]) @map("participant_agents")\n  writeBlocked           Boolean          @default(true) @map("write_blocked")\n  externalRegisterable   Boolean          @default(false) @map("external_registerable")'
)

with open("prisma/schema.prisma", "w") as f:
    f.write(content)
