# BFF MVP Evaluation Report

Date: 2026-06-07

Status: `DATTR-016_DONE`, `DATTR-018_DONE`, `DATTR-019_DONE`, `DATTR-021_DONE`, `DATTR-022_DONE`, `DATTR-023_DONE`

Scope: evaluate the current minimum viable Personal OS run after adding the BFF-first workflow and UI-only AI Import Workbench.

Update: `DATTR-018` extends the same UI-only BFF prototype so the AI Input workbench is usable on mobile/tablet viewports before any real workflow persistence or connector runtime is built. `DATTR-019` further refines the interaction model by turning the conversation/source side into a cowork-first panel. `DATTR-021` clarifies the IA into subpage-style views: `AI 對話`, `參考脈絡`, `同步設定`, and `AI 工作台`. `DATTR-022` refines `同步設定` into an external connector and sync status overview. `DATTR-023` adds a persistent mock data kill switch and formal-mode readiness gate.

## 1. Purpose

This pass did not attempt to add broad runtime features. It established a repeatable development workflow and implemented the currently safe UI-only task:

```txt
DATTR-016 - Prototype AI Import Workbench UI
DATTR-019 - Redesign AI Input cowork/source panel
DATTR-021 - Clarify AI Input reference context vs sync settings
DATTR-022 - Redesign AI Input sync settings as external connector status
DATTR-023 - Add mock data kill switch and Supabase readiness gate
```

The goal was to make the AI Input direction tangible while preserving the architecture boundary:

```txt
AI conversation
  -> BFF-visible contract
  -> mock workflow view models
  -> UI workbench
  -> no persistence
  -> no connector runtime
  -> no module SSOT write
```

## 2. BFF Strategy Used

The updated project workflow uses a Backend-for-Frontend strategy:

```txt
UI need
  -> BFF contract
  -> server action / route handler / Server Component loader
  -> requireUser()
  -> service-layer authorization
  -> domain service
  -> Prisma or approved adapter
  -> mapper / view model
  -> Client Component interaction
```

For this task, the chosen execution mode was:

```txt
UI-only/mock BFF prototype
```

That means:

- No route handler was added.
- No server action was added.
- No Prisma schema or migration was added.
- No connector runtime was added.
- Mock workbench data was kept inside the UI layer as a prototype contract.
- Future persistence should be handled by `DATTR-017`, not by this UI pass.

## 3. Framework Notes

Local Next.js 16 docs were checked before editing the App Router page:

- `node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`

Framework implications:

| Framework area | Current decision |
|---|---|
| Next.js App Router | Keep `/ai-input` as the current interactive route. |
| Server Components | Future DB-backed workflow loading should move to a Server Component loader or BFF route. |
| Client Components | Current AI conversation and mock workbench remain client-side because they are interactive and mock-only. |
| Server Actions | Not used in DATTR-016 because no mutation or persistence was required. |
| Route Handlers | Not used in DATTR-016 because no public BFF endpoint was required. |
| Data security | Future BFF endpoints must hide sensitive errors and enforce auth/authorization. |
| Prisma | No schema, migration, or database query changes in this pass. |

## 4. Implemented MVP

The minimum viable UI now available at `/ai-input`:

- AI conversation remains the primary interaction surface.
- The page now uses subpage-style navigation instead of simultaneous side panels.
- `AI 對話` is the default cowork entry.
- `參考脈絡` treats selected sources as current-conversation context only.
- `同步設定` shows external connector and sync status across LINE, Drive, Google Docs, RSS, Telegram, Gmail, GitHub/Markdown, and manual import.
- `同步設定` rows show connector state, sync state, scope, cadence, last/next sync, module hint, risk, and review condition.
- `AI 工作台` presents workflow data as table rows instead of nested cards.
- The workbench is marked as `Mock`.
- A persistent mock data toggle lets the user switch between mock/demo mode and formal mode.
- The dashboard sidebar also exposes a compact mock/formal toggle so the mode can be changed outside `/ai-input`.
- Formal mode hides mock source/workflow rows, blocks mock-only source write actions, and keeps the AI cowork entry usable.
- The workbench shows:
  - workflow count
  - completed count
  - review count
  - 今日 Workflow
  - 需要確認
  - 來源環境
  - 整理結果
  - 工作紀錄
- Mock workflow records include mentionable run IDs such as `@SRC-RUN-2026-00127`.
- Review rows show classification uncertainty and high-risk source fragment examples.
- Existing quick import and triage proposal UI remains available.

## 5. MVP Verification

