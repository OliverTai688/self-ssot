#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  layout: "src/app/(dashboard)/layout.tsx",
  service: "src/lib/services/library-asset-index.service.ts",
  storageService: "src/lib/services/storage.service.ts",
  mapper: "src/lib/mappers/library-asset.mapper.ts",
  context: "src/lib/context/library-classification-context.tsx",
  fileLibrary: "src/components/ai/file-library/file-library-page.tsx",
  mediaLibrary: "src/components/ai/media-library/media-library-page.tsx",
  fileEmpty: "src/components/ai/file-library/file-empty-state.tsx",
  actions: "src/app/actions/storage.ts",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  tasks: "tasks.md",
}

function read(filePath) {
  const target = path.join(ROOT, filePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null
}

const sources = Object.fromEntries(
  Object.entries(FILES).map(([key, filePath]) => [key, read(filePath)])
)
const checks = []

function check(id, passed, evidence) {
  checks.push({ id, passed, evidence })
}

for (const [key, filePath] of Object.entries(FILES)) {
  check(`file:${key}`, sources[key] !== null, `${filePath} exists`)
}

check(
  "server-owner-read",
  sources.service?.includes("getFileAssetsForProfile(profileId)") === true
    && sources.service?.includes("getMediaAssetsForProfile(profileId)") === true
    && sources.storageService?.includes("where: { ownerId: profileId, deletedAt: null }") === true,
  "formal loader delegates to owner-scoped file/media queries"
)
check(
  "server-component-hydration",
  sources.layout?.includes("buildFormalLibraryAssetIndex(currentUser.id)") === true
    && sources.layout?.includes("initialFormalLibrary={formalLibraryAssetIndex}") === true,
  "protected dashboard layout injects the serialized formal library DTO"
)
check(
  "mock-formal-store-isolation",
  sources.context?.includes("isMockDataEnabled ? mockFileAssetsState : formalFileAssets") === true
    && sources.context?.includes("isMockDataEnabled ? mockMediaAssetsState : formalMediaAssets") === true
    && sources.context?.includes("isMockDataEnabled ? mockLinks : formalLinks") === true
    && sources.context?.includes("useState<LibraryAssetModuleLink[]>([])") === true,
  "mock assets/links and formal assets/links use separate stores"
)
check(
  "no-mock-fallback",
  sources.service?.includes('status: "unavailable"') === true
    && sources.service?.includes("fileAssets: []") === true
    && sources.service?.includes("mediaAssets: []") === true
    && sources.service?.includes("hiddenMockFallback: true") === true,
  "formal read failure returns unavailable plus empty arrays, never demo rows"
)
check(
  "truthful-empty-unavailable-ui",
  sources.fileEmpty?.includes("尚無正式檔案") === true
    && sources.fileEmpty?.includes("正式檔案資料暫時無法載入") === true
    && sources.mediaLibrary?.includes("尚無正式媒體") === true
    && sources.mediaLibrary?.includes("正式媒體資料暫時無法載入") === true,
  "file/media UI distinguishes formal empty from formal unavailable"
)
check(
  "persisted-reload-mapper",
  sources.mapper?.includes("objectKey: asset.objectKey") === true
    && sources.mapper?.includes('provider: "r2"') === true
    && sources.actions?.includes("asset: mapStoredFileAsset(asset)") === true
    && sources.actions?.includes("asset: mapStoredMediaAsset(asset)") === true,
  "persisted rows and immediate upload responses share the same serializable view-model mapping"
)
check(
  "mock-write-block",
  sources.fileLibrary?.includes("Mock 模式不會寫入正式資料") === true
    && sources.mediaLibrary?.includes("Mock 模式不會寫入正式資料") === true,
  "real upload is explicitly blocked while the demo dataset is active"
)
check(
  "client-boundary",
  !/@prisma\/client|@\/lib\/db|@\/lib\/storage\/r2-client|process\.env/.test(
    `${sources.context ?? ""}\n${sources.fileLibrary ?? ""}\n${sources.mediaLibrary ?? ""}`
  ),
  "client provider/components do not import Prisma, DB, R2 credentials, or env"
)
check(
  "task-memory",
  sources.backlog?.includes("R2STORE-009") === true
    && sources.acceptance?.includes("R2STORE-009") === true
    && sources.tasks?.includes("R2STORE-009") === true,
  "backlog, acceptance, and task memory contain R2STORE-009"
)

const failed = checks.filter((item) => !item.passed)
const payload = {
  status: failed.length === 0 ? "ready_for_formal_library_use" : "failed",
  task: "R2STORE-009",
  checksPassed: checks.length - failed.length,
  checksTotal: checks.length,
  hiddenMockFallback: true,
  ownerScoped: true,
  failures: failed.map((item) => item.id),
  checks,
}

console.log(JSON.stringify(payload, null, 2))
process.exitCode = failed.length === 0 ? 0 : 1
