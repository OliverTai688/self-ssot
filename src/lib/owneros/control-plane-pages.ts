import type { ProductLocale } from "@/lib/i18n/product-copy"

export type ControlPlaneTone = "ready" | "review" | "blocked" | "proposal"

export interface ControlPlaneStat {
  label: string
  value: string
  detail: string
  tone: ControlPlaneTone
}

export interface ControlPlaneRow {
  label: string
  status: string
  description: string
  boundary: string
}

export interface ControlPlaneSection {
  title: string
  description: string
  rows: ControlPlaneRow[]
}

export interface ControlPlaneMatrixRow {
  label: string
  values: string[]
  tone?: ControlPlaneTone
}

export interface ControlPlaneMatrixSection {
  title: string
  description: string
  columns: string[]
  rows: ControlPlaneMatrixRow[]
}

export interface ControlPlaneAction {
  label: string
  href: string
}

export interface ControlPlanePageContent {
  eyebrow: string
  title: string
  description: string
  stateLabel: string
  stateTone: ControlPlaneTone
  primaryAction?: ControlPlaneAction
  secondaryActions?: ControlPlaneAction[]
  stats: ControlPlaneStat[]
  sections: ControlPlaneSection[]
  matrixSections?: ControlPlaneMatrixSection[]
}

export interface ControlPlanePageModel extends ControlPlanePageContent {
  locales?: Partial<Record<ProductLocale, ControlPlanePageContent>>
}

export const settingsLanguageControlPlane: ControlPlanePageModel = {
  eyebrow: "Owner settings",
  title: "語言與文案",
  description: "管理 Personal OS 的中文優先介面與 English fallback，讓全站能逐步完成正式雙語操作。",
  stateLabel: "UI-L4 foundation",
  stateTone: "review",
  primaryAction: { label: "回設定", href: "/settings" },
  stats: [
    { label: "預設語言", value: "繁體中文", detail: "正式操作語氣以 zh-TW 為主。", tone: "ready" },
    { label: "英文空間", value: "已保留", detail: "主要導航已有 en-US copy key。", tone: "review" },
    { label: "持久化", value: "待 BFF", detail: "偏好寫入需另選安全持久化切片。", tone: "proposal" },
  ],
  sections: [
    {
      title: "雙語切換路徑",
      description: "先建立 copy registry，再把頁面標題、命令、空狀態與風險標籤逐步換成 key。",
      rows: [
        {
          label: "Primary navigation",
          status: "已開始",
          description: "今日、AI 工作桌、核心作業、系統、更多已進入 shared copy。",
          boundary: "目前已支援本機語言偏好；正式個人設定持久化會在後續接上 Profile BFF。",
        },
        {
          label: "Normal page labels",
          status: "收斂中",
          description: "正常頁面應使用產品語言，不顯示工程 task id 或 proof wall。",
          boundary: "任務 ID 保留在 docs 與 admin/operator surface。",
        },
        {
          label: "Locale persistence",
          status: "待設計",
          description: "可先用 local preference，再升級為 owner profile setting。",
          boundary: "不在本頁直接寫入 Profile 或權限資料。",
        },
      ],
    },
  ],
}

export const settingsMembersControlPlane: ControlPlanePageModel = {
  eyebrow: "Owner settings",
  title: "成員與邀請",
  description: "用一個清楚頁面理解誰在這個 workspace 裡、邀請處於哪個狀態、哪些操作仍需人工核准。",
  stateLabel: "proposal-only",
  stateTone: "proposal",
  primaryAction: { label: "角色矩陣", href: "/settings/roles" },
  secondaryActions: [{ label: "管理端 RBAC", href: "/admin/rbac" }],
  stats: [
    { label: "Owner", value: "1", detail: "目前以 owner 私有操作為主。", tone: "ready" },
    { label: "邀請", value: "未啟用", detail: "Email delivery 與 member writes 仍未開。", tone: "blocked" },
    { label: "Team pilot", value: "Gate B", detail: "成員生命週期屬於 Gate B。", tone: "proposal" },
  ],
  sections: [
    {
      title: "成員生命週期",
      description: "先讓狀態語言清楚，再接 service-layer authorization 與 audit。",
      rows: [
        {
          label: "Active owner",
          status: "可見",
          description: "Owner 可以辨識目前個人 workspace 與未來 team workspace 的界線。",
          boundary: "不自動建立 workspace、不轉移專案、不寄送邀請。",
        },
        {
          label: "Pending invitation",
          status: "待 BFF",
          description: "邀請應有 email、role、expiresAt、accepted/revoked 狀態。",
          boundary: "Email provider 與資料寫入需明確核准。",
        },
        {
          label: "Offboarding",
          status: "待設計",
          description: "移除成員要先看受影響專案、來源、AI 記憶和審計紀錄。",
          boundary: "不可靜默刪除資料或撤銷 owner 權限。",
        },
      ],
    },
  ],
}