Commands:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
pnpm db:generate
pnpm exec eslint 'src/app/(dashboard)/ai-input/page.tsx'
pnpm build
git diff --check
```

Results:

| Check | Result |
|---|---|
| TypeScript | Passed |
| Prisma validate | Passed |
| Prisma generate | Passed |
| Targeted eslint for `/ai-input` | Passed |
| Production build | Passed after DATTR-023 |
| `/ai-input` production smoke check | Passed on temporary `http://localhost:3010/ai-input` with status `200` |
| Git diff whitespace check | Passed |
| Previous in-app browser checks through DATTR-019 | Passed |
| DATTR-021 browser automation | Not run; browser execution tool unavailable in this request |

Browser checks:

- Previous DATTR-016 to DATTR-019 browser checks passed.
- For DATTR-021, manual refresh should confirm the subpage navigation: `AI 對話`, `參考脈絡`, `同步設定`, and `AI 工作台`.

## 6. Build Result

`pnpm build` previously hung during the earlier DATTR-016 pass while an existing long-running `pnpm dev` process was active. After DATTR-023, `pnpm build` completed successfully.

Environment note:

- `.env.local` points to a remote Supabase PostgreSQL host.
- `.env` also points to a remote Supabase PostgreSQL host.
- Work persistence verification should therefore use an explicitly configured disposable local PostgreSQL database, not the default env files.
- The user later approved Supabase updates, but both configured Supabase URLs failed DNS resolution from this environment during the `WORK-007` verification attempt.

Current interpretation:

- TypeScript passed.
- Prisma validation/generation passed.
- Targeted ESLint passed.
- Production build passed.
- A temporary `next start -p 3010` server returned `200` for `/ai-input`.

Recommended follow-up:

```bash
pnpm build
```

Repeat a browser visual check in the user's active dev server if `localhost:3002` remains unresponsive; the temporary production server smoke check passed.

## 7. BFF Readiness Evaluation

| Criterion | Status | Notes |
|---|---|---|
| UI-visible contract exists | Pass | Subpage navigation and workbench tables express the intended workflow contract. |
| Client does not import Prisma | Pass | `/ai-input` remains mock/context driven. |
| No hidden persistence | Pass | No DB writes or schema changes were added. |
| No connector runtime | Pass | LINE, RSS, Google Doc, Markdown, image/audio remain mock actions. |
| Module SSOT protection | Pass | No module records are written by workflow workbench. |
| Future BFF boundary is clear | Pass | `AGENTS.md` now documents BFF-first flow. |
| Runtime build readiness | Pass | `pnpm build` passed after DATTR-023. |
| Work end-to-end refresh proof | Pending | Requires `WORK-007` against disposable local PostgreSQL because default env points to remote Supabase. |
| Responsive completeness | Pass for current mock scope | Mobile/tablet now shares the same subpage navigation instead of separate accordions. |
| Mock data kill switch | Pass | Formal mode clears/hides mock source workflow data and blocks mock-only writes. |
| Supabase AI Input persistence | Not ready | `DATTR-017` and `DATTR-010` are complete as proposals; still requires `DATTR-011`, migration review, `DATTR-024`, and reachable DB connectivity. |

## 8. Remaining Risks

- Workbench data is mock-only.
- Formal mode is an honest empty/readiness state, not full Supabase persistence.
- `AIWorkflowRun` and `AIWorkItem` are not persisted.
- `@AIWorkflowRun` / `@AIWorkItem` mention support is not wired into the mention picker yet.
- Morning brief integration is not runtime-backed.
- No source workflow correction engine exists yet.
- The user's active `localhost:3002` dev server did not answer a 5-second HTTP probe in this pass, despite production smoke check passing on port `3010`.
- `WORK-007` must be run against a disposable local PostgreSQL database before claiming full Work browser refresh proof.
- Mobile/tablet visual polish can continue after the interaction model is reviewed.

## 9. Recommended Next Tasks

Product mainline:

- `WORK-007` — Verify Work persistence and refresh behavior end-to-end.

Source workflow / data architecture:

- `DATTR-011` — Define source intake security, privacy, and retention policy.

UIUX follow-up:

- `DATTR-020` — Extend AI Input @mention target mock model so the conversation can reference workflow runs, work items, morning brief items, SourceAssets, and DataUnit proposals before persistence.

Formal-use persistence:

- `DATTR-024` — Persist AI Input Source Workflow data to Supabase BFF after schema, security/privacy, migration, and connectivity prerequisites are ready.
