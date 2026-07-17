# AI Input Quick Capture, Multimodal Import, And Extension/App Research

**Document ID:** `RES-008`
**Last updated:** 2026-07-14
**Status:** Research-to-task artifact; no runtime implementation in this pass
**Owner request:** Quick capture should be collapsible beside the page, support image/audio/file/text upload into AI import, let AI process and classify through conversation, and stay extensible for a future Chrome extension or standalone app.

---

## 1. Purpose

The current quick-capture concept is visually close to the owner's intent, but the screenshot shows a centered blocking modal. That pattern is useful for one short text note, but it weakens the core capture job: the owner often needs to keep surrounding context visible while collecting text, screenshots, files, voice notes, and page references.

This research defines a single extensible capture model for:

- protected `/ai-input` web UI;
- a collapsible in-app capture dock or side sheet;
- local text, image, audio, file, URL, clipboard, page-selection, and screenshot payloads;
- conversational AI processing and classification;
- a future PWA share target, Chrome extension side panel, and standalone app;
- BFF-first safety boundaries before any storage, connector runtime, OCR, transcription, or final module writes.

The selected architecture is `CaptureEnvelope`: every capture surface emits the same UI-safe envelope into the AI Input Source Workflow pipeline. Platform-specific collectors are adapters, not separate product flows.

---

## 2. Source Basis

### Local product and architecture sources

- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/07_research-and-design/RES-006_ai-input-source-conversation-and-reference-library-gap-research.md`
- `docs/07_research-and-design/RES-007_source-triggered-thinking-node-pipeline-and-action-fanout-research.md`
- `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md`
- `docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md`
- `docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md`
- `docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md`
- `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md`
- `src/app/(dashboard)/ai-input/ai-input-client.tsx`
- Attached owner screenshot: centered `快速擷取 - AI 將自動分類` modal over blurred `/ai-input` context.

### Official and primary external sources

- Chrome Extensions side panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Chrome Extensions context menus API: https://developer.chrome.com/docs/extensions/reference/api/contextMenus
- Chrome Extensions scripting API: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Chrome Extensions storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Chrome Extensions content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome Web Share Target API: https://developer.chrome.com/docs/capabilities/web-apis/web-share-target
- MDN Web App Manifest `share_target`: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target
- MDN FileReader: https://developer.mozilla.org/en-US/docs/Web/API/FileReader
- W3C File API: https://www.w3.org/TR/FileAPI/
- MDN MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- MDN MediaDevices: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices
- MDN Clipboard API: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API

---

## 3. Strategic Review Gate

| Question | Current answer |
|---|---|
| Current product target | Formal launch remains `L0_LOCAL_PROTOTYPE`; Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`. |
| Last three completed loops | Loop 189 repaired the Vercel build path. Loop 190 decoupled AI chat from immediate ingestion. Loop 191 added source coworking threads plus mock file/image library references. |
| Current blocker | AI Input still lacks a formal DB-backed capture/upload/storage/BFF runtime path; real connectors and provider events remain gated by `AUT-007`; Work/auth/deploy proof remains owner/operator evidence. |
| Is this repeat work? | It is owner-directed research, but it creates a new executable product architecture slice rather than another status-only report. |
| Capability moved | AI Input quick capture becomes a cross-surface capture contract with multimodal payloads, conversation processing, and extension/app adapter readiness. |
| What is more true after this loop? | Future web UI, PWA, Chrome extension, and standalone capture can share one capture envelope, one BFF contract, one safety boundary, and one AI workflow handoff. |

---

## 4. Page Requirement Understanding Score

Score: **90/100 - High**

| Dimension | Score | Evidence |
|---|---:|---|
| Actor/job clarity | 18/20 | Owner wants faster personal information capture while preserving context. |
| PRD/local evidence fit | 19/20 | AI Input, Source Workflow, Source Asset, and conversational ingestion are already documented; RES-006/RES-007 cover adjacent source conversation gaps. |
| Data/BFF/API clarity | 18/20 | ARC-008/015/031 provide the path; this research adds `CaptureEnvelope` before DB-backed writes. |
| UI/reference-pattern confidence | 14/15 | Screenshot makes the blocking-modal problem concrete; Chrome side panel and PWA share-target docs validate future platform shapes. |
| Risk/auth/public-output clarity | 13/15 | Upload, clipboard, page capture, audio, and future extension all require explicit consent and fail-closed protected BFF handling. |
| Acceptance/verification clarity | 8/10 | Docs, backlog, and marker checks are clear; runtime smoke waits for later implementation. |

Because the score is high, three research rounds are required before executable task shape.

### Round 1: Local PRD, code, and screenshot fit

