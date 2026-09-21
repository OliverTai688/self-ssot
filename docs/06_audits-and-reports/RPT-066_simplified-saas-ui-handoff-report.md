# Simplified SaaS UI Handoff Report

**Document ID:** `RPT-066`  
**Date:** 2026-08-24  
**Status:** Handoff for next UI agent; `PLN-069` reopened  
**Audience:** Claude, Codex, or another UI implementation agent  
**Primary owner feedback:** The interface still has too much text, users cannot understand it quickly, and it does not yet feel like a simplified SaaS product.

---

## 1. Correction

The previous completion claim in `RPT-065` was too broad.

What was actually done:

- Removed or renamed many visible engineering markers from normal pages.
- Added route structure for settings/admin/RBAC/AI governance.
- Added some bilingual copy coverage.
- Ran a browser marker sweep for selected strings.

What was not done:

- A full visual UX audit.
- A true Simplified SaaS redesign.
- User comprehension testing.
- First-viewport simplification.
- Visual hierarchy reduction.
- Enough progressive disclosure.

Important browser note:

- A later browser check on 2026-08-24 redirected protected routes to `/login`, so that run did not prove protected-page UX quality.
- Future UI review must first authenticate with the local dev login or a valid Supabase session, then capture screenshots/DOM metrics for protected pages.

`PLN-069` should be treated as reopened until the owner accepts the visual and interaction experience.

## 2. Current UI Problem

The core problem is not only copy. It is information architecture and density.

Observed or owner-reported issues:

| Problem | Current symptom | Required change |
|---|---|---|
| Too much text | Pages explain system state instead of helping the user act. | Replace prose with one-line status, short labels, and progressive disclosure. |
| Too many cards | First viewport looks like an internal status wall. | Use one primary surface plus one compact side rail or drawer. |
| Too many competing jobs | Pages show operation, proof, settings, readiness, AI proposal, and source state together. | Each page gets one primary user job. Secondary jobs move to tabs, drawer, settings, or admin. |
| Technical concepts leak | Even renamed technical readiness concepts still feel like implementation artifacts. | Normal pages use product jobs; admin owns proof/debug/readiness. |
| Weak SaaS visual hierarchy | Everything has similar borders, size, and importance. | Use tighter tables/lists, one accent action, fewer bordered containers, smaller secondary text. |
| AI governance is too visible in normal pages | Owner sees low-level boundaries before knowing what to do. | Show one sentence: "AI 只會建立待審核提案"; move details to admin. |
| Settings/admin still feel like reports | They read as documentation, not control planes. | Settings = user choices. Admin = diagnostics. Each setting should have an editable control or disabled reason. |

## 3. Design Target

The target is not "more polished cards." It is a quiet SaaS console.

Reference principles:

- [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): defer advanced or rarely used features to secondary screens.
- [Atlassian navigation](https://atlassian.design/components/navigation-system): repeat predictable navigation patterns and avoid forcing users to switch mental models.
- [Stripe full-page app patterns](https://docs.stripe.com/stripe-apps/patterns/full-page-apps): full-page SaaS surfaces need app name, clear page action, settings path, overview/list/detail structure.
- [Linear](https://linear.app/): speed, clarity, command-driven workflows, and low-noise surfaces.
- [shadcn/ui](https://ui.shadcn.com/docs), [Lucide](https://lucide.dev/guide/react/), [Motion](https://motion.dev/docs): use composable primitives and restrained motion only when it clarifies state.

Concrete design rules for Personal OS:

1. First viewport must answer only three questions:
   - What is this page for?
   - What needs my attention?
   - What can I do next?
2. Normal pages may show at most:
   - one H1,
   - one short subtitle,
   - one primary action,
   - one primary work area,
   - one secondary rail or collapsed drawer.
3. Keep admin-only concepts out of normal pages:
   - launch gates,
   - readiness proof,
   - task IDs,
   - raw capability flags,
   - provider/runtime details,
   - NANDA/AgentFacts fields.
4. Use Chinese product language by default:
   - "待你確認",
   - "今日建議",
   - "來源已整理",
   - "建立草稿",
   - "前往設定",
   - "查看詳細".
5. Avoid long descriptions. If a sentence is longer than 28 Chinese characters, move it to a tooltip, drawer, or admin page.
6. Avoid nested cards. Use flat sections, tables, compact lists, and drawers.
7. Use color sparingly:
   - neutral background,
   - one accent for primary action,
   - amber only for owner action required,
   - red only for blocked/danger.

## 4. Route-by-Route Handoff

### 4.1 `/dashboard` -> `今日`

Goal: "今天我該看什麼、做什麼、回覆什麼?"

Keep:

- Daily summary.
- One owner comment input.
- Top 3 actions.
- One link to AI 工作桌.

Remove or move:

- System proof text.
- Long readiness explanations.
- Too many cards.
- Debug/admin handoff copy.

Suggested first viewport:

```txt
今日
3 件事需要你看

[輸入想法或回覆 AI...] [產生今日建議]

待確認
1. 回覆商會合作提案
2. 檢查客戶交付物
3. 整理研究來源

AI 摘要
今天的重點是...
```

### 4.2 `/ai-input`

Goal: "把資訊丟進來，AI 幫我整理成可審核提案。"

Current risk:

- Too many top-level concepts: capture/review/sources/context/manual setup/source index/proposal detail/settings boundary.
- The page still reads like a workflow console, not a simple AI desk.

Keep:

- Main chat/input area.
- Source references.
- Proposal review as side drawer.

Move:

- Source workflow proof.
- Provider/runtime boundaries.
- Detailed settings.
- Manual setup detail.

Suggested first viewport:

```txt
AI 工作桌
把訊息、文件或想法放進來，我會整理成待確認提案。

[大型輸入框]
[加入來源] [建立提案]

右側窄欄:
待確認 3
已引用來源 5
最近對話 2
```

### 4.3 `/inbox`

Goal: "哪些輸入需要我處理?"

Required direction:

- Treat inbox as a queue.
- Use list/detail.
- Every item has a clear next action: "回覆", "轉成任務", "交給 AI 整理", "封存".

### 4.4 `/work`

Goal: "我有哪些專案正在推進?"

Keep:

- Project list.
- Active tasks.
- Client-visible boundary as a compact chip.

Move:

- Work proof readiness to admin.
- Long AI proposal explanations to drawer.

Preferred structure:

```txt
工作
[新增專案] [匯入更新]

專案
Name | 狀態 | 下一步 | 負責 | 到期

右側 detail panel:
選中專案的下一步、任務、交付物
```

### 4.5 `/research`

Goal: "我正在研究什麼、缺什麼證據、下一步寫什麼?"

Simplify to:

- Research questions list.
- Sources count.
- Evidence gaps.
- Draft output.

Move:

- AI governance and readiness details to admin.
- Long framework explanations to docs.

### 4.6 `/company`

Goal: "哪些公司策略需要我決定?"

Simplify to:

- Decision queue.
- Policy/contract/knowledge lanes.
- Private vs formal knowledge toggle.

High-risk rule:

- Never make strategy feel like auto-write. Use proposal/draft labels only.

### 4.7 `/agents`

Goal: "我能要求哪些 AI 代理做什麼?"

Current risk:

- The page is still too operator-oriented.

Simplified model:

- Cards/list of agent capabilities in plain language.
- One selected capability detail.
- "先預演" as primary action.
- Advanced CLI/API parity hidden in admin or collapsible developer section.

### 4.8 `/settings`

Goal: "我可以設定什麼?"

Settings should become real controls:

- Profile.
- Language.
- Members.
- Roles.
- AI sharing.
- Connected sources.
- Data/privacy.

Each row should have:

```txt
Setting name | current value | action
```

Do not show readiness reports here unless they block the setting.

### 4.9 `/admin`

Goal: "系統哪裡還不能上線?"

Admin may keep technical detail, but it still needs hierarchy:

- Blockers.
- Audit.
- RBAC.
- AI governance.
- System readiness.

Use tables and filters, not many cards.

## 5. Recommended Implementation Order

Do not redesign every page at once.

### Slice 1 - Shared Simplified Page Shell

Create or update a shared shell contract:

- `PageTitleBar`
- `PrimaryActionBar`
- `QueueDetailLayout`
- `InsightRail`
- `EmptyState`
- `AdminOnlyDisclosure`

Acceptance:

- Normal pages have one title bar and one primary work surface.
- Admin-only content can be hidden behind a disclosure/drawer.

Likely files:

- `src/components/layout/*`
- `src/components/owneros/*`
- `src/lib/i18n/product-copy.ts`

### Slice 2 - `/ai-input` First

This is the highest priority because it is the Gate A core work desk.

Acceptance:

- First viewport has fewer than 120 visible words.
- No more than 8 visible primary controls.
- Only one main input/work area.
- Proposal/source detail appears in a side rail or drawer.
- Advanced readiness/source workflow proof is hidden or moved.

Likely files:

- `src/app/(dashboard)/ai-input/ai-input-client.tsx`
- `src/lib/i18n/product-copy.ts`

### Slice 3 - `/dashboard`

Acceptance:

- First viewport is a daily action list, not a dashboard wall.
- Owner comment input is prominent.
- Top actions limited to 3.

Likely files:

- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/today-client.tsx`
- `src/lib/i18n/product-copy.ts`

### Slice 4 - `/settings`

Acceptance:

- Looks like a settings page, not a readiness report.
- Each row has current value + action.
- Manual setup is a compact status, not explanatory prose.

Likely files:

- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/settings/settings-hub-client.tsx`
- `src/app/(dashboard)/settings/settings-client.tsx`

### Slice 5 - `/admin`

Acceptance:

- Admin can keep detail but should be table/filter driven.
- First viewport shows current blockers and audit health.
- Technical proof is drilldown, not the whole page.

## 6. Browser Verification Gate For Next Agent

The next UI agent must not claim completion from source code only.

Required browser flow:

1. Start local app if needed.
2. Authenticate first.
   - Local dev login may use `taioliver688@gmail.com` and code `123456` when dev OTP is enabled.
3. Visit:
   - `/dashboard`
   - `/ai-input`
   - `/inbox`
   - `/work`
   - `/research`
   - `/company`
   - `/agents`
   - `/workflow`
   - `/settings`
   - `/admin`
4. Capture screenshot or DOM metrics for each.
5. Score each page:

| Criterion | Pass target |
|---|---|
| First-viewport word count | under 120 for normal pages |
| Primary action count | 1-3 obvious actions |
| Visible controls | under 10 unless table/list view |
| Card density | no nested cards; avoid more than 4 large cards above fold |
| Page purpose clarity | user can state the page job from H1 + subtitle |
| Admin separation | proof/debug only in admin/detail |
| Chinese comprehension | no mixed English technical terms unless unavoidable |

Completion requires owner acceptance, not only automated checks.

## 7. Suggested Prompt For Claude Or Next UI Agent

Use this prompt:

```txt
You are taking over Personal OS UI simplification. Read AGENTS.md, PLN-069, RPT-066, ARC-036, ARC-037, RES-002, and current app code.

The previous agent over-claimed UI-L4 completion after a marker cleanup. The owner rejected the interface: it still has too much text, users cannot understand it quickly, and it does not feel like a simplified SaaS product.

Your job is not to add more docs or more cards. Redesign the owner-facing UI toward a quiet Chinese-first SaaS console using progressive disclosure:

- one primary job per page;
- first viewport under 120 visible words for normal pages;
- one primary action and a small number of secondary actions;
- queue/detail or list/detail instead of card walls;
- proof/debug/task IDs only in admin;
- AI governance as plain-language proposal boundaries, not raw capability fields;
- settings as controls, admin as diagnostics.

Start with /ai-input, then /dashboard, then /settings, then /admin. Use browser verification after each significant UI slice. Do not claim completion unless authenticated browser screenshots/metrics and owner acceptance support it.

Do not enable provider execution, DB writes, public output, external registration, schema apply, production mutation, or high-risk writes without explicit approval.
```

## 8. Truth State

Current truth:

- `PLN-069` route expansion and marker cleanup: partially useful.
- `PLN-069` Simplified SaaS UX: not complete.
- `RPT-065`: superseded for completion claim.
- Next source of truth for UI continuation: this report, `RPT-066`.

The next correct move is an implementation-first UI simplification slice, starting with `/ai-input`, followed by authenticated browser visual review.
