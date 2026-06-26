"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AddEventSchema = z.object({
  name: z.string().min(1),
  eventType: z.enum(["CONFERENCE", "WORKSHOP", "SEMINAR", "SUMMER_SCHOOL", "WEBINAR"]).default("CONFERENCE"),
  field: z.array(z.string()).optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  isOnline: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  submissionDeadline: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime().optional(),
  url: z.string().url().optional(),
  cfpText: z.string().optional(),
  relatedThreadIds: z.array(z.string()).optional(),
  fitScore: z.number().int().min(0).max(100).optional(),
  aiFitReason: z.string().optional(),
  suggestedParticipationMode: z.enum([
    "SUBMIT_PAPER", "SUBMIT_POSTER", "ATTEND", "ASK_QUESTION", "NETWORKING",
  ]).default("ATTEND"),
})

const AddPersonSchema = z.object({
  name: z.string().min(1),
  academicRole: z.string().optional(),
  affiliation: z.string().optional(),
  country: z.string().optional(),
  profileUrl: z.string().url().optional(),
  researchAreas: z.array(z.string()).optional(),
  importantWorks: z.array(z.string()).optional(),
  relatedEvents: z.array(z.string()).optional(),
  backgroundSummary: z.string().optional(),
  relevanceToMyResearch: z.string().optional(),
  conversationAngles: z.array(z.string()).optional(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Event Actions ────────────────────────────────────────────────────────────

export async function getResearchEvents(): Promise<ActionResult<Awaited<ReturnType<typeof db.researchEvent.findMany>>>> {
  try {
    const events = await db.researchEvent.findMany({
      orderBy: { submissionDeadline: "asc" },
    })
    return { success: true, data: events }
  } catch (err) {
    console.error("[getResearchEvents]", err)
    return { success: false, error: "無法取得活動列表" }
  }
}

export async function addResearchEvent(
  input: z.infer<typeof AddEventSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = AddEventSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  try {
    const event = await db.researchEvent.create({
      data: {
        ...parsed.data,
        field: parsed.data.field ?? [],
        relatedThreadIds: parsed.data.relatedThreadIds ?? [],
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        submissionDeadline: parsed.data.submissionDeadline ? new Date(parsed.data.submissionDeadline) : undefined,
        registrationDeadline: parsed.data.registrationDeadline ? new Date(parsed.data.registrationDeadline) : undefined,
      },
    })
    revalidatePath("/research")
    return { success: true, data: { id: event.id } }
  } catch (err) {
    console.error("[addResearchEvent]", err)
    return { success: false, error: "新增學術活動失敗" }
  }
}

export async function deleteResearchEvent(id: string): Promise<ActionResult<void>> {
  try {
    await db.researchEvent.delete({ where: { id } })
    revalidatePath("/research")
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[deleteResearchEvent]", err)
    return { success: false, error: "刪除活動失敗" }
  }
}

// ─── Academic People Actions ──────────────────────────────────────────────────

export async function getAcademicPeople(): Promise<ActionResult<Awaited<ReturnType<typeof db.academicPerson.findMany>>>> {
  try {
    const people = await db.academicPerson.findMany({ orderBy: { updatedAt: "desc" } })
    return { success: true, data: people }
  } catch (err) {
    console.error("[getAcademicPeople]", err)
    return { success: false, error: "無法取得學者列表" }
  }
}

export async function addAcademicPerson(
  input: z.infer<typeof AddPersonSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = AddPersonSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  try {
    const person = await db.academicPerson.create({
      data: {
        ...parsed.data,
        researchAreas: parsed.data.researchAreas ?? [],
        importantWorks: parsed.data.importantWorks ?? [],
        relatedEvents: parsed.data.relatedEvents ?? [],
        conversationAngles: parsed.data.conversationAngles ?? [],
      },
    })
    return { success: true, data: { id: person.id } }
  } catch (err) {
    console.error("[addAcademicPerson]", err)
    return { success: false, error: "新增學者失敗" }
  }
}

export async function deleteAcademicPerson(id: string): Promise<ActionResult<void>> {
  try {
    await db.academicPerson.delete({ where: { id } })
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[deleteAcademicPerson]", err)
    return { success: false, error: "刪除學者失敗" }
  }
}

// ─── Research Digest Actions ───────────────────────────────────────────────────

export async function getDigestsByThread(
  threadId: string
): Promise<ActionResult<Awaited<ReturnType<typeof db.researchDigest.findMany>>>> {
  try {
    const digests = await db.researchDigest.findMany({
      where: { threadId },
      orderBy: { generatedAt: "desc" },
      take: 10,
    })
    return { success: true, data: digests }
  } catch (err) {
    console.error("[getDigestsByThread]", err)
    return { success: false, error: "無法取得研究摘要列表" }
  }
}

export async function saveResearchDigest(data: {
  threadId: string
  title: string
  scheduleType?: string
  newSources: string[]
  keyFindings: string[]
  openQuestions: string[]
  recommendedReadings: string[]
  writingSuggestions: string[]
}): Promise<ActionResult<{ id: string }>> {
  try {
    const digest = await db.researchDigest.create({ data })
    revalidatePath(`/research/${data.threadId}`)
    return { success: true, data: { id: digest.id } }
  } catch (err) {
    console.error("[saveResearchDigest]", err)
    return { success: false, error: "儲存研究摘要失敗" }
  }
}
