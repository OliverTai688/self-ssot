# RES-015 演化 vs. 兩個獨立 Agent 團隊

**日期:** 2026-07-22  
**語言:** 中文翻譯版  
**狀態:** 討論研究稿，不是正式架構決策  
**問題:** 如果 Personal OS 把 `RES-015` 演化進 AI Development Team OS，和另外維持「一個 RES-015 Agent 團隊 + 一個 AI 開發團隊」兩套獨立團隊，差異會是什麼？  
**Owner direction addendum:** 2026-07-22 owner 已選擇往 Shared Team OS Trust Plane 發展，並明確指出 AI Development Team OS 應該是全新的獨立 protected interface，不是任何現有 Personal OS 介面的 tab、section 或延伸。

---

## 1. 摘要回答

這裡其實有三種架構：

1. **整合式演化:** `RES-015` 變成 AI Development Team OS 的同意、上下文、Owner Inbox 與 Rule Memory 基礎層。
2. **兩個獨立團隊:** 一個 agent team 管 `RES-015` 的 AI Chat、參考脈絡、跨 agent 同意；另一個 agent team 管 AI 開發工作。
3. **混合式 bounded-context 架構:** 只有一個共享信任/治理控制平面，但底下分成 Conversation/Consent 與 Development Execution 兩個 bounded contexts。

目前建議 Personal OS 走第三種：

> 保留一個共享的 **Team OS trust plane**，負責身份、權限、Owner Inbox、audit、Rule Memory、AgentFacts-lite 與 evidence；再把 `RES-015` 和 AI Development Team 視為同一個 trust plane 底下的兩個 bounded operational contexts；同時讓 AI Development Team OS 擁有全新的獨立介面，而不是放進既有 `/agents`、`/ai-input`、admin/settings、Work 或 module surfaces。

這樣可以得到「分離」的主要好處，但不會太早製造兩套 governance、memory、agent registry、inbox、approval system 和 observability stack。

---

## 2. 目前 Personal OS 的脈絡

`RES-015` 目前定義的是跨 Agent 協作模式：

```txt
Requester Agent 向 Custodian Agent 要求上下文或權限
  -> Custodian 檢查 Rule Memory
  -> 允許：提供 scoped context
  -> 拒絕或不確定：Owner Inbox 收到決策請求
  -> Owner 批准 / 拒絕 / 縮小範圍
  -> Owner 的理由變成未來 Rule Memory
```

`RES-023` 把這個模式演化成開發團隊工作：

```txt
Owner intent
  -> Coordinator Agent
  -> Requester/Custodian context request
  -> 不確定時進 Owner Inbox
  -> Durable Workflow
  -> Worktree Sandbox
  -> Evidence and Review
  -> Experience Memory / Skill Candidate
```

真正的決策是：`RES-015` 應該是：

- AI 開發團隊會共用的一個 **protocol / trust layer**，還是
- 一個獨立 agent team，有自己的 runtime、memory、policy 和 inbox？

---

## 3. 網路研究來源

這次比較使用以下最新/原始來源：

- LangChain multi-agent docs: multi-agent 系統有助於 context management、distributed development 與 parallelization；context engineering 是核心；不是每個複雜任務都需要 multi-agent 架構。來源: <https://docs.langchain.com/oss/python/langchain/multi-agent>
- Deep Agents docs: deep agents 結合 planning、subagents、filesystem、context management、long-term memory、human-in-the-loop approval 與使用中學習。來源: <https://docs.langchain.com/oss/python/deepagents/overview>
- Deep Agents context engineering docs: subagents 可以隔離大量工作，只把精簡結果回傳主 agent，避免主上下文膨脹。來源: <https://docs.langchain.com/oss/python/deepagents/context-engineering>
- OpenAI Agents SDK docs: 當不同 specialists 需要不同 instructions/tools/policies，以及需要 sessions、tracing、guardrails、resumable approval flows 時，Agents SDK 比較適合。來源: <https://developers.openai.com/api/docs/guides/agents>
- OpenAI guardrails and human review docs: human review 會在敏感 action 前暫停，讓人或 policy 批准/拒絕。來源: <https://developers.openai.com/api/docs/guides/agents/guardrails-approvals>
- Azure Architecture Center domain-analysis docs: bounded contexts 讓 domain 的不同部分使用不同模型，並透過 context maps 明確標出 integration points。來源: <https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis>
- Martin Fowler bounded context: DDD 處理大型 models 與 teams 的方式，是把它們分成 bounded contexts，並明確定義彼此關係。來源: <https://martinfowler.com/bliki/BoundedContext.html>
- Microservices.io database-per-service pattern: 每個 service 的 persistent data 應該私有，並只能透過自己的 API 存取。來源: <https://microservices.io/patterns/data/database-per-service.html>
- MCP docs: MCP 標準化 AI applications 連接 tools、data sources 與 workflows 的方式。來源: <https://modelcontextprotocol.io/docs/getting-started/intro>
- A2A protocol docs: A2A 使用 AgentCard、Task、Artifact、Message、Part 來支援 agents 之間的結構化協作。來源: <https://agent2agent.info/docs/introduction/>
- Temporal docs/blog: durable execution 能在 crash、長時間等待與可恢復 workflow 中保留進度。來源: <https://docs.temporal.io/temporal>, <https://temporal.io/blog/what-is-durable-execution>
- Project NANDA GitHub: NANDA 聚焦 agent discovery、AgentFacts、registry、interoperability 與 trust infrastructure。來源: <https://github.com/projnanda/projnanda>

