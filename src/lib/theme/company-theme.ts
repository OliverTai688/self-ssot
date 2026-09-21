/**
 * Company / Operating 佈景主題。
 *
 * 四種佈景共用同一組語意 token，只換值：
 * - white  中性亮色
 * - orange 暖米底加橘色強調
 * - black  沿用現行 v5 深色（預設）
 * - brand  圓展教育科技 CI 手冊 v1.0：深藍底＋橘強調
 *
 * 這裡是唯一的色值來源：globals.css 的 .company-scope 覆蓋層與
 * v5 Shadow DOM 的 :host([data-theme]) 都對應同一組值。
 */

export const COMPANY_THEMES = ["white", "orange", "black", "brand"] as const

export type CompanyTheme = (typeof COMPANY_THEMES)[number]

export const DEFAULT_COMPANY_THEME: CompanyTheme = "black"

/** localStorage key；與 personalOS 的 `theme`（light/dark/system）分開存。 */
export const COMPANY_THEME_STORAGE_KEY = "company-theme"

/** 寫在 <html> 上的屬性名稱。 */
export const COMPANY_THEME_ATTRIBUTE = "data-company-theme"

/** 佈景變更時在 window 上派送，給 Shadow DOM 內的圖表重繪用。 */
export const COMPANY_THEME_EVENT = "yz:themechange"

export interface CompanyThemeMeta {
  id: CompanyTheme
  label: string
  labelEn: string
  /** 切換器上的色塊：底色 + 強調色。 */
  swatch: { base: string; accent: string }
  /** 這個佈景是亮底還是暗底，決定 color-scheme 與 dark variant。 */
  scheme: "light" | "dark"
}

export const COMPANY_THEME_META: Record<CompanyTheme, CompanyThemeMeta> = {
  white: {
    id: "white",
    label: "白",
    labelEn: "White",
    swatch: { base: "#ffffff", accent: "#2563eb" },
    scheme: "light",
  },
  orange: {
    id: "orange",
    label: "橘",
    labelEn: "Orange",
    swatch: { base: "#fff8f1", accent: "#ea580c" },
    scheme: "light",
  },
  black: {
    id: "black",
    label: "黑",
    labelEn: "Black",
    swatch: { base: "#0a0c0f", accent: "#6cb6ff" },
    scheme: "dark",
  },
  brand: {
    id: "brand",
    label: "品牌",
    labelEn: "Brand",
    swatch: { base: "#0b1f3a", accent: "#f59e0b" },
    scheme: "dark",
  },
}

export const COMPANY_THEME_LIST: CompanyThemeMeta[] = COMPANY_THEMES.map(
  (id) => COMPANY_THEME_META[id]
)

export function isCompanyTheme(value: unknown): value is CompanyTheme {
  return typeof value === "string" && (COMPANY_THEMES as readonly string[]).includes(value)
}

export function normalizeCompanyTheme(value: unknown): CompanyTheme {
  return isCompanyTheme(value) ? value : DEFAULT_COMPANY_THEME
}

/** v5 工作台（Shadow DOM）的 token 表；key 是 styles.ts 既有的變數名。 */
export type V5Palette = Record<string, string>

const BLACK: V5Palette = {
  "--bg": "#0a0c0f",
  "--surface": "#111418",
  "--surface-2": "#161a20",
  "--surface-3": "#1d232b",
  "--surface-4": "#242b34",
  "--border": "#232931",
  "--border-2": "#333b45",
  "--border-3": "#465060",
  "--text": "#e9ecf1",
  "--text-2": "#99a2af",
  "--text-3": "#626b77",
  "--pri": "#6cb6ff",
  "--pri-bg": "#11212e",
  "--pri-br": "#2d5a7d",
  "--ok": "#5fd09a",
  "--ok-bg": "#0f2620",
  "--warn": "#f2b95e",
  "--warn-bg": "#2a2111",
  "--danger": "#ef8a82",
  "--danger-bg": "#2b1614",
  "--info": "#a78bf5",
  "--info-bg": "#1c1830",
  "--teal": "#4fcfc0",
  "--teal-bg": "#0d2724",
  "--v1": "#3987e5",
  "--v2": "#d95926",
  "--v3": "#199e70",
  "--v4": "#c98500",
  "--st-good": "#0ca30c",
  "--st-warn": "#fab219",
  "--st-serious": "#ec835a",
  "--st-crit": "#d03b3b",
  "--seq-1": "#184f95",
  "--seq-2": "#256abf",
  "--seq-3": "#3987e5",
  "--seq-4": "#6da7ec",
  "--seq-5": "#9ec5f4",
  "--grid": "#252c35",
  "--axis": "#39414c",
  // ── 頭像與人物標記（黑底） ──
  "--avatar-bg": "#2b3440",
  "--av-yz-bg": "#2b4a63",
  "--av-yz-fg": "#9ecbf5",
  "--av-yz-br": "#365d7c",
  "--av-yz-lc-bg": "#0f1a26",
  "--av-yz-tl": "#6cb6ff",
  "--av-lily-bg": "#3d3357",
  "--av-lily-fg": "#c4a2f5",
  "--av-lily-br": "#4e416d",
  "--av-lily-lc-bg": "#1a1220",
  "--av-lily-tl": "#e58bc0",
  // ── 細微 hover 與互動一致性 ──
  "--hover-overlay": "rgba(255, 255, 255, 0.035)",
  "--item-on-ic": "#1d3446",
  "--pri-hover": "#163044",
  "--danger-hover": "#3a1c19",
  "--scroll-thumb": "#2a313a",
  "--scroll-thumb-hover": "#3a424d",
  "--shadow": "0 18px 44px rgba(0, 0, 0, 0.55)",
  // ── 需要與亮底文字對比的強調色底 ──
  "--on-pri": "#07121b",
  "--on-danger": "#1a0e0d",
  "--danger-br": "#5d2b26",
  "--gold": "#e0b25a",
  // ── 回覆追蹤（journal-reply-flow）：逾期警示維持跨佈景一致的「警戒色」 ──
  "--rq-alarm": "#ff4d4f",
  "--rq-alarm-hover": "#ff6668",
  "--rq-alarm-pulse": "#d9363a",
  "--rq-alarm-btn-fg": "#b3181b",
  "--rq-dec-bg": "#6a2d5c",
  // ── 回覆追蹤：隨佈景切換的柔和標籤色 ──
  "--rq-ask": "#e58bc0",
  "--rq-ask-bg": "#1e1019",
  "--rq-ask-br": "#4f2d45",
  "--rq-ok": "#4ea1ff",
  "--rq-ok-bg": "#0f1726",
  "--rq-ok-br": "#2c3a5c",
  "--rq-warn": "#f0924f",
  "--rq-warn-bg": "#2a1a0c",
  "--rq-warn-br": "#6a4520",
  "--rq-done-br": "#2d4d3d",
  "--rq-flash": "#7c8cff",
}