export const settingsRolesControlPlane: ControlPlanePageModel = {
  eyebrow: "Owner settings",
  title: "角色與權限",
  description: "把 OWNER / MANAGER / EDITOR / VIEWER / GUEST 的預設能力講清楚，避免未來團隊協作時權限失控。",
  stateLabel: "read-only matrix",
  stateTone: "review",
  primaryAction: { label: "成員", href: "/settings/members" },
  secondaryActions: [{ label: "管理端 RBAC", href: "/admin/rbac" }],
  stats: [
    { label: "角色", value: "5", detail: "Owner-approved RBAC labels。", tone: "ready" },
    { label: "有效權限", value: "待 BFF", detail: "需要角色 + 資源 grant 預覽。", tone: "proposal" },
    { label: "寫入", value: "關閉", detail: "本頁不直接變更權限。", tone: "blocked" },
  ],
  sections: [
    {
      title: "角色預設姿態",
      description: "RBAC 做粗粒度角色，資源分享保留 ReBAC/FGA 擴充空間。",
      rows: [
        {
          label: "擁有者 / OWNER",
          status: "Full control",
          description: "可管理 workspace、成員、模組、AI policy；所有敏感操作仍需 audit。",
          boundary: "Owner transfer 與刪除仍需獨立高風險流程。",
        },
        {
          label: "管理者 / MANAGER",
          status: "Scoped manage",
          description: "可管理被授權 workspace/module 操作，不預設能轉移 owner。",
          boundary: "不得自動取得 Finance、Life、權限變更或 public output 能力。",
        },
        {
          label: "編輯者 / EDITOR",
          status: "Create/update allowed records",
          description: "可編輯被授權模組資料，適合共同工作者。",
          boundary: "高風險 final write 仍需 approval policy。",
        },
        {
          label: "檢視者 / VIEWER",
          status: "Read-only",
          description: "可看被授權資源，不可改資料或觸發 AI execution。",
          boundary: "不可透過 UI 隱藏替代 service-layer authorization。",
        },
        {
          label: "外部訪客 / GUEST",
          status: "Explicit grants only",
          description: "只看明確分享的 client-safe 或 external-safe context。",
          boundary: "不繼承 workspace 內部資料、AI 記憶或私有來源。",
        },
      ],
    },
  ],
  matrixSections: [
    {
      title: "Owner-visible role matrix",
      description: "這個矩陣先讓 owner 看懂角色姿態；實際 allow/deny 仍由 service-layer authorization 決定。",
      columns: ["Workspace", "模組資料", "AI 能力", "高風險邊界"],
      rows: [
        {
          label: "OWNER / 擁有者",
          values: [
            "管理 workspace、設定、成員與系統邊界",
            "可管理已啟用模組與共享設定",
            "可審核、核准或停用 capability",
            "Owner transfer、刪除、公開輸出仍需獨立高風險流程",
          ],
          tone: "ready",
        },
        {
          label: "MANAGER / 管理者",
          values: [
            "管理被授權 workspace 或 team area",
            "可管理被授權模組操作",
            "可審核低風險 proposal，不預設改 policy",
            "不可轉移 owner、不可改 Finance/Life/public output",
          ],
          tone: "review",
        },
        {
          label: "EDITOR / 編輯者",
          values: [
            "看見被授權 workspace",
            "可新增或更新被授權 records",
            "可產生草稿或回饋 proposal",
            "final write 依模組風險與 approval policy 決定",
          ],
          tone: "proposal",
        },
        {
          label: "VIEWER / 檢視者",
          values: [
            "只讀被授權 workspace 或 project",
            "不可改 records 或 workflow",
            "不可觸發 execution，只可看 approved output",
            "write、send、permission change 預設拒絕",
          ],
          tone: "blocked",
        },
        {
          label: "GUEST / 外部訪客",
          values: [
            "只看明確分享的外部安全範圍",
            "不繼承內部模組資料",
            "不可讀 AI memory 或私有來源",
            "沒有 explicit grant 就 deny-by-default",
          ],
          tone: "blocked",
        },
      ],
    },
  ],
}

