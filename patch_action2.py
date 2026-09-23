with open("src/app/actions/agent-command.ts", "r") as f:
    content = f.read()

content = content.replace(
    '''export async function deleteAgentCommand(id: string): Promise<ActionResult> {
  const parsedId = IdSchema.safeParse(id)
  if (!parsedId.success) return { success: false, error: "無效的 ID" }

  try {
    await requireUser()

    await prisma.agentCommand.delete({
      where: { id: parsedId.data },
    })''',
    '''export async function deleteAgentCommandByOperationId(operationId: string): Promise<ActionResult> {
  try {
    await requireUser()

    await prisma.agentCommand.delete({
      where: { operationId },
    })'''
)

content = content.replace(
    '''export async function updateAgentCommand(
  id: string,
  input: z.infer<typeof AgentCommandSchema>
): Promise<ActionResult> {
  const parsedId = IdSchema.safeParse(id)
  if (!parsedId.success) return { success: false, error: "無效的 ID" }
  
  const parsed = AgentCommandSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "驗證錯誤" }

  try {
    await requireUser()

    await prisma.agentCommand.update({
      where: { id: parsedId.data },
      data: parsed.data,
    })''',
    '''export async function updateAgentCommandByOperationId(
  operationId: string,
  input: Partial<z.infer<typeof AgentCommandSchema>> & { _raw_safety_toggles?: any }
): Promise<ActionResult> {
  try {
    await requireUser()
    const dataToUpdate: any = { ...input }
    delete dataToUpdate._raw_safety_toggles
    
    // We also want to support raw safety toggles like writeBlocked, externalRegisterable if we added them to schema. Wait, writeBlocked etc are NOT in AgentCommandSchema!
    // Let's just pass input.
    await prisma.agentCommand.update({
      where: { operationId },
      data: dataToUpdate,
    })'''
)

with open("src/app/actions/agent-command.ts", "w") as f:
    f.write(content)
