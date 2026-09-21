/**
 * Prisma schema 的結構檢查（PLN-073 OPS-T21）。
 *
 *   node scripts/check-prisma-structure.mjs prisma/schema.prisma
 *
 * `prisma validate` 需要下載平台對應的 schema-engine；在沒有對外網路的環境
 * （CI sandbox、離線開發機）跑不起來。這支腳本用純文字解析補上最容易出錯的幾項：
 * 未知型別、缺少反向關聯、@relation 名稱沒有成對、fields/@@index 引用不存在的欄位。
 * 它**不取代** prisma validate —— 有網路時仍應該跑一次。
 */
import fs from 'node:fs'
const src = fs.readFileSync(process.argv[2], 'utf8')
const blocks = [...src.matchAll(/^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)]
const models = new Map(), enums = new Set()
for (const [, kind, name, body] of blocks) {
  if (kind === 'enum') enums.add(name); else models.set(name, body)
}
const errs = []
const SCALARS = new Set(['String','Int','Float','Boolean','DateTime','Json','Bytes','Decimal','BigInt'])
const relNames = new Map()
for (const [name, body] of models) {
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/)
    if (!m) continue
    const [, field, type, list, opt, rest] = m
    if (field.startsWith('@@') || field === '//') continue
    if (SCALARS.has(type) || enums.has(type)) continue
    if (!models.has(type)) { errs.push(`${name}.${field}: 未知型別 ${type}`); continue }
    // 反向關聯必須存在
    const other = models.get(type)
    const back = [...other.matchAll(/^\s*(\w+)\s+(\w+)(\[\])?(\?)?\s/gm)].some(([, , t]) => t === name)
    if (!back) errs.push(`${name}.${field} -> ${type}：${type} 缺少指回 ${name} 的反向關聯`)
    const rn = rest.match(/@relation\(\s*"([^"]+)"/)
    if (rn) {
      const key = rn[1]
      const arr = relNames.get(key) || []
      arr.push(`${name}.${field}`)
      relNames.set(key, arr)
    }
    // 有 fields: 的那一側必須有對應的純量欄位
    const f = rest.match(/fields:\s*\[([^\]]+)\]/)
    if (f) {
      for (const col of f[1].split(',').map(s => s.trim())) {
        if (!new RegExp(`^\\s*${col}\\s+`, 'm').test(body)) errs.push(`${name}.${field}: fields 引用不存在的欄位 ${col}`)
      }
    }
  }
}
for (const [key, sides] of relNames) if (sides.length !== 2) errs.push(`@relation("${key}") 出現 ${sides.length} 次（應為 2）：${sides.join(', ')}`)
// unique/index 引用的欄位要存在
for (const [name, body] of models) {
  for (const m of body.matchAll(/@@(unique|index)\(\s*\[([^\]]+)\]/g)) {
    for (const col of m[2].split(',').map(s => s.trim())) {
      if (!new RegExp(`^\\s*${col}\\s+`, 'm').test(body)) errs.push(`${name} @@${m[1]} 引用不存在的欄位 ${col}`)
    }
  }
}
console.log(`models=${models.size} enums=${enums.size} relations=${relNames.size}`)
if (errs.length) { errs.forEach(e => console.log('  ✗', e)); process.exit(1) }
console.log('PASS prisma structural lint')
