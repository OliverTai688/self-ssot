export interface AiNavSuggestion {
  label: string
  href: string
  type: "task" | "note" | "project" | "tab" | "page"
  context?: string
}

export interface MockAiMessage {
  text: string
  navSuggestions?: AiNavSuggestion[]
}

interface KeywordResponse {
  keywords: string[]
  response: MockAiMessage
}

// ─── Route-specific responses ─────────────────────────────────────────────────

export const routeResponses: Record<string, KeywordResponse[]> = {
  "/work/p1": [
    {
      keywords: ["任務", "task", "待辦"],
      response: {
        text: "Lisa Q2 Dashboard 目前有 10 個任務，6 個已完成。最緊急的是修改客戶分層的色彩對比度（進行中）和確認 Lisa 的輸出格式需求。",
        navSuggestions: [
          { label: "修改色彩對比度", href: "/work/p1?tab=work", type: "tab", context: "工作 Tab → 任務區" },
          { label: "確認輸出格式", href: "/work/p1?tab=work", type: "tab", context: "工作 Tab → 任務區" },
        ],
      },
    },
    {
      keywords: ["客戶", "client", "lisa", "分享"],
      response: {
        text: "Lisa 是這個專案的客戶，目前有分享連結。她上次反饋是關於色彩對比度的問題。你可以從客戶 Tab 管理分享設定，或生成客戶更新草稿。",
        navSuggestions: [
          { label: "客戶 Tab", href: "/work/p1?tab=client", type: "tab", context: "查看客戶可見內容與分享設定" },
        ],
      },
    },
    {
      keywords: ["脈搏", "pulse", "進度", "狀態"],
      response: {
        text: "Lisa Q2 Dashboard 整體進度 60%，健康度為「需留意」。AI 指出客戶分層模組因設計反饋需要修改，是目前的主要阻礙。距截止日還有 8 天，可控範圍內。",
        navSuggestions: [
          { label: "AI 脈搏", href: "/work/p1?tab=pulse", type: "tab", context: "查看完整 AI 分析" },
        ],
      },
    },
  ],
  "/work/p2": [
    {
      keywords: ["任務", "task", "待辦"],
      response: {
        text: "Allen NGO Proposal 有 8 個任務，只完成 2 個（25%）。最嚴重的阻礙是財務數據未收到，導致財務規劃模組完全無法推進。截止日是今天。",
        navSuggestions: [
          { label: "查看所有任務", href: "/work/p2?tab=work", type: "tab", context: "工作 Tab → 任務區" },
        ],
      },
    },
    {
      keywords: ["allen", "財務", "數據"],
      response: {
        text: "Allen 說財務數據要等理事會開完會，最快 5/9 才能提供。這已記錄在紀錄 Tab 中。建議直接聯繫 Allen 確認最新時間，或討論範圍縮減的可能性。",
        navSuggestions: [
          { label: "查看 Allen 紀錄", href: "/work/p2?tab=work", type: "tab", context: "工作 Tab → 紀錄區" },
        ],
      },
    },
  ],
  "/work": [
    {
      keywords: ["風險", "risk", "阻礙", "問題"],
      response: {
        text: "目前有 2 個需要注意的專案：Allen NGO Proposal 進度嚴重落後（25%，截止日今天）；Lisa Q2 Dashboard 有客戶反饋待處理。",
        navSuggestions: [
          { label: "Allen NGO Proposal", href: "/work/p2", type: "project", context: "health: risk" },
          { label: "Lisa Q2 Dashboard", href: "/work/p1", type: "project", context: "health: watch" },
        ],
      },
    },
    {
      keywords: ["今天", "今日", "要做什麼", "優先"],
      response: {
        text: "今天最需要處理的兩件事：① 聯絡 Allen 確認財務數據（Allen 的截止日已到）② 回覆 Lisa 的色彩對比度反饋（影響後續審稿）",
        navSuggestions: [
          { label: "Allen NGO Proposal", href: "/work/p2?tab=pulse", type: "project" },
          { label: "Lisa Q2 Dashboard", href: "/work/p1?tab=pulse", type: "project" },
        ],
      },
    },
    {
      keywords: ["所有", "全部", "列表"],
      response: {
        text: "目前共有 5 個專案：3 個進行中、1 個暫停、1 個已完成。進行中的專案中，Banner 系列最接近完成（67%）。",
        navSuggestions: [
          { label: "Lisa Q2 Dashboard", href: "/work/p1", type: "project" },
          { label: "Allen NGO Proposal", href: "/work/p2", type: "project" },
          { label: "商會活動 Banner 系列", href: "/work/p3", type: "project" },
        ],
      },
    },
  ],
  "/dashboard": [
    {
      keywords: ["工作", "專案", "work"],
      response: {
        text: "工作模組有 3 個進行中的專案。Allen 的提案進度最緊迫（25%），Lisa 的儀表板有設計反饋待處理。",
        navSuggestions: [
          { label: "前往工作模組", href: "/work", type: "page" },
          { label: "Allen NGO Proposal", href: "/work/p2", type: "project" },
        ],
      },
    },
    {
      keywords: ["今天", "今日", "早安", "簡報"],
      response: {
        text: "今天早安簡報顯示 3 件事需要注意：Allen 提案截止、Lisa 的 LINE 未回、Banner 後天送印。建議從最緊迫的 Allen 開始。",
        navSuggestions: [
          { label: "查看早安簡報", href: "/dashboard", type: "page" },
          { label: "Allen NGO Proposal", href: "/work/p2", type: "project" },
        ],
      },
    },
  ],
}