---

## 4. 架構 A：整合式演化

在整合式模型裡，`RES-015` 不是一個獨立團隊。它變成 AI Development Team OS 會使用的 consent 與 context-sharing protocol。

```txt
One Team OS
  -> shared identity / AgentFacts
  -> shared Rule Memory
  -> shared Owner Inbox
  -> shared audit / evidence
  -> shared workflow states
  -> AI Chat and AI Dev Team are different workflows inside the same control plane
```

### 變簡單的地方

- 一個 Owner Inbox。
- 一套 permission model。
- 一套 Rule Memory。
- 一條 audit/evidence trail。
- 決策更容易重用，例如 AI Chat 中學到的 consent rule，之後可以引導 Development Agent 的 context access。
- 產品 UI 不會重複。
- 短期實作成本較低。
- 比較容易整體維持 `externalRegisterable: false`。

### 變困難的地方

- 架構可能過度中心化。
- Chat/context work 和 code-execution work 可能混在一起。
- 如果沒有明確分層，開發團隊可能繼承 AI Chat UX 的較弱邊界。
- 單一 memory/rule system 可能過載。
- governance bug 的 blast radius 比較大。

### 什麼情況適合

- 早期階段。
- 單一 human owner。
- 還沒有 live external agent runtime。
- 還沒有真正 shell/coding-agent execution。
- 主要需求是 governance、consent、audit、owner decision learning 一致。

這符合目前 Personal OS 的階段。

---

## 5. 架構 B：兩個獨立 Agent 團隊

在兩隊模型裡，`RES-015` 和 AI Development Team 會成為分開的 agent teams。

```txt
RES-015 Team
  -> AI Chat
  -> Reference Context
  -> Cross-agent consent
  -> Owner Inbox escalation
  -> Rule Memory for conversation/context access

AI Development Team
  -> Product planning
  -> Architecture
  -> Coding
  -> Testing
  -> Review
  -> Worktree sessions
  -> Evidence and skill promotion

Bridge
  -> A2A / MCP / Personal OS internal contract
  -> Context package exchange
  -> Owner approval for cross-team access
```

### 變簡單的地方

- 概念分離更強。
- blast radius 更好控制。
- Chat/reference rules 不會不小心變成 code-execution rules。
- Development agents 可以有更嚴格的 shell、worktree、test、merge、sandbox policies。
- Conversation team 可以維持輕量和 UX-focused。
- Development team 可以往 agent runtime 演化，而不污染 AI Input chat。

### 變困難的地方

- 兩套 agent registry 或 identity space 可能 drift。
- 兩套 Rule Memory 可能互相衝突。
- 兩條 Owner Inbox path 可能產生重複決策。
- 跨團隊請求需要 bridge protocol。
- latency、cost、state reconciliation 都會增加。
- Skill/memory promotion 變複雜，因為 learning 必須被正確 scoped。
- Owner 可能需要理解兩個 dashboards 和兩套 operational mental models。

### 什麼情況適合

- 有多個 human operators。
- release cadence 不同。
- data classification rules 不同。
- runtime risk 不同。
- external agent registration 真的要啟動。
- Coding agents 已經有 shell/container/worktree execution。
- AI Chat 和 AI Dev Team 由不同人維護，或有不同 compliance boundaries。

