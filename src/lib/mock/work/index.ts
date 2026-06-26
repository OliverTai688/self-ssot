export * from "./mock-projects"
export * from "./mock-tasks"
export * from "./mock-notes"
export * from "./mock-deliverables"
export * from "./mock-timeline"

import type { PulseSourceMeta } from "@/types/work"

export const mockPulseSourceMeta: Record<string, PulseSourceMeta> = {
  pp1: {
    generatedAt: "2026-05-06T07:00:00Z",
    basedOnTaskIds: ["t1-p1", "t2-p1", "t3-p1", "t4-p1", "t5-p1", "t6-p1"],
    basedOnNoteIds: ["n1-p1", "n2-p1", "n3-p1"],
    basedOnDeliverableIds: ["d1-p1", "d2-p1"],
  },
  pp2: {
    generatedAt: "2026-05-06T07:00:00Z",
    basedOnTaskIds: ["t1-p2", "t2-p2", "t3-p2", "t4-p2", "t5-p2"],
    basedOnNoteIds: ["n1-p2", "n2-p2"],
    basedOnDeliverableIds: ["d1-p2", "d2-p2"],
  },
}
