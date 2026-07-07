# 全站 Header 導覽 + 首頁瘦身 — 設計文件

日期：2026-07-07
類型：全站靜態 HTML 結構調整 + 新 Web Component + 一次性 rollout 腳本（無 build/test framework）

## 背景 / 目標

`index.html` 目前混雜了兩種內容：「每日學習 log」跟四個一次性資源入口（關於我、手帖、資源、練習，各自一個 divider + 一張卡片）。這次改版把後者搬到一個新的全站共用 header 導覽列，讓首頁只保留 hero + 統計 + 日曆 + 學習紀錄。

同時，每頁現有的 `<header class="masthead">`（左＝類別／中＝標題／右＝日期 三欄）拿掉，改成：新的共用 header 導覽列（含返回首頁連結）＋ 頁面既有標題（`page-title`/`hero h1`/`book-title`/`brand-name`）正下方一行「類別 · 日期」的 `page-meta`。

## 範圍

- 全站掛 `shared.css` 的 61 個現有 HTML：`index.html`、`my-name-katakana.html`、`store-phrasebook.html`、`vocab-quiz.html`、`slowpaper.html`、`credits.html`（root，共 6）＋ `lessons/*.html` 54 個（含 `_skeleton.html` 樣板）＋ `readings/*.html` 1 個。
- 新增 1 個頁面：`resources.html`（root）。
- 新增 1 個共用 JS：`js/site-chrome.js`。
- `shared.css` 新增／刪除若干規則。
- 新增 1 個一次性 rollout 腳本：`scripts/add-site-chrome.mjs`。

非目標（YAGNI）：
- 不做 nav 目前頁面的 active 高亮（哪頁都顯示同樣三個連結）。
- 不改 TTS（`js/tts.js`）、不改各頁課程內容本身。
- SEO meta（description/OG tag 等）不在這份 spec 內，留待下一份 spec 討論。

## 1. `<site-header>` Web Component

`js/site-chrome.js` 用 `customElements.define` 定義 `<site-header>`（模板字串內嵌在 JS 裡，不用 `fetch`，`file://` 開檔也沒有 CORS 問題）。

**內容**：一列 chrome bar，左邊「返回首頁」連結、右邊三個導覽連結：

```html
<div class="site-header">
  <a class="home-link" href="{prefix}index.html">學習日誌</a>
  <nav class="site-nav">
    <a href="{prefix}my-name-katakana.html">關於我</a><span class="sep">·</span>
    <a href="{prefix}resources.html">資源</a><span class="sep">·</span>
    <a href="{prefix}vocab-quiz.html">練習</a>
  </nav>
</div>
```

- `{prefix}` 由元件內部依 `location.pathname` 判斷：路徑含 `/lessons/` 或 `/readings/` → `../`，否則空字串。
- **在 `index.html` 上不顯示 `home-link`**（已經在首頁），只顯示右邊三個導覽連結，整列靠右對齊（用 `location.pathname` 判斷是否為 `/`、`/index.html` 結尾）。
- 不做 active 高亮，三個連結在任何頁面上樣式都一樣。

## 2. `<site-footer>` Web Component

同一個 `js/site-chrome.js` 內定義 `<site-footer>`，render 現在 `index.html` 既有的 footer 內容（搬過去、全站共用）：

```html
<footer class="footer-area">
  <div><a href="https://chialin.me">chialin.me</a> · <a href="https://blog.chialin.me">blog</a> · <a href="{prefix}credits.html">credits</a></div>
  <div class="seal">日</div>
  <div>毎日少しずつ。</div>
</footer>
```

`{prefix}` 邏輯與 `<site-header>` 相同。

## 3. Masthead 移除 + `page-meta` 新增

**移除**：每頁現有的
```html
<a href="(../)?index.html" class="back-link">← 返回 学習日誌</a>
<header class="masthead">
  <div class="left">…</div>
  <div class="center">…</div>
  <div class="right">…</div>
</header>
```
整塊刪除（`back-link` 功能已併入 `<site-header>` 的「學習日誌」連結；`masthead` 三欄不再顯示）。

**新增**：在頁面既有標題元素**正下方**插入一行 `page-meta`，內容＝舊 masthead 的 `left` 文字 + `·` + `right` 文字：

```html
<h1 class="page-title">は<span class="accent">行</span></h1>
<div class="page-meta">五十音 · Gojuon · 2026 / 05 / 04</div>
<p class="page-subtitle">…</p>
```

各頁面型態的「標題元素」不同，插入點對應：