export const settingsAiSharingControlPlane: ControlPlanePageModel = {
  eyebrow: "Owner settings",
  title: "AI 分享與總 AI",
  description: "設定各模組可以分享哪些內容給總 AI，並把 AI 從自由聊天收斂成可審核、可回溯的 proposal/action queue。",
  stateLabel: "protected proposal",
  stateTone: "proposal",
  primaryAction: { label: "AI 治理", href: "/admin/ai-governance" },
  secondaryActions: [{ label: "今日", href: "/dashboard" }],
  stats: [
    { label: "總 AI", value: "內部", detail: "protected owner/admin only。", tone: "ready" },
    { label: "分享", value: "Opt-in", detail: "模組需明確允許分享範圍。", tone: "review" },
    { label: "執行", value: "關閉", detail: "runtime action execution 需另行核准。", tone: "blocked" },
  ],
  sections: [
    {
      title: "模組分享預設",
      description: "總 AI 可以摘要與提案；真正 API/TODO 行動必須經 capability registry、RBAC、approval 和 audit。",
      rows: [
        {
          label: "Work",
          status: "可分享摘要與 draft TODO",
          description: "可把專案狀態、下一步、阻塞點送進今日摘要與 AI Input proposal。",
          boundary: "不能未審核寫入最終任務或對外輸出。",
        },
        {
          label: "Research",
          status: "可分享高相關片段",
          description: "可分享研究題目、來源摘要、待整理資料包。",
          boundary: "來源引用、保留期限與刪除要求必須可追蹤。",
        },
        {
          label: "Company",
          status: "內部摘要",
          description: "可協助把 strategy context 轉為決策或工作提案。",
          boundary: "公司策略與客戶可見輸出需人工核准。",
        },
        {
          label: "Finance / Life",
          status: "預設封鎖",
          description: "高風險私人/財務資料只允許人工檢視與草稿提議。",
          boundary: "不得自動寫入 final records、不得外部分享。",
        },
      ],
    },
  ],
  matrixSections: [
    {
      title: "Module-to-Core-AI sharing policy",
      description: "總 AI 只吃 owner 允許的 scoped context；每個模組都要有分享內容、可做行動、保留刪除和邊界。",
      columns: ["分享內容", "總 AI 可做", "保留 / 刪除", "預設邊界"],
      rows: [
        {
          label: "Work",
          values: [
            "專案摘要、下一步、阻塞、owner comment",
            "整理今日摘要、產生 TODO 草稿、連回來源",
            "保留 source refs；刪除 request 要能追蹤",
            "不可未審核寫入 final task 或對外輸出",
          ],
          tone: "review",
        },
        {
          label: "Research",
          values: [
            "研究題目、來源摘要、待整理片段",
            "轉成 proposal、引用來源、建議歸檔",
            "需保留 citation/source id 與 retention note",
            "不得把 raw private source 當 public-safe context",
          ],
          tone: "review",
        },
        {
          label: "Company",
          values: [
            "內部策略摘要、決策背景、待辦關聯",
            "整理決策提案與行動 queue",
            "保留 internal-only 標籤與 approval ref",
            "客戶可見內容與策略 finalization 需人工核准",
          ],
          tone: "proposal",
        },
        {
          label: "Finance",
          values: [
            "預設不分享；僅允許 owner 手動摘要",
            "只能產生草稿建議，不得改 final record",
            "高風險 retention/delete 需人工確認",
            "自動寫入與外部分享封鎖",
          ],
          tone: "blocked",
        },
        {
          label: "Life",
          values: [
            "預設不分享；僅允許明確 opt-in",
            "只能做私人草稿或提醒建議",
            "刪除與保留需 owner 可理解",
            "不可進入 team/shared/public context",
          ],
          tone: "blocked",
        },
      ],
    },
  ],
}

export const adminRbacControlPlane: ControlPlanePageModel = {
  eyebrow: "Admin",
  title: "RBAC 與有效權限",
  description: "Operator 用來檢查角色、模組 grant、資源 grant、拒絕原因與稽核參照，不污染日常 owner 頁面。",
  stateLabel: "operator proof surface",
  stateTone: "review",
  primaryAction: { label: "角色設定", href: "/settings/roles" },
  stats: [
    { label: "RBAC", value: "可讀", detail: "角色語言已定義。", tone: "ready" },
    { label: "ReBAC", value: "保留", detail: "資源關係權限待模型化。", tone: "proposal" },
    { label: "Mutation", value: "disabled", detail: "權限寫入不在此 slice。", tone: "blocked" },
  ],
  sections: [
    {
      title: "Operator inspection",
      description: "管理端要回答的是為什麼 allow/deny，而不是讓 owner 在日常頁面看任務 ID。",
      rows: [
        {
          label: "Role assignment",
          status: "待 BFF",
          description: "列出 workspace member、role、來源與更新時間。",
          boundary: "寫入需 requireUser、service authz、audit event。",
        },
        {
          label: "Effective permission",
          status: "待 BFF",
          description: "預覽某 actor 對某 route/module/resource/capability 是否可做某 action。",
          boundary: "不可只靠 client-side filtering 做授權。",
        },
        {
          label: "Denied reason",
          status: "必備",
          description: "拒絕要能指出 role、resource grant、policy、setup 或 manual ops 缺口。",
          boundary: "錯誤訊息不得洩漏其他使用者或私有資源內容。",
        },
        {
          label: "Audit refs",
          status: "必備",
          description: "權限變更、邀請、撤銷與 transfer 都要能追到事件。",
          boundary: "沒有 audit 不啟用高風險權限寫入。",
        },
      ],
    },
  ],
  matrixSections: [
    {
      title: "Effective permission scenarios",
      description: "Operator 用這張表檢查角色、資源、行動與拒絕原因；真實判定未來要接 service-layer policy engine。",
      columns: ["Role", "Target", "Decision", "Reason / audit note"],
      rows: [
        {
          label: "Owner admin read",
          values: [
            "OWNER",
            "/admin/* read surfaces",
            "Allow",
            "Owner protected route after requireUser；mutation still audited",
          ],
          tone: "ready",
        },
        {
          label: "Manager module manage",
          values: [
            "MANAGER",
            "Granted workspace/module",
            "Conditional allow",
            "Requires scoped grant and audit refs for management actions",
          ],
          tone: "review",
        },
        {
          label: "Editor work update",
          values: [
            "EDITOR",
            "Granted Work project",
            "Allow draft/update",
            "Final high-risk writes still checked by module policy",
          ],
          tone: "proposal",
        },
        {
          label: "Viewer write attempt",
          values: [
            "VIEWER",
            "Any module record",
            "Deny",
            "Read-only role; denial message must not leak hidden resources",
          ],
          tone: "blocked",
        },
        {
          label: "Guest internal context",
          values: [
            "GUEST",
            "Private source or AI memory",
            "Deny",
            "No explicit external-safe grant; deny-by-default",
          ],
          tone: "blocked",
        },
      ],
    },
  ],
}