const WHITE: V5Palette = {
  ...BLACK,
  "--bg": "#ffffff",
  "--surface": "#f7f7f8",
  "--surface-2": "#f0f1f3",
  "--surface-3": "#e7e9ec",
  "--surface-4": "#dee1e6",
  "--border": "#e3e5e8",
  "--border-2": "#cfd3d8",
  "--border-3": "#aeb5bd",
  "--text": "#16181c",
  "--text-2": "#555b64",
  "--text-3": "#8a9099",
  "--pri": "#2563eb",
  "--pri-bg": "#eaf1fe",
  "--pri-br": "#bcd0f8",
  "--ok": "#15803d",
  "--ok-bg": "#e8f6ed",
  "--warn": "#b45309",
  "--warn-bg": "#fdf2e0",
  "--danger": "#dc2626",
  "--danger-bg": "#fdeaea",
  "--info": "#6d3fd4",
  "--info-bg": "#f0ebfd",
  "--teal": "#0f766e",
  "--teal-bg": "#e4f5f3",
  "--v1": "#2563eb",
  "--v2": "#c2410c",
  "--v3": "#15803d",
  "--v4": "#a16207",
  "--st-good": "#15803d",
  "--st-warn": "#b45309",
  "--st-serious": "#ea580c",
  "--st-crit": "#b91c1c",
  "--seq-1": "#c7dbfb",
  "--seq-2": "#9ec5f4",
  "--seq-3": "#6da7ec",
  "--seq-4": "#3987e5",
  "--seq-5": "#184f95",
  "--grid": "#ebedf0",
  "--axis": "#c3c8ce",
  // ── 頭像與人物標記（白底） ──
  "--avatar-bg": "#e2e8f0",
  "--av-yz-bg": "#dbeafe",
  "--av-yz-fg": "#1d4ed8",
  "--av-yz-br": "#bfdbfe",
  "--av-yz-lc-bg": "#eff6ff",
  "--av-yz-tl": "#2563eb",
  "--av-lily-bg": "#f3e8ff",
  "--av-lily-fg": "#7e22ce",
  "--av-lily-br": "#e9d5ff",
  "--av-lily-lc-bg": "#faf5ff",
  "--av-lily-tl": "#9333ea",
  // ── 細微 hover 與互動一致性 ──
  "--hover-overlay": "rgba(0, 0, 0, 0.035)",
  "--item-on-ic": "#ffffff",
  "--pri-hover": "#dbeafe",
  "--danger-hover": "#fee2e2",
  "--scroll-thumb": "#cfd3d8",
  "--scroll-thumb-hover": "#aeb5bd",
  "--shadow": "0 14px 36px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
  // ── 需要與亮底文字對比的強調色底（亮色佈景） ──
  "--on-pri": "#ffffff",
  "--on-danger": "#ffffff",
  "--danger-br": "#f3b4b4",
  "--gold": "#a16207",
  // ── 回覆追蹤：柔和標籤色（亮色佈景） ──
  "--rq-ask": "#be185d",
  "--rq-ask-bg": "#fce7f3",
  "--rq-ask-br": "#f9a8d4",
  "--rq-ok": "#1d4ed8",
  "--rq-ok-bg": "#eff6ff",
  "--rq-ok-br": "#bfdbfe",
  "--rq-warn": "#c2410c",
  "--rq-warn-bg": "#fff7ed",
  "--rq-warn-br": "#fed7aa",
  "--rq-done-br": "#bbf7d0",
  "--rq-flash": "#4f46e5",
}

