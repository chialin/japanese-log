# Favicon — 設計文件

日期：2026-05-17
類型：全站靜態資產 + 一次性注入腳本（無 build/test framework）

## 目標

為網站新增一個 favicon：棕橘圓角方底 + 紙色「あ」書法骨架，與全站視覺定調一致；以相對路徑連結注入全部 30 個 HTML（GitHub Pages 為專案頁，不能依賴根網域 `/favicon.ico`）。

## 範圍

- 單一 `favicon.svg`（僅 SVG，無 ICO/PNG 回退）。
- 「あ」字形重用既有 `assets/kanjivg/03042.svg` 的三條筆畫 path（畫法 A），加粗成毛筆骨架。
- 注入 30 個 HTML（根目錄與 `lessons/`、`readings/`）的 `<head>`。
- 同步 `lessons/_skeleton.html` 與 `scripts/build-jigen-pages.mjs` 樣板，維持決定性。

非目標（YAGNI）：不做 ICO/PNG/Apple touch icon、不做深色模式變體、不改既有頁面其他內容、不改 `shared.css`。

## 授權

「あ」字形衍生自 KanjiVG（CC-BY-SA 3.0）。`favicon.svg` 為衍生作品，須：
- 在檔案開頭保留版權註解，標明衍生自 KanjiVG 並連結 http://kanjivg.tagaini.net，授權同為 CC-BY-SA 3.0。
- 全站既有 jigen 頁頁尾已標註 KanjiVG，favicon 檔內註解即足夠 attribution + share-alike。

## favicon.svg 內容

`viewBox="0 0 64 64"`，結構：

1. 背景：`<rect width="64" height="64" rx="12" fill="#c96830"/>`
2. 「あ」骨架：一個群組，內含 `assets/kanjivg/03042.svg` 的三條 `<path d="...">`（s1/s2/s3，原 viewBox 109×109），群組屬性：
   - `fill="none" stroke="#fdf6f0" stroke-linecap="round" stroke-linejoin="round"`
   - `stroke-width="15"`（原始座標空間；經下方縮放後視覺約 6px）
   - `transform="translate(8.2 7.4) scale(0.404)"`
     - 推導：glyph 約佔原座標 x∈[23,95]、y∈[17,105]，中心≈(59,61)；scale 0.404 使其縮到 ~44px 見方並留邊；translate 使縮放後中心對齊 (32,32)。
   - 實作時須以瀏覽器目視微調 translate / scale / stroke-width，使「あ」置中、四周留適度留白、16px 分頁圖示仍可辨識；上述數值為起點。

精確的三條 path `d` 字串（逐字取自 `assets/kanjivg/03042.svg`，不得改動筆畫資料）：
- s1: `M31.01,33c0.88,0.88,2.75,1.82,5.25,1.75c8.62-0.25,20-2.12,29.5-4.25c1.51-0.34,4.62-0.88,6.62-0.5`
- s2: `M49.76,17.62c0.88,1,1.82,3.26,1.38,5.25c-3.75,16.75-6.25,38.13-5.13,53.63c0.41,5.7,1.88,10.88,3.38,13.62`
- s3: `M65.63,44.12c0.75,1.12,1.16,4.39,0.5,6.12c-4.62,12.26-11.24,23.76-25.37,35.76c-6.86,5.83-15.88,3.75-16.25-8.38c-0.34-10.87,13.38-23.12,32.38-26.74c12.42-2.37,27,1.38,30.5,12.75c4.05,13.18-3.76,26.37-20.88,30.49`

## 注入連結

注入字串（單行，緊接在每個 HTML 的 `<title>...</title>` 那一行之後，縮排對齊該檔 `<head>` 內既有 `<link>`）：

`<link rel="icon" type="image/svg+xml" href="<REL>favicon.svg" />`

`<REL>` 規則：
- 根目錄 HTML（如 `index.html`、`my-name-katakana.html`）→ `<REL>` 為空 → `href="favicon.svg"`
- `lessons/*.html`、`readings/*.html` → `<REL>` 為 `../` → `href="../favicon.svg"`

`_skeleton.html` 在 `lessons/` 下，亦使用 `../favicon.svg`。

## 一次性腳本 `scripts/add-favicon.mjs`

ESM，無依賴，沿用專案 `scripts/*.mjs` 慣例（shebang、中文標頭、相對路徑、從 repo root 執行）：

1. 掃描：repo root 的 `*.html`，加上 `lessons/*.html`、`readings/*.html`（含 `lessons/_skeleton.html`）。
2. 對每檔：
   - 若已含 `rel="icon"` → 跳過（冪等）。
   - 否則在第一個 `</title>` 之後插入一行 favicon link（`<REL>` 依檔案所在目錄決定），縮排沿用該檔 `<title>` 行的縮排。
3. 印出每檔 `+ <path>` 或 `skip <path>`，結尾印 `done: N injected, M skipped`。

> 注意：`scripts/build-jigen-pages.mjs` 產生的兩個 jigen 頁，其 favicon link 由 **build 樣板**提供（見下），不靠本腳本注入；本腳本對它們會因「已含 rel="icon"」而 skip（前提：先改樣板並重跑 build）。執行順序見實作計畫。

## 決定性同步

`scripts/build-jigen-pages.mjs` 的 `page()` 樣板 `<head>`：在 `<title>...</title>` 行後加入
`<link rel="icon" type="image/svg+xml" href="../favicon.svg" />`
（jigen 頁在 `lessons/` 下，故 `../`）。重跑 `node scripts/build-jigen-pages.mjs` 後，兩頁的 favicon link 必須與 add-favicon 腳本會注入的字串**逐字相同**，使 git 不漂移。

## 交付物

1. `favicon.svg`（root）
2. `scripts/add-favicon.mjs`
3. 28 個既有靜態 HTML（root + lessons + readings + `_skeleton.html`）各 +1 行
4. `scripts/build-jigen-pages.mjs`（樣板 +1 行）
5. `lessons/2026-05-17-hiragana-jigen.html`、`lessons/2026-05-17-katakana-jigen.html`（重跑 build 後 +1 行）

合計 30 個 HTML 皆含 favicon link。

## 驗證

- `favicon.svg` 單獨在瀏覽器開啟：棕橘圓角底、紙色「あ」置中清晰、留白適中；縮到 16px（分頁）仍可辨識。
- 每個 HTML 恰好 1 個 `rel="icon"`，相對路徑正確（root→`favicon.svg`，子目錄→`../favicon.svg`）：
  `grep -rl 'rel="icon"' *.html lessons/*.html readings/*.html | wc -l` → 30。
  抽查 root 與 lessons 各一頁的 href 前綴。
- 冪等：再跑 `node scripts/add-favicon.mjs` → `done: 0 injected, 30 skipped`，`git status` 乾淨。
- 決定性：再跑 `node scripts/build-jigen-pages.mjs` → `git status` 乾淨；兩 jigen 頁含且僅含 1 個正確 `../favicon.svg` link。
- 瀏覽器開 `index.html` 與一個 lessons 頁，分頁出現 favicon、無 console error、favicon 為本地相對請求（非外部）。
- `favicon.svg` 開頭含 KanjiVG CC-BY-SA 衍生版權註解。

## 風險 / 已知

- SVG favicon：現代瀏覽器全支援；舊版 Safari 可能不顯示（已與使用者確認可接受，不做回退）。
- KanjiVG path 為筆畫中心線（骨架），加粗 stroke 後呈書法骨架感而非實心明體字 —— 此為畫法 A 的刻意選擇，已獲使用者核可。