export const adminAiGovernanceControlPlane: ControlPlanePageModel = {
  eyebrow: "Admin",
  title: "AI 治理與能力登錄",
  description: "把總 AI、模組 AI、capability registry、風險等級、approval mode、dry-run 與 AgentFacts 姿態放在同一個 operator surface。",
  stateLabel: "externalRegisterable=false",
  stateTone: "blocked",
  primaryAction: { label: "AI 分享設定", href: "/settings/ai-sharing" },
  stats: [
    { label: "Agent visibility", value: "Protected", detail: "owner/admin only。", tone: "ready" },
    { label: "Capabilities", value: "Draft registry", detail: "低風險先 proposal/dry-run。", tone: "proposal" },
    { label: "External", value: "Blocked", detail: "未核准外部註冊與 DB access。", tone: "blocked" },
  ],
  sections: [
    {
      title: "Capability policy",
      description: "AI 只能透過已登錄能力行動，每個能力都要有 schema、risk、approval、audit 和 rollback。",
      rows: [
        {
          label: "summarize.today",
          status: "可提案",
          description: "總 AI 可把允許分享的模組 context 整理成今日摘要。",
          boundary: "不得讀取未授權模組、不得輸出 private context 到公開路由。",
        },
        {
          label: "work.todo.create_draft",
          status: "低風險候選",
          description: "把 owner comment 或來源資料轉成待審核 TODO 草稿。",
          boundary: "正式寫入需 approval mode、authz、audit。",
        },
        {
          label: "external.message.send",
          status: "封鎖",
          description: "寄信、LINE、客戶訊息等外部行動都屬於高風險。",
          boundary: "Provider setup 與每次 sending policy 需 owner 明確核准。",
        },
        {
          label: "permission.change",
          status: "封鎖",
          description: "AI 不可直接修改角色、成員或分享範圍。",
          boundary: "權限變更永遠走 RBAC approval + audit。",
        },
      ],
    },
  ],
  matrixSections: [
    {
      title: "Capability registry draft",
      description: "這是 Core AI 與模組 AI 後續合作的最小登錄視框；所有項目維持 internal protected，externalRegisterable=false。",
      columns: ["Module", "Risk", "Approval mode", "Runtime boundary"],
      rows: [
        {
          label: "summarize.today",
          values: [
            "Core AI / Today",
            "Low",
            "Draft or owner-visible proposal",
            "No provider/public output by default; scoped shared context only",
          ],
          tone: "proposal",
        },
        {
          label: "work.todo.create_draft",
          values: [
            "Work",
            "Low-medium",
            "Owner approve before DB write",
            "Draft DTO first; service authz and audit required before persistence",
          ],
          tone: "proposal",
        },
        {
          label: "inbox.return.route",
          values: [
            "Inbox / AI Input",
            "Low",
            "Owner-visible routing proposal",
            "Links source to destination without deleting context",
          ],
          tone: "review",
        },
        {
          label: "source.link_to_task",
          values: [
            "Source / Work",
            "Medium",
            "Owner approve",
            "Must preserve source id, consent, retention, and audit refs",
          ],
          tone: "review",
        },
        {
          label: "external.message.send",
          values: [
            "Provider",
            "High",
            "Disabled",
            "No Gmail/LINE/client send without explicit owner approval and provider setup",
          ],
          tone: "blocked",
        },
        {
          label: "permission.change",
          values: [
            "RBAC",
            "Critical",
            "Disabled",
            "AI cannot directly change roles, members, grants, or sharing scope",
          ],
          tone: "blocked",
        },
      ],
    },
  ],
}

export const adminAuditControlPlane: ControlPlanePageModel = {
  eyebrow: "Admin",
  title: "稽核與事件",
  description: "集中檢查 actor、action、target、source refs、agent refs、approval、retention 和 rollback，不讓 proof 細節散落在正常頁面。",
  stateLabel: "searchable surface",
  stateTone: "proposal",
  primaryAction: { label: "系統就緒", href: "/admin/system-readiness" },
  stats: [
    { label: "事件模型", value: "已定義方向", detail: "actor/action/target/source refs。", tone: "review" },
    { label: "搜尋", value: "待 UI", detail: "filter/search/export 待實作。", tone: "proposal" },
    { label: "Secrets", value: "禁止顯示", detail: "不呈現 URL credentials 或 raw packet。", tone: "ready" },
  ],
  sections: [
    {
      title: "Audit inventory",
      description: "每個高風險操作都需要可查、可說明、可刪除或可回復的紀錄。",
      rows: [
        {
          label: "Source refs",
          status: "必備",
          description: "AI 記憶與提案必須保留來源、同意、保留期限與刪除狀態。",
          boundary: "不得把 raw private context 當作 public-safe evidence。",
        },
        {
          label: "Approval refs",
          status: "必備",
          description: "AI execution、member invite、project transfer、public output 都要有 approval trace。",
          boundary: "沒有 approval ref 就保持 proposal-only。",
        },
        {
          label: "Rollback",
          status: "待模型化",
          description: "每個 capability 要標記是否支援 undo 或 compensation。",
          boundary: "不可宣稱可回復但沒有實際流程。",
        },
      ],
    },
  ],
}

