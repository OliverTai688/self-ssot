with open("src/app/actions/agent-command.ts", "r") as f:
    content = f.read()

content = content.replace(
    'stages: z.any().optional(),',
    'stages: z.any().optional(),\n  writeBlocked: z.boolean().default(true),\n  externalRegisterable: z.boolean().default(false),'
)

with open("src/app/actions/agent-command.ts", "w") as f:
    f.write(content)
