# Personal OS Loop 192 Evidence Report: Quick Capture Multimodal Extension Research

**Date:** 2026-07-14
**Selected task:** `AIINPUT-CAPTURE-001`
**Loop type:** Owner-directed research-to-task artifact
**Formal launch level:** `L0_LOCAL_PROTOTYPE` unchanged
**Manual Ops level:** `M1_MANUAL_OPS_READY` unchanged
**Conditional product maturity:** `C3_ARCHITECTURE_GATE_READY` unchanged

---

## 1. Task Selection

The owner attached a screenshot of a centered `快速擷取 - AI 將自動分類` modal and asked for research on:

- collapsible quick capture beside the page;
- image, audio, file, and text upload into AI import;
- conversational AI processing and classification;
- future Chrome extension or standalone app support;
- extensibility and research documentation.

No exact backlog row existed for the quick-capture/extension/app capture problem, so this loop created `AIINPUT-CAPTURE-001` under the AGENTS.md rule allowing a narrow new row for explicit owner requests.

## 2. Required Local Context Read

Read or re-read before selection and implementation:

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- Last three reports: loops 189, 190, and 191.

Relevant implementation and adjacent design context:

- `docs/07_research-and-design/RES-006_ai-input-source-conversation-and-reference-library-gap-research.md`
- `docs/07_research-and-design/RES-007_source-triggered-thinking-node-pipeline-and-action-fanout-research.md`
- `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md`
- `docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md`
- `docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md`
- `docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md`
- `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md`
- `src/app/(dashboard)/ai-input/ai-input-client.tsx`
- `src/lib/context/ingestion-context.tsx`

## 3. Strategic Review Gate

| Question | Answer |
|---|---|
| Current primary target | Formal launch remains `L0_LOCAL_PROTOTYPE`; Manual Ops is `M1_MANUAL_OPS_READY`; conditional product maturity is `C3_ARCHITECTURE_GATE_READY`. |
| Last three loops | Loop 189 repaired Vercel build memory/command pinning; loop 190 separated AI chat from immediate ingestion; loop 191 added source coworking threads and mock file/image libraries. |
| Current blocker | AI Input lacks a real protected upload/storage/BFF capture path; real connectors remain gated by `AUT-007`; auth, Work, and deployment proof remain owner/operator evidence. |
| Repeat risk | The loop is research/docs, but it is owner-directed and converts a new UI/platform requirement into executable tasks rather than repeating status-only evidence. |
| Capability moved | Quick capture becomes a cross-surface multimodal contract with AI conversation classification and future extension/app adapter path. |
| More true after loop | Future capture work can share one `CaptureEnvelope`, one BFF boundary, one Source Workflow path, and one NANDA-safe IngestionAgent capability plan. |

## 4. Research Gate

Page requirement understanding score: **90/100 High**

| Dimension | Score |
|---|---:|
| Actor/job clarity | 18/20 |
| PRD/local evidence fit | 19/20 |
| Data/BFF/API clarity | 18/20 |
| UI/reference-pattern confidence | 14/15 |
| Risk/auth/public-output clarity | 13/15 |
| Acceptance/verification clarity | 8/10 |

Three high-confidence research rounds were completed:

1. Local PRD/code/screenshot fit: selected collapsible dock/side sheet; rejected centered blocking modal as primary pattern.
2. Platform capability: selected web app dock first, then PWA share target, Chrome side panel/context menus/user-gesture scripting, then standalone app.
3. Data/safety/NANDA: selected `CaptureEnvelope` plus protected BFF validation into Source Workflow; rejected direct extension DB writes, silent clipboard/page scraping, raw private archive in extension storage, automatic final module writes, and a parallel classifier pipeline.

## 5. External Source Review

Official/primary sources used:

- Chrome side panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Chrome context menus API: https://developer.chrome.com/docs/extensions/reference/api/contextMenus
- Chrome scripting API: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Chrome Web Share Target API: https://developer.chrome.com/docs/capabilities/web-apis/web-share-target
- MDN Web App Manifest `share_target`: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target
- MDN FileReader: https://developer.mozilla.org/en-US/docs/Web/API/FileReader
- W3C File API: https://www.w3.org/TR/FileAPI/
- MDN MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- MDN MediaDevices: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices
- MDN Clipboard API: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API

Key conclusions:

- Chrome side panel is the right extension-era analog to the owner's desired beside-page capture.
- Context menus are appropriate for user-initiated selected text/link/image/page capture.
- Scripting/content scripts require explicit permission and should be used with user gesture, page filtering, and no silent scraping.
- Extension storage is useful for transient metadata/queue state, not secrets or durable private archives.
- PWA share target can support OS-level sharing into Personal OS after the web BFF is ready.
- FileReader/File API, MediaRecorder, MediaDevices, and Clipboard APIs support web capture primitives but require explicit UI and permission-conscious handling.

## 6. Artifact Changes

Created:

- `docs/07_research-and-design/RES-008_ai-input-quick-capture-multimodal-extension-research.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-192-20260714-quick-capture-multimodal-extension-research.md`

Updated:

- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `tasks.md`

## 7. Product Capability Delta

The product now has a formal path from a UI screenshot/request to executable capture architecture:

- collapsible capture dock replaces centered modal as selected direction;
- `CaptureEnvelope` becomes the shared contract for text, image, audio, file, URL, clipboard, page-selection, and screenshot payloads;
- quick capture is routed into AI Input Source Workflow and RES-007 thinking-node/action fan-out instead of a separate pipeline;
- web, PWA, Chrome extension, and standalone app capture become adapters around the same BFF boundary;
- high-risk final writes and public output remain owner-reviewed and blocked by policy.

## 8. NANDA Agent Protocol Gate

NANDA applies because the task defines future AI capture classification and IngestionAgent behavior.

Affected AgentFacts-lite fields:

- identity: `IngestionAgent`;
- provider: internal Personal OS agent;
- lifecycle: protected-owner visible draft/proposal workflow;
- endpoints: none added;
- protocols: internal Source Workflow only;
- capabilities: future `multimodal-capture-envelope-classification`;
- skills: classify, summarize, ask clarification, route proposals;
- auth: protected owner session required for formal BFF operations;
- trust: no public output, no direct extension DB write, no external agent DB access;
- observability: future audit/proof refs required;
- registry status: `externalRegisterable=false`.

Concrete artifact: `RES-008` and backlog row `AIINPUT-CAPTURE-006`.

External registration remains `HUMAN_APPROVAL_REQUIRED`.

## 9. Verification

| Command | Status |
|---|---|
| `git diff --check -- docs/00_manual-and-index/MAN-001_document-index.md docs/05_execution-plans/PLN-060_task-backlog.md docs/05_execution-plans/PLN-061_current-sprint.md docs/06_audits-and-reports/RPT-007_completed-log.md docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md docs/2_agent-input/generated/agent-loop/loop-state.json tasks.md` | Pass |
| `rg -n "[ \\t]+$" docs/07_research-and-design/RES-008_ai-input-quick-capture-multimodal-extension-research.md docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-192-20260714-quick-capture-multimodal-extension-research.md` | Pass; no matches, exit code 1 |
| `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state ok')"` | Pass; `loop-state ok` |
| `rg -n "RES-008|AIINPUT-CAPTURE-001|AIINPUT-CAPTURE-006" ...` | Pass; markers found in research doc, index, backlog, sprint, completed log, acceptance, and evidence report |

Full-worktree `git diff --check` was also attempted and failed because pre-existing dirty runtime files outside this loop contain trailing whitespace:

- `src/app/(dashboard)/ai-input/ai-input-client.tsx`
- `src/lib/context/ingestion-context.tsx`

Those files were already modified in the worktree and were not edited by this docs-only loop.

No `pnpm exec tsc`, `pnpm db:validate`, or `pnpm build` was required because this loop created docs/task-memory artifacts only and no runtime code.

## 10. Remaining Risks

- Quick capture dock runtime still needs `AIINPUT-CAPTURE-003`.
- Real local file/image/audio preview still needs `AIINPUT-CAPTURE-004`.
- Formal storage remains blocked by existing Source Workflow BFF/persistence gates.
- Chrome extension auth/token handling must be designed before extension runtime.
- OCR/transcription/provider processing remains gated.
- Extension/app capture must not bypass `requireUser()`, service-layer authorization, or Source Workflow audit boundaries.
- Launch level cannot move from this research artifact.

## 11. Next Decision

Preferred next global loop: run the overdue launch-level review because loop 185 is still the latest formal launch review and loops 190-192 were owner-directed AI Input work.

Preferred next capture-specific slice if launch review is intentionally deferred: `AIINPUT-CAPTURE-002`, the docs-first `CaptureEnvelope` and `CaptureSurfaceAdapter` architecture contract.