export const adminSystemReadinessControlPlane: ControlPlanePageModel = {
  eyebrow: "Admin",
  title: "系統就緒與 Manual Ops",
  description: "把 auth、env、deploy、provider、proof target 和 manual setup 放進 operator 面板，讓正常產品頁維持簡潔。",
  stateLabel: "manual ops visible",
  stateTone: "review",
  primaryAction: { label: "Admin 首頁", href: "/admin" },
  stats: [
    { label: "Auth", value: "待正式 proof", detail: "Supabase session/Profile 仍需真實證據。", tone: "review" },
    { label: "DB proof", value: "Owner-run", detail: "safe disposable/local proof target。", tone: "proposal" },
    { label: "Deploy", value: "待檢查", detail: "Vercel env/build/runtime 分開看。", tone: "review" },
  ],
  sections: [
    {
      title: "Readiness blockers",
      description: "無法自動升級的項目留在 Manual Ops，其他 UI/BFF 能繼續往前成熟。",
      rows: [
        {
          label: "Supabase auth",
          status: "Manual proof",
          description: "需要 signed-in `/auth/status`、Profile mapping、owner scoped read proof。",
          boundary: "不從 UI 自動建立或改寫 auth/profile。",
        },
        {
          label: "Work proof target",
          status: "Owner-run",
          description: "需要明確 local/disposable target 後才能跑資料寫入 proof。",
          boundary: "不得用 production DB 當測試目標。",
        },
        {
          label: "Provider runtime",
          status: "封鎖",
          description: "Gmail/LINE/Drive/AI provider 啟用需要 secret、OAuth、revoke、audit 與 owner approval。",
          boundary: "不在本頁啟用 provider 或外部輸出。",
        },
        {
          label: "Vercel deploy",
          status: "待檢查",
          description: "build memory、env、Prisma generate、runtime routes 要分開追蹤。",
          boundary: "不自動變更 production env 或 domain。",
        },
      ],
    },
  ],
}

settingsLanguageControlPlane.locales = {
  "en-US": {
    eyebrow: "Owner settings",
    title: "Language and copy",
    description:
      "Manage the Chinese-first interface and English fallback so Personal OS can become a real bilingual operating console.",
    stateLabel: "UI-L4 foundation",
    stateTone: "review",
    primaryAction: { label: "Back to settings", href: "/settings" },
    stats: [
      { label: "Default locale", value: "Traditional Chinese", detail: "Formal product tone stays zh-TW first.", tone: "ready" },
      { label: "English path", value: "Reserved", detail: "Primary shell labels already use locale keys.", tone: "review" },
      { label: "Persistence", value: "Pending BFF", detail: "Profile-backed preference is a later safe slice.", tone: "proposal" },
    ],
    sections: [
      {
        title: "Bilingual rollout path",
        description: "Use a copy registry first, then migrate page titles, commands, empty states, and risk labels to keys.",
        rows: [
          {
            label: "Primary navigation",
            status: "Started",
            description: "Today, AI Workbench, Core Ops, System, and More are now shared copy.",
            boundary: "This pass keeps local preference only; profile-backed persistence comes later.",
          },
          {
            label: "Normal page labels",
            status: "Converging",
            description: "Normal pages should use product language and hide engineering task ids or proof walls.",
            boundary: "Task ids stay in docs and admin/operator surfaces.",
          },
          {
            label: "Locale persistence",
            status: "Pending design",
            description: "Start with local preference, then upgrade to owner profile setting.",
            boundary: "This page does not write Profile or permission data.",
          },
        ],
      },
    ],
  },
}

settingsMembersControlPlane.locales = {
  "en-US": {
    eyebrow: "Owner settings",
    title: "Members and invitations",
    description:
      "Understand who belongs to the workspace, where invitations stand, and which actions still need manual approval.",
    stateLabel: "proposal-only",
    stateTone: "proposal",
    primaryAction: { label: "Role matrix", href: "/settings/roles" },
    secondaryActions: [{ label: "Admin RBAC", href: "/admin/rbac" }],
    stats: [
      { label: "Owner", value: "1", detail: "Current mode is owner-private operation.", tone: "ready" },
      { label: "Invites", value: "Disabled", detail: "Email delivery and member writes are not enabled.", tone: "blocked" },
      { label: "Team pilot", value: "Gate B", detail: "Member lifecycle belongs to the team pilot gate.", tone: "proposal" },
    ],
    sections: [
      {
        title: "Member lifecycle",
        description: "Clarify states first, then connect service-layer authorization and audit.",
        rows: [
          {
            label: "Active owner",
            status: "Visible",
            description: "Owner can distinguish the private workspace from future team workspaces.",
            boundary: "No workspace creation, project transfer, or invitation sending in this page.",
          },
          {
            label: "Pending invitation",
            status: "Pending BFF",
            description: "Invitations need email, role, expiresAt, accepted, and revoked states.",
            boundary: "Email provider and DB writes require explicit approval.",
          },
          {
            label: "Offboarding",
            status: "Pending design",
            description: "Removing a member must show affected projects, sources, AI memory, and audit events.",
            boundary: "Do not silently delete data or revoke owner authority.",
          },
        ],
      },
    ],
  },
}

