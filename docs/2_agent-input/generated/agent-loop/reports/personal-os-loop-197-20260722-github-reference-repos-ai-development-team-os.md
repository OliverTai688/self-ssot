# Personal OS Loop 197 Evidence - GitHub Reference Repositories For AI Development Team OS

**Date:** 2026-07-22  
**Task:** `AIDEVTEAM-011`  
**Status:** Completed as research/docs only  
**Launch level:** unchanged, `L0_LOCAL_PROTOTYPE`  

---

## 1. Trigger

Owner asked:

> 有沒有什麼 github repo 是可以參考到目前的開發小組的，上網研究生成相關研究文件

This preempted the overdue launch-level review as owner-directed research.

---

## 2. Work Completed

- Created `docs/07_research-and-design/RES-025_github-reference-repositories-for-ai-development-team-os-research.md`.
- Created `docs/2_agent-input/generated/agent-loop/github-reference-repositories-for-ai-development-team-os.zh.md`.
- Added `AIDEVTEAM-011` as the completed research row in Phase 18.
- Updated `AIDEVTEAM-002`, `AIDEVTEAM-003`, `AIDEVTEAM-006`, and `AIDEVTEAM-007` guidance so the next architecture/UI/adapter tasks can cite `RES-025`.
- Updated `MAN-001`, `PLN-060`, `PLN-061`, `PLN-065`, `RPT-007`, `tasks.md`, and `loop-state.json`.

---

## 3. External Sources Reviewed

Primary GitHub/project sources:

- OpenHands: https://github.com/OpenHands/openhands
- OpenHands Agent Canvas: https://github.com/OpenHands/agent-canvas
- Paperclip: https://github.com/paperclipai/paperclip
- Pane: https://github.com/dcouple/Pane
- Superset: https://github.com/superset-sh/superset
- Agent Deck: https://github.com/asheshgoplani/agent-deck
- Parallel Code: https://github.com/johannesjo/parallel-code
- Agent of Empires: https://github.com/agent-of-empires/agent-of-empires
- OpenCode active repo: https://github.com/anomalyco/opencode
- OpenCode agents docs: https://opencode.ai/docs/agents/
- Goose: https://github.com/aaif-goose/goose
- Plandex: https://github.com/plandex-ai/plandex
- Aider: https://github.com/aider-ai/aider
- SWE-agent: https://github.com/swe-agent/SWE-agent
- Open SWE: https://github.com/langchain-ai/open-swe
- PR-Agent: https://github.com/The-PR-Agent/pr-agent
- Agent Client Protocol: https://github.com/agentclientprotocol/agent-client-protocol
- ACP UI: https://github.com/formulahendry/acp-ui
- Zeroshot: https://github.com/the-open-engine/zeroshot
- Agyn repo: https://github.com/agynio/v1
- Agyn paper: https://arxiv.org/abs/2602.01465
- Harness Engineering paper: https://arxiv.org/abs/2606.24429

GitHub metadata was sampled with an unauthenticated REST API script on 2026-07-22. Important observations:

- `anomalyco/opencode` is the active OpenCode repository; `opencode-ai/opencode` is archived.
- `agynio/v1` is archived and license metadata is `NOASSERTION`; use research-only.
- `Pane`, `Superset`, and `OpenHands/openhands` returned `NOASSERTION` license metadata in the sampled API output; use as references until license strategy is reviewed.
- `OpenHands/agent-canvas`, `Paperclip`, `OpenCode`, `Open SWE`, `SWE-agent`, `PR-Agent`, `ACP`, `Agent Deck`, `Parallel Code`, `Agent of Empires`, `Zeroshot`, `LangGraph`, and `Deep Agents` returned permissive SPDX ids in the sampled output, but dependency adoption still needs project review.

---

## 4. Product Capability Delta

Before this loop, `RES-024` said the AI Development Team interface must be independent, but the concrete external reference set was still broad.

After this loop, Personal OS has a reference matrix:

- direct interface references: Agent Canvas, Paperclip, Pane, Superset, Agent Deck, Parallel Code, Agent of Empires;
- adapter/runtime references: OpenHands, OpenCode, Goose, Plandex, Aider, SWE-agent, Open SWE;
- evidence/review references: PR-Agent, SWE-agent, Zeroshot;
- protocol references: ACP, MCP/NANDA/AgentFacts-lite;
- research-only conceptual reference: Agyn.

---

## 5. Acceptance Mapping

Mapped to:

- `RES-023` AI Development Team OS structural research;
- `RES-024` Shared Team OS Trust Plane and independent interface boundary;
- `PLN-065` AI Development Team OS research plan;
- Phase 18 backlog row `AIDEVTEAM-011`;
- future `AIDEVTEAM-002`, `AIDEVTEAM-003`, `AIDEVTEAM-006`, and `AIDEVTEAM-007`.

---

## 6. NANDA Gate

NANDA gate applies because this research touches agent capabilities and future adapter protocols.

Result:

- Current status remains governance/research only.
- No new runtime agent, endpoint, provider, tool permission, skill, or registry registration was added.
- AgentFacts-lite impact is future-oriented only: `DevAgentRole`, `CodingAgentAdapterPolicy`, `DevRunEvidence`, and `DevReviewDecision` should map to AgentFacts-lite in `AIDEVTEAM-002`.
- `externalRegisterable: false` remains unchanged.

---

## 7. Verification

Verification commands run after document updates:

```bash
pnpm agent:registry:check
pnpm agent:bus:check
node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"
git diff --check
```

Result:

- `pnpm agent:registry:check` PASSED: internal status `ready_for_internal_use`, external registration `blocked_by_policy`, 15 manifests, 0 validation errors.
- `pnpm agent:bus:check` PASSED: status `ready_for_internal_agent_bus_contract_use`, external runtime enabled `false`, 0 errors.
- loop-state JSON parse PASSED.
- `git diff --check` PASSED.

---

## 8. Remaining Risks

- `AIDEVTEAM-002` still must turn the research into a formal architecture contract before runtime or UI implementation.
- License strategy remains mandatory before adopting `NOASSERTION`, GPL, AGPL, archived, or unclear repos as dependencies.
- No coding-agent sandbox pilot may start until `AIDEVTEAM-002..008` are complete and owner explicitly approves the pilot.
- Formal launch remains blocked by owner/operator proof for auth, Work DB proof, and deployment marker.

---

## 9. Next Decision

If continuing the AI Development Team OS line, run:

```txt
AIDEVTEAM-002 - Create AI Development Team OS domain and adapter architecture contract
```

Otherwise, the heartbeat plan still says the overdue launch-level review should run next.
