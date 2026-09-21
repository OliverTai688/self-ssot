import "server-only"
import { parseUiDataMode } from "@/lib/ui-data/yuanzhan/mode"

export function readUiDataMode() {
  return parseUiDataMode(process.env.PERSONAL_OS_UI_DATA_MODE)
}
