// 由 lib/theme/company-theme.ts 的 token 表產生 Shadow DOM 的佈景覆蓋。
// styles.ts 本身的 :host{} 仍是黑色預設值，這裡只追加其他三種佈景。
import { V5_PALETTES, type CompanyTheme } from "@/lib/theme/company-theme"

function block(selector: string, theme: CompanyTheme): string {
  const palette = V5_PALETTES[theme]
  const body = Object.entries(palette)
    .map(([token, value]) => `  ${token}: ${value};`)
    .join("\n")
  return `${selector} {\n${body}\n}`
}

export const v5ThemeStyles = [
  block(':host([data-theme="white"])', "white"),
  block(':host([data-theme="orange"])', "orange"),
  block(':host([data-theme="black"])', "black"),
  block(':host([data-theme="brand"])', "brand"),
  // 亮底佈景下，原本為深色設計的陰影與捲軸要跟著轉。
  ':host([data-theme="white"]), :host([data-theme="orange"]) { color-scheme: light; }',
  ':host([data-theme="black"]), :host([data-theme="brand"]) { color-scheme: dark; }',
  `
  /* ── 四種佈景主題一致性：頭像配色 ── */
  .avatar {
    background: var(--avatar-bg, #2b3440);
    color: var(--text-2);
  }
  .av-yz {
    background: var(--av-yz-bg, #2b4a63) !important;
    color: var(--av-yz-fg, #9ecbf5) !important;
    box-shadow: inset 0 0 0 1px var(--av-yz-br, transparent);
  }
  .av-lily {
    background: var(--av-lily-bg, #3d3357) !important;
    color: var(--av-lily-fg, #c4a2f5) !important;
    box-shadow: inset 0 0 0 1px var(--av-lily-br, transparent);
  }

  /* 使用者切換 hover 回饋 */
  .userbtn:hover {
    background: var(--surface-3);
    border-color: var(--border-3);
    color: var(--text);
  }

  /* 召喚選單（# 召喚）與搜尋（cmdk）項目 hover 與選取 */
  .summon-i {
    transition: background 0.12s;
  }
  .summon-i:hover {
    background: var(--surface-2);
  }
  .summon-i.on {
    background: var(--pri-bg) !important;
  }
  .summon-i.on .ic {
    background: var(--item-on-ic, var(--surface-3)) !important;
    color: var(--pri) !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  .cmdk-i {
    transition: background 0.12s;
  }
  .cmdk-i:hover {
    background: var(--surface-2);
  }
  .cmdk-i.on {
    background: var(--pri-bg) !important;
  }
  .cmdk-i.on .ic {
    background: var(--item-on-ic, var(--surface-3)) !important;
    color: var(--pri) !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  /* 按鈕 hover 隨主題強調色 */
  .btn.pri:hover {
    background: var(--pri-hover, var(--pri-br)) !important;
  }
  .btn.dgr:hover {
    background: var(--danger-hover, var(--danger-bg)) !important;
  }

  /* 捲軸顏色隨主題切換（避免亮色主題出現刺眼深黑捲軸） */
  ::-webkit-scrollbar-thumb {
    background: var(--scroll-thumb, #2a313a) !important;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--scroll-thumb-hover, #3a424d) !important;
  }

  /* 編輯器與日誌行 hover（亮色底使用微透黑、暗色底使用微透白） */
  .eb:hover {
    background: var(--hover-overlay, rgba(255, 255, 255, 0.025)) !important;
  }
  .jc-ro:hover {
    background: var(--hover-overlay, rgba(255, 255, 255, 0.035)) !important;
  }

  /* 雙人日誌駕駛艙：行內留言對話串與人物色彩 */
  .jc-lcs {
    margin: 4px 0 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-left: 2px solid var(--border-2);
    padding-left: 10px;
  }
  .jc-lc {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 6px;
    background: var(--surface-2) !important;
    border: 1px solid var(--border);
    border-left: 3px solid var(--av-lily-tl, #e58bc0) !important;
    font-size: 12.5px;
    line-height: 1.5;
  }
  .jc-lc.av-yz {
    border-left-color: var(--av-yz-tl, #6cb6ff) !important;
  }
  .jc-lc .av {
    margin-top: 2px;
    flex-shrink: 0;
  }
  .jc-lc-content {
    flex: 1;
    min-width: 0;
  }
  .jc-lc-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }
  .jc-lc-author {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
  }
  .jc-lc.av-yz .jc-lc-author {
    color: var(--av-yz-tl, #6cb6ff) !important;
  }
  .jc-lc-m {
    font-family: var(--mono);
    font-size: 10.5px;
    color: var(--text-3);
  }
  .jc-lc-actions {
    margin-left: auto;
    display: flex;
    gap: 6px;
  }
  .jc-lc-actions .jc-link {
    font-size: 11px;
    color: var(--text-3);
    cursor: pointer;
  }
  .jc-lc-actions .jc-link:hover {
    color: var(--pri);
  }
  .jc-lc-actions .jc-link.dgr:hover {
    color: var(--danger);
  }
  .jc-lc-text {
    font-size: 12.5px;
    color: var(--text-2);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .jc-lc-in {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }
  .jc-lc-in input {
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-2);
    background: var(--surface-2);
    color: var(--text);
    font-size: 12.5px;
    outline: none;
  }
  .jc-lc-in input:focus {
    border-color: var(--pri);
    background: var(--surface-3);
  }
  .jc-lc-reply-bar {
    padding: 2px 0;
  }
  .jc-lc-reply-bar .jc-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    color: var(--pri);
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
  }
  .jc-lc-reply-bar .jc-link:hover {
    background: var(--pri-bg);
  }

  /* 時間線點人物色 */
  .jc-tl div::before {
    background: var(--av-yz-tl, #7c8cff) !important;
  }
  .jc-tl div.lily::before {
    background: var(--av-lily-tl, #e58bc0) !important;
  }

  /* 額外細節 hover 調整 */
  .toast .undo:hover {
    background: var(--surface-4);
    border-color: var(--border-3);
  }
  .rq-optbtn:hover {
    border-color: var(--pri);
    background: var(--surface-3);
  }

  /* Lucide icon 尺寸與對齊 */
  .btn svg {
    vertical-align: -1.5px;
    display: inline-block;
  }
  .jc-date .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
  }
  .jc-date .btn svg {
    vertical-align: 0;
  }
  .rq-pill svg {
    vertical-align: -1px;
    margin-right: 2px;
  }

  /* ── 浮動指令面板（Selection Command Panel）與多選高亮 ── */
  .eb.msel {
    background: var(--pri-bg) !important;
    outline: 1px solid var(--pri-br) !important;
  }
  .sel-cmd-panel {
    background: var(--surface) !important;
    border-color: var(--border-2) !important;
    box-shadow: var(--shadow) !important;
    color: var(--text) !important;
  }
  .sc-head {
    border-bottom-color: var(--border) !important;
  }
  .sc-close:hover {
    background: var(--surface-3) !important;
    color: var(--text) !important;
  }
  .sc-item {
    color: var(--text) !important;
  }
  .sc-item:hover {
    background: var(--pri-bg) !important;
    color: var(--pri) !important;
  }
  .sc-item:hover .sc-ic {
    color: var(--pri) !important;
  }
  .sc-item.dgr {
    color: var(--text) !important;
  }
  .sc-item.dgr:hover {
    background: var(--danger-bg) !important;
    color: var(--danger) !important;
  }
  .sc-item.dgr:hover .sc-ic {
    color: var(--danger) !important;
  }
  .sc-item .sc-kb {
    background: var(--surface-2) !important;
    border-color: var(--border-2) !important;
    color: var(--text-3) !important;
  }
  .sc-item:hover .sc-kb {
    background: var(--surface-3) !important;
    border-color: var(--border-3) !important;
    color: var(--text-2) !important;
  }
  .sc-type-chip {
    background: var(--surface-2) !important;
    border-color: var(--border-2) !important;
    color: var(--text-2) !important;
  }
  .sc-type-chip:hover {
    background: var(--pri-bg) !important;
    border-color: var(--pri-br, var(--pri)) !important;
    color: var(--pri) !important;
  }
  .sc-type-chip.on {
    background: var(--pri-bg) !important;
    border-color: var(--pri) !important;
    color: var(--pri) !important;
  }
  .sc-div {
    background: var(--border) !important;
  }
  `
].join("\n\n")
