import "server-only"

import {
  OPERATING_DATA_SOURCES,
  parseOperatingDataSource,
  type OperatingDataSource,
} from "@/lib/ui-data/yuanzhan/data-source"

export type { OperatingDataSource }
export { OPERATING_DATA_SOURCES }

/**
 * PLN-074 M0。
 *
 * `PERSONAL_OS_UI_DATA_MODE` 決定「畫面上有沒有範例資料」，它不決定「輸入的東西會不會被保存」。
 * 過去這兩件事混在同一個開關上，結果是 `empty` 看起來像正式空白資料庫，其實只是清空的記憶體。
 * 這個變數把「資料來源」獨立出來，讓 UI 能誠實說出自己的狀態。
 */
export function readOperatingDataSource(): OperatingDataSource {
  return parseOperatingDataSource(process.env.PERSONAL_OS_OPERATING_DATA_SOURCE)
}
