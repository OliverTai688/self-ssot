/**
 * 引用驗證（RES-037 §4.4）。
 *
 * 模型在答案裡寫 ⟦cite⟧。這裡只承認「這個對話裡工具真的回傳過、或使用者自己釘選的」cite；
 * 對不上的一律拿掉，原處留一個「未驗證」記號 —— 寧可少一個依據，也不要一個指向空白的膠囊。
 */

export type Citation =
  | { kind: "line"; cite: string; day: string; author: string; blockId: string; label: string }
  | { kind: "object"; cite: string; ty: string; rid: string; label: string }

export type CiteInfo = { label: string }

const CITE_RE = /⟦([^⟦⟧\n]{1,200})⟧/g
export const UNVERIFIED_MARK = "⟦?⟧"

export function parseCite(cite: string, info: CiteInfo): Citation | null {
  const line = cite.match(/^line:(\d{4}-\d{2}-\d{2}):([^:]+):(.+)$/)
  if (line) return { kind: "line", cite, day: line[1], author: line[2], blockId: line[3], label: info.label }
  const obj = cite.match(/^([a-z_]+):(.+)$/)
  if (obj) return { kind: "object", cite, ty: obj[1], rid: obj[2], label: info.label }
  return null
}

/**
 * 把答案裡的 ⟦cite⟧ 對照允許的集合：
 *   - 認得的：留著標記（前端把它換成膠囊），收進 citations（依第一次出現的順序、不重複）；
 *   - 不認得的：換成 ⟦?⟧，記進 dropped。
 */
export function verifyCitations(
  text: string,
  allowed: Map<string, CiteInfo>,
): { text: string; citations: Citation[]; dropped: string[] } {
  const citations: Citation[] = []
  const seen = new Set<string>()
  const dropped: string[] = []
  const out = text.replace(CITE_RE, (_all, raw: string) => {
    const cite = raw.trim()
    const info = allowed.get(cite)
    const parsed = info ? parseCite(cite, info) : null
    if (!parsed) {
      dropped.push(cite)
      return UNVERIFIED_MARK
    }
    if (!seen.has(cite)) {
      seen.add(cite)
      citations.push(parsed)
    }
    return `⟦${cite}⟧`
  })
  return { text: out, citations, dropped }
}
