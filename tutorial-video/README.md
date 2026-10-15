# 日誌教學影片工具組

2026-10-03 建立。觀眾：圓展內部新成員。形式：分章短片加一支總覽。

## 做法

1. **錄**：Playwright 腳本在 showcase 預覽上操作真實的日誌介面，錄成影片（`record/`）。
2. **合成**：HyperFrames（HeyGen 開源，用 HTML + GSAP 寫影片）把錄影放進畫框，加章節卡、字幕、按鍵提示與放大，輸出 MP4（`sample/`）。

## 這個資料夾

| 檔案 | 內容 |
|---|---|
| `樣片_第2章_開始寫.mp4` | 12.5 秒樣片，證明整條流程走得通。構圖與字幕時間還沒調 |
| `sample/index.html` | 樣片的合成原始檔，字幕文案與動畫都在這裡 |
| `sample/footage.mp4` | 樣片用的真實介面錄影 |
| `record/ch02-sample.cjs` | 錄製腳本 |
| `setup-cloud.sh` | 在雲端工作區重建預覽與資料庫的步驟 |
| `package.json` | 工具版本：hyperframes 0.8.114、playwright 1.63.0、gsap 3.14.2 |

## 在哪裡跑

**雲端工作區（已實測）**：Chromium、ffmpeg、中文字型、PostgreSQL 都有。預覽、錄影、合成三步都跑通。算圖速度約為影片長度的 7 倍（12.5 秒算 84 秒）。工作區閒置後會被回收，下次要用 `setup-cloud.sh` 重建。

**你的 Mac（未實測）**：理論上更單純，因為專案本來就在上面跑。

```bash
cd tutorial-video && npm install && npx hyperframes doctor
# 另開終端機，在專案根目錄：node scripts/start-yuanzhan-ui-preview.mjs showcase 3011
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run record:sample
npm run render:sample
```

## 已知限制

- 雲端工作區連不到 jsdelivr 與 Google Fonts，所以 GSAP 用本地檔、字型用系統的 Noto Sans CJK TC。`hyperframes lint` 會因此報字型錯誤，算圖結果正常。
- showcase 示範資料裡有私人語氣的句子（例如「今天有點想媽媽和大阿姨」），正式錄製前要換成教學用資料。
- 錄影時頂端有黃色「預覽模式」橫幅，正式錄製要用 CSS 隱藏。
- 語音旁白未做。HyperFrames 支援本地語音合成（Kokoro），中文模型下載得到，音質沒試。

## 成片與重錄方式（2026-10-03 更新）

`成片/` 有 10 支：`第0章_總覽.mp4` 與第 1–9 章，1080p，含 Kokoro 女聲旁白與字幕。

`prod/` 是整套製作檔，每章一個資料夾：

| 檔案 | 用途 |
|---|---|
| `chNN/shots.json` | 每個鏡頭的旁白（同時是字幕）、章名、重點卡 |
| `chNN/record.cjs` | 該章的錄製腳本（Playwright 操作真實介面） |
| `chNN/edit.json` | 鏡頭縮放、框線、按鍵提示的時間點 |
| `lib/tts.py` | 依 shots.json 合成旁白 |
| `lib/rec.cjs` | 錄製共用工具（假游標、同步閃光、鎖定捲動位置） |
| `lib/compose.mjs` | 產生 HyperFrames 合成檔 |
| `lib/overview.py` | 從各章錄影剪出總覽 |
| `tutorial-demo-data.patch` | 「秋季展籌備」示範資料，套在 `src/lib/ui-data/yuanzhan/v5-seed.js` |

重做一章（在 `prod/` 下）：

```bash
python lib/tts.py ch03          # 改了旁白才需要
node ch03/record.cjs            # 改了操作才需要
node lib/compose.mjs ch03
lib/render-all.sh ch03          # 輸出 ch03/ch03.mp4
```

錄製前，雲端那份程式另外改了兩處 `runtime.js`（都只在網址帶特定參數時生效）：`?tutFresh=1` 拿掉宇星當天的開工紀錄（第 2 章用），`?tutNoStandup=1` 拿掉當天預先放好的 Standup（第 3 章用）。這兩處沒有寫回你的專案。
