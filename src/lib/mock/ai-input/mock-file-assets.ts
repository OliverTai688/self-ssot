import type { FileAsset } from "@/types/file-library"
import { generateReferenceCode } from "@/lib/naming/reference-code"

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString()
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60_000).toISOString()
}

/**
 * Demo dataset for the file library. Each asset demonstrates one of the
 * required states from RES-006 (system upload, external-reference-only,
 * synced snapshot, outdated snapshot, permission-lost-with-snapshot,
 * permission-lost-without-snapshot, AI parse failure, archived, and
 * multi-reference). This is prototype/demo data — see AI Input formal
 * readiness docs for the real SourceAsset/Snapshot BFF contract.
 */
const mockFileAssetsBase: Omit<FileAsset, "referenceCode">[] = [
  {
    id: "fa-001",
    title: "AI治理架構白皮書.pdf",
    mimeType: "application/pdf",
    size: 2_411_724,
    status: "active",
    snapshots: [
      { id: "snap-001-1", versionNumber: 1, createdAt: daysAgo(44), referenceCount: 2 },
    ],
    processing: { extractionStatus: "completed", indexed: true, chunkCount: 38 },
    references: { chats: 2, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
    createdAt: daysAgo(44),
    lastUsedAt: minutesAgo(95),
  },
  {
    id: "fa-002",
    title: "ESG Reporting Framework v3.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 1_258_291,
    status: "active",
    source: {
      provider: "google_drive",
      availability: "available",
      syncStatus: "synced",
      providerVersion: "Drive 214",
      sourceModifiedAt: daysAgo(9),
      lastSyncedAt: minutesAgo(10),
      lastCheckedAt: minutesAgo(10),
      webViewUrl: "https://drive.google.com/file/d/esg-reporting-framework-v3/view",
      driveFileId: "esg-reporting-framework-v3",
      driveFolderPath: "工作 / ESG 專案",
    },
    snapshots: [
      { id: "snap-002-1", versionNumber: 1, sourceVersion: "Drive 198", createdAt: daysAgo(39), referenceCount: 0 },
      { id: "snap-002-2", versionNumber: 2, sourceVersion: "Drive 206", createdAt: daysAgo(20), referenceCount: 1 },
      { id: "snap-002-3", versionNumber: 3, sourceVersion: "Drive 214", createdAt: daysAgo(9), referenceCount: 2 },
    ],
    processing: { extractionStatus: "completed", indexed: true, chunkCount: 22 },
    references: { chats: 2, evidence: 1, observationUnits: 0, reports: 0, sprints: 0 },
    createdAt: daysAgo(39),
    lastUsedAt: minutesAgo(10),
  },
  {
    id: "fa-003",
    title: "會議決議_20260713.pdf",
    mimeType: "application/pdf",
    size: 870_400,
    status: "active",
    source: {
      provider: "google_drive",
      availability: "available",
      syncStatus: "outdated",
      providerVersion: "Drive 184",
      sourceModifiedAt: minutesAgo(4),
      lastSyncedAt: daysAgo(1),
      lastCheckedAt: minutesAgo(10),
      webViewUrl: "https://drive.google.com/file/d/meeting-resolution-20260713/view",
      driveFileId: "meeting-resolution-20260713",
      driveFolderPath: "商會 / 會議紀錄",
    },
    snapshots: [
      { id: "snap-003-1", versionNumber: 1, sourceVersion: "Drive 171", createdAt: daysAgo(3), referenceCount: 0 },
      { id: "snap-003-2", versionNumber: 2, sourceVersion: "Drive 179", createdAt: daysAgo(1), referenceCount: 1 },
    ],
    processing: { extractionStatus: "completed", indexed: true, chunkCount: 6 },
    references: { chats: 0, evidence: 0, observationUnits: 0, reports: 1, sprints: 0 },
    createdAt: daysAgo(3),
    lastUsedAt: daysAgo(1),
  },
  {
    id: "fa-004",
    title: "年度營運計畫",
    mimeType: "application/vnd.google-apps.document",
    status: "active",
    source: {
      provider: "google_drive",
      availability: "available",
      syncStatus: "synced",
      providerVersion: "Drive 42",
      sourceModifiedAt: daysAgo(2),
      lastSyncedAt: minutesAgo(30),
      lastCheckedAt: minutesAgo(30),
      webViewUrl: "https://drive.google.com/file/d/annual-operating-plan/view",
      driveFileId: "annual-operating-plan",
      driveFolderPath: "公司 / 策略文件",
    },
    snapshots: [],
    processing: { extractionStatus: "not_started", indexed: false },
    references: { chats: 1, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
    createdAt: daysAgo(60),
    lastUsedAt: minutesAgo(30),
  },
  {
    id: "fa-005",
    title: "商會會員名冊.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 512_000,
    status: "active",
    source: {
      provider: "google_drive",
      availability: "permission_lost",
      syncStatus: "error",
      providerVersion: "Drive 12",
      sourceModifiedAt: daysAgo(30),
      lastSyncedAt: daysAgo(14),
      lastCheckedAt: minutesAgo(50),
      driveFileId: "chamber-member-roster",
      driveFolderPath: "商會 / 名冊",
      errorMessage: "PersonalOS 已不再有此 Google Drive 檔案的存取權限，請重新連結來源。",
    },
    snapshots: [
      { id: "snap-005-1", versionNumber: 1, sourceVersion: "Drive 8", createdAt: daysAgo(45), referenceCount: 0 },
      { id: "snap-005-2", versionNumber: 2, sourceVersion: "Drive 12", createdAt: daysAgo(14), referenceCount: 1 },
    ],
    processing: { extractionStatus: "completed", indexed: true, chunkCount: 4 },
    references: { chats: 0, evidence: 0, observationUnits: 0, reports: 1, sprints: 0 },
    createdAt: daysAgo(45),
    lastUsedAt: daysAgo(14),
  },
  {
    id: "fa-006",
    title: "舊版策略提案（已停用來源）.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    status: "active",
    source: {
      provider: "google_drive",
      availability: "source_deleted",
      syncStatus: "error",
      lastCheckedAt: minutesAgo(120),
      driveFileId: "legacy-strategy-deck",
      errorMessage: "來源檔案已從 Google Drive 移除，且尚未建立任何 Snapshot。",
    },
    snapshots: [],
    processing: { extractionStatus: "not_started", indexed: false },
    references: { chats: 0, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
    createdAt: daysAgo(90),
  },
  {
    id: "fa-007",
    title: "客戶提案簡報.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size: 4_190_000,
    status: "active",
    snapshots: [
      { id: "snap-007-1", versionNumber: 1, createdAt: daysAgo(2), referenceCount: 0 },
    ],
    processing: {
      extractionStatus: "failed",
      indexed: false,
      errorMessage: "解析失敗：簡報內嵌影片超過單檔可解析大小上限。",
    },
    references: { chats: 1, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
    createdAt: daysAgo(2),
    lastUsedAt: daysAgo(2),
  },
  {
    id: "fa-008",
    title: "舊版公司簡介.pdf",
    mimeType: "application/pdf",
    size: 1_050_000,
    status: "archived",
    snapshots: [
      { id: "snap-008-1", versionNumber: 1, createdAt: daysAgo(210), referenceCount: 0 },
    ],
    processing: { extractionStatus: "completed", indexed: true, chunkCount: 12 },
    references: { chats: 0, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
    createdAt: daysAgo(210),
    lastUsedAt: daysAgo(180),
  },
  {
    id: "fa-009",
    title: "訪談紀錄整理_林副理事長.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 690_000,
    status: "active",
    source: {
      provider: "google_drive",
      availability: "available",
      syncStatus: "synced",
      providerVersion: "Drive 57",
      sourceModifiedAt: daysAgo(6),
      lastSyncedAt: minutesAgo(20),
      lastCheckedAt: minutesAgo(20),
      webViewUrl: "https://drive.google.com/file/d/interview-notes-lin/view",
      driveFileId: "interview-notes-lin",
      driveFolderPath: "商會 / 訪談紀錄",
    },
    snapshots: [
      { id: "snap-009-1", versionNumber: 1, sourceVersion: "Drive 40", createdAt: daysAgo(20), referenceCount: 1 },
      { id: "snap-009-2", versionNumber: 2, sourceVersion: "Drive 57", createdAt: daysAgo(6), referenceCount: 3 },
    ],
    processing: { extractionStatus: "completed", indexed: true, chunkCount: 15 },
    references: { chats: 3, evidence: 2, observationUnits: 1, reports: 1, sprints: 1 },
    createdAt: daysAgo(20),
    lastUsedAt: minutesAgo(20),
  },
  {
    id: "fa-010",
    title: "RES-006_ai-input-source研究筆記.md",
    mimeType: "text/markdown",
    size: 48_200,
    status: "active",
    snapshots: [
      { id: "snap-010-1", versionNumber: 1, createdAt: daysAgo(5), referenceCount: 1 },
    ],
    processing: { extractionStatus: "completed", indexed: true, chunkCount: 5 },
    references: { chats: 1, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
    createdAt: daysAgo(5),
    lastUsedAt: daysAgo(1),
  },
  {
    id: "fa-011",
    title: "商會活動素材壓縮包.zip",
    mimeType: "application/zip",
    size: 18_900_000,
    status: "active",
    snapshots: [
      { id: "snap-011-1", versionNumber: 1, createdAt: daysAgo(7), referenceCount: 0 },
    ],
    processing: { extractionStatus: "not_started", indexed: false },
    references: { chats: 0, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
    createdAt: daysAgo(7),
  },
]

export const mockFileAssets: FileAsset[] = mockFileAssetsBase.map((asset) => ({
  ...asset,
  referenceCode: generateReferenceCode("FILE", "AIINPUT", asset.createdAt),
}))
