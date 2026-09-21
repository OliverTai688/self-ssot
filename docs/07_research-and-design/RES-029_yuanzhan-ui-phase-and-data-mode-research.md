# 圓展 UI 階段與雙資料模式接合研究

**Document ID:** `RES-029`  
**Date:** 2026-09-13  
**Task:** `YZUI-001`  
**Status:** 需求與契約研究完成；runtime 未實作

## 1. 問題與範圍

使用者選定個人／圓展雙空間，要求公司工作日誌直接輸入、公司內一般工作互見，以情境筆記與原始 HTML 發展 UI，並用 env 切換完整示例與完全空白資料。

本研究聚焦同一個首先要完成的問題：**圓展工作日誌如何在雙空間外層中運作，且同一頁可用 showcase／empty 驗證。** 財務、容量等其他頁的細部研究尚未完成，本文件不替它們批次宣告可直接實作。

## 2. 本地證據與現有落差

| 證據 | 觀察 | 對本階段的影響 |
|---|---|---|
| 使用者本次決定＋原始筆記 | 工作日誌在公司；可見範圍輸入時確定；要自由書寫及 typed components | 保留 B 的空間邊界，A 的書寫深度進公司；不採私人轉公司主流程 |
| 原始 v2、v3、v4、v5 HTML | 有情境工作台、CRUD、縮排／模板／引用、雙角色／信號；資料多為 in-memory 示例 | 作為互動依據；不聲稱 auth、工時、版本雜湊或核准已正式完成 |
| `workspace-context.service.ts`／`workspace-context.tsx` | 空間來自有效 membership，cookie 切換後 refresh | 共用既有身分及空間概念，UI 模式不取代授權 |
| `mock-data-mode-context.tsx` | localStorage 先於 defaultEnabled，會跨 session 影響示例選擇 | 新 UI-phase env 必須為唯一資料模式來源，不讀舊 key |
| `(dashboard)/layout.tsx` | demo account gating、多種 legacy provider、正式檔案 hydration | 新 fixture store 需明確隔離，不直接混用 root 的 formal library |
| Work／FileAsset services | 已有正式讀寫路徑且部分 owner-only | UI-only command 不得呼叫原有 DB action；角色顯示不當作真實授權證明 |
| ARC-038 | 原本固定五分頁 | 新公司工作台採已選定的情境分頁；未納入頁面維持原行為 |
| ARC-039 | Personal／Workspace 設定分層，Finance 目前屬個人 | 公司帳本獨立 DTO／store，不擴大私人 Finance 權限 |
| PRD-004 | 工作樹已預先刪除 | 以 `git show HEAD:...` 讀歷史，不還原使用者刪除；本階段新增 PRD-006 明確入口 |

## 3. 同頁需求理解評分

這是工作日誌＋空間與模式接合頁的評分，不是整套營運系統的成熟度或上線分數。

| 維度 | 分數 |
|---|---:|
| Actor/job clarity | 19/20 |
| PRD/local evidence fit | 19/20 |
| Data/BFF/API clarity（限 UI-only） | 17/20 |
| UI interaction/reference confidence | 14/15 |
| Risk/auth/public-output boundary | 13/15 |
| Acceptance/verification | 9/10 |
| Total | 91/100（High） |

依 AGENTS.md，高理解度須完成 3 輪。下列是同一問題的三個研究視角；跨模組正式資料、薪資規則和具體 Screen ID 仍待各自處理。

## 4. 三輪研究與需求收斂

| 輪次 | 視角／實際檢查 | 收斂後需求 | 採用／不採用 |
|---|---|---|---|
| R1 | 使用者情境、v4/v5 書寫與 v2 整合修正 | 公司工作日誌的作者視角；一般共享／受限例外；大綱、模板及引用；第一筆從空白開始 | 採用工作直接在公司；不採用先私人再交接或只用簡化表單 |
| R2 | 現有 Workspace、layout、MockDataModeProvider、formal library 接線 | 同一 UI-safe contract，獨立 UI-memory adapter；模式不能控制登入、正式資料或 provider activation | 採用專用 phase provider；不採用全域 boolean 替換、畫面層藏資料或 DB seed |
| R3 | 本地 Next.js env guide、官方文件、空／滿資料與 session 驗收 | server-only enum；empty 預設、invalid 明確錯誤、無 localStorage override；空資料也可建立第一筆、引用更新及最後一筆刪除 | 採用 env → DTO → 同一組元件；不採用 NEXT_PUBLIC_ runtime 切換假設、query override 或兩套分叉頁面 |

三輪產物：PRD-006 情境／互動、ARC-040 模式及資料邊界、ACC-008 可驗證矩陣、PLN-070 首段可實作 task shape。

## 5. 外部方法核對

[Next.js 官方 environment variables guide](https://nextjs.org/docs/app/guides/environment-variables) 說明 server-only env、NEXT_PUBLIC_ 在 build 時內嵌與動態渲染時讀取 runtime env。本地版本亦已閱讀：[environment-variables.md](../../node_modules/next/dist/docs/01-app/02-guides/environment-variables.md)。

選擇 server reader 傳 enum 的方式，是依本專案需要 runtime 可辨識模式與 SSR 一致性作的推論；不是官方指定的圓展架構。模式更改後重啟 server，部署的 env 生效機制另按部署平台驗證。

UI 參考採使用者提供且已接受的原型；本次未做新的外部 usability study，不宣稱量化效率提升。

## 6. 尚待逐頁研究

- 工作日誌實際路由／Screen ID、編輯器選型、資料型別與編輯撤銷操作。
- 層級聊天室與物件關聯、Evidence 版本 UI、財務／對帳、承諾、容量各自的 scope、理解評分及要求輪次。
- UI-only 的角色 read/edit 模擬可先明列；正式管理員讀草稿、離職保留、核准／付款與 provider 流程另定權限規格。
- 對現有某一正式頁面導入 UI-phase adapter 前，重新確認當時 dirty overlap、screen approval、auth 和業務資料呼叫邊界。

## 7. Agent／NANDA

本次不建立、路由或啟用 agent capability，不新增 AI 工作面或 provider call。NANDA gate 已檢查為不適用；ARC-028 的 `externalRegisterable: false` 及外部 agent 不直接存取 DB 的既有邊界維持。原型中的 AI 建議只作歷史設計背景；未排入本 UI 階段的自主執行。