Selected pattern: replace the current blocking quick-capture mental model with a collapsible dock:

- collapsed rail: one icon/button near the right side of `/ai-input` or global dashboard shell;
- compact composer: fast text note plus attachment buttons;
- expanded review side sheet: payload list, source hints, classification preview, conversation thread;
- conversation handoff: submit creates or resumes an AI Input capture conversation;
- mobile: bottom sheet with the same states.

Rejected pattern: centered modal as the primary capture surface. It hides the page being captured, cannot comfortably support multi-file/audio workflows, and does not translate cleanly to Chrome side panel or standalone app.

### Round 2: Platform capability research

Selected pattern: web app first, then adapter surfaces:

- Web app dock: simplest path for `/ai-input` and shared dashboard capture.
- PWA share target: installed app can receive shared text, links, and files through Web Share Target.
- Chrome extension: Manifest V3 side panel gives persistent alongside-page capture; context menus support page/link/image selection entry points; content scripts/scripting support explicit user-initiated page selection or screenshot metadata capture.
- Standalone app: reuse the same `CaptureEnvelope` API with native file picker, microphone, screenshot, and global-shortcut adapters once product risk is lower.

Rejected pattern: extension-first ingestion. Extension permissions, storage, content script isolation, clipboard behavior, and auth token handling create high security scope before the core BFF contract is stable.

### Round 3: Data, safety, and NANDA boundary

Selected pattern: all collectors create a draft `CaptureEnvelope`; final processing remains protected-owner, proposal-only, and BFF-first:

```txt
Capture surface
  -> CaptureSurfaceAdapter
  -> CaptureEnvelope draft
  -> protected BFF validation
  -> SourceAsset / AIWorkflowRun proposal
  -> IngestionAgent classification conversation
  -> DataUnitProposal / ModuleWriteIntent draft
  -> owner review before module writes
```

Rejected patterns:

- direct database writes from browser extension;
- raw provider/page payload storage in extension storage;
- silent clipboard reads or background page scraping;
- automatic final writes into Work, Finance, Life, Company, or public output;
- new parallel ingestion pipeline separate from Source Workflow.

---

## 5. Selected Product Pattern

### 5.1 Capture dock states

| State | Purpose | Required behavior |
|---|---|---|
| Collapsed rail | Always-available quick entry | Small side control, tooltip, keyboard shortcut, unread/draft indicator, no layout jump. |
| Compact composer | Fast capture | Text box, paste support, attach buttons for image/audio/file/link, current page/context hint, submit. |
| Expanded review | Multimodal review | Shows payload chips/previews, source metadata, risk labels, classification suggestions, and conversation thread. |
| Conversation processing | AI collaboration | AI asks clarifying questions, proposes categories, and lists possible module destinations. |
| Proposal review | Owner control | Owner accepts, edits, routes, or discards proposals; high-risk modules remain draft-only. |
| Mobile bottom sheet | Small viewport equivalent | Same contract, bottom dock/sheet rather than right side rail. |

The dock can be open beside the current page, collapsed without losing draft state, and reopened into the same envelope. It must not force context blur as the normal path.

### 5.2 `CaptureEnvelope` contract proposal

```ts
type CaptureInputChannel =
  | "web_dock"
  | "pwa_share_target"
  | "chrome_side_panel"
  | "chrome_context_menu"
  | "standalone_app"
  | "automation_stub";

type CapturePayloadKind =
  | "text"
  | "image"
  | "audio"
  | "file"
  | "url"
  | "clipboard"
  | "page_selection"
  | "screenshot";

interface CaptureEnvelope {
  id: string;
  ownerProfileRef: "current-user";
  inputChannel: CaptureInputChannel;
  sourceSurface: string;
  modeHint?: "general" | "work" | "research" | "reflection" | "finance" | "life" | "chamber" | "company" | "report";
  payloads: CapturePayload[];
  contextRefs: CaptureContextRef[];
  conversationThreadRef?: string;
  consent: {
    userGesture: boolean;
    captureScope: "typed" | "selected" | "shared" | "uploaded" | "recorded";
    sensitiveContentWarningShown: boolean;
  };
  risk: {
    publicOutputAllowed: false;
    finalModuleWriteAllowed: false;
    externalAgentAccessAllowed: false;
    externalRegisterable: false;
  };
  status: "draft" | "submitted" | "classifying" | "needs_owner_review" | "discarded";
  createdAt: string;
}
```

`CapturePayload` should separate transient local previews from persisted SourceAsset refs. A web-only mock can hold object URLs in local component state, but formal mode must move through protected BFF validation before persistence.

### 5.3 Multimodal payload handling