settingsRolesControlPlane.locales = {
  "en-US": {
    eyebrow: "Owner settings",
    title: "Roles and permissions",
    description:
      "Explain what OWNER, MANAGER, EDITOR, VIEWER, and GUEST can do before team collaboration expands.",
    stateLabel: "read-only matrix",
    stateTone: "review",
    primaryAction: { label: "Members", href: "/settings/members" },
    secondaryActions: [{ label: "Admin RBAC", href: "/admin/rbac" }],
    stats: [
      { label: "Roles", value: "5", detail: "Owner-approved RBAC labels.", tone: "ready" },
      { label: "Effective access", value: "Pending BFF", detail: "Needs role plus resource grants preview.", tone: "proposal" },
      { label: "Writes", value: "Disabled", detail: "This page does not change permissions.", tone: "blocked" },
    ],
    sections: [
      {
        title: "Default role posture",
        description: "RBAC handles coarse roles while resource grants keep the door open for FGA/ReBAC later.",
        rows: [
          {
            label: "OWNER",
            status: "Full control",
            description: "Can manage workspace, members, modules, and AI policy; sensitive actions still need audit.",
            boundary: "Owner transfer and deletion require a separate high-risk flow.",
          },
          {
            label: "MANAGER",
            status: "Scoped manage",
            description: "Can manage authorized workspace or module operations, not owner transfer by default.",
            boundary: "No default Finance, Life, permission change, or public output authority.",
          },
          {
            label: "EDITOR",
            status: "Create/update records",
            description: "Can edit authorized module data for collaboration.",
            boundary: "High-risk final writes still follow approval policy.",
          },
          {
            label: "VIEWER",
            status: "Read-only",
            description: "Can read granted resources without modifying data or triggering AI execution.",
            boundary: "UI hiding never replaces service-layer authorization.",
          },
          {
            label: "GUEST",
            status: "Explicit grants only",
            description: "Can see explicitly shared client-safe or external-safe context only.",
            boundary: "No inherited internal data, AI memory, or private sources.",
          },
        ],
      },
    ],
    matrixSections: [
      {
        title: "Owner-visible role matrix",
        description: "This matrix makes role posture understandable; real allow/deny remains a service-layer decision.",
        columns: ["Workspace", "Module data", "AI capabilities", "High-risk boundary"],
        rows: [
          {
            label: "OWNER",
            values: [
              "Manage workspace, settings, members, and boundaries",
              "Manage enabled modules and sharing policy",
              "Review, approve, or disable capabilities",
              "Transfer, deletion, and public output still need high-risk flow",
            ],
            tone: "ready",
          },
          {
            label: "MANAGER",
            values: [
              "Manage granted workspace or team area",
              "Manage granted module operations",
              "Review low-risk proposals, not default policy changes",
              "No owner transfer, Finance/Life finalization, or public output",
            ],
            tone: "review",
          },
          {
            label: "EDITOR",
            values: [
              "See granted workspace",
              "Create or update granted records",
              "Create drafts and proposal feedback",
              "Final writes depend on module risk and approval policy",
            ],
            tone: "proposal",
          },
          {
            label: "VIEWER",
            values: [
              "Read granted workspace or project",
              "No record or workflow changes",
              "No execution; approved output only",
              "Write, send, and permission change are denied by default",
            ],
            tone: "blocked",
          },
          {
            label: "GUEST",
            values: [
              "Only explicit external-safe shares",
              "No inherited internal module data",
              "No AI memory or private source access",
              "Deny-by-default without explicit grant",
            ],
            tone: "blocked",
          },
        ],
      },
    ],
  },
}

settingsAiSharingControlPlane.locales = {
  "en-US": {
    eyebrow: "Owner settings",
    title: "AI sharing and Core AI",
    description:
      "Control what modules may share with Core AI, and keep AI actions reviewable, traceable, and bounded.",
    stateLabel: "protected proposal",
    stateTone: "proposal",
    primaryAction: { label: "AI governance", href: "/admin/ai-governance" },
    secondaryActions: [{ label: "Today", href: "/dashboard" }],
    stats: [
      { label: "Core AI", value: "Internal", detail: "Protected owner/admin only.", tone: "ready" },
      { label: "Sharing", value: "Opt-in", detail: "Modules must declare share scope.", tone: "review" },
      { label: "Execution", value: "Disabled", detail: "Runtime action execution needs separate approval.", tone: "blocked" },
    ],
    sections: [
      {
        title: "Module sharing defaults",
        description: "Core AI may summarize and propose; API/TODO actions require registry, RBAC, approval, and audit.",
        rows: [
          {
            label: "Work",
            status: "Summary and draft TODO allowed",
            description: "Project status, next steps, and blockers can feed Today and AI Input proposals.",
            boundary: "No unreviewed final task write or external output.",
          },
          {
            label: "Research",
            status: "Relevant snippets allowed",
            description: "Research topics, source summaries, and intake packets can become proposals.",
            boundary: "Citation, retention, and deletion requests must be traceable.",
          },
          {
            label: "Company",
            status: "Internal summary",
            description: "Strategy context can become decision or work proposals.",
            boundary: "Strategy finalization and client-visible output need human approval.",
          },
          {
            label: "Finance / Life",
            status: "Blocked by default",
            description: "High-risk personal and financial data stay as human-reviewed drafts only.",
            boundary: "No automatic final records or external sharing.",
          },
        ],
      },
    ],
    matrixSections: [
      {
        title: "Module-to-Core-AI sharing policy",
        description: "Core AI consumes only scoped owner-approved context with clear action, retention, and boundary rules.",
        columns: ["Shared context", "Core AI may do", "Retention / deletion", "Default boundary"],
        rows: [
          {
            label: "Work",
            values: [
              "Project summaries, next steps, blockers, owner comments",
              "Create Today summary, TODO drafts, source links",
              "Keep source refs; deletion requests must be trackable",
              "No final task write or external output without review",
            ],
            tone: "review",
          },
          {
            label: "Research",
            values: [
              "Research topics, source summaries, intake snippets",
              "Create proposals, cite sources, suggest filing",
              "Keep citation/source id and retention note",
              "Raw private sources are not public-safe context",
            ],
            tone: "review",
          },
          {
            label: "Company",
            values: [
              "Internal strategy summaries and decision context",
              "Draft decision proposals and action queues",
              "Keep internal-only labels and approval refs",
              "Client-visible strategy output needs human approval",
            ],
            tone: "proposal",
          },
          {
            label: "Finance",
            values: [
              "Blocked by default; owner manual summary only",
              "Draft suggestions only; no final record changes",
              "High-risk retention/delete needs owner confirmation",
              "Automatic writes and external sharing are blocked",
            ],
            tone: "blocked",
          },
          {
            label: "Life",
            values: [
              "Blocked by default unless explicitly opted in",
              "Private drafts or reminder suggestions only",
              "Retention and deletion must be owner-readable",
              "Never enters team, shared, or public context by default",
            ],
            tone: "blocked",
          },
        ],
      },
    ],
  },
}

