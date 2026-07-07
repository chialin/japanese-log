# 全站 Header 導覽 + 首頁瘦身 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「關於我／手帖／資源／練習」四個入口從首頁搬到全站共用的 `<site-header>` 導覽列，拿掉每頁的 `<header class="masthead">` 三欄，改成標題下方一行 `page-meta`（類別＋日期），並新增 `resources.html` 整合手帖與 slowpaper。

**Architecture:** 兩個 Web Component（`<site-header>`／`<site-footer>`，定義在 `js/site-chrome.js`，模板字串內嵌不用 fetch）套用到全站 61 個既有 HTML + 1 個新頁 `resources.html`。既有 61 個檔案裡，59 個結構一致（有 `<h1>`），靠一支冪等的 Node 腳本 `scripts/add-site-chrome.mjs` 自動改寫；2 個沒有 `<h1>` 的例外檔案（`slowpaper.html`、`my-name-katakana.html`）與 `index.html` 特有的區塊搬移，用手動編輯完成。

**Tech Stack:** 純靜態 HTML/CSS/JS，無 build、無套件、無自動化測試框架（純 Node ESM 腳本 + 瀏覽器手動驗證，沿用本專案 `scripts/add-favicon.mjs` 的慣例）。

## Global Constraints

- 全站每頁 `:root` 一律要有 `--paper`／`--paper-deep`／`--ink`／`--ink-soft`／`--ink-mute`／`--accent`／`--accent-soft`／`--accent-pale`／`--line` 這組變數（design doc 已確認全站皆備），新 CSS 只能用這組變數，不得新增色票變數。
- 不做 nav 目前頁面的 active 高亮（design doc 明確排除，YAGNI）。
- 不改 `js/tts.js`、不改各頁課程內容本身、不做 SEO meta（design doc 排除，留待下一份 spec）。
- `<site-header>`/`<site-footer>` 模板字串內嵌在 JS 裡，不用 `fetch`（`file://` 開檔沒有 CORS 問題）。
- 所有腳本改動必須冪等（可重複執行不出錯、不重複插入）。
- 每個字型/色票規則沿用專案既有慣例：Shippori Mincho（標題）／Cormorant Garamond 斜體（meta/羅馬拼音類）／Noto Serif TC（正文）。

---

## 參考：Design Doc

完整設計見 [`docs/superpowers/specs/2026-07-07-site-header-nav-design.md`](../specs/2026-07-07-site-header-nav-design.md)。本計畫的每個 Task 對應 design doc 的對應章節（已在各 Task 標題註明）。

---

### Task 1: `shared.css` — 新增 site-header／page-meta／footer-area／lesson-list 樣式

對應 design doc 第 4 節（CSS 新增部分；刪除部分留到 Task 7）。

**Files:**
- Modify: `shared.css`

**Interfaces:**
- Produces：`.site-header`（含 `.home-page` 變體、`.home-link`、`.site-nav`、`.sep`）、`.page-meta`、`.footer-area`（含 `.seal`）、`.lesson-list`/`.lesson-link`（含 `[href^="readings/"]` 變體）— 這些 class 名稱是 Task 2～6 所有 HTML 都會直接使用的字面 class 名稱。

- [ ] **Step 1: 在 `shared.css` 的 `.kana-compare` 區塊之後（第 269 行之後）、`/* ── Responsive ── */` 之前，插入新規則**

在 `shared.css` 裡找到這段（現有第 265～271 行）：

```css
.kana-char {
  font-family: 'Klee One', 'Shippori Mincho', serif; font-size: 28px; font-weight: 600;
  color: var(--ink); background: var(--accent-pale);
  padding: 6px 10px; border: 1px solid var(--line);
}

/* ── Responsive ── */
```

改成（在 `.kana-char` 規則和 `/* ── Responsive ── */` 之間插入以下整段）：