const ORANGE: V5Palette = {
  ...WHITE,
  "--bg": "#fff8f1",
  "--surface": "#ffffff",
  "--surface-2": "#fdf0e3",
  "--surface-3": "#f9e3cd",
  "--surface-4": "#f3d5b7",
  "--border": "#f1d9c2",
  "--border-2": "#e6bf9b",
  "--border-3": "#cf9a68",
  "--text": "#2a1a0e",
  "--text-2": "#6b4a33",
  "--text-3": "#a07a5c",
  "--pri": "#ea580c",
  "--pri-bg": "#ffedd5",
  "--pri-br": "#fdba74",
  "--warn": "#a16207",
  "--warn-bg": "#fdf3d8",
  "--v1": "#ea580c",
  "--v2": "#2563eb",
  "--v3": "#15803d",
  "--v4": "#a16207",
  "--seq-1": "#fde3c6",
  "--seq-2": "#fdba74",
  "--seq-3": "#fb923c",
  "--seq-4": "#ea580c",
  "--seq-5": "#9a3412",
  "--grid": "#f4e6d6",
  "--axis": "#dcc0a3",
  // ── 頭像與人物標記（橘底） ──
  "--avatar-bg": "#fde8d0",
  "--av-yz-bg": "#ffedd5",
  "--av-yz-fg": "#c2410c",
  "--av-yz-br": "#fed7aa",
  "--av-yz-lc-bg": "#fff7ed",
  "--av-yz-tl": "#ea580c",
  "--av-lily-bg": "#fae8ff",
  "--av-lily-fg": "#86198f",
  "--av-lily-br": "#f5d0fe",
  "--av-lily-lc-bg": "#fdf4ff",
  "--av-lily-tl": "#a21caf",
  // ── 細微 hover 與互動一致性 ──
  "--hover-overlay": "rgba(42, 26, 14, 0.04)",
  "--item-on-ic": "#ffffff",
  "--pri-hover": "#fed7aa",
  "--danger-hover": "#fee2e2",
  "--scroll-thumb": "#e6bf9b",
  "--scroll-thumb-hover": "#cf9a68",
  "--shadow": "0 14px 36px rgba(120, 60, 20, 0.12), 0 2px 8px rgba(120, 60, 20, 0.06)",
}

const BRAND: V5Palette = {
  ...BLACK,
  "--bg": "#0b1f3a",
  "--surface": "#13294a",
  "--surface-2": "#16335c",
  "--surface-3": "#1e4a82",
  "--surface-4": "#24589a",
  "--border": "#1c3a68",
  "--border-2": "#2b5286",
  "--border-3": "#3f6ba6",
  "--text": "#f8fafc",
  "--text-2": "#c4d0e4",
  "--text-3": "#9db0cc",
  "--pri": "#f59e0b",
  "--pri-bg": "#2a2411",
  "--pri-br": "#8a5f12",
  "--warn": "#fbbf24",
  "--warn-bg": "#2b2410",
  "--v1": "#f59e0b",
  "--v2": "#6da7ec",
  "--v3": "#5fd09a",
  "--v4": "#fbbf24",
  "--seq-1": "#1e4a82",
  "--seq-2": "#2b5f9f",
  "--seq-3": "#4a82c4",
  "--seq-4": "#7ba4d8",
  "--seq-5": "#9db0cc",
  "--grid": "#17345d",
  "--axis": "#2b5286",
  // ── 頭像與人物標記（品牌底） ──
  "--avatar-bg": "#1e3b66",
  "--av-yz-bg": "#1e3f6e",
  "--av-yz-fg": "#fbbf24",
  "--av-yz-br": "#2a528e",
  "--av-yz-lc-bg": "#12243d",
  "--av-yz-tl": "#f59e0b",
  "--av-lily-bg": "#2e254d",
  "--av-lily-fg": "#c084fc",
  "--av-lily-br": "#3f3366",
  "--av-lily-lc-bg": "#1a162b",
  "--av-lily-tl": "#c084fc",
  // ── 細微 hover 與互動一致性 ──
  "--hover-overlay": "rgba(255, 255, 255, 0.045)",
  "--item-on-ic": "#243e63",
  "--pri-hover": "#3d3215",
  "--danger-hover": "#3d1a18",
  "--scroll-thumb": "#2b5286",
  "--scroll-thumb-hover": "#3f6ba6",
  "--shadow": "0 18px 44px rgba(0, 0, 0, 0.55)",
}

export const V5_PALETTES: Record<CompanyTheme, V5Palette> = {
  white: WHITE,
  orange: ORANGE,
  black: BLACK,
  brand: BRAND,
}

/** 頁面尚未掛載 React 前，host 元素要用的底色。 */
export function companyThemeBackground(theme: CompanyTheme): string {
  return V5_PALETTES[theme]["--bg"]
}