// ─── General fallback responses ───────────────────────────────────────────────

export const generalResponses: KeywordResponse[] = [
  {
    keywords: ["幫助", "help", "怎麼用", "功能"],
    response: {
      text: "我是你的 AI 助理，可以幫你：① 快速了解各專案的狀態 ② 找到需要處理的任務 ③ 跳轉到對應頁面。你可以問我「哪個專案最緊急？」或「Lisa 的專案現在怎樣？」",
    },
  },
  {
    keywords: ["謝謝", "好", "了解", "ok"],
    response: {
      text: "好的！有任何問題隨時告訴我。",
    },
  },
]

export const defaultResponse: MockAiMessage = {
  text: "我目前是 Phase 1 模擬模式，對這個問題的理解還有限。你可以試試問我「哪個專案最緊急？」或「今天要做什麼？」",
}

// ─── Greeting messages per route ─────────────────────────────────────────────

export const routeGreetings: Record<string, string> = {
  "/dashboard": "今天的早安簡報已整理好。有 3 件事需要你的注意。需要我幫你決定從哪裡開始嗎？",
  "/work": "工作模組目前有 3 個進行中的專案。Allen 的提案進度最緊迫，需要優先處理。",
  "/work/p1": "Lisa Q2 Dashboard 整體進度 60%，客戶分層色彩問題是目前的主要阻礙。需要我幫你查什麼嗎？",
  "/work/p2": "Allen NGO Proposal 進度落後（25%），財務數據尚未收到。今天最重要的事是聯絡 Allen 確認。",
  "/work/p3": "商會活動 Banner 系列進度 67%，還有 2 張未完成。Mark 需要你確認審稿狀態。",
  "/work/p4": "Cathy ESG 報告設計目前暫停，等待客戶提供文字內容。有什麼需要記錄的嗎？",
  "/work/p5": "商會年刊 2025 已完成，所有任務都完成了。",
}

export function getGreeting(pathname: string): string {
  if (routeGreetings[pathname]) return routeGreetings[pathname]
  if (/\/work\//.test(pathname)) return "你正在查看一個專案詳情。需要我幫你分析什麼嗎？"
  return "你好！有什麼需要我幫忙的嗎？"
}

export function matchResponse(input: string, pathname: string): MockAiMessage {
  const lower = input.toLowerCase()

  // Try route-specific responses first
  for (const [routePattern, responses] of Object.entries(routeResponses)) {
    if (pathname.startsWith(routePattern)) {
      for (const { keywords, response } of responses) {
        if (keywords.some((kw) => lower.includes(kw))) return response
      }
    }
  }

  // Try general responses
  for (const { keywords, response } of generalResponses) {
    if (keywords.some((kw) => lower.includes(kw))) return response
  }

  return defaultResponse
}
