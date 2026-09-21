import type { UiDataMode } from "@/types/yuanzhan-ui"

export function parseUiDataMode(value: string | undefined): UiDataMode {
  if (value === undefined || value === "" || value === "empty") return "empty"
  if (value === "showcase") return "showcase"
  throw new Error("PERSONAL_OS_UI_DATA_MODE must be showcase or empty")
}
