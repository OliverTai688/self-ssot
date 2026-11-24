/**
 * AI 團隊可用的模型（RES-039）。Claude 與 OpenAI 兩家，每個對話自己選、隨時可換。
 *
 * 純資料與純函式：哪些模型「接上了」由伺服器的金鑰決定（providers.ts），這裡不讀環境變數，
 * 所以驗收腳本可以直接呼叫。
 *
 * 價格：每百萬 token 的美元（2026-11 牌價，短上下文）。fallback 改由別的模型回答時仍以請求的模型估算，是上限的估法。
 */

export type ProviderId = "anthropic" | "openai"

export type ModelInfo = {
  id: string
  provider: ProviderId
  label: string
  /** 選單上的一句話 */
  note: string
  price: { input: number; output: number; cacheRead: number; cacheWrite: number }
}

export const PROVIDER_LABEL: Record<ProviderId, string> = { anthropic: "Claude", openai: "OpenAI" }

export const AI_MODELS: ModelInfo[] = [
  { id: "claude-opus-5-5", provider: "anthropic", label: "Claude Opus 5.5", note: "最仔細", price: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 } },
  { id: "claude-sonnet-5-5", provider: "anthropic", label: "Claude Sonnet 5.5", note: "快、便宜一半", price: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 } },
  { id: "gpt-6.2-astra", provider: "openai", label: "GPT-6.2 Astra", note: "OpenAI 旗艦、最貴", price: { input: 8, output: 40, cacheRead: 0.4, cacheWrite: 10 } },
  { id: "gpt-6.2-sol", provider: "openai", label: "GPT-6.2 Sol", note: "OpenAI 均衡", price: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 } },
]

/** 每家預設用哪一個（只接上一家時，新對話用這個）。 */
export const PROVIDER_DEFAULT_MODEL: Record<ProviderId, string> = { anthropic: "claude-opus-5-5", openai: "gpt-6.2-sol" }

export function modelInfo(id: string | null | undefined): ModelInfo | null {
  return AI_MODELS.find((m) => m.id === id) ?? null
}

/** 舊對話沒記錄、或是名單外的模型（例如環境變數指定的新版）：依名稱猜供應者。 */
export function providerOfModel(id: string): ProviderId | null {
  const known = modelInfo(id)
  if (known) return known.provider
  if (/^claude-/i.test(id)) return "anthropic"
  if (/^(gpt-|o\d)/i.test(id)) return "openai"
  return null
}

export function modelLabel(id: string): string {
  return modelInfo(id)?.label ?? id
}

export function costMicroUsd(model: string, u: { input: number; output: number; cacheRead: number; cacheWrite: number }): number {
  const known = modelInfo(model)
  // 名單外的模型：用同一家最貴的估，寧可高估，月上限才守得住
  const p = known?.price ?? (providerOfModel(model) === "openai" ? modelInfo("gpt-6.2-astra")!.price : modelInfo("claude-opus-5-5")!.price)
  // 每百萬 token 的美元 × token 數 ＝ 百萬分之一美元（micro USD）
  return Math.round(u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite)
}

/**
 * 決定一個對話這一輪用誰跑：
 *   - 一家都沒接上 → mock（示範模式，本機開發不花錢）
 *   - 這個模型的那一家接上了 → 那一家
 *   - 沒接上 → null（請使用者換模型，不偷偷改用別家）
 */
export function resolveRunProvider(model: string, configured: ProviderId[], forceMock = false): ProviderId | "mock" | null {
  if (forceMock || !configured.length) return "mock"
  const provider = providerOfModel(model)
  return provider && configured.includes(provider) ? provider : null
}

export function availableModels(configured: ProviderId[]): ModelInfo[] {
  return AI_MODELS.filter((m) => configured.includes(m.provider))
}

/** 新對話的預設模型：指定的（若那一家接上了）→ Claude → OpenAI。一家都沒有時沿用 Claude 的名字（mock 跑）。 */
export function defaultModelFor(configured: ProviderId[], preferred?: string | null): string {
  if (preferred) {
    const p = providerOfModel(preferred)
    if (p && configured.includes(p)) return preferred
  }
  for (const p of ["anthropic", "openai"] as ProviderId[]) if (configured.includes(p)) return PROVIDER_DEFAULT_MODEL[p]
  return preferred || PROVIDER_DEFAULT_MODEL.anthropic
}