adminRbacControlPlane.locales = {
  "en-US": {
    eyebrow: "Admin",
    title: "RBAC and effective permissions",
    description:
      "Operator surface for role grants, module/resource access, denial reasons, and audit references without crowding owner pages.",
    stateLabel: "operator proof surface",
    stateTone: "review",
    primaryAction: { label: "Role settings", href: "/settings/roles" },
    stats: [
      { label: "RBAC", value: "Readable", detail: "Role language is defined.", tone: "ready" },
      { label: "ReBAC", value: "Reserved", detail: "Resource relationships are still pending.", tone: "proposal" },
      { label: "Mutation", value: "disabled", detail: "Permission writes are not in this slice.", tone: "blocked" },
    ],
    sections: [
      {
        title: "Operator inspection",
        description: "Admin should explain why access is allowed or denied; task/proof details stay out of normal pages.",
        rows: [
          {
            label: "Role assignment",
            status: "Pending BFF",
            description: "List workspace member, role, source, and updated time.",
            boundary: "Writes require requireUser, service authorization, and audit event.",
          },
          {
            label: "Effective permission",
            status: "Pending BFF",
            description: "Preview whether an actor may perform an action on a route, module, resource, or capability.",
            boundary: "Client-side filtering is never the authorization boundary.",
          },
          {
            label: "Denied reason",
            status: "Required",
            description: "Denials must point to role, grant, policy, setup, or manual ops gaps.",
            boundary: "Errors must not leak other users or private resources.",
          },
          {
            label: "Audit refs",
            status: "Required",
            description: "Permission changes, invites, revocations, and transfers must trace to events.",
            boundary: "No high-risk permission write without audit.",
          },
        ],
      },
    ],
    matrixSections: [
      {
        title: "Effective permission scenarios",
        description: "Use this table to inspect role, resource, action, and denial reason before a policy engine is connected.",
        columns: ["Role", "Target", "Decision", "Reason / audit note"],
        rows: [
          {
            label: "Owner admin read",
            values: ["OWNER", "/admin/* read surfaces", "Allow", "Owner protected route after requireUser; mutations still audited"],
            tone: "ready",
          },
          {
            label: "Manager module manage",
            values: ["MANAGER", "Granted workspace/module", "Conditional allow", "Requires scoped grant and audit refs"],
            tone: "review",
          },
          {
            label: "Editor work update",
            values: ["EDITOR", "Granted Work project", "Allow draft/update", "Final high-risk writes still use module policy"],
            tone: "proposal",
          },
          {
            label: "Viewer write attempt",
            values: ["VIEWER", "Any module record", "Deny", "Read-only role; denial must not leak hidden resources"],
            tone: "blocked",
          },
          {
            label: "Guest internal context",
            values: ["GUEST", "Private source or AI memory", "Deny", "No explicit external-safe grant; deny-by-default"],
            tone: "blocked",
          },
        ],
      },
    ],
  },
}