```css
.kana-char {
  font-family: 'Klee One', 'Shippori Mincho', serif; font-size: 28px; font-weight: 600;
  color: var(--ink); background: var(--accent-pale);
  padding: 6px 10px; border: 1px solid var(--line);
}

/* ── Site header（全站導覽列，取代舊 masthead）── */
.site-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 4px; margin: 0 0 32px;
  background: var(--paper-deep);
  border-bottom: 2px solid var(--accent);
}
.site-header.home-page { justify-content: flex-end; }
.site-header .home-link {
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  color: var(--ink-mute); text-decoration: none; font-size: 14px; letter-spacing: .1em;
  transition: color .2s;
}
.site-header .home-link:hover { color: var(--accent); }
.site-header .site-nav {
  display: flex; gap: 18px;
  font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 14px; letter-spacing: .08em;
}
.site-header .site-nav a { color: var(--ink-mute); text-decoration: none; transition: color .2s; }
.site-header .site-nav a:hover { color: var(--accent); }
.site-header .site-nav .sep { color: var(--line); }

/* ── Page meta（標題正下方的類別＋日期，取代舊 masthead 三欄）── */
.page-meta {
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  color: var(--ink-mute); font-size: 14px; letter-spacing: .12em;
  margin-bottom: 28px;
}

/* ── Footer（全站共用，原本只在 index.html）── */
.footer-area {
  margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--line);
  display: flex; justify-content: space-between; align-items: center;
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  color: var(--ink-mute); font-size: 14px; letter-spacing: .1em;
}
.footer-area a { color: var(--accent); text-decoration: none; }
.footer-area a:hover { text-decoration: underline; }
.footer-area .seal {
  width: 40px; height: 40px; border: 2px solid var(--accent); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Shippori Mincho', serif; font-weight: 700; font-size: 16px;
  transform: rotate(-6deg);
}

/* ── Lesson/resource card list（原本只在 index.html 內嵌，現在 resources.html 也要用）── */
.lesson-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.lesson-link {
  display: block; background: rgba(255,255,255,.55); border: 1px solid var(--line);
  border-left: 3px solid var(--accent); padding: 16px 20px; text-decoration: none; color: inherit;
  transition: border-color .15s, background .15s, transform .15s;
}
.lesson-link:hover { border-color: var(--accent); background: rgba(255,255,255,.8); transform: translateX(4px); }
.lesson-link[href^="readings/"] { border-left-color: var(--reading-accent); }
.lesson-link[href^="readings/"]:hover { border-color: var(--reading-accent); }
.lesson-meta {
  font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 14px; letter-spacing: .15em;
  color: var(--ink-mute); text-transform: uppercase; margin-bottom: 4px;
}
.lesson-title {
  font-family: 'Shippori Mincho', serif; font-size: 17px; font-weight: 600; margin-bottom: 4px;
  display: flex; align-items: center; gap: 8px;
}
.lesson-title .arrow { margin-left: auto; color: var(--ink-mute); transition: transform .15s; }
.lesson-link:hover .lesson-title .arrow { color: var(--accent); transform: translateX(4px); }
.lesson-summary { font-size: 14px; color: var(--ink-soft); }

/* ── Responsive ── */
```

> 注意：`.lesson-link[href^="readings/"]` 用到 `var(--reading-accent)` —— 這個變數目前只有 `index.html` 的 `:root` 有定義（`resources.html` 用不到這個選擇器，因為它的卡片連到 `store-phrasebook.html`/`slowpaper.html`，不是 `readings/`）。變數在其他頁面未定義時，這條規則單純不生效，不會報錯。

- [ ] **Step 2: 在既有 `@media (max-width: 640px)` 區塊裡加一行讓 site-header 在窄螢幕自動換行**

找到（現有最後一段）：

```css
@media (max-width: 640px) {
  .wrap { padding: 32px 18px 64px; }
  .masthead { grid-template-columns: 1fr; text-align: center; gap: 10px; }
  .masthead .right { text-align: center; }
  .gojuon { gap: 6px; }
  .kana-big { font-size: 26px; }
  .kana-compare { grid-template-columns: 1fr; }
}
```

改成（`.masthead` 那兩行先保留，Task 7 才刪；這裡只新增 `.site-header` 那行）：

```css
@media (max-width: 640px) {
  .wrap { padding: 32px 18px 64px; }
  .masthead { grid-template-columns: 1fr; text-align: center; gap: 10px; }
  .masthead .right { text-align: center; }
  .site-header { flex-wrap: wrap; justify-content: center; gap: 10px; text-align: center; }
  .gojuon { gap: 6px; }
  .kana-big { font-size: 26px; }
  .kana-compare { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: 用瀏覽器檢查語法沒壞掉**

任意開一個現有頁面（例如 `lessons/2026-07-05-gym-flyer.html`）確認畫面跟改之前一樣（因為這階段還沒有任何 HTML 用到新 class，純加規則不應該有任何視覺變化）。

- [ ] **Step 4: Commit**

```bash
git add shared.css
git commit -m "Add site-header/page-meta/footer-area/lesson-list styles to shared.css"
```

---

### Task 2: `js/site-chrome.js` — `<site-header>` / `<site-footer>` Web Component

對應 design doc 第 1、2 節。

**Files:**
- Create: `js/site-chrome.js`

**Interfaces:**
- Consumes：`shared.css` 的 `.site-header`／`.page-meta`／`.footer-area`（Task 1 已新增）。
- Produces：自訂元素 `<site-header></site-header>`、`<site-footer></site-footer>`，往後所有 HTML 直接把這兩個標籤寫進 `<body>` 即可使用；連結路徑靠 `location.pathname` 自動判斷 `lessons/`/`readings/` 底下要不要加 `../` 前綴。

- [ ] **Step 1: 建立 `js/site-chrome.js`**

```js
// js/site-chrome.js
// <site-header> / <site-footer> — 全站共用導覽列與頁尾
// Web Component，模板字串內嵌在這支檔案裡（不用 fetch，file:// 開檔也沒有 CORS 問題）

function siteChromePrefix() {
  return /\/(lessons|readings)\//.test(location.pathname) ? '../' : '';
}

