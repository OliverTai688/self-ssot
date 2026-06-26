import { mockProjectPulseCards, mockPublicOutputs } from "@/lib/mock/ai"
import { mockPulseSourceMeta, mockProjectTimelines } from "@/lib/mock/work"

/**
 * Temporary mock adapter for AI-generated project insights.
 * 
 * TODO: In P2, replace these mock queries with real queries to the `AgentMessage`,
 * `AIPulse`, or `ProjectDeliverable` tables.
 */
export async function getProjectPulse(projectId: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100))
  return mockProjectPulseCards.find(c => c.relatedEntityId === projectId) ?? null
}

export async function getProjectTimeline(projectId: string) {
  await new Promise(resolve => setTimeout(resolve, 100))
  return mockProjectTimelines[projectId] ?? null
}

export async function getPublicOutputs(aiCardId: string) {
  await new Promise(resolve => setTimeout(resolve, 100))
  return mockPublicOutputs.find(o => o.aiCardId === aiCardId) ?? null
}

export async function getPulseSourceMeta(aiCardId: string) {
  await new Promise(resolve => setTimeout(resolve, 100))
  return mockPulseSourceMeta[aiCardId] ?? null
}
