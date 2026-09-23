/**
 * 營運工作台的資料來源（ARC-042 §8）。
 *
 * prototype：記憶體操作，commit 佇列不送出，UI 必須明示不會保存。
 * database：讀寫實際 workspace 資料；首次無資料就是真的空白，不注入 fixture。
 *
 * 這個檔案沒有 "server-only"：V5State 會把值帶進瀏覽器，讓工作台知道自己處在哪一種模式。
 * 讀環境變數的那一半在 `@/lib/config/operating-data-source`，那邊才是 server-only。
 */
export const OPERATING_DATA_SOURCES = ["prototype", "database"] as const

export type OperatingDataSource = (typeof OPERATING_DATA_SOURCES)[number]

export const DEFAULT_OPERATING_DATA_SOURCE: OperatingDataSource = "prototype"

export function isOperatingDataSource(value: unknown): value is OperatingDataSource {
  return typeof value === "string" && (OPERATING_DATA_SOURCES as readonly string[]).includes(value)
}

/**
 * 未設定時回退到 prototype。
 *
 * 刻意不丟例外：把資料來源設錯字不應該讓整個工作台打不開，而是退回「不會保存」——
 * 這個方向的失敗是安全的，反過來（誤判成 database）會讓人以為資料存了。
 */
export function parseOperatingDataSource(value: unknown): OperatingDataSource {
  return isOperatingDataSource(value) ? value : DEFAULT_OPERATING_DATA_SOURCE
}
