with open("src/app/actions/agent-command.ts", "r") as f:
    content = f.read()

content = content.replace(
    'promptTemplate: z.string().optional().nullable(),',
    'promptTemplate: z.string().optional().nullable(),\n  stages: z.any().optional(),'
)

with open("src/app/actions/agent-command.ts", "w") as f:
    f.write(content)
