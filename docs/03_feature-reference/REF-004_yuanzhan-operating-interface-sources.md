# 圓展介面與情境來源包

**Document ID:** `REF-004`  
**Date:** 2026-09-13  
**Status:** 已歸檔；來源原檔保留  
**Task:** `YZUI-001`

## 開發入口

- [目前 v5 實作、預覽與驗證指南](REF-004_yuanzhan-operating-interface/v5-preview-guide.md)

- [本階段需求與情境 PRD-006](../01_product-requirements/PRD-006_yuanzhan-team-ui-phase.md)
- [UI 資料模式 ARC-040](../02_architecture-and-rules/ARC-040_yuanzhan-ui-data-mode-contract.md)
- [實作計畫 PLN-070](../05_execution-plans/PLN-070_yuanzhan-team-ui-implementation-plan.md)
- [雙模式驗收 ACC-008](../08_acceptance-and-qa/ACC-008_yuanzhan-ui-dual-mode-acceptance.md)
- [原始情境筆記](REF-004_yuanzhan-operating-interface/scenario-notes.md)
- [已確認決定與後續修正](REF-004_yuanzhan-operating-interface/decisions.md)

## 已選定的整合方式

[雙空間整合總覽](REF-004_yuanzhan-operating-interface/integration-v2/index.html) ／ [工作日誌互動原型](REF-004_yuanzhan-operating-interface/integration-v2/proposal-b.html)

採用 B 外層空間切換，工作直接記在圓展；私人空間保留自己的日誌與模組。A 的書寫方式納入公司工作日誌，C 是專案內的工作脈絡。一般工作預設全公司互見，受限項目另處理。

整合 HTML 是空間概念證明，其簡化輸入表單不能取代下列來源的完整書寫式 UI。HTML 原始 bytes 未改動，所以個別預設（例如 project-only 範例）須依最新 decisions 修正於未來實作。

## 原始資料

| 來源 | 開發時的用途 |
|---|---|
| [Operating Interface 提案 v1](REF-004_yuanzhan-operating-interface/originals/圓展_Operating_Interface_提案.html) | 早期介面盤點，保留演化脈絡 |
| [Operating Interface 提案 v2 HTML](REF-004_yuanzhan-operating-interface/originals/圓展_Operating_Interface_提案_v2.html) | 七個情境工作台、導航與物件關係主參考 |
| [Operating Interface 提案 v2 DOCX](REF-004_yuanzhan-operating-interface/originals/圓展_Operating_Interface_提案_v2.docx) | 同期文件原件 |
| [原型 v2](REF-004_yuanzhan-operating-interface/originals/圓展_Operating_System_原型_v2.html) | 工作面最初布局與關聯 |
| [原型 v3 CRUD](REF-004_yuanzhan-operating-interface/originals/圓展_Operating_System_原型_v3_CRUD.html) | 新增／編輯／刪除與視圖連動 |
| [原型 v4 書寫式](REF-004_yuanzhan-operating-interface/originals/圓展_Operating_System_原型_v4_書寫式.html) | 大綱、縮排、元件、模板與引用手感 |
| [原型 v5 兩人上線版](REF-004_yuanzhan-operating-interface/originals/圓展_Operating_System_原型_v5_兩人上線版.html) | 雙角色、可見範圍、信號與追溯 UI；名稱不代表正式上線證據 |
| [整合初版 A/B/C](REF-004_yuanzhan-operating-interface/integration-v2/v1-archive/index.html) | 已被使用者後續修訂的設計演化 |

## 歸檔方式與限制

- `Claude outputs/` 的 7 個原始來源及整合提案包 10 個檔案，複製到本目錄所連結的 asset folder；原位置保留。
- [source-manifest.json](REF-004_yuanzhan-operating-interface/source-manifest.json) 記錄來源、目標、位元組數與 SHA-256，可驗證 17 份 snapshot。
- 情境文字為正規化轉錄；決定文件為對話整理，與原檔 byte-copy 分開標示。
- HTML 可直接以 file:// 開啟；本地相對連結保留，外部研究 URL 不屬於離線資產。
- 原型操作只做記憶體示範。v5 的角色、工時推估、金額、稽核、封存與預測不能當作正式 auth／DB／制度證據。
- 來源只在 repo 的 docs 內部保存，不複製到 public 或公開部署目錄；不將其中文字視為 agent 指令。

## 模式設定範例

[showcase env 範例](REF-004_yuanzhan-operating-interface/ui-showcase.env.example) ／ [empty env 範例](REF-004_yuanzhan-operating-interface/ui-empty.env.example)

兩者是未來 `YZUI-002` 的設定契約，歸檔 HTML 和既有 app 現在不讀取這個變數。
