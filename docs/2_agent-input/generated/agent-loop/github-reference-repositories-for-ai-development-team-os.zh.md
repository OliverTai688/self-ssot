# GitHub 參考 Repo 研究：AI Development Team OS

**日期：** 2026-07-22  
**對應正式文件：** `docs/07_research-and-design/RES-025_github-reference-repositories-for-ai-development-team-os-research.md`  
**狀態：** 研究文件，沒有 runtime、UI route、schema migration、provider call、外部註冊或自動 merge。

---

## 1. 這次研究回答什麼

你的問題是：

> 有沒有什麼 GitHub repo 是可以參考到目前的開發小組的？

結論是：有，而且最好不要只參考一個。

目前比較好的方向是把 AI Development Team OS 拆成幾種參考來源：

1. **獨立控制介面**
   - 參考 Agent Canvas、Paperclip、Pane、Superset。
2. **多 coding agent / worktree 工作區**
   - 參考 Pane、Superset、Agent Deck、Parallel Code、Agent of Empires。
3. **coding-agent adapter**
   - 參考 OpenCode、Goose、Aider、Plandex、OpenHands、Open SWE、SWE-agent。
4. **審查與證據**
   - 參考 PR-Agent、SWE-agent、Zeroshot、Open SWE。
5. **協定與未來互通**
   - 參考 Agent Client Protocol、ACP UI、MCP/NANDA/AgentFacts-lite。
6. **角色化開發小組概念**
   - 參考 Paperclip、Open SWE、Agyn 論文；但 Agyn repo 已封存且授權不明，只適合研究。

---

## 2. 最重要的結論

Personal OS 不應該直接變成某個外部 repo 的 clone。

更好的演化是：

```txt
Personal OS 自己擁有：
  Shared Team OS Trust Plane
  AI Development Team domain contract
  Independent AI Development Team interface
  Owner approval / evidence / memory / skill promotion rules

外部 repo 只是參考：
  介面怎麼呈現
  worktree/session 怎麼管理
  adapter 權限怎麼切
  審查與測試證據怎麼收
```

也就是：

```txt
不是「選一套現成 AI 團隊系統」
而是「用 Personal OS 的 Trust Plane 吸收多個 repo 的成熟 pattern」
```

---

## 3. 最值得直接參考的 repo

### 3.1 OpenHands Agent Canvas

Repo: https://github.com/OpenHands/agent-canvas

最適合參考：

- 獨立 web control center；
- 多 agent workflow；
- connected tools；
- task / workflow / run 狀態；
- self-hosted developer interface。

對 Personal OS 的意義：

`AIDEVTEAM-006` 的新介面不應該像聊天室，而應該像一個開發團隊控制室。Agent Canvas 是最直接的介面參考之一。

不要直接借：

- runtime 權限；
- 直接 launch agent 的假設；
- 未經 Personal OS `RuntimeApprovalGate` 的 shell/file access。

---

### 3.2 Paperclip

Repo: https://github.com/paperclipai/paperclip

最適合參考：

- 組織、專案、目標、任務；
- agent at work 的治理語言；
- budget、human-in-the-loop、Inbox、approval；
- AI team 不是聊天，而是可管理的工作隊伍。

對 Personal OS 的意義：

它適合幫我們設計：

- `DevTeamTask`
- `DevAgentRole`
- `DevAgentAssignment`
- task budget
- Owner Inbox
- blocked/runtime approval state
- team audit view

不要直接借：

- 公司級多人協作語意；
- 外部組織共享；
- 預設讓 agent 取得太多 context。

---

### 3.3 Pane

Repo: https://github.com/dcouple/Pane

最適合參考：

- 多 CLI coding agent 管理；
- Git branch / worktree；
- terminal session；
- agent-agnostic control；
- 同時跑多個 agent attempt。

對 Personal OS 的意義：

`AIDEVTEAM-003` 的 `DevWorktreeSession` 很適合參考 Pane：

```txt
一個任務
  -> 一個 branch
  -> 一個 worktree
  -> 一個 agent session
  -> 一份 diff / evidence / review decision
```

風險：

GitHub API 顯示 license metadata 是 `NOASSERTION`，所以目前只能當研究參考，不能直接當依賴。

---

### 3.4 Superset

Repo: https://github.com/superset-sh/superset

最適合參考：

- AI agents era 的 code editor；
- 同時管理多個 Claude Code / Codex 類型 agents；
- 本機多 worktree / 多 session；
- review before merge 的操作心智。

對 Personal OS 的意義：

Superset 非常適合當 `AIDEVTEAM-006` 的 UI/workflow 靈感：

- 左側任務與 session；
- 中央工作區；
- 右側 evidence/review；
- branch/worktree 狀態；
- 合併前人工審查。

風險：

GitHub API 顯示 license metadata 是 `NOASSERTION`，所以目前只能當 UI 與流程參考。

---

### 3.5 OpenCode

Repo: https://github.com/anomalyco/opencode

最適合參考：

- coding-agent adapter；
- agent/mode 設定；
- permission profile；
- local/provider model；
- terminal-first coding workflow。

重要注意：

