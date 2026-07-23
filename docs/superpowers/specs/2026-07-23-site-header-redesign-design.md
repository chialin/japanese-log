# 全站 Header 改版設計（三分組膠囊 · 融合 handoff）

日期：2026-07-23
狀態：已定案，待撰寫實作計畫

## 背景

`design_handoff_tabemashita_lesson` 交來一份重新設計的 header（Organic 風格：圓潤膠囊、Caprasimo 圓體字、赤陶＋鼠尾草綠）。該風格與本專案既有的「文學／信箋 serif 系統」（Shippori Mincho、棕橘色票、扁平 letterpress）差異很大。

經 brainstorming 確認方向為**融合**：以現有 serif 系統與色票為底，吸收 handoff 的「三分組膠囊」結構，但用 serif 語彙重繪，不引入新字體或新色系。

## 目標與範圍

- 改的是**全站共用元件**：`js/site-chrome.js` 的 `<site-header>` 與 `shared.css` 的 `.site-header` 區塊。所有頁面（`lessons/*`、`readings/*`、`index.html`、`my-name-katakana.html`、`resources.html`、`vocab-quiz.html` …）都會套到新 header。
- **不改** footer、頁面內容、色票 token、字體。
- **不引入** handoff 的 Caprasimo/Figtree 字體、鼠尾草綠 `--color-accent-2`、也不用 handoff README 的 `--color-*` 命名；一律沿用現有 `--paper / --accent / --accent-pale / --line …` token。

## 視覺設計（定案）

三分組 flex，`justify-content: space-between`：

```
[ 品牌「學習日誌」 ]      [ 導覽膠囊 ]      [ 控制膠囊 ]
```

- **列**：底色 `--accent-pale`（淡赤陶），底部 `2px solid var(--accent)`。沿用現有 `.site-header` 的 `100vw` 貼邊技巧。
- **品牌「學習日誌」**：`Shippori Mincho` 600、`letter-spacing:.05em`、色 `var(--accent)`、約 18px。
- **導覽膠囊**：白底（`--paper`）圓角 `999px`，`box-shadow: 0 2px 8px rgba(120,60,20,.10)`，內含三個連結「關於我 · 資源 · 練習」。每個連結 padding `5px 13px`、圓角膠囊、色 `--ink-soft`。
- **控制膠囊**：白底圓角 `999px`、同款陰影；內含**耳機 icon** ＋音量滑桿。
- **耳機 icon**：Lucide headphones 線條 SVG，`stroke="currentColor"`（＝`var(--accent)`）、`stroke-width:2.5`、16px。取代原本的 🔈/🔇 emoji。

### 目前頁面高亮

導覽三項依 `location.pathname` 判斷 active，命中者加 `active`：背景 `--accent-pale`、文字 `--accent`。

| 連結 | 目標頁 |
|------|--------|
| 關於我 | `my-name-katakana.html` |
| 資源 | `resources.html` |
| 練習 | `vocab-quiz.html` |

一般課程／閱讀頁不屬於這三者，三項皆不高亮（正常）。

### 自動配色（跨頁主題）

膠囊底色、列底色、accent 全用 `var(--accent-*)` token。因各頁 `:root` 色票不同，header 會自動跟著頁面主題走：

- `lessons/*` + `index`：棕橘
- `readings/*`：深紅
- `my-name-katakana.html`：海軍藍

無需為各主題另寫 header 樣式。

### 控制膠囊的條件顯示

沿用現有 `hasTTS`（頁面是否載入 `tts.js`）判斷：

- **有 TTS**（課程／閱讀頁）：顯示控制膠囊。
- **無 TTS**（`index`、`resources` 等）：不顯示控制膠囊。此時只剩「品牌 ｜ 導覽膠囊」兩組，`space-between` 讓導覽膠囊靠右。

### 首頁

首頁（`index.html`）不需要「回學習日誌」連結，品牌文字改成**不可點的 `<span>` 落款**（非 `<a>`），維持三分組平衡。其餘頁面品牌為指向 `index.html` 的連結。

### 音量 mute 回饋

原本用 emoji 在 `v===0` 切換 🔇 表示靜音。改用 SVG 後：耳機 icon 常態 `var(--accent)`；`v===0`（靜音）時 icon `opacity:.35` 變淡，作為靜音回饋。滑桿位置本身也傳達音量。

### 響應式（手機版 · M1）

窄螢幕（`max-width: 560px`）三分組放不下，收合為 **M1**：

- **第一排**：品牌（左）＋ 控制膠囊（右），`space-between`。
- **第二排**：導覽膠囊**整寬置中**（`justify-content:center`），方便點按。
- 無 TTS 的頁面：無控制膠囊，第一排只有品牌，第二排導覽膠囊整寬。

## 保留的現有行為

- 音量滑桿：`localStorage['jtalk-volume']`（0–1，預設 0.5）、`JTalk.setVolume(v)`、`input` 事件即時更新。邏輯不變，只是外觀包進控制膠囊、icon 換耳機。
- `siteChromePrefix()` 依 `lessons/`、`readings/` 路徑決定 `../` 前綴。不變。
- `<site-footer>` 完全不動。

## 受影響檔案

| 檔案 | 變更 |
|------|------|
| `js/site-chrome.js` | 重寫 `SiteHeader.connectedCallback` 的 `innerHTML`：三分組結構、耳機 SVG、active 判斷、首頁品牌 span。音量事件邏輯沿用，補上 mute 變淡。 |
| `shared.css` | 重寫 `.site-header` 區塊：列底色改 `--accent-pale`、新增 `.site-nav`（膠囊化）、`.site-control`（控制膠囊）、active 樣式、`@media (max-width:560px)` 的 M1 收合。移除／改寫舊 `.site-volume` 扁平樣式。 |

## 非目標（YAGNI）

- 不做漢堡選單／抽屜（三項連結 + 滑桿換行即可）。
- 不加新導覽項目。
- 不改 footer、不改頁面內容區塊。
- 不引入 handoff 的第二強調色與新字體。

## 驗證方式

無 build／test。以瀏覽器預覽逐項確認：

1. 桌機：課程頁（棕橘）、閱讀頁（深紅）、關於我頁（海軍藍）三分組與自動配色正確。
2. active 高亮：走到 `resources.html` / `vocab-quiz.html` / `my-name-katakana.html` 對應項高亮。
3. 無 TTS 頁（`index`、`resources`）不出現控制膠囊、導覽靠右。
4. 首頁品牌為不可點落款。
5. 音量：拖曳滑桿即時生效、重整後記憶、`v=0` 耳機變淡。
6. 手機（≤560px）：M1 兩排收合，導覽膠囊整寬置中。
