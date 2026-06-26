"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateThreadSchema = z.object({
  title: z.string().min(1, "標題不能為空"),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  disciplines: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  methodType: z.string().optional(),
  mainResearchQuestion: z.string().optional(),
  workLinkage: z.string().optional(),
  ownerId: z.string().uuid(),
})

const UpdateThreadSchema = CreateThreadSchema.partial().omit({ ownerId: true }).extend({
  id: z.string().uuid(),
  status: z.enum(["EXPLORING", "ACTIVE", "WRITING", "PUBLISHED", "PAUSED"]).optional(),
})

// ─── Actions ──────────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function getResearchThreads(ownerId: string): Promise<ActionResult<Awaited<ReturnType<typeof db.researchThread.findMany>>>> {
  try {
    const threads = await db.researchThread.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            sources: true,
            concepts: true,
            writingProjects: true,
          },
        },
      },
    })
    return { success: true, data: threads }
  } catch (err) {
    console.error("[getResearchThreads]", err)
    return { success: false, error: "無法取得研究主軸列表" }
  }
}

export async function getResearchThreadById(id: string): Promise<ActionResult<Awaited<ReturnType<typeof db.researchThread.findUnique>>>> {
  try {
    const thread = await db.researchThread.findUnique({
      where: { id },
      include: {
        sources: { orderBy: { createdAt: "desc" } },
        concepts: { orderBy: { createdAt: "desc" } },
        writingProjects: {
          include: { sections: { orderBy: { sectionOrder: "asc" } } },
          orderBy: { createdAt: "desc" },
        },
        feedbackRuns: { orderBy: { createdAt: "desc" }, take: 10 },
        digests: { orderBy: { generatedAt: "desc" }, take: 5 },
      },
    })
    return { success: true, data: thread }
  } catch (err) {
    console.error("[getResearchThreadById]", err)
    return { success: false, error: "無法取得研究主軸詳情" }
  }
}

export async function createResearchThread(
  input: z.infer<typeof CreateThreadSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateThreadSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  try {
    const thread = await db.researchThread.create({
      data: {
        ...parsed.data,
        keywords: parsed.data.keywords ?? [],
        disciplines: parsed.data.disciplines ?? [],
        regions: parsed.data.regions ?? [],
      },
    })
    revalidatePath("/research")
    return { success: true, data: { id: thread.id } }
  } catch (err) {
    console.error("[createResearchThread]", err)
    return { success: false, error: "建立研究主軸失敗" }
  }
}

export async function updateResearchThread(
  input: z.infer<typeof UpdateThreadSchema>
): Promise<ActionResult<void>> {
  const parsed = UpdateThreadSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const { id, ...data } = parsed.data
  try {
    await db.researchThread.update({ where: { id }, data })
    revalidatePath("/research")
    revalidatePath(`/research/${id}`)
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[updateResearchThread]", err)
    return { success: false, error: "更新研究主軸失敗" }
  }
}

export async function deleteResearchThread(id: string): Promise<ActionResult<void>> {
  try {
    await db.researchThread.delete({ where: { id } })
    revalidatePath("/research")
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[deleteResearchThread]", err)
    return { success: false, error: "刪除研究主軸失敗" }
  }
}
