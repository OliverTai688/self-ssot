import type { AICard, Confidence, TriageCategory } from "@/types/ai"

// ─── Keyword rules ────────────────────────────────────────────────────────────

const CATEGORY_RULES: Array<{ keywords: string[]; category: TriageCategory }> = [
  {
    keywords: ["client", "line", "banner", "design", "project", "客戶", "設計", "專案", "提案", "banner"],
    category: "project_note",
  },
  {
    keywords: ["research", "paper", "thread", "literature", "研究", "論文", "文獻", "期刊", "投稿"],
    category: "research_idea",
  },
  {
    keywords: ["receipt", "amount", "payment", "expense", "收據", "金額", "付款", "支出", "費用", "發票"],
    category: "finance_record",
  },
  {
    keywords: ["cold", "exercise", "body", "doctor", "health", "sleep", "感冒", "運動", "身體", "醫生", "健康", "睡眠"],
    category: "life_care",
  },
  {
    keywords: ["friend", "dinner", "memory", "birthday", "朋友", "晚餐", "記憶", "回憶", "生日", "聚會"],
    category: "memory",
  },
]

function detectCategory(text: string): TriageCategory {
  const lower = text.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return rule.category
    }
  }
  return "general"
}

function detectConfidence(text: string, category: TriageCategory): Confidence {
  if (category === "general") return "low"
  const lower = text.toLowerCase()
  const matchCount = CATEGORY_RULES
    .find((r) => r.category === category)
    ?.keywords.filter((kw) => lower.includes(kw.toLowerCase())).length ?? 0
  if (matchCount >= 2) return "high"
  return "medium"
}

function extractTitle(text: string): string {
  const trimmed = text.trim()
  const firstLine = trimmed.split("\n")[0]
  if (firstLine.length <= 40) return firstLine
  return firstLine.slice(0, 37) + "…"
}

const CATEGORY_LABELS: Record<TriageCategory, string> = {
  project_note: "工作筆記",
  research_idea: "研究想法",
  finance_record: "財務記錄",
  life_care: "生活照護",
  memory: "記憶",
  relationship: "關係",
  general: "一般",
}

const PLACEMENT_MAP: Record<TriageCategory, string> = {
  project_note: "工作 → 專案任務備註",
  research_idea: "研究 → 研究方向",
  finance_record: "財務 → 支出記錄",
  life_care: "生活 → 健康追蹤",
  memory: "關係 → 重要記憶",
  relationship: "關係 → 聯絡人",
  general: "收件匣 → 待分類",
}

const REASONING_TEMPLATE: Record<TriageCategory, string> = {
  project_note: "內容包含專案相關關鍵字（客戶、設計、LINE 等），屬於具體的專案工作記錄或反饋。",
  research_idea: "內容包含研究相關關鍵字（research、paper、thread 等），屬於學術研究的想法或文獻線索。",
  finance_record: "內容包含財務相關關鍵字（收據、金額、支出等），屬於財務記錄。請確認金額與分類正確。",
  life_care: "內容包含身體或生活健康相關關鍵字，屬於生活節律或健康狀態的記錄。",
  memory: "內容包含人際關係的重要節點（生日、聚會、記憶等），值得保存為關係記憶。",
  relationship: "內容與特定聯絡人相關，屬於人際關係的記錄或更新。",
  general: "無法從內容中識別出明確分類，暫時歸為一般項目。建議手動確認分類。",
}

const RECOMMENDATION_TEMPLATE: Record<TriageCategory, string> = {
  project_note: "確認後加入對應專案的任務備註，評估是否需要建立新任務。",
  research_idea: "確認後存入對應的研究主題，考慮是否需要開啟新的研究子方向。",
  finance_record: "確認金額與分類正確後存入財務模組。注意：AI 不會自動記錄財務，需要你確認。",
  life_care: "記下這個身體或生活狀態，考慮是否需要設定追蹤或提醒。",
  memory: "存入對應聯絡人的重要日期或記憶，考慮是否需要設定未來提醒。",
  relationship: "更新對應聯絡人的資料或互動記錄。",
  general: "請手動確認此項目的分類和存放位置。",
}

// ─── Main triage function ─────────────────────────────────────────────────────

export function triageCapture(
  content: string,
  captureId: string
): Omit<AICard, "id" | "createdAt" | "status"> {
  const category = detectCategory(content)
  const confidence = detectConfidence(content, category)

  return {
    title: extractTitle(content),
    summary: content.length > 120 ? content.slice(0, 117) + "…" : content,
    aiType: "triage",
    triageCategory: category,
    confidence,
    reasoning: REASONING_TEMPLATE[category],
    recommendation: RECOMMENDATION_TEMPLATE[category],
    suggestedPlacement: PLACEMENT_MAP[category],
    extractedEntities: [],
  }
}

export { CATEGORY_LABELS, PLACEMENT_MAP }
