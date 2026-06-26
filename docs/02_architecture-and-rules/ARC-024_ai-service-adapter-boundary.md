# D-DECISION-003: AIService Adapter Boundary

**Task:** AI-001
**Date:** 2026-06-09
**Status:** DECIDED — mock adapter in place; real adapter deferred

---

## Context

The system generates AI content (project pulse summaries, morning briefs, research feedback, triage proposals) via `src/lib/services/mock-ai.service.ts`. This mock service returns deterministic or randomly-seeded data. The boundary between the mock adapter and a real AI API (Anthropic, OpenAI, or local LLM) must be defined before any real inference is wired.

---

## Decision

**Maintain a single AIService interface. The mock implementation stays as the default. Real adapters are injected at the service layer boundary, not the component level.**

---

## Interface Contract

```typescript
// src/lib/services/ai.service.ts (proposed)
export interface AIService {
  generateProjectPulse(project: ProjectContext): Promise<AICard>
  generateMorningBrief(context: MorningBriefContext): Promise<MorningBriefResult>
  generateResearchFeedback(writingProject: WritingProjectContext): Promise<AIFeedbackRun>
  generateTriageProposals(sources: RawSourceItem[]): Promise<AITriageProposal[]>
  generateDataUnitSummary(dataUnit: DataUnitContext): Promise<string>
}
```

---

## Adapter Strategy

| Adapter | When | Risk |
|---|---|---|
| `MockAIService` | Always (current) | Static data; no API cost or latency |
| `AnthropicAIService` | After AUTH-001 + API key config | Real cost; outputs must go through human review before module writes |
| `LocalLLMService` | Optional/future | Requires local model setup; privacy-preserving for Life/Finance |

Selection logic: check `process.env.AI_ADAPTER` at service initialization. Default to mock if unset or `"mock"`.

---

## Rules for Real Adapters

- Real AI output must NEVER directly write to the database. All output is a proposal that goes through the `ModuleWriteIntent` review flow (see DATA-002).
- Real adapters must not receive Finance, Life, or Company Strategy data unless the module's privacy policy explicitly allows it (see DATTR-011).
- API keys must be server-side environment variables only. Client Components must never receive or forward API credentials.
- Adapter errors must return a typed `AIError` (not raw exceptions) so the UI can show a safe fallback.
- All real AI outputs must preserve `sourceIds` and `modelId` in the response metadata for audit trail.

---

## Current State

`src/lib/services/mock-ai.service.ts` implements deterministic mock versions of pulse, morning brief, and feedback. It does not implement `generateTriageProposals` or `generateDataUnitSummary` (these are newer contracts from DATTR-015/DATTR-013).

---

## Acceptance Criteria

- [x] Mock and real adapter boundary documented
- [x] Interface contract defined
- [x] Selection strategy and environment variable pattern described
- [ ] `AIService` interface extracted to a shared types file (follow-on)
- [ ] `AnthropicAIService` implementation (after AUTH-001 + API key decision)
