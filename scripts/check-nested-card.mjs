/**
 * 脫離 nested card 的機檢（規格：PLN-075 §S1.5 E、ARC-043 §5、AGENTS.md §12.1）。
 *
 *   node scripts/check-nested-card.mjs            # 一般模式（對基線 ratchet）
 *   node scripts/check-nested-card.mjs --baseline # 印出現況，用來更新基線
 *   node scripts/check-nested-card.mjs --strict    # 忽略基線，印出全部現況違規
 *
 * 五條規則：
 *   R1 巢狀卡（CSS）        同類 surface 容器互相包覆的後代選擇器
 *   R2 巢狀卡（markup）     樣板字串裡 surface 容器層級 > 1
 *   R3 primary surface 是卡  data-pm-surface="primary" 的元素帶 surface 容器類別
 *   R4 寫死色值             非 var(--t, #fallback) 的 hex、固定 Tailwind 色票
 *   R5/R6 圖示              emoji 當圖示、字面 <svg>（v5 內一律 svg(name, size)）
 *
 * **基線的意義**：R4/R6 在既有檔案裡有存量技術債（generator 產出的 styles.ts／
 * runtime.js 來自凍結原型，本輪不修）。所以這支 checker 分兩種待遇：
 *   - STRICT_FILES（本契約新建的 primitive）：違規數必須為 0；
 *   - BASELINE（既有檔）：違規數不得「超過」記錄下來的基線 —— 只能往下走。
 * 名單外的檔案一出現違規就是失敗，所以新檔天生零容忍。
 */
import fs from 'node:fs'
import path from 'node:path'

const V5 = 'src/components/yuanzhan/v5'

/** 本契約新建、必須零違規的檔案。 */
const STRICT_FILES = [
  `${V5}/pm-primitives.source.js`,
  `${V5}/pm-primitives.css`,
  // PLN-075 S3：專案模組的外殼與五個資源版面
  `${V5}/pm-shell.source.js`,
  `${V5}/pm-shell.css`,
  `${V5}/pm-overview.source.js`,
  `${V5}/pm-plan.source.js`,
  `${V5}/pm-drive.source.js`,
  `${V5}/pm-meeting.source.js`,
  `${V5}/pm-chat.source.js`,
]

/**
 * 既有檔案的違規基線（2026-10-03 實測）。格式：檔案 -> { 規則: 允許的最大數 }。
 * 這些是 claude/company-theme-implementation.md 記錄的存量技術債，本輪不修；
 * 數字只能往下調，不得往上。styles.ts / runtime.js 是 generator 產物，
 * 源頭在凍結原型 originals/*.html，要修得走 css-token-patches / source-patches。
 */
const BASELINE = {
  // --- generator 產物（源頭在 originals/*.html 凍結原型，只能走 patch 檔修） ---
  [`${V5}/styles.ts`]: { 'R1-nested-css': 15, 'R4-hex': 65 },
  [`${V5}/runtime.js`]: { 'R4-hex': 13, 'R6-literal-svg': 20 },
  // --- 團隊自有檔的存量技術債 ---
  [`${V5}/additions.css`]: { 'R1-nested-css': 3 },
  [`${V5}/cashflow-faces.css`]: { 'R1-nested-css': 1 },
  [`${V5}/journal-cockpit.css`]: { 'R1-nested-css': 3, 'R4-hex': 2 },
  [`${V5}/operating-canvas.css`]: { 'R4-hex': 1 },
  [`${V5}/replies.css`]: { 'R4-hex': 6 },
  [`${V5}/extensions.source.js`]: { 'R4-hex': 8 },
  [`${V5}/journal-cockpit.source.js`]: { 'R2-nested-markup': 2 },
  [`${V5}/journal-review.source.js`]: { 'R2-nested-markup': 1 },
  [`${V5}/replies.source.js`]: { 'R2-nested-markup': 1 },
  [`${V5}/notifications.source.js`]: { 'R6-literal-svg': 1 },
  [`${V5}/template-objects.source.js`]: { 'R6-literal-svg': 1 },
}