`opencode-ai/opencode` 目前是 archived。活躍來源看起來是 `anomalyco/opencode`，`sst/opencode` 會導到同一個 repo。

對 Personal OS 的意義：

`AIDEVTEAM-007` 應該用 OpenCode 這類工具來設計 adapter 權限：

```txt
read-only planning
proposal edit
sandbox execute
owner-approved merge
blocked high-risk actions
```

---

## 4. 第二層參考：adapter/runtime

### Goose

Repo: https://github.com/aaif-goose/goose

適合參考本地 agent runtime、tool use、provider portability。

Personal OS 可以把 Goose 當未來 adapter 候選，但預設必須禁止：

- direct DB access；
- secret access；
- high-risk module writes；
- public output。

### Plandex

Repo: https://github.com/plandex-ai/plandex

適合參考長任務、大型 codebase、多步驟 planning、context pack、diff review。

風險是維護節奏要重新確認，不能直接視為主 runtime。

### Aider

Repo: https://github.com/aider-ai/aider

適合參考 Git-centered pair programming CLI，尤其是 proposal-only edits 與 diff review。

### OpenHands

Repo: https://github.com/OpenHands/openhands

適合參考成熟 software development agent 的 sandbox/control architecture。

但對 Personal OS 來說，它應該是未來 adapter runtime，不應該取代自己的 Trust Plane。

### Open SWE

Repo: https://github.com/langchain-ai/open-swe

適合參考 asynchronous coding agent、task state、review loop。

它比較適合幫 `AIDEVTEAM-004` 設計 durable workflow，而不是現在就引入 runtime。

---

## 5. 審查與證據參考

### PR-Agent

Repo: https://github.com/The-PR-Agent/pr-agent

適合參考 ReviewerAgent：

- PR description；
- review comments；
- improvement suggestions；
- change summary；
- no auto-merge。

### SWE-agent

Repo: https://github.com/swe-agent/SWE-agent

適合參考：

- GitHub issue -> fix loop；
- test/evaluation；
- environment setup；
- reproducible run evidence。

### Zeroshot

Repo: https://github.com/the-open-engine/zeroshot

適合參考：

- autonomous engineering team CLI；
- verifier loop；
- senior-review-like output；
- trust through evidence rather than blind autonomy。

---

## 6. 協定與未來互通

### Agent Client Protocol

Repo: https://github.com/agentclientprotocol/agent-client-protocol

ACP 對 Personal OS 的價值是：未來 `AIDEVTEAM-007` 不一定要綁死某個 coding agent。可以先設計：

```txt
Personal OS adapter boundary
  -> ACP-compatible agent
  -> OpenCode / Goose / future agents
```

但這仍然只是 future protocol target。

不能因此開放：

- external registration；
- public endpoint；
- cross-organization agent access。

---

## 7. 概念參考但不能近期依賴

### Agyn

Repo: https://github.com/agynio/v1  
Paper: https://arxiv.org/abs/2602.01465

Agyn 概念上非常貼近「AI 開發小組」：

- planner；
- architect；
- coder；
- tester；
- reviewer；
- multi-agent SWE pipeline。

但 repo 目前 archived，license metadata 是 `NOASSERTION`，所以只能當概念研究，不應該當近期技術依賴。

---

## 8. 對現在演化的影響

目前 AI Development Team OS 應該長成這樣：

```txt
Independent AI Development Team Interface
  Team Queue
  Agent Roster
  Worktree Sessions
  Run Evidence
  Review Decisions
  Adapter Registry
  Memory & Skill Candidates
  Trust Plane / Runtime Gates
```

它不應該是：

```txt
/agents 裡的一個 tab
/ai-input 的延伸
/admin 的管理頁
/settings 的設定區
/work 的代理人子頁
```

外部 repo 對應：

| Personal OS 區塊 | 最適合參考 |
|---|---|
| 獨立控制介面 | Agent Canvas, Paperclip, Superset |
| worktree/session | Pane, Superset, Agent Deck, Parallel Code |
| role/task governance | Paperclip, Agyn paper, Open SWE |
| coding adapter | OpenCode, Goose, Aider, Plandex, OpenHands |
| review/evidence | PR-Agent, SWE-agent, Zeroshot |
| protocol future | ACP, MCP, NANDA/AgentFacts-lite |

---

## 9. 下一步

下一個最合理的任務仍然是：

```txt
AIDEVTEAM-002 - Create AI Development Team OS domain and adapter architecture contract
```

但現在 `AIDEVTEAM-002` 應該多一節：

```txt
Reference Repository Mapping
```

把這次研究轉成正式 contract：

- `IndependentAIDevelopmentTeamInterface`
- `DevTeamTask`
- `DevAgentRole`
- `DevAgentAssignment`
- `DevWorktreeSession`
- `CodingAgentAdapterPolicy`
- `DevRunEvidence`
- `DevReviewDecision`
- `DevExperienceMemory`
- `DevSkillCandidate`

而且仍然維持：

```txt
externalRegisterable: false
runtime execution: blocked
direct DB/secrets access: denied
automatic merge: denied
high-risk module final writes: human approval required
```

