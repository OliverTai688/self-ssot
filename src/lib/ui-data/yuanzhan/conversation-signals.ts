/**
 * 潛在訊號的規則判讀 —— 純契約模組（無 DOM、無 Prisma、無 `server-only`）。
 *
 * RES-036 §6：潛在訊號是「可能是一件事」的提案，人按下採納之前不產生任何義務。
 * 這裡只做用規則就看得出來的三種，全部在本機執行、不送出任何內容：
 *
 *   question     外部的人問了問題，之後沒有我方發言
 *   commitment   我方說了「某個時間前做某件事」
 *   deliverable  外部的人傳來檔案
 *
 * 「條件變更」沒有放進來：「那就改成分兩期」與「改天再聊」只差在語意，
 * 規則分不出來，硬抓只會把訊號頁變吵。它留給人確認後才送出的 AI 分析（S3b）。
 */
import { payloadFingerprint, type ConvMessage, type ConvSide } from './conversation-deid'

export type CandidateKind = 'question' | 'commitment' | 'deliverable'

export interface CandidateDraft {
  /** 同一則訊息、同一種判讀一定得到同一個鍵；重複分析同一段對話靠它去重 */
  key: string
  kind: CandidateKind
  msgId: string
  at: string
  speaker: string
  side: ConvSide
  quote: string
  /** 為什麼被列出來，一句話 */
  hint: string
  /** 建議期限 `YYYY-MM-DD`；沒有就空字串 */
  due: string
  conf: 'high' | 'mid'
}

export interface DetectOptions {
  /** 發話者屬於哪一邊。沒列到的一律當外部（寧可多問一句，不要漏掉客戶的提問） */
  sides?: Record<string, ConvSide>
  /** `YYYY-MM-DD HH:mm`，用來算「已經多久沒回」。不給就不算時間 */
  now?: string
  group?: string
}

export const CANDIDATE_KIND_LABELS: Record<CandidateKind, string> = {
  question: '對方提問未回',
  commitment: '承諾與期限',
  deliverable: '交付物到了',
}

/** 問號不一定在句尾：「可以分兩期嗎？第一期先匯…」問完還會接著說。 */
const QUESTION_RE = /[?？]|嗎[\s，。！~～]*$|請問|是否|能不能|可不可以|什麼時候|甚麼時候|何時|多少錢|多久/
const WEEKDAYS = '日一二三四五六'
const DEADLINE_RE =
  /(今天|明天|後天|下(?:週|周|星期|禮拜)[一二三四五六日天]|(?:這|本)?(?:週|周|星期|禮拜)[一二三四五六日天]|月底|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}[日號]?)(?:以前|之前|前|內)?/
const VERB_RE = /給|寄|傳|交|提供|回覆|回您|回你|完成|送|更新|處理|安排|弄好|做好|整理|補上|確認/

const pad = (n: number) => String(n).padStart(2, '0')
const toYmd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const fromYmd = (s: string) => new Date(s + 'T00:00:00Z')
const plusDays = (s: string, n: number) => toYmd(new Date(fromYmd(s).getTime() + n * 864e5))
const weekdayOf = (ch: string) => (ch === '天' ? 0 : WEEKDAYS.indexOf(ch))

/**
 * 把「週五」「明天」「10/16」換成日期。基準是那則訊息的日期 —— 人說「週五」指的是
 * 說話當時的下一個週五，不是現在的。看不懂就回空字串，不猜。
 */
export function resolveDeadline(phrase: string, base: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return ''
  if (phrase.startsWith('今天')) return base
  if (phrase.startsWith('明天')) return plusDays(base, 1)
  if (phrase.startsWith('後天')) return plusDays(base, 2)
  if (phrase.startsWith('月底')) {
    const d = fromYmd(base)
    return toYmd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
  }
  const wk = /^(下)?(?:這|本)?(?:週|周|星期|禮拜)([一二三四五六日天])/.exec(phrase)
  if (wk) {
    const target = weekdayOf(wk[2])
    const today = fromYmd(base).getUTCDay()
    if (wk[1]) {
      // 「下週五」：下一個週一起算的那一週。週日算一週的最後一天。
      const toNextMonday = ((8 - today) % 7) || 7
      return plusDays(base, toNextMonday + ((target + 6) % 7))
    }
    return plusDays(base, (target - today + 7) % 7)
  }
  const md = /^(\d{1,2})(?:\/|月)(\d{1,2})/.exec(phrase)
  if (md) {
    const m = +md[1], d = +md[2]
    if (m < 1 || m > 12 || d < 1 || d > 31) return ''
    const y = +base.slice(0, 4)
    const guess = `${y}-${pad(m)}-${pad(d)}`
    // 十二月說「1/5」指的是明年。
    return guess < plusDays(base, -180) ? `${y + 1}-${pad(m)}-${pad(d)}` : guess
  }
  return ''
}

const hoursBetween = (from: string, to: string) =>
  Math.floor((new Date(to.replace(' ', 'T') + ':00Z').getTime() - new Date(from.replace(' ', 'T') + ':00Z').getTime()) / 36e5)

export function detectCandidates(messages: ConvMessage[], options: DetectOptions = {}): CandidateDraft[] {
  const sides = options.sides ?? {}
  const sideOf = (name: string): ConvSide => sides[name] ?? 'client'
  const group = options.group ?? ''
  const spoken = messages.filter(m => m.type !== 'system' && m.type !== 'sticker' && m.speaker)
  // 沒有任何一位被標成我方時，「之後沒有我方發言」對每一則都成立，結果全是雜訊。
  const hasUs = spoken.some(m => sideOf(m.speaker) === 'us')
  let lastUs = -1
  spoken.forEach((m, i) => { if (sideOf(m.speaker) === 'us') lastUs = i })

  const out: CandidateDraft[] = []
  const add = (kind: CandidateKind, m: ConvMessage, quote: string, hint: string, due: string, conf: 'high' | 'mid') =>
    out.push({
      key: `${kind}-${payloadFingerprint([group, m.at, m.speaker, m.text, kind].join('|'))}`,
      kind, msgId: m.id, at: m.at, speaker: m.speaker, side: sideOf(m.speaker), quote, hint, due, conf,
    })

  spoken.forEach((m, i) => {
    const side = sideOf(m.speaker)
    const text = m.text.trim()
    if (side !== 'us') {
      if (m.type === 'file') return add('deliverable', m, text, '對方傳來檔案', '', 'high')
      if (m.type !== 'text' || !hasUs || i < lastUs || !QUESTION_RE.test(text)) return
      const hours = options.now && m.at ? hoursBetween(m.at, options.now) : -1
      const waited = hours < 0 ? '之後沒有我方發言' : hours < 1 ? '還沒有我方發言' : hours < 48 ? `已 ${hours} 小時沒有我方發言` : `已 ${Math.floor(hours / 24)} 天沒有我方發言`
      return add('question', m, text, waited, '', /[?？]/.test(text) ? 'high' : 'mid')
    }
    if (m.type !== 'text' || /[?？]\s*$/.test(text)) return
    const hit = DEADLINE_RE.exec(text)
    if (!hit || !VERB_RE.test(text)) return
    const due = resolveDeadline(hit[1], m.at.slice(0, 10))
    const overdue = due && options.now && due < options.now.slice(0, 10)
    add('commitment', m, text, due ? `說了「${hit[0]}」→ ${due.slice(5).replace('-', '/')}${overdue ? '，已經過了' : ''}` : `說了「${hit[0]}」`, due, due ? 'high' : 'mid')
  })
  return out
}
