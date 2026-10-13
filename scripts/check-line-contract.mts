/**
 * LINE webhook 與綁定代碼的純契約檢查（AUT-010 §2、§3 · LINESIG-S1）。
 *
 *   pnpm exec tsx scripts/check-line-contract.mts
 *
 * 不連資料庫、不連 LINE。簽章用固定向量：期望值是另外用 openssl 算出來的，
 * 不是用被測的那支函式自己算自己。
 */
import { createHmac } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  generateBindCode,
  hashBindCode,
  normalizeBindCode,
  parseWebhookBody,
  sanitizeLineEvent,
  verifyLineSignature,
} from '../src/lib/line/line-webhook-contract'

const results: [string, string, string][] = []
const ok = (name: string, cond: unknown, extra?: string) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : extra ?? ''])

const SECRET = 'test-channel-secret-0123456789abcdef'
const BODY = '{"destination":"Uxxxx","events":[{"type":"message","message":{"type":"text","id":"1","text":"你好\\n第二行"},"webhookEventId":"01HX","deliveryContext":{"isRedelivery":false},"timestamp":1760000000000,"source":{"type":"user","userId":"U1234"},"replyToken":"rt","mode":"active"}]}'

/* ── 1. 簽章 ─────────────────────────────────────────────── */
const viaOpenssl = execFileSync('sh', ['-c', `printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | openssl base64`], { env: { ...process.env, BODY, SECRET } }).toString().trim()
ok('與 openssl 算出來的簽章一致（LINE 文件的驗證方式）', verifyLineSignature(BODY, viaOpenssl, SECRET), viaOpenssl)
ok('body 多一個空白就不過', !verifyLineSignature(BODY + ' ', viaOpenssl, SECRET))
ok('parse 再序列化的 body 不過（必須用原始字串）', !verifyLineSignature(JSON.stringify(JSON.parse(BODY), null, 1), viaOpenssl, SECRET))
ok('別的 channel secret 不過', !verifyLineSignature(BODY, viaOpenssl, SECRET + 'x'))
ok('沒有簽章不過', !verifyLineSignature(BODY, null, SECRET) && !verifyLineSignature(BODY, '', SECRET))
ok('沒有密鑰不過（未設定的環境不會暫時放行）', !verifyLineSignature(BODY, viaOpenssl, '') && !verifyLineSignature(BODY, viaOpenssl, undefined))
ok('長度不對或不是 base64 的簽章不過、不丟例外', !verifyLineSignature(BODY, 'abc', SECRET) && !verifyLineSignature(BODY, '***', SECRET))
ok('十六進位的簽章不過（LINE 用 Base64）', !verifyLineSignature(BODY, createHmac('sha256', SECRET).update(BODY).digest('hex'), SECRET))

/* ── 2. 綁定代碼 ─────────────────────────────────────────── */
const codes = Array.from({ length: 200 }, generateBindCode)
ok('代碼形狀 YZ-XXXX-XXXX', codes.every((c) => /^YZ-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c)), codes[0])
ok('不含容易看錯的 0／O／1／I', codes.every((c) => !/[0O1I]/.test(c.slice(3))))
ok('200 組沒有重複', new Set(codes).size === 200)
const c = codes[0]
const n = normalizeBindCode(c)
ok('正規化：原樣', n === 'YZ' + c.slice(3).replace('-', ''))
ok('正規化：小寫、空白、少打連字號、全形', [c.toLowerCase(), ` ${c} `, c.replace(/-/g, ''), c.replace(/-/g, ' '), c.replace(/[A-Z0-9]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0xfee0))].every((v) => normalizeBindCode(v) === n))
ok('不是代碼的訊息回 null（一般聊天不算一次失敗的嘗試）', ['你好', 'YZ', 'YZ-1234', 'AB-' + c.slice(3), c + 'A', '', null, undefined, 'YZ-OOOO-0000'].every((v) => normalizeBindCode(v as string) === null))
ok('雜湊：同一組代碼同一個值，不同密鑰不同值', hashBindCode(n!, SECRET) === hashBindCode(n!, SECRET) && hashBindCode(n!, SECRET) !== hashBindCode(n!, SECRET + 'x'))
ok('雜湊裡看不到代碼', !hashBindCode(n!, SECRET).toUpperCase().includes(n!.slice(2)))

/* ── 3. 事件落地前去內容 ─────────────────────────────────── */
const ev = (over: Record<string, unknown>) => ({ type: 'message', webhookEventId: 'E1', timestamp: 1760000000000, deliveryContext: { isRedelivery: false }, source: { type: 'user', userId: 'U1' }, replyToken: 'rt', message: { type: 'text', id: 'm1', text: '哈囉' }, ...over })
const plain = sanitizeLineEvent(ev({}), SECRET)!
ok('一般文字：內文不落地', !JSON.stringify(plain).includes('哈囉') && plain.payload.message?.codeHash === undefined)
const coded = sanitizeLineEvent(ev({ message: { type: 'text', id: 'm2', text: c.toLowerCase() } }), SECRET)!
ok('代碼：換成雜湊，原值不落地', coded.payload.message?.codeHash === hashBindCode(n!, SECRET) && !JSON.stringify(coded).toUpperCase().includes(c.slice(3)))
const inGroup = sanitizeLineEvent(ev({ source: { type: 'group', groupId: 'C1', userId: 'U1' }, message: { type: 'text', id: 'm3', text: c } }), SECRET)!
ok('群組裡的代碼：不產生雜湊（等於沒看到）', inGroup.payload.message?.codeHash === undefined && inGroup.sourceType === 'group' && inGroup.groupId === 'C1' && !JSON.stringify(inGroup).includes(c))
ok('保留處理需要的欄位', plain.webhookEventId === 'E1' && plain.lineUserId === 'U1' && plain.payload.replyToken === 'rt' && plain.occurredAt.getTime() === 1760000000000 && plain.isRedelivery === false)
ok('重送旗標', sanitizeLineEvent(ev({ deliveryContext: { isRedelivery: true } }), SECRET)!.isRedelivery === true)
ok('沒有 webhookEventId 或 type 的事件丟掉', sanitizeLineEvent(ev({ webhookEventId: undefined }), SECRET) === null && sanitizeLineEvent(ev({ type: 5 }), SECRET) === null && sanitizeLineEvent('x', SECRET) === null)
ok('圖片訊息：只留 id 與類型', JSON.stringify(sanitizeLineEvent(ev({ message: { type: 'image', id: 'm9', contentProvider: { type: 'line' } } }), SECRET)!.payload.message) === '{"id":"m9","type":"image"}')

/* ── 4. 信封 ─────────────────────────────────────────────── */
ok('信封：正常', parseWebhookBody(BODY)?.events.length === 1)
ok('信封：LINE 後台 Verify 送的空事件', parseWebhookBody('{"destination":"U","events":[]}')?.events.length === 0)
ok('信封：不是 JSON、沒有 events、events 不是陣列', parseWebhookBody('nope') === null && parseWebhookBody('{}') === null && parseWebhookBody('{"events":{}}') === null && parseWebhookBody('null') === null)

let fail = 0
for (const [s, name, e] of results) { if (s === 'FAIL') fail++; console.log(`${s}  ${name}${e ? `\n      → ${e}` : ''}`) }
console.log(`\n${results.length - fail}/${results.length} PASS`)
process.exit(fail ? 1 : 0)
