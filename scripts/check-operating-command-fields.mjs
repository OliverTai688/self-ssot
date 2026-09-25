/**
 * operating-commands.service.ts ↔ prisma/schema.prisma 的欄位契約。
 *
 * 為什麼需要這支：`prisma generate` 需要下載 engine，而 binaries.prisma.sh 在這個
 * 環境被擋（403），所以 tsc 看到的 PrismaClient 型別永遠是舊的，拼錯的欄位名不會被抓到。
 * 這支用解析 schema 的方式補上那一段：服務層依賴的每一個 model 與欄位都必須真的存在。
 *
 * 它同時是一道防漂移的護欄 —— 之後有人改欄位名，這裡會先紅，而不是等執行期炸掉。
 */
import fs from 'node:fs'

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')

/** model 名 → { fields:Set, uniques:[string[]] } */
const models = new Map()
for (const [, name, body] of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const fields = new Set()
  const uniques = []
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('//') || line.startsWith('///')) continue
    const unique = line.match(/^@@unique\(\[([^\]]+)\]/)
    if (unique) {
      uniques.push(unique[1].split(',').map(part => part.trim()))
      continue
    }
    if (line.startsWith('@@')) continue
    const field = line.match(/^(\w+)\s+\S/)
    if (field) fields.add(field[1])
  }
  models.set(name, { fields, uniques })
}

/** 服務層實際寫入的欄位。改 handler 就要同步改這裡 —— 那是刻意的。 */
const DEPENDENCIES = {
  Workspace: ['id', 'type', 'name', 'slug', 'createdByProfileId'],
  Profile: ['id', 'email'],
  OrganizationSetting: ['orgKey', 'key', 'value', 'updatedById'],
  OperatingAuditEvent: [
    'actorType', 'actorRef', 'actorDisplay', 'requestRef', 'moduleKey', 'action',
    'targetType', 'targetRef', 'targetDisplay', 'result', 'riskLevel', 'approvalLevel',
    'humanApprovalRequired', 'sourceKind', 'metadata', 'redactionVersion', 'retentionClass',
  ],
  Occasion: [
    'id', 'workspaceId', 'title', 'category', 'onDate', 'endOn', 'place',
    'actorIds', 'star', 'prep', 'recap', 'derivedFrom', 'remind',
  ],
  Rhythm: [
    'id', 'workspaceId', 'title', 'kind', 'scope', 'ownerIds', 'rrule', 'dtstart',
    'until', 'timeOfDay', 'timezone', 'expectMedia', 'derivedFrom', 'remind', 'active',
  ],
  RhythmSession: ['id', 'rhythmId', 'occurrenceDate', 'state', 'movedTo', 'note', 'recordedById'],
  Project: ['id', 'ownerId', 'workspaceId', 'name', 'clientName', 'status', 'phase', 'startedAt'],
  OperatingProjectProfile: [
    'projectId', 'client', 'goalId', 'engagementType', 'operatingStatus',
    'bonusRatePct', 'bonusCapPct', 'budgetAmount', 'evidenceRepoTag', 'startedOn',
  ],
  ProjectTask: [
    'id', 'projectId', 'title', 'status', 'operatingStatus', 'priority', 'dueAt', 'completedAt',
    'sizeClass', 'blocker', 'expectation', 'evidenceCount', 'relations', 'customFields', 'subtasks',
  ],
  OperatingGoal: ['id', 'workspaceId', 'title', 'period', 'progressPct', 'warning'],
  OperatingDecision: ['id', 'workspaceId', 'authorId', 'title', 'body', 'decidedOn'],
  OperatingJournalEntry: ['workspaceId', 'authorId', 'onDate', 'title', 'blocks', 'visibility'],
  ProjectPhaseNode: ['id', 'projectId', 'phase', 'label', 'startDate', 'endDate'],
  ProjectMilestone: ['id', 'phaseNodeId', 'title', 'date', 'acceptance', 'derivedFrom', 'remind'],
  ProjectObjective: ['id', 'milestoneId', 'title'],
  OperatingDocument: ['id', 'workspaceId', 'direction', 'title', 'clauses'],
  OperatingCommitment: [
    'id', 'workspaceId', 'documentRef', 'clauseRef', 'direction', 'title',
    'ownerKey', 'status', 'cadence', 'logs',
  ],
  OperatingThread: ['id', 'workspaceId', 'projectId', 'title', 'closed', 'messages', 'closeNote', 'files'],
  OperatingEvidenceRepo: ['projectId', 'workspaceId', 'version', 'frozen', 'readme', 'versions', 'tree'],
  OperatingCapacityPlan: ['workspaceId', 'actorKey', 'allocations'],
  OperatingTimesheet: ['workspaceId', 'actorKey', 'weeks'],
  OperatingTransaction: [
    'id', 'workspaceId', 'onDate', 'title', 'projectRef', 'category',
    'amount', 'formula', 'passThrough', 'vouchers', 'attachments', 'note',
  ],
  OperatingReimbursement: ['id', 'workspaceId', 'actorKey', 'title', 'amount', 'status', 'onDate'],
  OperatingBankEntry: ['id', 'workspaceId', 'onDate', 'title', 'amount', 'matchedRef'],
  OperatingPayrollDraft: ['workspaceId', 'actorKey', 'baseAmount', 'overtime', 'milestone', 'separate'],
  OperatingIntakeItem: [
    'id', 'workspaceId', 'workbenchRef', 'actorKey', 'title', 'amount', 'onDate',
    'projectRef', 'status', 'file', 'reimbRef', 'postedRef', 'createdAt',
  ],
  OperatingPeriod: ['workspaceId', 'period', 'status', 'closedBy', 'closedAt', 'checklist', 'log'],
  OperatingComment: [
    'id', 'workspaceId', 'authorId', 'authorKey', 'workbenchRef',
    'targetType', 'targetRef', 'body', 'meta', 'deletedAt',
  ],
  OperatingRequest: [
    'id', 'workspaceId', 'workbenchRef', 'fromKey', 'toKey', 'onDate',
    'blockId', 'text', 'kind', 'sentAt', 'payload',
  ],
  OperatingLibraryFile: [
    'id', 'workspaceId', 'workbenchRef', 'name', 'category', 'tags',
    'space', 'authorKey', 'versions',
  ],
  OperatingCommandLog: [
    'id', 'workspaceId', 'clientRefHash', 'actorProfileId', 'actorKey',
    'op', 'entity', 'label', 'collections', 'changeCount', 'riskLevel',
  ],
  OperatingDocObject: [
    'id', 'workspaceId', 'workbenchRef', 'kind', 'subKind', 'title',
    'titleAuto', 'onDate', 'authorKey', 'payload', 'createdAt', 'updatedAt',
  ],
}