/* ---------------------------------------------------------------- 工具 */

/** 去掉 // 與 /* *​/ 註解，避免把註解裡的示意字元當成違規。字串內的 // 也會被誤砍，
 *  但 R4–R6 都不在意那種情況（色值與 <svg 不會只出現在被誤砍的那一段）。 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:\\])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(Math.max(0, m.length - p.length)))
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length

/** 把 ${...} 換成等長的佔位識別字，讓標籤堆疊掃得動樣板字串。 */
function maskInterpolations(text) {
  let out = ''
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '$' && text[i + 1] === '{') {
      let depth = 0
      let j = i + 1
      for (; j < text.length; j += 1) {
        if (text[j] === '{') depth += 1
        else if (text[j] === '}') { depth -= 1; if (!depth) break }
      }
      out += 'X'.repeat(j - i + 1)
      i = j
      continue
    }
    out += text[i]
  }
  return out
}

/* ------------------------------------------------- surface 容器類別的判定 */

const RADIUS = /border-radius\s*:\s*([^;}]+)/
const BORDER_ALL = /(?:^|[;{\s])border\s*:\s*([^;}]+)/
const SHADOW = /box-shadow\s*:\s*([^;}]+)/
const OUTLINE = /(?:^|[;{\s])outline\s*:\s*([^;}]+)/

/** 半徑 >= 24px 或 999/9999 視為 pill（chip），不是卡。 */
function isPill(value) {
  if (/999|9999|50%/.test(value)) return true
  const px = value.match(/(\d+(?:\.\d+)?)px/)
  return !!px && Number(px[1]) >= 24
}

const nonEmpty = (v) => !!v && !/^\s*(0|none|unset|initial|transparent)\s*(?:$|\s)/.test(v)

/**
 * 「surface 容器」＝ 區塊容器同時具備 border-radius（非 pill）與
 * 四邊 border／box-shadow／outline 其一。
 * 排除：position:fixed|absolute 的覆蓋層（抽屜／彈窗／toast 是圖層，不是頁面卡，
 * ARC-012 §7 明文允許 drilldown drawer），以及 display:inline* 的行內元素。
 */
function isSurfaceBlock(body) {
  const r = body.match(RADIUS)
  if (!r || isPill(r[1])) return false
  const framed =
    nonEmpty((body.match(BORDER_ALL) || [])[1]) ||
    nonEmpty((body.match(SHADOW) || [])[1]) ||
    nonEmpty((body.match(OUTLINE) || [])[1])
  if (!framed) return false
  if (/position\s*:\s*(fixed|absolute)/.test(body)) return false
  if (/display\s*:\s*inline/.test(body)) return false
  return true
}

/** 去掉 CSS 註解但保留行號（註解裡的 .class 不是選擇器）。 */
function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
}

/** 粗略拆 CSS 規則：{ selector, body, index }。足夠應付本專案手寫的扁平 CSS。 */
function cssRules(input) {
  const css = stripCssComments(input)
  const rules = []
  const re = /([^{}@]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(css))) {
    const sel = m[1].replace(/\s+/g, ' ').trim()
    if (!sel || sel.startsWith('%') || /^(from|to|\d+%)$/.test(sel)) continue
    rules.push({ selector: sel, body: m[2], index: m.index })
  }
  return rules
}

