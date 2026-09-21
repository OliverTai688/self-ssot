"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { AgentCommandType } from "@prisma/client"

import { requireUser } from "@/lib/services/auth.service"
import { db as prisma } from "@/lib/db"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

const IdSchema = z.string().uuid()

const AgentCommandSchema = z.object({
  operationId: z.string().min(1, "Operation ID 必填"),
  label: z.string().min(1, "名稱必填"),
  agentInstructionLabel: z.string().min(1, "Agent 指令說明必填"),
  moduleKey: z.string().min(1, "模組 Key 必填"),
  ownerAgent: z.string().min(1, "Owner Agent 必填"),
  targetModule: z.string().min(1, "目標模組必填"),
  riskLevel: z.string().min(1, "風險層級必填"),
  approvalLevel: z.string().min(1, "核准層級必填"),
  dataVisibilityLevel: z.string().min(1, "資料可見度層級必填"),
  commandType: z.enum(["SINGLE_AGENT", "TEAM_GROUP"]),
  uiEntrySurface: z.string().min(1, "UI 進入點必填"),
  scopes: z.array(z.string()).default([]),
  allowedModes: z.array(z.string()).default(["dry_run"]),
  proposalOutputs: z.array(z.string()).default([]),
  agentProposalOutputs: z.array(z.string()).default([]),
  blockedWrites: z.array(z.string()).default([]),
  agentBlockedWrites: z.array(z.string()).default([]),
  sourceRefs: z.array(z.string()).default([]),
  participantAgents: z.array(z.string()).default([]),
  promptTemplate: z.string().optional().nullable(),
  stages: z.any().optional(),
  writeBlocked: z.boolean().default(true),
  externalRegisterable: z.boolean().default(false),
})

export async function getAgentCommands() {
  const user = await requireUser()
  
  const commands = await prisma.agentCommand.findMany({
    orderBy: { createdAt: "desc" },
  })
  return commands
}

export async function createAgentCommand(
  input: z.infer<typeof AgentCommandSchema>
): Promise<ActionResult> {
  const parsed = AgentCommandSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "驗證錯誤" }
  }

  try {
    const user = await requireUser()

    await prisma.agentCommand.create({
      data: parsed.data,
    })

    revalidatePath("/agents")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Failed to create agent command:", error)
    return { success: false, error: "建立 AI 指令失敗" }
  }
}

export async function updateAgentCommandByOperationId(
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
    })

    revalidatePath("/agents")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Failed to update agent command:", error)
    return { success: false, error: "更新 AI 指令失敗" }
  }
}

export async function deleteAgentCommandByOperationId(operationId: string): Promise<ActionResult> {
  try {
    await requireUser()

    await prisma.agentCommand.delete({
      where: { operationId },
    })

    revalidatePath("/agents")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Failed to delete agent command:", error)
    return { success: false, error: "刪除 AI 指令失敗" }
  }
}