| 頁面型態 | 標題元素 | 插入點 |
|---|---|---|
| `lessons/*`、`readings/*`（絕大多數，用 `_skeleton.html` 樣板） | `<h1 class="page-title">` | 該 `</h1>` 之後 |
| `index.html` | `.hero h1` | 該 `</h1>` 之後（`page-meta` 加 `text-align:center` 對齊 hero） |
| `store-phrasebook.html` | `.book-cover h1.book-title` | 該 `</h1>` 之後 |
| `vocab-quiz.html`、`credits.html` | 已用 `<h1 class="page-title">`，跟 lessons 同一套 | 該 `</h1>` 之後（腳本自動處理，不用特例） |
| `slowpaper.html` | `.brand-hero .brand-name`（**非 `<h1>`，腳本抓不到**） | 該 `.brand-name` 的 `</div>` 之後 — 手動插入 |
| `my-name-katakana.html` | `.name-display .name-jp`（**非 `<h1>`，腳本抓不到**） | 該 `.name-jp` 的 `</div>` 之後 — 手動插入 |
| 新 `resources.html` | 新寫的頁面，見第 5 節 | 直接照第 5 節寫，不經過腳本 |

## 4. CSS（`shared.css`）

新增：
- `.site-header`：flex 兩端對齊、`background: var(--paper-deep)`、`border-bottom: 2px solid var(--accent)`、左右各留一點 padding，跟內容之間有明顯的一塊分隔（底色卡 + 粗線，非純細線）。
- `.site-header .home-link`：Cormorant Garamond 斜體、`var(--ink-mute)`，hover 變 `var(--accent)`。
- `.site-header .site-nav`：同款字體，多個連結用 `·`（`.sep`，`var(--line)` 色）分隔。
- `.page-meta`：Cormorant Garamond 斜體、`var(--ink-mute)`、小字、字距寬一點，樣式介於舊 masthead 的 `.left`/`.right` 之間。
- `.footer-area`（**從 `index.html` 內嵌 `<style>` 搬過來**，單一來源）。

刪除：
- `.masthead`、`.masthead .left/.right/.center` 規則（全站不再使用）。
- `.back-link` 規則（全站不再使用；已確認除了首頁返回連結外，無其他頁面把這個 class 用在別的用途）。
- `index.html`、`my-name-katakana.html`、`slowpaper.html` 內嵌 `<style>` 裡重複的 `.footer-area` 規則（這三個檔案目前都各自寫了一份 `.footer-area` CSS，其中 my-name-katakana.html／slowpaper.html 至今從未實際 render footer，是死代碼；改用 `<site-footer>` 後統一交給 shared.css）。

## 5. 新頁面 `resources.html`

Root 層級，沿用 index.html 卡片清單（`lesson-link`）的視覺，取代原本首頁上「手帖 · Phrasebook」＋「資源 · Resources」兩個 divider 區塊：

```html
<div class="site-header">…</div>
<h1 class="page-title">資 <span class="accent">源</span></h1>
<div class="page-meta">資源 · Resources</div>
<p class="page-subtitle">手帖與練字帖資源</p>

<ul class="lesson-list">
  <li><a class="lesson-link" href="store-phrasebook.html">
    <div class="lesson-meta">店員さんとの会話帖 · Phrases for the Counter</div>
    <div class="lesson-title">店員對話手帖 <span class="arrow">→</span></div>
    <div class="lesson-summary">餐廳・咖啡・花店・超市・便利商店・拉麵店 — 店員會問什麼、你可以怎麼回（可發音，另附 PDF）</div>
  </a></li>
  <li><a class="lesson-link" href="slowpaper.html">
    <div class="lesson-meta">slowpaper · ひらがな練字帖（免費試用）</div>
    <div class="lesson-title">50 音 PDF 練字帖 <span class="arrow">→</span></div>
    <div class="lesson-summary">我自己做的練字帖品牌 — 免費 7 頁試用（あ行 5 頁 ＋ が ＋ きゃ），Supernote／iPad／列印皆可</div>
  </a></li>
</ul>

<site-footer></site-footer>
```

沿用 `lessons/_skeleton.html` 的 `<head>`（棕橘色票、字體、favicon）與 `<script src="js/site-chrome.js" defer>`。

## 6. `index.html` 改動

- 移除舊 `<header class="masthead">` 三欄，`<site-header>` 取代（首頁不顯示 home-link，只有導覽）。
- `.hero h1` 下方加 `<div class="page-meta">カリン · 日本語 · 2026 · Spring</div>`。
- 移除四個 divider + `lesson-list` 區塊：「關於我 · About」「手帖 · Phrasebook」「資源 · Resources」「練習 · Practice」（連同各自唯一的一張卡片）。
- 「學習紀錄 · Log」區塊與 calendar/stats 邏輯不變。
- 移除內嵌 `<style>` 裡的 `.footer-area` 規則、`</footer>` 區塊改用 `<site-footer></site-footer>`。

## 7. 一次性 rollout 腳本 `scripts/add-site-chrome.mjs`

ESM，無依賴，沿用專案 `scripts/*.mjs` 慣例（shebang、中文標頭、相對路徑、從 repo root 執行），冪等。