function isHomePage() {
  return /(^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith('/');
}

class SiteHeader extends HTMLElement {
  connectedCallback() {
    const prefix = siteChromePrefix();
    const home = isHomePage();
    const homeLink = home
      ? ''
      : `<a class="home-link" href="${prefix}index.html">學習日誌</a>`;
    this.innerHTML = `
      <div class="site-header${home ? ' home-page' : ''}">
        ${homeLink}
        <nav class="site-nav">
          <a href="${prefix}my-name-katakana.html">關於我</a><span class="sep">·</span>
          <a href="${prefix}resources.html">資源</a><span class="sep">·</span>
          <a href="${prefix}vocab-quiz.html">練習</a>
        </nav>
      </div>
    `;
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    const prefix = siteChromePrefix();
    this.innerHTML = `
      <footer class="footer-area">
        <div><a href="https://chialin.me">chialin.me</a> · <a href="https://blog.chialin.me">blog</a> · <a href="${prefix}credits.html">credits</a></div>
        <div class="seal">日</div>
        <div>毎日少しずつ。</div>
      </footer>
    `;
  }
}

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
```

- [ ] **Step 2: 語法檢查**

Run: `node --check js/site-chrome.js`
Expected: 沒有輸出（語法正確就不會印任何東西，也不會有 exit code 錯誤）。

- [ ] **Step 3: 建一個暫時的 scratch HTML 手動驗證元件行為**

建立 `/tmp/site-chrome-test.html`（純手動驗證用，不進 repo）：

```html
<!DOCTYPE html>
<html><head>
<link rel="stylesheet" href="/Users/chialin/Documents/3-resources/programming/japanese-log/shared.css">
<script src="/Users/chialin/Documents/3-resources/programming/japanese-log/js/site-chrome.js" defer></script>
</head><body>
<site-header></site-header>
<h1>測試標題</h1>
<site-footer></site-footer>
</body></html>
```

用瀏覽器直接開啟這個檔案（`file://` 路徑），確認：
- 畫面上方出現「學習日誌」連結 + 「關於我 · 資源 · 練習」三個連結（因為路徑不是 index.html，所以會顯示 home-link）。
- 畫面下方出現 footer（chialin.me · blog · credits + 印章「日」+「毎日少しずつ。」）。
- 打開瀏覽器 console，確認沒有 JS error。

確認後刪除這個暫存檔（`rm /tmp/site-chrome-test.html`），它不屬於這次改動的交付物。

- [ ] **Step 4: Commit**

```bash
git add js/site-chrome.js
git commit -m "Add site-header/site-footer web components"
```

---

### Task 3: 新增 `resources.html`

對應 design doc 第 5 節。這是第一個「正式」使用 `<site-header>`/`<site-footer>` 的頁面，可以完整跑一次瀏覽器驗證。

**Files:**
- Create: `resources.html`

**Interfaces:**
- Consumes：`js/site-chrome.js`（Task 2）、`shared.css` 的 `.lesson-list`/`.lesson-link`/`.page-title`/`.page-meta`/`.page-subtitle`（Task 1）。
- Produces：兩張卡片連到 `store-phrasebook.html`、`slowpaper.html`，之後 `<site-header>` 的「資源」連結會指到這個檔案（Task 4 的腳本不會碰這個檔案，因為它是新寫的）。

- [ ] **Step 1: 建立 `resources.html`**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>資源 · Resources — 手帖與練字帖</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg" />
<style>
/* root 資源頁 棕橘色票（跟 lessons/* 同一套） */
:root{--paper:#fdf6f0;--paper-deep:#f5e8d8;--ink:#2a1810;--ink-soft:#4a3020;--ink-mute:#8a6040;--accent:#c96830;--accent-soft:#f0b48a;--accent-pale:#fce8d8;--line:#f0d0b8;--bg-spot-1:#fdf0e5;--bg-spot-2:#f8e0c8;}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600;700;800&family=Noto+Serif+TC:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="shared.css" />
<script src="js/site-chrome.js" defer></script>
</head>
<body>
<div class="wrap">
<site-header></site-header>

  <h1 class="page-title">資 <span class="accent">源</span></h1>
  <div class="page-meta">資源 · Resources</div>
  <p class="page-subtitle">手帖與練字帖資源</p>

  <ul class="lesson-list">
    <li>
      <a class="lesson-link" href="store-phrasebook.html">
        <div class="lesson-meta">店員さんとの会話帖 · Phrases for the Counter</div>
        <div class="lesson-title">店員對話手帖 <span class="arrow">→</span></div>
        <div class="lesson-summary">餐廳・咖啡・花店・超市・便利商店・拉麵店 — 店員會問什麼、你可以怎麼回（可發音，另附 PDF）</div>
      </a>
    </li>
    <li>
      <a class="lesson-link" href="slowpaper.html">
        <div class="lesson-meta">slowpaper · ひらがな練字帖（免費試用）</div>
        <div class="lesson-title">50 音 PDF 練字帖 <span class="arrow">→</span></div>
        <div class="lesson-summary">我自己做的練字帖品牌 — 免費 7 頁試用（あ行 5 頁 ＋ が ＋ きゃ），Supernote／iPad／列印皆可</div>
      </a>
    </li>
  </ul>

<site-footer></site-footer>
</div>
</body>
</html>
```

- [ ] **Step 2: 用 `node --check` 等價的 HTML 檢查——用瀏覽器打開驗證**

用瀏覽器直接開啟 `resources.html`（`file://` 路徑），確認：
- 上方 `<site-header>` 顯示「學習日誌」連結（因為不是 index.html）+ 「關於我 · 資源 · 練習」。
- 標題「資源」下方有 `page-meta`「資源 · Resources」。
- 兩張卡片可以點擊，分別連到 `store-phrasebook.html` 和 `slowpaper.html`（此時這兩個檔案還沒被 Task 4 的腳本處理，點過去應該還是舊版畫面，這是預期的，Task 4 之後才會統一）。
- 畫面下方有 footer。
- Console 沒有錯誤。

- [ ] **Step 3: Commit**

```bash
git add resources.html
git commit -m "Add resources.html hub page linking phrasebook + slowpaper"
```

---

### Task 4: `scripts/add-site-chrome.mjs` — 寫腳本並跑過全站

對應 design doc 第 3、7 節。這是本次改動最大的一步：一次性、冪等地把 61 個既有 HTML 轉換成新結構。

**Files:**
- Create: `scripts/add-site-chrome.mjs`
- Modify（由腳本執行寫入，非手動）：root 6 個主題頁（`index.html`／`my-name-katakana.html`／`store-phrasebook.html`／`vocab-quiz.html`／`slowpaper.html`／`credits.html`）＋ `lessons/*.html`（54 個，含 `_skeleton.html`）＋ `readings/*.html`（1 個）

**Interfaces:**
- Consumes：`js/site-chrome.js`（Task 2）、`shared.css` 新規則（Task 1）。
- Produces：全站頁面在 `<body>` 內第一行有 `<site-header></site-header>`，結尾（第一個 `<script` 之前的最後一個 `</div>`）之前有 `<site-footer></site-footer>`，`<head>` 內 shared.css `<link>` 之後有 `<script src="(../)?js/site-chrome.js" defer></script>`，舊的 `back-link`/`masthead` 消失，多數頁面（有 `<h1>` 的）標題下方多一行 `.page-meta`。

- [ ] **Step 1: 建立 `scripts/add-site-chrome.mjs`**

```js
#!/usr/bin/env node
// scripts/add-site-chrome.mjs
//
// 冪等地把全站頁面套上新的 <site-header>/<site-footer>：
//   1. 插入 js/site-chrome.js 的 <script> include（緊接 shared.css <link> 之後）
//   2. 移除舊的「← 返回 学習日誌」連結（class="back-link" 或早期版本的 inline style 寫法）
//   3. 移除 <header class="masthead">…</header>，把裡面 left/right 文字合併成
//      <div class="page-meta">{left} · {right}</div>，插在檔案第一個 </h1> 之後
//      （抓不到 <h1> 的頁面——目前已知 slowpaper.html / my-name-katakana.html——
//       印警告，交給後續手動處理，不自動插入）
//   4. 在 <div class="wrap"> 或 <div class="container"> 開頭標籤後插入 <site-header></site-header>
//   5. 在第一個 <script 標籤之前，找最後一個 </div>（也就是 wrap/container 收尾），
//      在它之前插入 <site-footer></site-footer>
//
// 已含 <site-header 的檔案視為處理過，整檔 skip（可重複執行、冪等）。
//
// 用法：node scripts/add-site-chrome.mjs   （從 repo root 執行）

import { readdir, readFile, writeFile } from 'node:fs/promises';

async function htmlFilesIn(dir) {
  const entries = await readdir(dir);
  return entries
    .filter(n => n.endsWith('.html'))
    .map(n => (dir === '.' ? n : `${dir}/${n}`));
}

const files = [
  ...(await htmlFilesIn('.')),
  ...(await htmlFilesIn('lessons')),
  ...(await htmlFilesIn('readings')),
].sort();

let changed = 0, skipped = 0, warned = 0;

for (const file of files) {
  const src = await readFile(file, 'utf8');

  if (src.includes('<site-header')) { skipped++; console.log(`skip ${file}`); continue; }

  const prefix = file.includes('/') ? '../' : '';
  let out = src;

  // 1. script include
  const cssLineMatch = out.match(/^.*<link rel="stylesheet" href="(?:\.\.\/)?shared\.css"\s*\/?>.*$/m);
  if (!cssLineMatch) {
    console.error(`✗ ${file} — no shared.css link found, skipped entirely`);
    continue;
  }
  const cssLine = cssLineMatch[0];
  out = out.replace(cssLine, `${cssLine}\n<script src="${prefix}js/site-chrome.js" defer></script>`);

  // 2. 移除舊的返回首頁連結（class="back-link" 或早期 inline-style 寫法）
  out = out.replace(/[ \t]*<a href="(?:\.\.\/)?index\.html"[^>]*>[\s\S]*?返回[\s\S]*?<\/a>\n?/, '');

  // 3. 移除 masthead，抓 left/right，插入 page-meta
  const mastheadMatch = out.match(/<header class="masthead">[\s\S]*?<\/header>\n?/);
  if (mastheadMatch) {
    const block = mastheadMatch[0];
    const leftMatch = block.match(/<div class="left">([\s\S]*?)<\/div>/);
    const rightMatch = block.match(/<div class="right">([\s\S]*?)<\/div>/);
    const left = leftMatch ? leftMatch[1].trim() : '';
    const right = rightMatch ? rightMatch[1].trim() : '';
    out = out.replace(block, '');

    const h1Match = out.match(/<h1[^>]*>[\s\S]*?<\/h1>/);
    if (h1Match) {
      out = out.replace(h1Match[0], `${h1Match[0]}\n<div class="page-meta">${left} · ${right}</div>`);
    } else {
      console.warn(`⚠ ${file} — no <h1>, page-meta 需手動插入（left="${left}" right="${right}"）`);
      warned++;
    }
  } else {
    console.error(`✗ ${file} — no masthead found (unexpected)`);
  }

  // 4. 插入 <site-header>：wrap/container 開頭標籤後
  const wrapOpenMatch = out.match(/<div class="(?:wrap|container)">\n?/);
  if (wrapOpenMatch) {
    out = out.replace(wrapOpenMatch[0], `${wrapOpenMatch[0]}<site-header></site-header>\n`);
  } else {
    console.error(`✗ ${file} — no .wrap/.container div found, site-header not inserted`);
  }

  // 5. 插入 <site-footer>：第一個 <script 標籤之前最後一個 </div> 之前
  const scriptIdx = out.search(/<script/);
  const searchRegion = scriptIdx === -1 ? out : out.slice(0, scriptIdx);
  const lastDivIdx = searchRegion.lastIndexOf('</div>');
  if (lastDivIdx === -1) {
    console.error(`✗ ${file} — no closing </div> found, site-footer not inserted`);
  } else {
    out = out.slice(0, lastDivIdx) + '<site-footer></site-footer>\n' + out.slice(lastDivIdx);
  }

  await writeFile(file, out, 'utf8');
  changed++;
  console.log(`+ ${file}`);
}

console.log(`\ndone: ${changed} changed, ${skipped} skipped, ${warned} warnings (missing <h1>)`);
```

- [ ] **Step 2: 執行腳本**

Run: `node scripts/add-site-chrome.mjs`

Expected（依目前檔案數推算，實際數字以腳本輸出為準）：
```
+ credits.html
+ index.html
+ my-name-katakana.html
+ slowpaper.html
+ store-phrasebook.html
+ vocab-quiz.html
+ lessons/_skeleton.html
+ lessons/2026-04-29-a-row.html
... (共 61 個 + 行)
+ readings/2026-05-05-reading-cho.html

done: 61 changed, 0 skipped, 2 warnings (missing <h1>)
```
最後一行的 `2 warnings` 應該對應 `slowpaper.html` 和 `my-name-katakana.html`（腳本會印出這兩行 warning，內容包含各自的 left/right 文字，留給 Task 5 手動處理）。

- [ ] **Step 3: 驗證冪等性（重跑一次應該全部 skip）**

Run: `node scripts/add-site-chrome.mjs`
Expected:
```
skip credits.html
skip index.html
... (61 行 skip)

done: 0 changed, 61 skipped, 0 warnings (missing <h1>)
```

- [ ] **Step 4: grep 驗證全站都有 `<site-header>`**

Run: `grep -rl "<site-header" *.html lessons/*.html readings/*.html | wc -l`
Expected: `61`

- [ ] **Step 5: grep 驗證 masthead 完全消失**

Run: `grep -rl 'class="masthead"' *.html lessons/*.html readings/*.html`
Expected: 無輸出（沒有任何檔案還有 masthead）

- [ ] **Step 6: grep 驗證 back-link 完全消失**

Run: `grep -rl 'class="back-link"' *.html lessons/*.html readings/*.html`
Expected: 無輸出

Run: `grep -l '返回 学習日誌' *.html lessons/*.html readings/*.html`
Expected: 無輸出（包含 `readings/2026-05-05-reading-cho.html` 那個早期 inline-style 版本也要清乾淨）

- [ ] **Step 7: 瀏覽器抽查一個一般 lessons 頁**

用瀏覽器開 `lessons/2026-07-05-gym-flyer.html`，確認：
- 最上方是 `site-header`（底色卡 + accent 粗底線），左邊「學習日誌」連結，右邊「關於我 · 資源 · 練習」。
- 沒有舊的「← 返回 学習日誌」連結，也沒有三欄 masthead。
- 原本的 `<h1 class="page-title">` 標題下方多一行 `page-meta`，內容是原本 masthead 的類別 + 日期（例如「日常生活 · Shopping · 2026 / 07 / 05」，實際文字依該頁原本 masthead 內容而定）。
- 頁面最下方有新的 `<site-footer>`。
- 課程內容（假名卡片、單字、TTS 播放按鈕）跟改之前一樣正常。
- Console 沒有 JS error。

- [ ] **Step 8: 瀏覽器抽查 `readings/2026-05-05-reading-cho.html`（早期 inline-style back-link 的特例）**

確認早期版本的返回連結也被正確移除、`page-meta` 正確顯示「No. 001 · 日本語 · 2026 / 05 / 05」（或類似格式）在 `<h1 class="hero-title">` 下方。

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Roll out site-header/site-footer to all pages, remove masthead/back-link"
```

---

### Task 5: 手動修補沒有 `<h1>` 的兩個頁面 + skeleton TODO 註解

對應 design doc 第 3 節表格裡的 `slowpaper.html`／`my-name-katakana.html` 特例，以及風險章節提到的 `_skeleton.html` 後續維護性。

**Files:**
- Modify: `slowpaper.html`
- Modify: `my-name-katakana.html`
- Modify: `lessons/_skeleton.html`

**Interfaces:**
- Consumes：Task 4 腳本執行後印出的 warning 訊息（含各檔案原本的 left/right 文字，若當時終端輸出已經看不到，参考下面 Step 1/2 給的確切文字，是從 masthead 原始內容手動抄的）。

- [ ] **Step 1: 手動幫 `slowpaper.html` 補 `page-meta`**

打開 `slowpaper.html`，找到 `.brand-hero` 區塊裡的 `.brand-name`（Task 4 跑完後，這個檔案的 masthead 已經被刪掉，`.brand-name` 那塊應該長這樣，沒有 page-meta）：

```html
    <div class="brand-name">slowpaper<span class="dot">.</span></div>
```

改成（在 `.brand-name` 的 `</div>` 之後插入 page-meta，內容是原本 masthead 的 `資源 · Resource` + `slowpaper` 兩個值）：

```html
    <div class="brand-name">slowpaper<span class="dot">.</span></div>
    <div class="page-meta">資源 · Resource · slowpaper</div>
```

- [ ] **Step 2: 手動幫 `my-name-katakana.html` 補 `page-meta`**

打開 `my-name-katakana.html`，找到 `.name-display` 區塊裡的 `.name-jp`（Task 4 跑完後同樣沒有 masthead 了）：

```html
      <div class="name-jp"><span class="accent">シ</span>・カリン</div>
```

改成（插入 page-meta，內容是原本 masthead 的 `私について · About` + `2026 / 05` 兩個值）：

```html
      <div class="name-jp"><span class="accent">シ</span>・カリン</div>
      <div class="page-meta">私について · About · 2026 / 05</div>
```

- [ ] **Step 3: 幫 `lessons/_skeleton.html` 補一句 TODO 提示**

Task 4 跑完後，`_skeleton.html` 的 `<h1 class="page-title">本課標題 <span class="accent">重點字</span></h1>` 下方已經自動多了一行：

```html
<div class="page-meta">類別 · Category · 2026 / 05 / 13</div>
```

在這行前面加一個 TODO 註解，讓未來複製這個樣板的人知道要改（找到這行，改成）：

```html
<!-- TODO: 類別 + 日期，格式「類別 · Category · 2026/05/13」 -->
<div class="page-meta">類別 · Category · 2026 / 05 / 13</div>
```

- [ ] **Step 4: 瀏覽器驗證**

分別打開 `slowpaper.html` 和 `my-name-katakana.html`，確認 `page-meta` 那行正確顯示在標題下方、樣式跟其他頁一致（斜體小字、`--ink-mute` 顏色）。

- [ ] **Step 5: Commit**

```bash
git add slowpaper.html my-name-katakana.html lessons/_skeleton.html
git commit -m "Manually add page-meta to slowpaper/my-name-katakana, annotate skeleton TODO"
```

---

### Task 6: `index.html` — 移除四個 divider 區塊

對應 design doc 第 6 節。

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes：`resources.html`（Task 3）、`<site-header>`（Task 2，已在 Task 4 套用到 index.html）作為新的入口取代這四塊。

- [ ] **Step 1: 刪除「關於我 · About」「手帖 · Phrasebook」「資源 · Resources」「練習 · Practice」四個 divider 區塊**

Task 4 跑完後，`index.html` 在日曆和「學習紀錄 · Log」之間，會有這四塊（結構跟改動前一樣，只是最外層 `.container` 開頭多了 `<site-header>`，`masthead` 已經被拿掉）：

```html
  <div class="divider" style="margin:40px 0 16px;">關於我 · About</div>
  <ul class="lesson-list" style="margin-bottom:40px;">
    <li>
      <a class="lesson-link" href="my-name-katakana.html">
        <div class="lesson-meta">私の名前 · My Name in Japanese</div>
        <div class="lesson-title">シ・カリン <span class="arrow">→</span></div>
        <div class="lesson-summary">用片假名寫名字，附每個文字的羅馬拼音與發音</div>
      </a>
    </li>
  </ul>

  <div class="divider" style="margin:40px 0 16px;">手帖 · Phrasebook</div>
  <ul class="lesson-list" style="margin-bottom:40px;">
    <li>
      <a class="lesson-link" href="store-phrasebook.html">
        <div class="lesson-meta">店員さんとの会話帖 · Phrases for the Counter</div>
        <div class="lesson-title">店員對話手帖 <span class="arrow">→</span></div>
        <div class="lesson-summary">餐廳・咖啡・花店・超市・便利商店・拉麵店 — 店員會問什麼、你可以怎麼回（可發音，另附 PDF）</div>
      </a>
    </li>
  </ul>

  <div class="divider" style="margin:40px 0 16px;">資源 · Resources</div>
  <ul class="lesson-list" style="margin-bottom:40px;">
    <li>
      <a class="lesson-link" href="slowpaper.html">
        <div class="lesson-meta">slowpaper · ひらがな練字帖（免費試用）</div>
        <div class="lesson-title">50 音 PDF 練字帖 <span class="arrow">→</span></div>
        <div class="lesson-summary">我自己做的練字帖品牌 — 免費 7 頁試用（あ行 5 頁 ＋ が ＋ きゃ），Supernote／iPad／列印皆可</div>
      </a>
    </li>
  </ul>

  <div class="divider" style="margin:40px 0 16px;">練習 · Practice</div>
  <ul class="lesson-list" style="margin-bottom:40px;">
    <li>
      <a class="lesson-link" href="vocab-quiz.html">
        <div class="lesson-meta">看図猜詞 · Picture Vocab Quiz</div>
        <div class="lesson-title">看圖猜詞小測驗 <span class="arrow">→</span></div>
        <div class="lesson-summary">看 emoji 選出正確的日文讀音，答對唸給你聽、再揭曉漢字 — 20 個 N5 常用單字</div>
      </a>
    </li>
  </ul>

```

整段（從第一個 `<div class="divider" style="margin:40px 0 16px;">關於我 · About</div>` 開始，到最後一個 `</ul>` 加上它後面的空行為止）直接刪除，讓日曆區塊後面直接接「學習紀錄 · Log」：

```html
  <div class="divider" style="margin-bottom:16px;">學習紀錄 · Log</div>
```

- [ ] **Step 2: 瀏覽器驗證**

開 `index.html`，確認：
- 最上方 `site-header` 沒有「學習日誌」連結（因為已經在首頁），只有「關於我 · 資源 · 練習」靠右對齊。
- `hero`（日本語 学習日誌）下方有 `page-meta`「カリン · 日本語 · 2026 · Spring」。
- 統計、日曆區塊照舊。
- 日曆下面直接接「學習紀錄 · Log」，四個 divider 區塊都不見了。
- 點右上角「關於我」連到 `my-name-katakana.html`、「資源」連到 `resources.html`、「練習」連到 `vocab-quiz.html`，都要能正常開啟且畫面正常（此時這些頁面已經在 Task 4/5 處理過）。
- 從 `resources.html` 點兩張卡片能正常開到 `store-phrasebook.html`/`slowpaper.html`。

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Remove homepage divider sections now covered by site-header nav"
```

---

### Task 7: 清理死代碼 — `.masthead`/`.back-link` CSS + 三個檔案的重複 `.footer-area`/`.lesson-list` 內嵌樣式

對應 design doc 第 4 節「刪除」部分。

**Files:**
- Modify: `shared.css`
- Modify: `index.html`
- Modify: `my-name-katakana.html`
- Modify: `slowpaper.html`

**Interfaces:**
- 無新介面；純刪除 Task 1～6 之後確認不再使用的規則。

- [ ] **Step 1: 從 `shared.css` 刪除 `.masthead` 規則**

刪除這整段（原本第 54～70 行附近）：

```css
/* ── Masthead ── */
.masthead {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 20px;
  padding-bottom: 20px; border-bottom: 1px solid var(--line);
  margin-bottom: 40px;
}
.masthead .left, .masthead .right {
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 14px; letter-spacing: .12em; color: var(--ink-mute);
}
.masthead .right { text-align: right; }
.masthead .center {
  font-family: 'Shippori Mincho', serif; font-weight: 700;
  letter-spacing: .35em; font-size: 14px; color: var(--accent);
  padding: 5px 14px; border: 1px solid var(--accent);
}
```

- [ ] **Step 2: 從 `shared.css` 刪除 `.back-link` 規則**

刪除這段：

```css
/* ── Back link ── */
.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--ink-mute); text-decoration: none;
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 14px; letter-spacing: .08em; margin-bottom: 32px;
  transition: color .2s;
}
.back-link:hover { color: var(--accent); }
```

- [ ] **Step 3: 從 `shared.css` 的 `@media (max-width: 640px)` 區塊刪掉 `.masthead` 那兩行**

改成（拿掉 `.masthead` 和 `.masthead .right` 那兩行，保留其他）：

```css
@media (max-width: 640px) {
  .wrap { padding: 32px 18px 64px; }
  .site-header { flex-wrap: wrap; justify-content: center; gap: 10px; text-align: center; }
  .gojuon { gap: 6px; }
  .kana-big { font-size: 26px; }
  .kana-compare { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4: 從 `index.html` 內嵌 `<style>` 刪除重複的 `.footer-area`／`.lesson-list`／`.lesson-link`／`--about-accent` 相關規則**

`index.html` 的內嵌 `<style>` 目前（Task 1～6 之後）還留著這些跟 `shared.css` 重複、或因為「關於我」卡片被刪除而變成死代碼的規則：

- `--about-accent:#2a5f9e;`（`:root` 裡的一個變數宣告）—— 因為「關於我」卡片已經從 `index.html` 移除（Task 6），這個變數不再被任何選擇器使用，可以整個拿掉。
- `.lesson-list{...}`、`.lesson-link{...}`、`.lesson-link:hover{...}`、`.lesson-link[href^="readings/"]{...}`、`.lesson-link[href^="readings/"]:hover{...}`、`.lesson-link[href="my-name-katakana.html"]{...}`、`.lesson-link[href="my-name-katakana.html"]:hover{...}`、`.lesson-meta{...}`、`.lesson-title{...}`、`.lesson-title .arrow{...}`、`.lesson-link:hover .lesson-title .arrow{...}`、`.lesson-summary{...}` —— 這些已經搬進 `shared.css`（Task 1），`.lesson-link[href="my-name-katakana.html"]` 這個變體因為「關於我」卡片被刪除也不會再被用到，整段刪掉。
- `.footer-area{...}`、`.footer-area a{...}`、`.footer-area a:hover{...}`、`.footer-area .seal{...}` —— 已搬進 `shared.css`（Task 1），刪掉。

刪除後，`:root` 只留 `--paper`／`--paper-deep`／`--ink`／`--ink-soft`／`--ink-mute`／`--accent`／`--accent-soft`／`--accent-pale`／`--line`／`--bg-spot-1`／`--bg-spot-2`／`--reading-accent`（`--reading-accent` 仍在用，因為「學習紀錄 · Log」清單還混著 `readings/*` 連結）。

- [ ] **Step 5: 從 `my-name-katakana.html` 內嵌 `<style>` 刪除重複的 `.footer-area` 規則**

刪除：

```css
.footer-area{margin-top:48px;padding-top:24px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--ink-mute);font-size:14px;letter-spacing:.1em;}.footer-area .seal{width:44px;height:44px;border:2px solid var(--accent);color:var(--accent);display:flex;align-items:center;justify-content:center;font-family:'Shippori Mincho',serif;font-weight:700;font-size:18px;transform:rotate(-6deg);}
```

（這個頁面過去從未實際 render `<footer class="footer-area">`，是純死代碼；現在會透過 Task 4 加的 `<site-footer>` 用 `shared.css` 的版本 render，尺寸會是 40px 的印章而不是這裡寫的 44px —— 屬於預期中的視覺微調，全站統一用 `shared.css` 的 40px 版本。）

- [ ] **Step 6: 從 `slowpaper.html` 內嵌 `<style>` 刪除重複的 `.footer-area` 規則**

刪除：

```css
/* ── Footer ── */
.footer-area{margin-top:48px;padding-top:24px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--ink-mute);font-size:14px;letter-spacing:.1em;}
.footer-area .seal{width:40px;height:40px;border:2px solid var(--accent);color:var(--accent);display:flex;align-items:center;justify-content:center;font-family:'Shippori Mincho',serif;font-weight:700;font-size:16px;transform:rotate(-6deg);}
```

- [ ] **Step 7: grep 驗證死代碼清乾淨**

Run: `grep -rn "masthead\|back-link" shared.css`
Expected: 無輸出

Run: `grep -c "footer-area{" index.html my-name-katakana.html slowpaper.html`
Expected: 三個檔案都是 `0`（`grep -c` 對沒有匹配的檔案回傳 0，指令整體 exit code 非 0 是正常的，看數字就好）

- [ ] **Step 8: 瀏覽器完整回歸檢查**

依序打開 `index.html`、`my-name-katakana.html`、`slowpaper.html`、任一 `lessons/*` 頁，確認：
- 畫面跟 Task 6 完成時視覺上完全一樣（這個 Task 純刪重複 CSS，不應該有任何視覺變化，除了 my-name-katakana.html 的印章從 44px 變 40px，這是預期中的統一）。
- Console 沒有錯誤。

- [ ] **Step 9: Commit**

```bash
git add shared.css index.html my-name-katakana.html slowpaper.html
git commit -m "Remove dead masthead/back-link CSS and duplicate footer-area/lesson-list styles"
```

---

### Task 8: 全站最終驗證

對應 design doc 「驗證」章節，收尾用。

**Files:**
- 無新增/修改，純驗證。

- [ ] **Step 1: 全站 grep 總檢查**

```bash
grep -rl "site-header" *.html lessons/*.html readings/*.html | wc -l
```
Expected: `62`（61 個既有頁 + 新 `resources.html`）

```bash
grep -rl 'class="masthead"' *.html lessons/*.html readings/*.html
grep -rl 'class="back-link"' *.html lessons/*.html readings/*.html
```
Expected: 兩個指令都無輸出

```bash
grep -c "page-meta" index.html slowpaper.html my-name-katakana.html resources.html
```
Expected: 每個檔案至少 `1`

- [ ] **Step 2: 冪等性最終確認**

```bash
node scripts/add-site-chrome.mjs
```
Expected: 全部 `skip`，`0 changed`

```bash
git status
```
Expected: 乾淨（沒有未預期的改動；如果 Task 1～7 都已經 commit，這裡應該顯示 working tree clean）

- [ ] **Step 3: `file://` 直接開啟驗證（不依賴任何 HTTP server）**

用瀏覽器直接雙擊打開（不透過 `python -m http.server` 之類的本地伺服器）：
- `index.html`
- `resources.html`
- 一個 `lessons/*` 頁
- `store-phrasebook.html`
- `slowpaper.html`

每頁都確認 `<site-header>`/`<site-footer>` 正常 render（因為模板字串內嵌不用 fetch，這裡主要是再次確認沒有意外用到會被 file:// 擋掉的 API）、console 無 error、`network` 面板沒有 404（favicon、字型、shared.css、site-chrome.js 都要 200）。

- [ ] **Step 4: 手機寬度驗證（響應式）**

用瀏覽器開發者工具切到手機寬度（例如 375px），開 `index.html` 和一個 `lessons/*` 頁，確認 `site-header` 在窄螢幕會換行置中，不會爆版或裁切。

- [ ] **Step 5: 最終 commit（如果 Step 1～4 有發現需要修的小問題）**

如果驗證過程有修正，正常走 `git add` + `git commit`；如果全部通過、沒有新改動，這個 Task 不需要額外 commit。