/** 選擇器最後一段裡的 class 名。 */
function tailClasses(selector) {
  const last = selector.split(/[>+~ ]+/).filter(Boolean).pop() || ''
  return [...last.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((x) => x[1])
}

/* ------------------------------------------------------------- 規則實作 */

const violations = []
const add = (file, rule, line, message) => violations.push({ file, rule, line, message })

const HEX = /#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z_-])/g
const VAR_FALLBACK = /var\(\s*--[\w-]+\s*,\s*([^()]*?)\)/g
const TAILWIND =
  /\b(?:bg|text|border|ring|from|via|to|divide|outline|fill|stroke|accent|caret|placeholder|shadow|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g
/* 只抓 emoji presentation 的圖畫字（U+1F300–U+1FAFF）與 variation selector。
   §12.1 明文把 ★ ✓ ⇧↵ → 這類單色字形算「內容」而非圖示，所以不在這條規則裡。 */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{FE0F}]/gu
const LITERAL_SVG = /<svg\b/g

function ruleColors(file, src) {
  const masked = src.replace(VAR_FALLBACK, (m, inner) => `var(--x,${'.'.repeat(inner.length)})`)
  for (const m of masked.matchAll(HEX)) {
    add(file, 'R4-hex', lineOf(masked, m.index), `寫死色值 ${m[0]}；請改 var(--token, ${m[0]})`)
  }
  for (const m of src.matchAll(TAILWIND)) {
    add(file, 'R4-tailwind', lineOf(src, m.index), `固定 Tailwind 色票 ${m[0]}`)
  }
}

function ruleIcons(file, src) {
  const code = stripComments(src)
  for (const m of code.matchAll(EMOJI)) {
    add(file, 'R5-emoji', lineOf(code, m.index), `emoji 當圖示 ${m[0]}；請用 svg(name, size)`)
  }
  for (const m of code.matchAll(LITERAL_SVG)) {
    const tag = code.slice(m.index, m.index + 220)
    if (/role="img"/.test(tag)) continue // 圖表是資料視覺化，不是圖示
    add(file, 'R6-literal-svg', lineOf(code, m.index), '字面 <svg>；v5 內一律 svg(name, size)')
  }
}

function ruleNestedCss(file, css, cardClasses) {
  for (const rule of cssRules(css)) {
    for (const sel of rule.selector.split(',')) {
      const parts = sel.trim().split(/[>+~ ]+/).filter(Boolean)
      if (parts.length < 2) continue
      const hit = parts
        .map((p) => [...p.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((x) => x[1]).find((c) => cardClasses.has(c)))
        .filter(Boolean)
      if (hit.length >= 2) {
        add(file, 'R1-nested-css', lineOf(css, rule.index), `選擇器讓卡包卡：${sel.trim()}（${hit.join(' ⊃ ')}）`)
      }
    }
  }
}

/** 掃樣板字串裡的 DOM 標籤堆疊，算 surface 容器層級。 */
function ruleNestedMarkup(file, src, cardClasses) {
  const code = stripComments(src)
  const re = /<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  const masked = maskInterpolations(code)
  const stack = []
  let depth = 0
  let m
  const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'path', 'circle', 'rect', 'use', 'source'])
  while ((m = re.exec(masked))) {
    const [raw, tag, attrs, selfClose] = m
    const closing = raw[1] === '/'
    if (closing) {
      while (stack.length) {
        const top = stack.pop()
        if (top.card) depth -= 1
        if (top.tag === tag.toLowerCase()) break
      }
      continue
    }
    if (selfClose || VOID.has(tag.toLowerCase())) continue
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || ''
    const card = cls.split(/\s+/).some((c) => cardClasses.has(c))
    if (card) {
      depth += 1
      if (depth > 1) {
        add(file, 'R2-nested-markup', lineOf(masked, m.index), `卡層級 ${depth} > 1：class="${cls}"`)
      }
    }
    if (/data-pm-surface="primary"/.test(attrs) && card) {
      add(file, 'R3-primary-is-card', lineOf(masked, m.index), `primary operation surface 不得是卡片容器：class="${cls}"`)
    }
    stack.push({ tag: tag.toLowerCase(), card })
  }
}

/* ------------------------------------------------------------------ 主程序 */

const args = process.argv.slice(2)
const mode = args.includes('--baseline') ? 'baseline' : args.includes('--strict') ? 'strict' : 'ratchet'

const cssFiles = fs.readdirSync(V5).filter((f) => f.endsWith('.css')).map((f) => path.join(V5, f))
const jsFiles = fs.readdirSync(V5).filter((f) => f.endsWith('.source.js')).map((f) => path.join(V5, f))

