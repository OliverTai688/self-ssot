/**
 * ARC-042 §10 的契約測試。純函式層，不需要 DB、不需要瀏覽器。
 *
 * 這些斷言守的是「只送改動的列」這條線：diff 一旦開始產生假變更或漏掉刪除，
 * 寫入管線就會靜默地把錯的東西送上伺服器，而那是最難從畫面上看出來的一種壞掉。
 */
import {
  HIGH_RISK_COLLECTIONS,
  MAX_CHANGES_PER_COMMAND,
  WRITE_ENABLED_COLLECTIONS,
  diffCollections,
  identifyRow,
  snapshotCollections,
  stableStringify,
  type PersistedCollection,
} from '../src/lib/ui-data/yuanzhan/operating-commands'

let checks = 0
let failed = 0

function check(name: string, condition: boolean, detail = '') {
  checks += 1
  if (!condition) {
    failed += 1
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  check(name, stableStringify(actual) === stableStringify(expected), `got ${stableStringify(actual)}`)
}

/* -- stableStringify ------------------------------------------------ */

eq(
  'stableStringify is key-order independent',
  stableStringify({ b: 1, a: 2 }),
  stableStringify({ a: 2, b: 1 }),
)
check(
  'stableStringify keeps array order significant',
  stableStringify([1, 2]) !== stableStringify([2, 1]),
)
eq('stableStringify drops undefined members', stableStringify({ a: 1, b: undefined }), '{"a":1}')

/* -- identifyRow ---------------------------------------------------- */

eq('identifyRow uses id', identifyRow('occasions', { id: 'OCC-1' }), 'OCC-1')
eq(
  'identifyRow uses the occurrence key for sessions',
  identifyRow('sessions', { rhythmId: 'R1', occurrenceDate: '2026-09-22' }),
  'R1|2026-09-22',
)
eq('identifyRow rejects a row with no id', identifyRow('occasions', { title: 'x' }), null)

/* -- diff ------------------------------------------------------------ */

const base = { occasions: [{ id: 'OCC-1', title: '月會', onDate: '2026-09-18' }] }
const before = snapshotCollections(base)

eq('an untouched store produces no changes', diffCollections(before, snapshotCollections(base)), [])

const created = { occasions: [...base.occasions, { id: 'OCC-2', title: '學習日', onDate: '2026-09-22' }] }
eq('create is detected', diffCollections(before, snapshotCollections(created)), [
  { collection: 'occasions', id: 'OCC-2', op: 'create', after: { id: 'OCC-2', title: '學習日', onDate: '2026-09-22' } },
])

const updated = { occasions: [{ id: 'OCC-1', title: '月營運會議', onDate: '2026-09-18' }] }
eq('update is detected', diffCollections(before, snapshotCollections(updated)), [
  { collection: 'occasions', id: 'OCC-1', op: 'update', after: { id: 'OCC-1', title: '月營運會議', onDate: '2026-09-18' } },
])

eq('delete is detected', diffCollections(before, snapshotCollections({ occasions: [] })), [
  { collection: 'occasions', id: 'OCC-1', op: 'delete' },
])

const reordered = { occasions: [{ onDate: '2026-09-18', title: '月會', id: 'OCC-1' }] }
eq('reordering object keys is not a change', diffCollections(before, snapshotCollections(reordered)), [])

/* -- 只比對已知集合 --------------------------------------------------- */

const withNoise = {
  occasions: base.occasions,
  changelog: [{ id: 'C1', op: 'create' }],
  journal: { '2026-09-22': { title: 'x' } },
  weekly: [['W38', 4]],
}
eq(
  'undeclared collections never reach the diff',
  diffCollections(snapshotCollections(withNoise), snapshotCollections({ ...withNoise, changelog: [] })),
  [],
)

/* -- 閘門 ------------------------------------------------------------ */

for (const collection of HIGH_RISK_COLLECTIONS) {
  check(
    `high-risk collection is not write-enabled: ${collection}`,
    !WRITE_ENABLED_COLLECTIONS.includes(collection),
  )
}

const M1_EXPECTED: PersistedCollection[] = ['rhythms', 'sessions', 'occasions']
eq('M1 opens exactly the project-independent tracks', [...WRITE_ENABLED_COLLECTIONS].sort(), [...M1_EXPECTED].sort())

// 專案軌要等 SCH-008 §3 的模型決定；在那之前開放它們會寫出指向不存在專案的列。
for (const collection of ['phases', 'milestones', 'objectives'] as PersistedCollection[]) {
  check(`project-bound track stays closed until M2: ${collection}`, !WRITE_ENABLED_COLLECTIONS.includes(collection))
}

check('the per-command change cap is a real bound', MAX_CHANGES_PER_COMMAND > 0 && MAX_CHANGES_PER_COMMAND <= 1000)

/* -- 結果 ------------------------------------------------------------ */

if (failed > 0) {
  console.error(`\noperating-commands contract: ${failed} of ${checks} checks FAILED`)
  process.exit(1)
}
console.log(`operating-commands contract: ${checks} checks PASS`)