這不是目前 Personal OS 的狀態，但在 controlled coding-agent sandbox pilot 成立後，可能會變得適合。

---

## 6. 架構 C：混合式 Bounded-Context Model

混合式模型使用一個共享 trust plane，但分離 operational contexts。

```txt
Shared Team OS Trust Plane
  -> Agent identity / AgentFacts-lite
  -> Owner Inbox
  -> BoundaryPolicy
  -> Rule Memory
  -> Audit / Evidence
  -> NANDA readiness posture
  -> External registration state

Bounded Context 1: Conversation / Consent
  -> AI Chat
  -> Reference Context
  -> AgentConsentRequest
  -> context package negotiation

Bounded Context 2: Development Execution
  -> DevTeamTask
  -> DevAgentAssignment
  -> DevWorktreeSession
  -> DevRunEvidence
  -> DevReviewDecision
  -> DevSkillCandidate
```

這個模型跟 DDD bounded context 的核心一致：domain 的不同部分可以有不同模型，但彼此關係必須透過 context map 明確定義。

### 為什麼推薦這條路

它避開兩個極端：

- 避免變成一個巨大、沒有分界的 agent system。
- 避免兩個完全隔離的 agent organizations 重複治理並逐漸 drift。

在這個模型裡，`RES-015` 不是「另一個團隊」，而是 **conversation/consent bounded context**，也是 AI Development Team 會使用的 **pattern library**。

---

## 7. 並排比較

| 面向 | 整合式演化 | 兩個獨立團隊 | 混合式 Bounded Context |
|---|---|---|---|
| 核心概念 | `RES-015` 成為 AI Dev Team 的 consent substrate | `RES-015` team 與 AI Dev Team 是兩個組織 | 一個 trust plane，兩個 bounded contexts |
| 最適合 | 早期、單一 owner、沒有 runtime agents | 成熟 runtime、不同團隊/風險 | 目前 Personal OS 方向 |
| Owner UX | 一個 dashboard/inbox | 兩個 dashboards 或很多 bridge prompts | 一個 dashboard，context-specific surfaces |
| Rule Memory | 共享 | 分離或 federated | 共享 rule plane，但 rules 有 scope |
| Agent identity | 單一 registry | 兩個 registry 或 federated registry | 單一 AgentFacts-lite registry，加 context labels |
| Coordination cost | 低 | 高 | 中 |
| Context isolation | 需要仔細設計 | 預設較強 | 每個 context 強隔離，owner decision 共享 |
| Runtime safety | 中央 policy，但 blast radius 大 | blast radius 小，但 integration 複雜 | 中央 policy + execution-specific barriers |
| Evidence model | 統一 | 重複或橋接 | 統一 evidence envelope + context-specific payload |
| Skill promotion | 共享 skill pipeline | 分開 skill pipelines | 共享 pipeline，但加 context tags |
| A2A/MCP 需求 | 後期才需要 | 早期就需要 | 邊界點才需要 |
| 混淆風險 | 單一系統可能太廣 | Owner 要理解兩個 agent organizations | 需要清楚 labels 和 contracts |

---

## 8. 最深層的差異

真正的差異不是 agent 數量。

真正的差異是 **authority 放在哪裡**。

### 整合式演化

Authority 在一個 Personal OS Team OS 層。

```txt
One owner decision loop
One rule memory
One audit trail
One identity registry
Many agent roles
```

這比較簡單、一致，但需要很好的內部分界。

### 兩個獨立團隊

Authority 分成兩個 agent organizations。

```txt
RES-015 Team owns context consent
AI Dev Team owns development execution
Bridge protocol controls cross-team access
Owner decides at boundaries
```

這對成熟 runtime isolation 比較安全，但早期 integration overhead 很高。

### 混合式

Authority 在 trust 層集中，但 domain models 分離。

```txt
Shared trust plane
Separate bounded contexts
Explicit context map
Owner decisions become reusable but scoped rules
```

這是目前最好的折衷。

---

## 9. 建議的產品解讀

Personal OS 應該把 `RES-015` 視為：

1. 一組具體 AI Chat / Reference Context features。
2. 一套 cross-agent consent 與 owner-decision protocol。
3. 未來任何 agent-to-agent access 都可重用的 architecture pattern。
4. 但還不是一個完全獨立 agent team。

Personal OS 應該把 AI Development Team OS 視為：

