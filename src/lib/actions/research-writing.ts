"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateWritingProjectSchema = z.object({
  threadId: z.string().uuid(),
  title: z.string().min(1),
  writingType: z.enum(["PAPER", "CONFERENCE_PAPER", "PROPOSAL", "ESSAY", "POSTER", "PRESENTATION"]).default("PAPER"),
  targetVenueId: z.string().uuid().optional(),
  researchQuestion: z.string().optional(),
  thesisStatement: z.string().optional(),
})

const UpdateSectionSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  linkedSourceIds: z.array(z.string()).optional(),
  aiNotes: z.array(z.string()).optional(),
})

const AddFeedbackRunSchema = z.object({
  threadId: z.string().uuid(),
  writingProjectId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
  perspective: z.enum([
    "METHOD_REVIEWER", "THEORY_REVIEWER", "DOMAIN_EXPERT",
    "CRITICAL_REVIEWER", "FRIENDLY_MENTOR", "CONFERENCE_CHAIR", "JOURNAL_EDITOR",
  ]).default("FRIENDLY_MENTOR"),
  inputType: z.string().optional(),
  summary: z.string(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
  actionItems: z.array(z.string()).optional(),
})

// ─── Writing Project Actions ───────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function getWritingProjectsByThread(
  threadId: string
): Promise<ActionResult<Awaited<ReturnType<typeof db.researchWritingProject.findMany>>>> {
  try {
    const projects = await db.researchWritingProject.findMany({
      where: { threadId },
      include: { sections: { orderBy: { sectionOrder: "asc" } } },
      orderBy: { updatedAt: "desc" },
    })
    return { success: true, data: projects }
  } catch (err) {
    console.error("[getWritingProjectsByThread]", err)
    return { success: false, error: "無法取得寫作專案列表" }
  }
}

export async function createWritingProject(
  input: z.infer<typeof CreateWritingProjectSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateWritingProjectSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  try {
    const project = await db.researchWritingProject.create({
      data: {
        ...parsed.data,
        // Create default scaffold sections
        sections: {
          create: [
            { title: "Introduction / 問題意識", sectionOrder: 1, body: "" },
            { title: "Literature Review / 文獻回顧", sectionOrder: 2, body: "" },
            { title: "Methodology / 研究方法", sectionOrder: 3, body: "" },
            { title: "Findings & Analysis / 研究發現", sectionOrder: 4, body: "" },
            { title: "Discussion / 討論與詮釋", sectionOrder: 5, body: "" },
            { title: "Conclusion / 結論", sectionOrder: 6, body: "" },
          ],
        },
      },
    })
    revalidatePath(`/research/${input.threadId}`)
    return { success: true, data: { id: project.id } }
  } catch (err) {
    console.error("[createWritingProject]", err)
    return { success: false, error: "建立寫作專案失敗" }
  }
}

export async function updateWritingSection(
  input: z.infer<typeof UpdateSectionSchema>
): Promise<ActionResult<void>> {
  const parsed = UpdateSectionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  try {
    await db.researchWritingSection.update({
      where: { id: parsed.data.id },
      data: {
        body: parsed.data.body,
        linkedSourceIds: parsed.data.linkedSourceIds ?? [],
        aiNotes: parsed.data.aiNotes ?? [],
      },
    })
    // revalidate research detail
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[updateWritingSection]", err)
    return { success: false, error: "儲存章節失敗" }
  }
}

export async function deleteWritingProject(id: string, threadId: string): Promise<ActionResult<void>> {
  try {
    await db.researchWritingProject.delete({ where: { id } })
    revalidatePath(`/research/${threadId}`)
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[deleteWritingProject]", err)
    return { success: false, error: "刪除寫作專案失敗" }
  }
}

// ─── AI Feedback Actions ──────────────────────────────────────────────────────

export async function addAIFeedbackRun(
  input: z.infer<typeof AddFeedbackRunSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = AddFeedbackRunSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  try {
    const run = await db.aIFeedbackRun.create({
      data: {
        ...parsed.data,
        strengths: parsed.data.strengths ?? [],
        weaknesses: parsed.data.weaknesses ?? [],
        questions: parsed.data.questions ?? [],
        suggestions: parsed.data.suggestions ?? [],
        actionItems: parsed.data.actionItems ?? [],
      },
    })
    revalidatePath(`/research/${input.threadId}`)
    return { success: true, data: { id: run.id } }
  } catch (err) {
    console.error("[addAIFeedbackRun]", err)
    return { success: false, error: "儲存 AI 審校結果失敗" }
  }
}

export async function getFeedbackRunsByThread(
  threadId: string
): Promise<ActionResult<Awaited<ReturnType<typeof db.aIFeedbackRun.findMany>>>> {
  try {
    const runs = await db.aIFeedbackRun.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return { success: true, data: runs }
  } catch (err) {
    console.error("[getFeedbackRunsByThread]", err)
    return { success: false, error: "無法取得 AI 審校記錄" }
  }
}