| Payload | Web app dock | Future extension/app path | Safety note |
|---|---|---|---|
| Text | textarea, paste, keyboard shortcut | side panel textarea, context menu selected text, share target text | Text remains draft until submitted. |
| Image | `<input type="file">`, paste image, drag/drop | context menu image URL, screenshot adapter, native file picker | Strip or hide EXIF in UI-safe DTOs; no public rendering by default. |
| Audio | MediaRecorder preview, uploaded audio file | standalone/native mic, extension side panel recording if permissioned | Transcription remains a later gated provider/runtime task. |
| File | `<input type="file">`, file preview metadata | share target files, native file picker | Large/private files should default to metadata-only until approved storage exists. |
| URL/page | URL input, current app context | browser tab URL with explicit user gesture | Do not fetch arbitrary URLs from client; server-side fetch remains a separate approved adapter. |
| Clipboard | paste event, explicit clipboard button where allowed | side panel paste or user-gesture clipboard action | Clipboard API requires secure-context and permission-conscious handling. |
| Page selection | not available in core web app except current app context | content script selection capture via active tab/user gesture | No silent page scraping. |
| Screenshot | manual upload first | extension or standalone screenshot adapter | Treat screenshot as image payload with private-source risk. |

### 5.4 BFF operations

Future runtime should define operations before implementing storage:

- `createCaptureDraft(inputChannel, modeHint, contextRefs)`
- `attachCapturePayload(captureId, payloadMetadata, transientBlobRef)`
- `submitCaptureEnvelope(captureId)`
- `getCaptureConversation(captureId)`
- `classifyCapture(captureId, ownerInstruction?)`
- `convertCaptureProposal(captureId, targetModule, proposalType)`
- `discardCaptureDraft(captureId, retentionReason)`

All formal operations require `requireUser()`, service-layer authorization, no raw Prisma payload in Client Components, no secrets in DTOs, and no final high-risk writes.

### 5.5 Conversation processing

The capture conversation should be a first-class AI Input thread, not a one-shot classifier:

1. The owner submits a `CaptureEnvelope`.
2. IngestionAgent creates an AI Input capture thread.
3. The agent summarizes payloads and asks clarification when destination or sensitivity is unclear.
4. The agent proposes one or more classifications: source note, Research item, Work task, reflection, client-visible draft blocker, finance/life/company draft-only item, or discard.
5. The owner confirms, edits, or rejects proposals.
6. Only approved low-risk paths can proceed to later `ModuleWriteIntent` review. High-risk modules stay proposal-only.

This aligns with RES-007's source-triggered thinking-node pipeline: quick capture is another trigger source, not a separate classifier.

---

## 6. Extension And Standalone App Path

### Phase A: Web app dock

Implement the collapsible side dock inside protected `/ai-input` first. It can use mock/local previews for attachments, route into the existing AI Input chat/coworking surface, and keep persistence disabled until Source Workflow BFF prerequisites are ready.

### Phase B: PWA share target

Add a manifest `share_target` only after the web app can accept a `CaptureEnvelope` route safely. This supports OS-level sharing into Personal OS for text, links, and files when installed as a PWA.

### Phase C: Chrome extension

Use a Manifest V3 extension as an adapter around the same backend contract:

- `sidePanel` for persistent beside-page capture;
- `contextMenus` for selected text, page, link, and image entry points;
- `activeTab` plus `scripting` only after user gesture for page-selection capture;
- extension `storage.local` or `storage.session` only for transient drafts/queue metadata, not secrets or durable private archives;
- authenticated submission to the protected Personal OS BFF through an explicit sign-in or token handoff design, never direct DB access.

The extension must not store Supabase keys, database URLs, service-role keys, raw provider credentials, or long-lived private payload archives.

### Phase D: Standalone app

The standalone app should reuse `CaptureEnvelope` and `CaptureSurfaceAdapter` with native capabilities:

- global shortcut opens compact composer;
- native file picker and drag/drop;
- microphone recording;
- screenshot capture;
- offline queue metadata;
- protected sync to the same BFF once signed in.

Standalone runtime should come after the web/PWA/extension contract is proven, because it expands packaging, updates, offline storage, and local privacy risk.

---

## 7. NANDA Agent Protocol Gate

This task touches AI Input, IngestionAgent classification, capture-triggered workflow runs, and future extension/app ingestion.

Affected AgentFacts-lite fields:

- identity: `IngestionAgent`;
- provider: internal Personal OS agent, no external provider registration;
- lifecycle: protected-owner visible draft/proposal workflow;
- endpoints: none added in this pass;
- protocols: internal Source Workflow only in this pass;
- capabilities: future `multimodal-capture-envelope-classification`;
- skills: classify, summarize, route proposals, ask clarification;
- auth: protected owner session required for formal BFF operations;
- trust: no public output, no external agent DB access, no direct extension DB writes;
- observability: future capture audit events and proof refs required before formal runtime;
- registry status: `externalRegisterable: false`.

Concrete artifact from this loop: this `RES-008` research document plus backlog row `AIINPUT-CAPTURE-006` for the manifest capability update.

External registration remains `HUMAN_APPROVAL_REQUIRED` and out of scope.

---

## 8. Rejected Alternatives

| Alternative | Rejection reason |
|---|---|
| Keep centered modal as the primary UX | Blocks visual context, weak for multi-asset capture, and does not map cleanly to side panel/standalone patterns. |
| Build Chrome extension first | Permission, storage, auth, and page-capture risks are higher before the core BFF and envelope contract are stable. |
| Extension writes directly to DB/Supabase | Violates service-layer authorization and secret boundaries. |
| Store raw files in extension storage | Extension storage is not the right long-term private archive; formal storage must be owner-authenticated and auditable. |
| Silent clipboard/page capture | Violates user-gesture and trust expectations; raises public-output/private-context risk. |
| Auto-final writes into modules | High-risk modules and Work writes require owner review, authz, proof refs, and rollback/audit strategy. |
| New capture-only classifier pipeline | Would duplicate Source Workflow and break RES-006/RES-007 convergence. |

---

## 9. Executable Backlog Shape

| Task id | Scope | Acceptance | Verification |
|---|---|---|---|
| `AIINPUT-CAPTURE-001` | Create and index this research artifact. | `RES-008` exists, records local/external source review, selected/rejected patterns, NANDA boundary, and follow-up rows. | `git diff --check`, marker scan, JSON parse. |
| `AIINPUT-CAPTURE-002` | Add `CaptureEnvelope` and `CaptureSurfaceAdapter` proposal to `ARC-008` or a new `ARC-*`. | Contract defines payload kinds, channels, consent, risk flags, Source Workflow mapping, and no-runtime boundaries. | Docs review, `git diff --check`. |
| `AIINPUT-CAPTURE-003` | Replace blocking quick-capture modal with collapsible dock mock UI. | Owner can collapse/expand, add text and mock payload chips, submit to an AI Input capture thread, and keep page context visible. | `pnpm exec tsc --noEmit --pretty false`, manual click-through. |
| `AIINPUT-CAPTURE-004` | Add real local preview inputs for image/audio/file before persistence. | File/image/audio previews use browser file/MediaRecorder APIs in local state; no DB/storage/provider runtime. | Typecheck, manual local upload/record smoke. |
| `AIINPUT-CAPTURE-005` | Define Chrome/PWA/standalone adapter contract. | Contract maps side panel, context menus, scripting/content script, share target, and standalone adapter to `CaptureEnvelope`; secrets/direct DB writes forbidden. | Docs review, official-source scan. |
| `AIINPUT-CAPTURE-006` | Extend IngestionAgent AgentFacts-lite manifest. | Capability `multimodal-capture-envelope-classification` is present; `externalRegisterable=false`; high-risk outputs require human approval. | `pnpm agent:registry:check`. |

---

## 10. Acceptance Mapping

- PRD-004 / PRD-005: strengthens AI Input as the owner's fast capture and classification layer.
- ACC-001: supports v0.1 operating loop by making capture-to-review clearer before persistence.
- ACC-002: new acceptance section `AIINPUT-CAPTURE-001` records this research and follow-up contract.
- RES-001 / RES-002: improves AI Input operating surface maturity and future owner workflow ergonomics.
- RES-006: reuses per-source/coworking-thread direction instead of replacing it.
- RES-007: treats quick capture as another trigger into source-thinking-node and action fan-out.
- ARC-008 / ARC-015 / ARC-031: extends Source Workflow rather than adding a parallel ingestion model.
- AUT-001 / AUT-007: keeps file ingestion, OCR, transcription, connector runtime, and provider event processing gated.
- ARC-028: NANDA gate applies; external registration remains disabled.

---

## 11. Stop Conditions

Stop before implementation if the next task requires any of:

- schema or migration changes for persisted capture assets;
- Supabase Storage writes or raw file storage policy changes;
- OCR/transcription/provider calls;
- extension auth token storage;
- public output from captured content;
- final writes to Work, Finance, Life, Company, Client Portal, or external collaboration;
- external agent access to private captured content;
- external agent registration.

When those boundaries are reached, create or update a formal `ARC`, `AUT`, `DBS`, `SCH`, `PLN`, or `ACC` artifact before runtime code.
