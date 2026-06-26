"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AddSourceSchema = z.object({
  threadId: z.string().uuid(),
  title: z.string().min(1),
  sourceType: z.enum([
    "PAPER", "BOOK", "ARTICLE", "CONFERENCE_RECORD", "WORKSHOP_RECORD",
    "MEETING_RECORD", "AUDIO_TRANSCRIPT", "INSTITUTION_REPORT", "DATASET",
    "WEBSITE", "PERSONAL_NOTE",
  ]).default("PAPER"),
  authors: z.array(z.string()).optional(),
  year: z.number().int().optional(),
  doi: z.string().optional(),
  url: z.string().url().optional(),
  institution: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  language: z.string().default("zh-TW"),
  abstract: z.string().optional(),
  summary: z.string().optional(),
  originalText: z.string().optional(),
  fileUrl: z.string().optional(),
  reliability: z.enum(["PRIMARY", "SECONDARY", "INFORMAL", "PERSONAL_OBSERVATION"]).default("PRIMARY"),
})

const UpsertConceptSchema = z.object({
  threadId: z.string().uuid(),
  id: z.string().uuid().optional(), // if present → update
  name: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  definition: z.string().optional(),
  relatedSources: z.array(z.string()).optional(),
  relatedAuthors: z.array(z.string()).optional(),
  competingDefinitions: z.any().optional(),
  myCurrentUnderstanding: z.string().optional(),
  aiClarification: z.string().optional(),
  confusionPoints: z.array(z.string()).optional(),
})

// ─── Source Actions ───────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function getSourcesByThread(
  threadId: string
): Promise<ActionResult<Awaited<ReturnType<typeof db.researchSource.findMany>>>> {
  try {
    const sources = await db.researchSource.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: sources }
  } catch (err) {
    console.error("[getSourcesByThread]", err)
    return { success: false, error: "無法取得文獻列表" }
  }
}

export async function addResearchSource(
  input: z.infer<typeof AddSourceSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = AddSourceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  try {
    const source = await db.researchSource.create({
      data: {
        ...parsed.data,
        authors: parsed.data.authors ?? [],
      },
    })
    revalidatePath(`/research/${input.threadId}`)
    return { success: true, data: { id: source.id } }
  } catch (err) {
    console.error("[addResearchSource]", err)
    return { success: false, error: "新增文獻失敗" }
  }
}

export async function deleteResearchSource(id: string, threadId: string): Promise<ActionResult<void>> {
  try {
    await db.researchSource.delete({ where: { id } })
    revalidatePath(`/research/${threadId}`)
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[deleteResearchSource]", err)
    return { success: false, error: "刪除文獻失敗" }
  }
}

// ─── Concept Actions ──────────────────────────────────────────────────────────

export async function getConceptsByThread(
  threadId: string
): Promise<ActionResult<Awaited<ReturnType<typeof db.researchConcept.findMany>>>> {
  try {
    const concepts = await db.researchConcept.findMany({
      where: { threadId },
      orderBy: { updatedAt: "desc" },
    })
    return { success: true, data: concepts }
  } catch (err) {
    console.error("[getConceptsByThread]", err)
    return { success: false, error: "無法取得概念列表" }
  }
}

export async function upsertResearchConcept(
  input: z.infer<typeof UpsertConceptSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = UpsertConceptSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const { id, threadId, ...data } = parsed.data
  try {
    const concept = await db.researchConcept.upsert({
      where: { id: id ?? "00000000-0000-0000-0000-000000000000" },
      update: {
        ...data,
        aliases: data.aliases ?? [],
        relatedSources: data.relatedSources ?? [],
        relatedAuthors: data.relatedAuthors ?? [],
        confusionPoints: data.confusionPoints ?? [],
      },
      create: {
        threadId,
        name: data.name,
        aliases: data.aliases ?? [],
        definition: data.definition,
        relatedSources: data.relatedSources ?? [],
        relatedAuthors: data.relatedAuthors ?? [],
        competingDefinitions: data.competingDefinitions ?? [],
        myCurrentUnderstanding: data.myCurrentUnderstanding,
        aiClarification: data.aiClarification,
        confusionPoints: data.confusionPoints ?? [],
      },
    })
    revalidatePath(`/research/${threadId}`)
    return { success: true, data: { id: concept.id } }
  } catch (err) {
    console.error("[upsertResearchConcept]", err)
    return { success: false, error: "儲存概念失敗" }
  }
}

export async function deleteResearchConcept(id: string, threadId: string): Promise<ActionResult<void>> {
  try {
    await db.researchConcept.delete({ where: { id } })
    revalidatePath(`/research/${threadId}`)
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[deleteResearchConcept]", err)
    return { success: false, error: "刪除概念失敗" }
  }
}