adminAiGovernanceControlPlane.locales = {
  "en-US": {
    eyebrow: "Admin",
    title: "AI governance and capability registry",
    description:
      "Inspect Core AI, module AI, capability registry, risk levels, approval modes, dry-run support, and AgentFacts posture.",
    stateLabel: "externalRegisterable=false",
    stateTone: "blocked",
    primaryAction: { label: "AI sharing settings", href: "/settings/ai-sharing" },
    stats: [
      { label: "Agent visibility", value: "Protected", detail: "Owner/admin only.", tone: "ready" },
      { label: "Capabilities", value: "Draft registry", detail: "Low-risk actions start as proposal/dry-run.", tone: "proposal" },
      { label: "External", value: "Blocked", detail: "No external registration or DB access is approved.", tone: "blocked" },
    ],
    sections: [
      {
        title: "Capability policy",
        description: "AI acts only through registered capabilities with schema, risk, approval, audit, and rollback.",
        rows: [
          {
            label: "summarize.today",
            status: "Proposal allowed",
            description: "Core AI may turn approved shared context into a Today summary.",
            boundary: "No unauthorized module reads or private context on public routes.",
          },
          {
            label: "work.todo.create_draft",
            status: "Low-risk candidate",
            description: "Turn owner comments or sources into reviewable TODO drafts.",
            boundary: "Persistence requires approval mode, authz, and audit.",
          },
          {
            label: "external.message.send",
            status: "Blocked",
            description: "Email, LINE, and client messages are high-risk external actions.",
            boundary: "Provider setup and every sending policy require explicit owner approval.",
          },
          {
            label: "permission.change",
            status: "Blocked",
            description: "AI cannot directly edit roles, members, or sharing scope.",
            boundary: "Permission changes always go through RBAC approval plus audit.",
          },
        ],
      },
    ],
    matrixSections: [
      {
        title: "Capability registry draft",
        description: "Minimal registry frame for Core AI and module AI collaboration; all entries stay internal protected.",
        columns: ["Module", "Risk", "Approval mode", "Runtime boundary"],
        rows: [
          {
            label: "summarize.today",
            values: ["Core AI / Today", "Low", "Draft or owner-visible proposal", "Scoped shared context only; no public output"],
            tone: "proposal",
          },
          {
            label: "work.todo.create_draft",
            values: ["Work", "Low-medium", "Owner approve before DB write", "Draft DTO first; authz and audit before persistence"],
            tone: "proposal",
          },
          {
            label: "inbox.return.route",
            values: ["Inbox / AI Input", "Low", "Owner-visible routing proposal", "Link source to destination without deleting context"],
            tone: "review",
          },
          {
            label: "source.link_to_task",
            values: ["Source / Work", "Medium", "Owner approve", "Preserve source id, consent, retention, and audit refs"],
            tone: "review",
          },
          {
            label: "external.message.send",
            values: ["Provider", "High", "Disabled", "No Gmail/LINE/client send without explicit setup and approval"],
            tone: "blocked",
          },
          {
            label: "permission.change",
            values: ["RBAC", "Critical", "Disabled", "AI cannot change roles, members, grants, or sharing scope"],
            tone: "blocked",
          },
        ],
      },
    ],
  },
}

adminAuditControlPlane.locales = {
  "en-US": {
    eyebrow: "Admin",
    title: "Audit and events",
    description:
      "Inspect actor, action, target, source refs, agent refs, approval, retention, and rollback in one operator surface.",
    stateLabel: "searchable surface",
    stateTone: "proposal",
    primaryAction: { label: "System readiness", href: "/admin/system-readiness" },
    stats: [
      { label: "Event model", value: "Direction set", detail: "Actor/action/target/source refs.", tone: "review" },
      { label: "Search", value: "Pending UI", detail: "Filter/search/export still pending.", tone: "proposal" },
      { label: "Secrets", value: "Hidden", detail: "No URL credentials or raw packets.", tone: "ready" },
    ],
    sections: [
      {
        title: "Audit inventory",
        description: "Every high-risk action needs records that are searchable, explainable, deletable, or reversible.",
        rows: [
          {
            label: "Source refs",
            status: "Required",
            description: "AI memory and proposals must keep source, consent, retention, and deletion state.",
            boundary: "Raw private context is not public-safe evidence.",
          },
          {
            label: "Approval refs",
            status: "Required",
            description: "AI execution, member invite, project transfer, and public output need approval traces.",
            boundary: "No approval ref means proposal-only.",
          },
          {
            label: "Rollback",
            status: "Pending model",
            description: "Every capability marks whether undo or compensation is supported.",
            boundary: "Do not claim rollback without an actual flow.",
          },
        ],
      },
    ],
  },
}

adminSystemReadinessControlPlane.locales = {
  "en-US": {
    eyebrow: "Admin",
    title: "System readiness and Manual Ops",
    description:
      "Keep auth, env, deploy, provider, proof targets, and manual setup in the operator panel so product pages stay calm.",
    stateLabel: "manual ops visible",
    stateTone: "review",
    primaryAction: { label: "Admin home", href: "/admin" },
    stats: [
      { label: "Auth", value: "Needs proof", detail: "Supabase session/Profile still needs real evidence.", tone: "review" },
      { label: "DB proof", value: "Owner-run", detail: "Use safe disposable/local proof target.", tone: "proposal" },
      { label: "Deploy", value: "Pending check", detail: "Separate Vercel env/build/runtime checks.", tone: "review" },
    ],
    sections: [
      {
        title: "Readiness blockers",
        description: "Manual Ops keeps non-automatable setup visible while UI/BFF maturity can continue.",
        rows: [
          {
            label: "Supabase auth",
            status: "Manual proof",
            description: "Needs signed-in auth status, Profile mapping, and owner-scoped read proof.",
            boundary: "UI does not auto-create or rewrite auth/profile.",
          },
          {
            label: "Work proof target",
            status: "Owner-run",
            description: "Data write proof needs an explicit local/disposable target.",
            boundary: "Production DB is not a test target.",
          },
          {
            label: "Provider runtime",
            status: "Blocked",
            description: "Gmail/LINE/Drive/AI provider activation needs secrets, OAuth, revoke, audit, and approval.",
            boundary: "This page does not enable providers or external output.",
          },
          {
            label: "Vercel deploy",
            status: "Pending check",
            description: "Build memory, env, Prisma generate, and runtime routes are tracked separately.",
            boundary: "Do not auto-change production env or domain.",
          },
        ],
      },
    ],
  },
}