/** styles.ts 是 generator 把 CSS 整包 JSON.stringify 出來的那一行。 */
function stylesCss() {
  const raw = fs.readFileSync(`${V5}/styles.ts`, 'utf8')
  const at = raw.indexOf('export const v5Styles = ')
  if (at < 0) return ''
  try {
    return JSON.parse(raw.slice(at + 'export const v5Styles = '.length).trim())
  } catch {
    return ''
  }
}

// surface 容器類別的集合，由全部 v5 CSS（含 generator 產出的 styles.ts）推導。
const allCss = [...cssFiles.map((f) => fs.readFileSync(f, 'utf8')), stylesCss()].join('\n')
const cardClasses = new Set()
for (const rule of cssRules(allCss)) {
  if (!isSurfaceBlock(rule.body)) continue
  for (const sel of rule.selector.split(',')) tailClasses(sel).forEach((c) => cardClasses.add(c))
}

for (const f of cssFiles) {
  const css = fs.readFileSync(f, 'utf8')
  ruleColors(f, css)
  ruleNestedCss(f, css, cardClasses)
}
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8')
  ruleColors(f, src)
  ruleIcons(f, src)
  ruleNestedMarkup(f, src, cardClasses)
}
// generator 產物也掃，但只對基線負責（源頭在凍結原型，本輪不修）。
{
  const f = `${V5}/styles.ts`
  const css = stylesCss()
  ruleColors(f, css)
  ruleNestedCss(f, css, cardClasses)
}
{
  const f = `${V5}/runtime.js`
  const src = fs.readFileSync(f, 'utf8')
  ruleColors(f, src)
  ruleIcons(f, src)
}

/* ------------------------------------------------------------------ 報告 */

const byFile = new Map()
for (const v of violations) {
  const key = v.file
  if (!byFile.has(key)) byFile.set(key, new Map())
  const rules = byFile.get(key)
  rules.set(v.rule, (rules.get(v.rule) || 0) + 1)
}

if (mode === 'baseline') {
  console.log('現況違規（可直接貼進 BASELINE）：\n')
  for (const [file, rules] of [...byFile].sort()) {
    console.log(`  ${JSON.stringify(file)}: ${JSON.stringify(Object.fromEntries([...rules].sort()))},`)
  }
  console.log(`\n合計 ${violations.length} 筆，涵蓋 ${byFile.size} 個檔案。`)
  process.exit(0)
}

let failures = 0
const report = []

for (const [file, rules] of [...byFile].sort()) {
  const strict = STRICT_FILES.includes(file)
  const base = BASELINE[file] || {}
  for (const [rule, count] of [...rules].sort()) {
    const allowed = strict || mode === 'strict' ? 0 : base[rule] || 0
    if (count > allowed) {
      failures += 1
      report.push({ file, rule, count, allowed })
    }
  }
}

if (report.length) {
  console.log('nested-card 檢查失敗：\n')
  for (const r of report) {
    console.log(`  ✗ ${r.file} · ${r.rule}：${r.count} 筆（上限 ${r.allowed}）`)
    violations
      .filter((v) => v.file === r.file && v.rule === r.rule)
      .slice(0, 6)
      .forEach((v) => console.log(`      L${v.line} ${v.message}`))
  }
}

const strictTotal = STRICT_FILES.reduce(
  (n, f) => n + [...(byFile.get(f) || new Map()).values()].reduce((a, b) => a + b, 0),
  0,
)

console.log(
  [
    '',
    `surface 容器類別：${cardClasses.size} 個（由 v5 CSS 推導）`,
    `新契約檔案（必須 0）：${STRICT_FILES.join(', ')} -> ${strictTotal} 筆`,
    `既有檔案基線總數：${Object.values(BASELINE).reduce((n, r) => n + Object.values(r).reduce((a, b) => a + b, 0), 0)} 筆（存量技術債，本輪不修）`,
    `本次掃出違規總數：${violations.length} 筆`,
    failures ? `\n${failures} failing` : '\nnested card: all checks passed',
  ].join('\n'),
)
process.exit(failures ? 1 : 0)
