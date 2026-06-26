import type { SourceConnection } from "@/types/ingestion"

export const mockSourceConnections: SourceConnection[] = [
  {
    id: "sc-manual",
    provider: "manual",
    displayName: "手動輸入",
    status: "connected",
    lastSyncedAt: null,
    syncCursor: null,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "sc-line",
    provider: "line",
    displayName: "LINE（模擬）",
    status: "mock",
    lastSyncedAt: "2026-05-05T22:00:00Z",
    syncCursor: "msg_9901",
    createdAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "sc-gdocs",
    provider: "google_docs",
    displayName: "Google Docs（模擬）",
    status: "mock",
    lastSyncedAt: "2026-05-04T18:30:00Z",
    syncCursor: "doc_version_42",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "sc-local",
    provider: "local_file",
    displayName: "本機檔案",
    status: "connected",
    lastSyncedAt: null,
    syncCursor: null,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "sc-url",
    provider: "url",
    displayName: "URL 擷取",
    status: "connected",
    lastSyncedAt: null,
    syncCursor: null,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "sc-rss",
    provider: "url",
    displayName: "Web RSS（模擬）",
    status: "mock",
    lastSyncedAt: "2026-05-09T06:00:00Z",
    syncCursor: "feed_item_88",
    createdAt: "2026-04-01T00:00:00Z",
  },
]

export function getSourceConnection(id: string): SourceConnection | undefined {
  return mockSourceConnections.find((c) => c.id === id)
}
