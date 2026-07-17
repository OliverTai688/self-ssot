# Dual Naming Model: Human Display Name vs. ISO 9001-Style AI Reference Code

**Document ID:** `RES-018`
**Last updated:** 2026-07-16
**Status:** Research / design — no runtime implementation in this loop
**Trigger:** Owner feedback, given right after `RES-014`/`AICHAT-001..003` shipped chat-thread folders and rename. Owner's ask, translated:

> Whether it's the chat room, the file library, or the media library — naming should have two layers. One is the name the *user* sees (can be manually renamed, or AI-recommended). The other is a name given via an **ISO 9001-style naming convention**, meant for the *AI* to read.

## 1. Source Basis

Local sources reviewed:

- `docs/02_architecture-and-rules/ARC-011_document-attribute-layer.md` §6 (line 167-173) — **already defines** a three-field naming rule for `SourceAsset`: `originalName` (external truth, never overwritten), `canonicalName` ("internal Personal OS semantic name for AI grouping, role inference, and UI organization"), `displayName` ("controls what the user sees"). This is the closest existing precedent and this document extends it rather than reinventing it — see §3 for how the owner's ask differs from `canonicalName`.
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md` / `MAN-001_document-index.md` — this repo's **own** documentation already uses a structured, ISO-9001-consistent identification scheme: `docs/<folder>/<TYPE>-<NNN>_<kebab-case-title>.<ext>`, centrally indexed. This is the load-bearing precedent for §4: the owner is asking to extend a pattern this repo already trusts and runs, to runtime objects, not to adopt an unfamiliar external scheme.
- `src/app/(dashboard)/ai-input/ai-input-client.tsx` `ChatThread` (extended by `RES-014`/`AICHAT-001..003`, shipped this session) — currently has exactly one name field, `title`, renameable manually or via `generateThreadTitle()`'s mock heuristic. No second, stable identifier exists beyond the opaque client-generated `id` (e.g. `"new_1697..."`, `"source-line"`).
- `src/types/file-library.ts` `FileAsset` (line 64-82) — has `id` (opaque, e.g. `"fa-001"`) and `title` (single human string) only. `src/components/ai/file-library/file-quick-edit-dialogs.tsx`'s `FileRenameDialog` already lets the owner manually rename `title` — but there is no AI-suggested-title affordance (the `AICHAT-003` pattern has no equivalent here yet) and no second machine-facing code at all.
- `src/types/media-library.ts` `MediaAsset` (line 10-12) — `id` + `name` only. No rename affordance exists in `src/components/ai/media-library/` at all yet (neither manual nor AI-suggested).
- `RES-011_human-ai-event-operating-model-research.md` / `RES-010` — `AnalysisEvent`, `InboxItem`, `AgentBusTask`/`AgentBusMessage` (`ARC-032`) all carry `sourceRefs`/`auditRefs`/reference ids that point at resources. None of those referenced resources currently have a rename-proof identifier — if an owner renames a `ChatThread` or `FileAsset` display title, any human-readable citation baked into a past `AnalysisEvent` report or agent message becomes stale/ambiguous. This is the concrete failure mode a stable reference code fixes.
- `RES-016_module-scoped-file-and-media-library-tab-and-classification-routing-research.md` (created concurrently this session by the loop automation) — audits 檔案庫/媒體庫 module classification; does not touch naming/identification, so no overlap with this document.
- `RES-014`/`RES-015` (this session) — chat thread organization and reference-context research; no overlap, cross-linked in §6.

Primary external source (per `AGENTS.md` §7's requirement to use official sources when a named standard is invoked):

- ISO 9001:2015 Clause 7.5.2 (Creating and updating documented information) requires that documented information have "appropriate identification and description (e.g. a title, date, author, or reference number)."
- ISO 9001:2015 Clause 7.5.3 (Control of documented information) requires that documented information be controlled for availability, suitability, distribution, access, retrieval, storage, and version control — i.e. it must stay reliably findable and traceable over time.
- Critically, **the standard itself is deliberately non-prescriptive about the exact naming syntax** — it requires uniqueness, consistency, and traceability, and explicitly leaves organizations free to choose their own scheme (small orgs may use plain titles; others use coded numbering like `QP-7.2-001` for a Quality Procedure under Clause 7.2). This means "ISO 9001-style naming" is correctly understood as *the design discipline* (stable, unique, dated, coded, retrievable identification, separate from the working title) — not a single fixed syntax to look up and copy.

Sources:
- [ISO 9001, Clause 7.5, Documented Information — ISMS.online](https://www.isms.online/iso-9001/clause-7-5-documented-information/)
- [Understanding ISO 9001 Clause 7.5.2 — Auditor Training Online](https://blog.auditortrainingonline.com/blog/understanding-iso-9001-clause-7.5.2)
- [Explaining ISO 9001 Clause 7.5.3 — Auditor Training Online](https://blog.auditortrainingonline.com/blog/explaining-iso-9001-clause-7.5.3-control-of-documented-information)
- [Clause 7.5.2 ISO 9001:2015 Explained — Core Business Solutions](https://www.thecoresolution.com/clause-7-5-2-iso-90012015-explained)

## 2. Current Implementation Audit

| Object | Human-facing name today | AI/machine-facing stable code today | Gap |
|---|---|---|---|
| `ChatThread` (`ai-input-client.tsx`) | `title` — manual rename (`AICHAT-002`) + mock AI-suggest (`AICHAT-003`), both shipped this session | None. Only the opaque `id` (client-generated, not dated/coded, not guaranteed globally stable if thread creation logic changes) | No second tier; nothing an `AgentBusTask`/`AnalysisEvent` could cite that survives a rename. |
| `FileAsset` (`src/types/file-library.ts`) | `title` — manual rename only (`FileRenameDialog`); no AI-suggest button | None beyond opaque `id` (`"fa-001"`, sequential but undated/uncoded) | Missing both the AI-suggest half of tier 1 (parity gap with `ChatThread`) and all of tier 2. |
| `MediaAsset` (`src/types/media-library.ts`) | `name` — **no rename affordance exists at all**, manual or AI | None beyond opaque `id` | Missing tier 1 entirely, and all of tier 2. |
| `SourceAsset` (`ARC-011`, schema proposal, not yet implemented) | `displayName` (documented) | `canonicalName` (documented) — but this is a *semantic grouping label*, not a coded/dated identifier; see §3 | Tier 1 is documented but unimplemented; tier 2 as the owner now defines it (ISO-9001-style code) does not exist even on paper yet. |

## 3. Clarifying What "Two Names" Means (Avoiding a Naming Collision With `ARC-011`)

`ARC-011` already has a field called `canonicalName`. It would be a mistake to silently treat the owner's new ask as "just implement `canonicalName`" — they solve different problems:

| Field | Question it answers | Stability | Who edits it |
|---|---|---|---|
| `displayName` / `title` | "What do I call this when I look at it?" | Changes anytime — manual rename or AI-suggested rename (`AICHAT-002/003` pattern) | Owner, or AI on owner's click |
| `canonicalName` (`ARC-011`, existing) | "Which other assets is this the same underlying subject as, for grouping/dedup?" | Recomputed as new related assets arrive; still a human-readable phrase | AI, silently, for internal grouping only |
| **`referenceCode`** (new, this document) | "What is the one string that always, unambiguously, and permanently points at this exact object — usable in a citation, an audit log, or an AI message, even after ten renames?" | **Assigned once at creation, never regenerated, never reused** | System, at creation time, never edited by anyone |

The owner's ask is specifically the third row. It is additive to `ARC-011` (`SourceAsset` gains `referenceCode` alongside its existing `originalName`/`canonicalName`/`displayName`), and it is the missing piece for `ChatThread`, `FileAsset`, and `MediaAsset`, none of which currently have anything in that row.

## 4. Design: The Reference Code Scheme

Reuse this repo's own precedent (`MAN-000`'s `TYPE-NNN_kebab-title` doc numbering) rather than inventing new syntax — it already satisfies ISO 9001 §7.5.2's identification fields (type/reference-number/date) and §7.5.3's retrievability requirement (centrally indexed in `MAN-001`), and the owner and every future agent are already fluent in reading it.

```txt
{OBJECT_TYPE}-{ORIGIN}-{SEQUENCE:6}-{DATE:YYYYMMDD}
```

- `OBJECT_TYPE` — fixed short token per object kind: `THREAD` (chat), `FILE` (file library asset), `MEDIA` (media library asset). Extensible later to `WORKREC`/`RESREC`/etc. if `ARC-030`'s `ResourceVersion` needs the same treatment.
- `ORIGIN` — the owning module or source, reusing the existing module-id vocabulary (`src/types/module-permission.ts`'s `ALL_MODULES`, already cited as canonical by `RES-016`) — e.g. `AIINPUT`, `WORK`, `CHAMBER` — or, for source-coworking threads, the specific connector (`LINE`, `RSS`, `DRIVE`).
- `SEQUENCE` — 6-digit zero-padded counter, monotonic **per `OBJECT_TYPE`** (mirrors `MAN-000`'s per-doc-type numbering, so `THREAD` and `FILE` sequences don't collide or compete).
- `DATE` — creation date, `YYYYMMDD`, satisfying ISO 9001 §7.5.2's explicit "date" identification field.

Examples: `THREAD-AIINPUT-000123-20260716`, `FILE-AIINPUT-000045-20260710`, `MEDIA-AIINPUT-000012-20260712`.

Rules:

- **Assigned once, at creation, and never regenerated** — this is the entire point; a `displayName` rename or an `AICHAT-003`-style AI re-title must never touch `referenceCode`.
- **Never reused** after an object is deleted — matches `ARC-011`'s "`originalName` must never be overwritten" discipline and prevents a stale citation from silently pointing at a different, newer object.
- Mock-mode generation is a deterministic client-side counter (no DB sequence exists yet for any of these three objects); this can ship as a pure function today with zero backend dependency, same posture as `AICHAT-003`'s mock heuristic.
- Rendered as a small monospace, copy-to-clipboard badge — next to (not replacing) the display name — in the `ChatThread` row/detail, and in `FileAsset`/`MediaAsset` detail drawers.
- This is the string an AI message, an `AnalysisEvent` report, or an `AgentBusTask` reference (`RES-011`, `ARC-032`) should cite going forward instead of a bare `id` or a rename-prone display title — it is legible in raw text/logs without a DB lookup, which a UUID-style `id` is not.

## 5. Design: Closing the Tier-1 Parity Gap

While implementing tier 2, the audit in §2 surfaced that tier 1 itself is uneven across the three surfaces:

- `FileAsset` has manual rename but no AI-suggest button — add one using the exact `generateThreadTitle`-style heuristic already shipped for `ChatThread` in `AICHAT-003` (first-line-of-content excerpt; swappable for a real provider call later).
- `MediaAsset` has neither manual nor AI-suggest rename — needs both, following the same `FileRenameDialog` pattern already proven for `FileAsset`.

This is scoped as its own backlog row (§6) rather than folded into the `referenceCode` rows, since it's a smaller, independently shippable UI parity fix reusing an already-proven pattern, not new design.

## 6. Rejected Alternatives

| Option | Why rejected |
|---|---|
| Repurpose `ARC-011`'s existing `canonicalName` as the "AI name" | Conflates two different jobs (semantic grouping vs. permanent citation key) — see §3. Would break `canonicalName`'s existing documented purpose. |
| Use the opaque `id` as the AI-facing reference | `id`s in this codebase are either random client tokens (`ChatThread`) or short undated sequential slugs (`fa-001`) — neither is dated, typed, or legible without cross-referencing a lookup table, failing ISO 9001 §7.5.2's "date" and readability intent. |
| Invent a new external syntax (e.g. copy a specific ISO consultancy's numbering template verbatim) | ISO 9001 itself imposes no fixed syntax (§1); this repo already has a working, owner-familiar scheme (`MAN-000`) that satisfies the standard's actual requirements — reusing it is lower-risk and more consistent than importing an unrelated template. |
| Auto-regenerate the reference code whenever the display name changes | Defeats the entire purpose — the code's value is that it *never* changes, so past citations remain valid. |

## 7. NANDA Agent Protocol Gate

This is a naming/identification scheme for existing UI objects (chat threads, file assets, media assets) — it does not create, modify, route, or expose any new AI agent capability. No `AgentFacts-lite` manifest change is required. It does, however, directly serve `ARC-032`/`RES-011`'s existing citation and audit-trail needs by giving future `AgentBusMessage`/`AnalysisEvent` reference fields a stable, human-legible key to point at — flagged here so `EVENTOPS-024`/`EVENTOPS-031` (event/audit contract work, still `TODO`) adopt `referenceCode` instead of inventing another id scheme when they're picked up.

## 8. Backlog Rows

| Task id | Title | Module | Files likely affected | Acceptance criteria | Verification | Risk / Notes |
|---|---|---|---|---|---|---|
| `NAMECODE-001` | Define `referenceCode` generation contract | Cross-module | New `src/lib/naming/reference-code.ts` (pure function + per-type counter) | `generateReferenceCode(objectType, origin): string` returns `{TYPE}-{ORIGIN}-{SEQUENCE:6}-{DATE}`; sequence is monotonic per `objectType`; documented as assign-once/never-regenerate/never-reuse | `pnpm exec tsc --noEmit --pretty false`, unit-style manual check (two calls same type produce increasing sequence) | LOW — pure client-side utility, no schema/server action. See `RES-018` §4. |
| `NAMECODE-002` | Add `referenceCode` to `ChatThread` and render badge | AI Input | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Every `ChatThread` (existing default thread included, via a one-time backfill on state init) gets a `referenceCode` at creation using `NAMECODE-001`; a small monospace copy-to-clipboard badge renders in the thread's detail area; renaming via `AICHAT-002`/`003` never changes it | `pnpm exec tsc --noEmit --pretty false`, manual click-through (rename a thread, confirm badge unchanged) | LOW. Depends on `NAMECODE-001`. See `RES-018` §4, §6. |
| `NAMECODE-003` | Add `referenceCode` to `FileAsset`/`MediaAsset` and render badge | AI Input / Library | `src/types/file-library.ts`, `src/types/media-library.ts`, `src/lib/mock/ai-input/mock-file-assets.ts`, `src/lib/mock/ai-input/mock-media-assets.ts`, `src/components/ai/file-library/file-detail-drawer.tsx`, media detail equivalent | Both types gain `referenceCode`; mock fixtures seeded with values; detail drawers show the badge alongside title/name | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual smoke | LOW. Depends on `NAMECODE-001`. See `RES-018` §4, §6. |
| `NAMECODE-004` | Close tier-1 parity gap: AI-suggest rename for `FileAsset`, full rename for `MediaAsset` | AI Input / Library | `src/components/ai/file-library/file-quick-edit-dialogs.tsx`, new media rename dialog under `src/components/ai/media-library/` | `FileAsset` gains an "AI 命名" action next to its existing manual `FileRenameDialog`, reusing the `AICHAT-003` heuristic pattern; `MediaAsset` gains both manual and AI-suggest rename, modeled on `FileRenameDialog` | `pnpm exec tsc --noEmit --pretty false`, manual click-through | LOW — reuses an already-shipped pattern, no new design. See `RES-018` §5. |
| `NAMECODE-005` | Extend `ARC-011` §6 naming rules with `referenceCode` | Architecture / Docs | `docs/02_architecture-and-rules/ARC-011_document-attribute-layer.md` | §6's `SourceAsset` naming rules gain a fourth field, `referenceCode`, documented per §3/§4 of this research, explicitly distinguished from `canonicalName`; `ACC-002` gains a reference | Docs review, `git diff --check` | LOW — docs-only, keeps the future `SourceAsset` schema proposal consistent with what `ChatThread`/`FileAsset`/`MediaAsset` ship first in mock mode. |

## 9. Sequencing Note

`NAMECODE-002`/`003` (UI badge rendering) can ship immediately in mock mode — no dependency on `DATTR-024`'s Source Workflow persistence track, which remains blocked on Supabase/auth proof per `PLN-061`. `NAMECODE-005` is docs-only and keeps the eventual real-schema version aligned with what ships in the UI first, avoiding the same "documented but unimplemented" gap `ARC-011`'s existing `canonicalName`/`displayName` split currently has (§2).