1. 一個 development-execution bounded context。
2. 未來 worktree-isolated coding agents 的 runtime surface。
3. `RES-015` consent/rule-memory pattern 的使用者。
4. 不允許繞過共享 Owner Inbox、AgentFacts、audit 或 Rule Memory。

---

## 10. 建議實作形狀

### 近期

建立一個 shared trust plane：

- `AgentFacts-lite`
- `BoundaryPolicy`
- `AgentRuleMemory`
- `OwnerInboxDecision`
- `AuditEvidenceEnvelope`
- `ContextPackage`

然後定義兩個 bounded contexts：

- `ConversationConsentContext`
- `DevelopmentExecutionContext`

### 中期

加入明確 bridge objects：

- `CrossContextAccessRequest`
- `ContextPackageManifest`
- `DecisionRuleScope`
- `EvidenceRef`
- `SkillPromotionScope`

### 後期

只有 runtime execution 存在之後，才考慮：

- 拆 execution workers。
- 加 worktree/session manager。
- 加 coding-agent adapter profiles。
- 考慮 A2A/MCP boundaries。
- 考慮分離 memory backends。
- 考慮 external registration。

---

## 11. 決策標準

選 **整合式演化**，如果：

- 目標是近期產品一致性。
- Owner 想要一個 control surface。
- 還沒有 runtime code execution。
- consent/rule memory 需要快速重用。
- 實作速度很重要。

選 **兩個獨立團隊**，如果：

- coding agents 會執行 shell/container actions。
- AI Chat 和 AI Dev Team 需要不同 security classifications。
- 兩個區域由不同 humans owner。
- release cadence 不同。
- external registration 或 agent-to-agent protocol exposure 真的啟動。

選 **混合式 bounded context**，如果：

- 一個 owner 仍然治理整個系統。
- 需要強概念邊界。
- 想共享 identity/inbox/audit/rule memory。
- 想保留未來拆 runtime 的路，而現在不複製治理。

這就是目前推薦路線。

---

## 12. 對 Personal OS 的建議決策

**Decision:** 使用 Shared Team OS Trust Plane + bounded contexts，並讓 AI Development Team OS 成為全新的獨立 protected interface。

**原因:** Personal OS 還沒有成熟到需要兩個獨立 agent organizations，但它已經複雜到不能把 AI Chat consent 和 AI Development execution 壓成同一個沒有分界的 model。

**產品語言:**

> Personal OS 有一個 AI Team OS trust plane。在這個 trust plane 裡，`RES-015` 變成 Conversation/Consent context，AI Development Team OS 變成 Development Execution context。它們共享 owner decisions、identity、audit 和 rule memory，但使用不同 task models、risk controls、runtime gates 和 interface homes。AI Development Team OS 是全新的獨立 protected interface，不是既有介面的 subview。

**下一個架構任務:**

`AIDEVTEAM-002` 應該明確建模：

- `ConversationConsentContext`
- `DevelopmentExecutionContext`
- `SharedAgentTrustPlane`
- `CrossContextAccessRequest`
- `ContextPackageManifest`
- `DecisionRuleScope`
- `IndependentAIDevelopmentTeamInterface`

---

## 13. 需要跟 Owner 討論的開放問題

1. `RES-015` 應該維持為 AI Input 內的一個 feature area，還是改名成全系統的「Agent Consent Context」？
2. 全新的 AI Development Team interface 應該叫什麼、route 放在哪裡？暫定提案是 `/ai-dev-team`，等實作設計時再確認。
3. Rule Memory 應該預設 global、再用 scope 限制，還是預設 scoped、再明確 promotion 到 global？
4. 第一個 worktree sandbox pilot 可以請求 AI Chat history context 嗎？還是只能用 docs/code/backlog context？
5. Personal OS 什麼時候要從 internal context packages 升級到 A2A/MCP-style protocol boundaries？

---

## 14. 最後一句

跟「一個獨立 RES-015 agent team + 一個獨立 AI Development Team」相比，目前的演化比較不像建立兩間公司，而像建立一個作業系統，底下有兩個部門。

目前的演化是：

> 保留一個 trust、identity、inbox、audit 和 memory layer。把 conversation-consent 工作與 development-execution 工作分成 bounded contexts。AI Development Team OS 現在就應該有獨立介面，但要等 execution risk、team scale 或 external interoperability 真的需要時，才拆成獨立 runtime teams。