/**
 * 讀取路徑（operating-store.service）靠 workbench_ref 把資料庫的列還原成
 * 工作台的業務 id。少一個欄位，那張表的資料就讀不回來 —— 而畫面只會顯示「空的」，
 * 不會顯示「讀不到」。所以這裡逐表檢查。
 */
const REVERSE_LOOKUP_MODELS = [
  'Occasion', 'Rhythm', 'ProjectPhaseNode', 'ProjectMilestone', 'ProjectObjective',
  'ProjectTask', 'OperatingProjectProfile', 'OperatingGoal', 'OperatingDecision',
  'OperatingDocument', 'OperatingCommitment', 'OperatingThread', 'OperatingTransaction',
  'OperatingReimbursement', 'OperatingBankEntry', 'OperatingEvidenceRepo',
  'OperatingComment', 'OperatingRequest', 'OperatingLibraryFile', 'OperatingDocObject',
  'OperatingIntakeItem',
]

/** 服務層用到的複合唯一鍵；Prisma 的 where 鍵名由這些欄位組出來。 */
const COMPOSITE_KEYS = {
  OrganizationSetting: ['orgKey', 'key'],
  RhythmSession: ['rhythmId', 'occurrenceDate'],
  OperatingJournalEntry: ['workspaceId', 'authorId', 'onDate'],
  OperatingCommandLog: ['workspaceId', 'clientRefHash'],
  OperatingCapacityPlan: ['workspaceId', 'actorKey'],
  OperatingTimesheet: ['workspaceId', 'actorKey'],
  OperatingPayrollDraft: ['workspaceId', 'actorKey'],
  OperatingPeriod: ['workspaceId', 'period'],
}

let failed = 0
let checked = 0

for (const [model, fields] of Object.entries(DEPENDENCIES)) {
  const found = models.get(model)
  if (!found) {
    console.error(`FAIL  model missing from schema: ${model}`)
    failed += 1
    continue
  }
  for (const field of fields) {
    checked += 1
    if (!found.fields.has(field)) {
      console.error(`FAIL  ${model}.${field} is written by the service but absent from the schema`)
      failed += 1
    }
  }
}

for (const [model, key] of Object.entries(COMPOSITE_KEYS)) {
  checked += 1
  const found = models.get(model)
  const match = found?.uniques.some(
    unique => unique.length === key.length && key.every(part => unique.includes(part)),
  )
  if (!match) {
    console.error(`FAIL  ${model} has no @@unique([${key.join(', ')}]) for the upsert key the service uses`)
    failed += 1
  }
}

for (const model of REVERSE_LOOKUP_MODELS) {
  checked += 1
  const found = models.get(model)
  if (!found?.fields.has('workbenchRef')) {
    console.error(`FAIL  ${model} has no workbenchRef, so the read path cannot restore its workbench ids`)
    failed += 1
  }
}

// 文件庫不得有存 bytes 的欄位：那條路是 R2，不是資料庫。
{
  checked += 1
  const body = schema.match(/^model\s+OperatingLibraryFile\s*\{([\s\S]*?)^\}/m)?.[1] ?? ''
  if (/^\s*(data|bytes|content|blob)\s+(String|Bytes)/m.test(body)) {
    console.error('FAIL  OperatingLibraryFile must not carry a column that invites file bytes; they belong in R2')
    failed += 1
  }
}

// 留言的作者必須可空：席位對不到 Profile 時，整筆留言仍要存得進來。
{
  checked += 1
  const body = schema.match(/^model\s+OperatingComment\s*\{([\s\S]*?)^\}/m)?.[1] ?? ''
  if (!/^\s*authorId\s+String\?/m.test(body)) {
    console.error('FAIL  OperatingComment.authorId must be optional so an unmapped seat does not lose the comment')
    failed += 1
  }
}

// 里程碑的日期必須可為空，否則「日期待補」的里程碑只能被塞一個假日期。
{
  checked += 1
  const body = schema.match(/^model\s+ProjectMilestone\s*\{([\s\S]*?)^\}/m)?.[1] ?? ''
  if (!/^\s*date\s+DateTime\?/m.test(body)) {
    console.error('FAIL  ProjectMilestone.date must be optional so a milestone can exist before its date does')
    failed += 1
  }
}

if (failed > 0) {
  console.error(`\noperating command fields: ${failed} problem(s) across ${checked} checks`)
  process.exit(1)
}
console.log(`operating command fields: ${checked} checks PASS against prisma/schema.prisma`)