掃描範圍：root 6 個主題頁 + `lessons/*.html`（含 `_skeleton.html`）+ `readings/*.html`。（`resources.html` 是新寫的檔案，直接照第 5 節手寫，不靠腳本）

對每個檔案：

1. **script include**：若 `<script src=".../js/site-chrome.js"` 不存在，於 `<link rel="stylesheet" href="(../)?shared.css">` 那行之後插入 `<script src="(../)?js/site-chrome.js" defer></script>`。
2. **移除 back-link**：若存在 `<a href="(../)?index.html" class="back-link">…</a>` 整行，刪除。
3. **移除 masthead + 插入 page-meta**：
   - 抓 `<header class="masthead">` 到對應 `</header>` 之間的 `.left` / `.right` 文字內容。
   - 刪除整個 `<header class="masthead">…</header>` 區塊。
   - 找檔案中第一個 `</h1>`：
     - 若找到 → 緊接其後插入 `<div class="page-meta">{left} · {right}</div>`。
     - 若找不到（目前已知 `slowpaper.html`、`my-name-katakana.html` 兩個檔案沒有 `<h1>`）→ **不自動插入**，在腳本輸出印 `⚠ <file> — no <h1>, page-meta 需手動插入`，交給實作計畫手動處理。
4. **插入 `<site-header>`**：於 `<body>` 開始標籤後（也就是原本 back-link 所在位置附近）插入 `<site-header></site-header>`。
5. **插入 `<site-footer>`**：於檔案結尾、`.wrap`（或 `index.html` 的 `.container`）收尾的最後一個 `</div>` 之前插入 `<site-footer></site-footer>`。

冪等判斷：若檔案已含 `<site-header` 則整檔跳過（印 `skip <file>`），確保可重複執行。

`index.html` 本身的四個 divider 區塊移除與內嵌 `.footer-area` CSS 清理，不靠這支通用腳本（結構跟其他頁差異太大），在實作計畫中列為手動編輯步驟。

## 交付物

1. `js/site-chrome.js`（新檔案，`<site-header>` + `<site-footer>` 定義）
2. `shared.css`（新增 `.site-header`／`.page-meta`／`.footer-area`，刪除 `.masthead`／`.back-link`）
3. `resources.html`（新檔案）
4. `scripts/add-site-chrome.mjs`（新腳本）
5. 全站 61 個既有 HTML 套用腳本後的結果（+ `slowpaper.html`、`my-name-katakana.html` 手動補 `page-meta`）
6. `index.html` 手動調整（移除 4 個 divider 區塊、hero 加 page-meta、footer 換元件）
7. `lessons/_skeleton.html` 同步更新（往後新頁直接繼承新結構）

## 驗證

- `grep -rl "site-header" *.html lessons/*.html readings/*.html | wc -l` → 62（61 個既有頁 + 新 `resources.html`，含 skeleton）。
- `grep -rl "class=\"masthead\"" *.html lessons/*.html readings/*.html` → 無結果（全部移除）。
- 冪等：重跑 `node scripts/add-site-chrome.mjs` → 全部 `skip`，`git status` 乾淨。
- 瀏覽器抽查：`index.html`（無 home-link，四個 divider 區塊消失，hero 下方有 page-meta，footer 是 `<site-footer>` render 出來的）、一個 `lessons/*` 頁（page-title 下方有 page-meta，header 有底色卡+粗線分隔+返回連結+三個導覽連結）、`store-phrasebook.html`、`vocab-quiz.html`、`credits.html`、`slowpaper.html`／`my-name-katakana.html`（手動確認 page-meta 位置）、新 `resources.html`（兩張卡片連到 store-phrasebook.html / slowpaper.html）。
- Console 無 JS error；`file://` 直接雙擊開啟 `index.html` 也要正常 render（不能依賴 fetch/CORS）。

## 風險 / 已知

- `slowpaper.html`、`my-name-katakana.html` 都沒有 `<h1>`，rollout 腳本會 skip 這兩頁的 `page-meta` 自動插入，需要手動加在 `.brand-name` / `.name-jp` 後面。
- 移除 `.masthead`／`.back-link` CSS 屬於破壞性清理，若之後發現有頁面遺漏被腳本正確處理（例如未來新增頁面手動複製舊版 `_skeleton.html` 或忘記重跑腳本），該頁會缺少返回首頁的路徑——但 `_skeleton.html` 樣板本身已同步更新，之後複製樣板的新頁不受影響。
- Web Component 定義若 `js/site-chrome.js` 載入失敗（例如檔案遺失），`<site-header>`/`<site-footer>` 標籤會直接顯示空白（無 fallback 內容）——可接受，跟現有 `js/tts.js` 失敗時的錯誤處理程度一致（無 fallback）。
