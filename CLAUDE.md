# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A pure static-HTML Japanese learning log. No build system, no package manager, no dependencies — every file opens directly in a browser. Deployed via GitHub Pages from the `main` branch root.

The learner (Scarlett) is studying from zero. She finished the hiragana 五十音 and (from 2026-05-14) started katakana, so both kana are now in scope for lesson content. Each lesson page teaches either a 五十音 row (5 kana + vocabulary) or a thematic topic (numbers, seasons, phrases).

## No Build Commands

There is no build, lint, or test step. Development workflow:
- Open HTML files directly in a browser to preview
- `git add . && git commit -m "..." && git push` — GitHub Pages auto-deploys in ~1–2 minutes

## Architecture

### File Structure

```
index.html                       ← 首頁：calendar + log（棕色主題）
shared.css                       ← 全站共用元件樣式（masthead/word-item/play-btn/...）
resources.html                   ← 資源入口：多読起步清單、看圖猜詞測驗、店員對話帖、練字帖（棕色主題）
vocab-quiz.html                  ← 看圖猜詞單字測驗（棕色主題，從 resources.html 連過去）
tadoku.html                      ← 多読入口：自製迷你多読小故事清單（藤色主題）
my-name-katakana.html            ← 「私の名前」自我介紹（藍色主題）
lessons/YYYY-MM-DD-topic.html    ← 每日課程（棕色主題）
readings/YYYY-MM-DD-topic.html   ← 閱讀筆記（深紅主題，真實日文短文素材；目前目錄為空）
tadoku/YYYY-MM-DD-topic.html     ← 自製迷你多読小故事（藤色主題，跟 tadoku.html 同一套；同時仍列進 index.html 的 log/calendar）
images/tadoku/*.png              ← 多読故事的插圖（いらすとや，自存不直連）
```

全站導覽列固定三個入口：關於我（`my-name-katakana.html`）／資源（`resources.html`）／多読（`tadoku.html`）——導覽列上寫「多読」不是「練習」，因為這個入口目前只放自製多読小故事，看圖猜詞單字測驗改放進「資源」。

每個 HTML 都長同一個樣子：
1. 自己的 `<style>` 裡只放 `:root` 色票（其餘版面交給 `shared.css`）
2. 然後 `<link rel="stylesheet" href="(../)?shared.css">`
3. `<body>` 裡用 `<div class="wrap">`、`<header class="masthead">`、`<a class="back-link">` 開頭

新增頁面**必先選定類型**——類型決定色票、目錄位置、可用樣板區塊。

### index.html — How the Calendar Works

Each `<a class="lesson-link">` in `#lesson-list` carries:
- `data-date="2026-05-03"` — ISO date（**唯一會被 JS 讀到的屬性**，驅動 calendar）
- `data-kana="5"` / `data-words="8"` — 該課的假名數／單字數，**目前純紀錄用、不會顯示**

> 首頁原本頂端有一組 Lessons / Words / Kana 統計方塊（由 `data-kana`／`data-words` 即時加總），
> **2026-07-28 已移除**（含 `.stats` CSS、`#stats` 區塊與加總 JS）。`data-kana` / `data-words` 保留在
> `<li>` 上當作紀錄，新增課程時照填即可；要不要再拿來做視覺化再說。

### index.html — Milestones（歩み 大事件時間軸）

日曆上方有一條 `<ol class="milestones">` 時間軸，記錄**學習階段的轉折點**——不是每日課程，
而是「換了新的假名系統」「上課形式改變」這種大事件（2026-07-28 新增）。純靜態 HTML，沒有 JS。

新增一筆時：
1. 在 `<ol class="milestones">` **末尾**追加 `<li class="ms">`（舊→新排序，跟下面的 Log 相反）
2. 把上一筆的 `class="ms current"` 改回 `class="ms"`，並移除它 `.ms-date` 裡的 `<span class="ms-badge">now</span>`
3. 新的那筆掛 `class="ms current"` ＋ `now` badge（實心圓點＋標籤靠這兩個）
4. `.ms-body` 的 `href` 指向那天的代表課程頁

判斷標準：**這件事會讓之後的學習內容長得不一樣**才放進來，否則只進 Log。

The calendar is built dynamically from `data-date` attributes. The script **auto-detects the two most recent months** that contain at least one lesson and renders only those two — no manual update needed when a new month starts.

### Adding a New Page

**Step 1 — 決定類型**（決定目錄、色票、可用樣板區塊）：

| 類型 | 放在 | 起手用什麼 |
|------|------|------|
| `lessons/*`（每日課程，含五十音行／主題／文法／概念） | `lessons/YYYY-MM-DD-<slug>.html` | **複製 [`lessons/_skeleton.html`](lessons/_skeleton.html)**，依「子類型」加上對應 CSS 區塊（見下表） |
| 閱讀筆記（真實日文短文） | `readings/YYYY-MM-DD-topic.html` | **目前沒有現存範例**（唯一一篇 2026-05-05「蝶の話」已於 2026-07-28 刪除，要撈舊版看 `git log -- readings/`）；色票與 `shared.css` 的 `readings/` 規則都還在，新頁比照 `tadoku/*` 結構再套深紅色票 |
| 自製迷你多読小故事（掛在多読入口底下） | `tadoku/YYYY-MM-DD-topic.html` | 複製 [tadoku-kami](tadoku/2026-07-27-tadoku-kami.html)，並在 [tadoku.html](tadoku.html) 的 `<ul>` 加一個 `<li>` 卡片 |
| 一次性介紹頁 | 根目錄 | 複製 [my-name-katakana](my-name-katakana.html) |

**Step 2 — 把 skeleton 內所有 `TODO:` 註解區塊填掉**（標題、masthead、divider、word-item …），不需要的 `<section>` 整段刪。色票寫死在 `:root`，**不要改**。

**Step 3 — 加子類型專屬 CSS／HTML 區塊**（從下方「子類型 → 樣板對照」表挑最近的範本，把它的 `<style>` 與結構複製過來）。

**Step 4 — 在 `index.html` `<ul id="lesson-list">` 開頭插入新 `<li>`**（新→舊排序）：

```html
<li>
  <a class="lesson-link" href="lessons/YYYY-MM-DD-topic.html"
     data-kana="5" data-words="10" data-date="YYYY-MM-DD">
    <div class="lesson-meta">2026 · May 6 · Wed · Lesson</div>
    <div class="lesson-title">は行五音 + 單字 <span class="arrow">→</span></div>
    <div class="lesson-summary">は・ひ・ふ・へ・ほ + 單字與句子</div>
  </a>
</li>
```

`lesson-meta` 結尾的 `· Lesson` / `· Reading` 是純文字標籤，給人讀的；機器靠 `href` 前綴 (`readings/` / `tadoku/` / `lessons/` / `my-name-katakana.html`) 自動換左邊框顏色（CSS attribute selector，見 shared.css 的 `.lesson-link[href^="..."]` 規則）。

Calendar 會自動重算——`data-date` 提供即可，新月份不必動 calendar 邏輯（`data-kana` / `data-words` 目前不顯示，照填當紀錄）。

**Step 5 — 確保 favicon link 存在**（特別是非複製 `lessons/_skeleton.html` 的手寫頁、或新類型的產生器頁）：最簡單做法是執行 `node scripts/add-favicon.mjs`（冪等，已有 `rel="icon"` 的頁會自動跳過；root 頁注入 `favicon.svg`、`lessons/`／`readings/`／`tadoku/` 注入 `../favicon.svg`）。favicon 功能已於 2026-05-17 完成（見 [docs/superpowers/specs/2026-05-17-favicon-design.md](docs/superpowers/specs/2026-05-17-favicon-design.md)），`_skeleton.html` 已內含該 link，但手寫新頁或新產生器樣板不會自動帶上。

### TTS — VOICEVOX 預生 mp3（主要）＋ speechSynthesis（fallback）

**音檔一律用 VOICEVOX 離線預先生成 mp3，不靠瀏覽器即時合成。** 瀏覽器內建的
`speechSynthesis` 只是在找不到對應 mp3（404）時的退路，不是主要方案。

**新增／更新教材發音的工作流：**
1. 可發音元素照舊帶 `data-text="<日文>"`（kanji+kana 混寫即可，VOICEVOX 自己判讀）。
2. 開 VOICEVOX app（engine 自動上 `:50021`），跑 `node scripts/generate-audio.mjs`
   （預設角色 = 波音リツ ノーマル，speaker_id=9，2026-07-20 起；強制重生加 `--force`。
   2026-07-20 前的舊音檔多為春日部つむぎ(8)，store-phrasebook.html 用九州そら(16)——
   重生舊頁時注意語者，別整批蓋成新聲）。
   腳本會掃所有 lesson/reading HTML 的 `data-text`，增量生成 `audio/<sha256-16>.mp3`。
3. **生完務必 Cmd+Shift+R 硬重整瀏覽器**——檔名 hash 不含參數，重生會覆寫同名檔，cache 不會自動失效。

**單音不發音：** 單一假名（`data-text` 只有 1 個 kana）一律不生 mp3、也不綁 click→speak，
kana 卡片純視覺對照。只有單字／句子（含外來語）才有發音。

**客戶端：** 每頁載入 `js/tts.js`，用 `JTalk.speak(text, button, { rate })`。
`JTalk` 先試 `audio/<hash>.mp3`，404 才 fallback 到 `speechSynthesis`。

**fallback 的語音偏好（女聲優先，僅在沒 mp3 時生效）：** `Kyoko → O-ren → Hana`，
再退到任一 `ja` 語音；排除男聲 `Otoya`。

**生成參數（寫死在 `scripts/generate-audio.mjs`）：** 依字長 speedScale、`volumeScale=1.0`
＋兩段式峰值正規化拉到 -1.5 dBFS（不要用 loudnorm 或 volumeScale>1 去加大聲，會破音）。

Speed slider: `0.5x` to `1.2x`, default **`0.8x`** (slightly slower for learning)。
綁 `.speed-control input` 控制傳給 `JTalk.speak` 的 `rate`。

### EPUB — 給 Supernote A5X 離線閱讀

`node scripts/build-epub.mjs [輸出路徑.epub]`（2026-07-28 新增）把某一天的課程**重新編排**成一本 EPUB，
不是把網頁直接倒出來——章節結構、內容與速記表都手寫在腳本裡（`chapters` 陣列 ＋ `VOCAB`），
要出別天的就改那份資料再跑。

**產物要進版控**：輸出固定放 `epub/`（預設路徑，資料夾不存在會自動建），
並且**跟著 commit** —— `index.html` 的 Log 最上面有一列 `.dl-link` 下載卡直接連過去
（`href="epub/xxx.epub" download`），GitHub Pages 直接當靜態檔案送出，不需要另開頁面。
`.gitignore` 只擋根目錄誤產出的 `/*.epub`。
新增別天的電子書時，記得同步加一張 `.dl-link`（它不是 `.lesson-link`，日曆與清單邏輯會略過）。

排版是針對 **Supernote A5X（1404×1872、10.3" E-ink 灰階）** 調的，改動前先理解這些限制：
- **不靠顏色分辨資訊**（灰階螢幕），改用邊框粗細：`.alert` 粗實線左邊、`.note` 雙線左邊
- **不要用底色填滿**，E-ink 上會變成髒網點；只用白底 ＋ 1px 邊框
- 字級一律 `em`（保留裝置自己的縮放）、行距 1.85、插圖寬 32% 並用 `sips` 轉灰階
- 版面用 `<table>` 而非 flex/grid（E-ink 閱讀器支援參差）
- 同時輸出 EPUB3 `nav.xhtml` 與 EPUB2 `toc.ncx`，目次才一定讀得到
- 打包時 `mimetype` 必須是 zip 第一項且**不壓縮**（`zip -X0`），否則部分閱讀器不認

### Design System

#### 字體（全站統一）

從 Google Fonts 載入這三套，全部 serif 風格：
- **Shippori Mincho** — 主要日文字 + 中文標題（標題、`.kana-big`、`.word-ja`、`.phrase-ja`）
- **Noto Serif TC** — 繁體中文正文
- **Cormorant Garamond** — 拉丁字斜體（meta、`.romaji`、`.subtitle`、divider）

不可改成 sans-serif，視覺定調是「文學感／信箋感」。

#### 色票（按類型套用）

每頁 `<style>` 裡的 `:root` 決定主色，`shared.css` 透過 `var(--accent)` 等變數消化掉差異。**只有色票會變，版面結構保持一致**。

| 類型 | 色票（主色） | `--paper` | `--accent` |
|------|------|------|------|
| `index.html` + `lessons/*` | 棕橘 / 茶色 | `#fdf6f0` | `#c96830` |
| `my-name-katakana.html`（自我介紹） | 海軍藍 | `#f2f6fb` | `#2a5f9e` |
| `readings/*`（閱讀筆記） | 深紅 / 暗朱 | `#f4ece0` | `#8b3a3a` |
| `tadoku.html`、`tadoku/*`（自製迷你多読） | 藤色 / 淡紫 | `#f8f6fc` | `#7a68a6` |

`tadoku/*` 是自製的迷你多読小故事（例如 [tadoku-kami](tadoku/2026-07-27-tadoku-kami.html)），不教新單字（`index.html` 對應 `data-words="0"`），色票跟 `tadoku.html` 一樣用藤色，但仍列進 `index.html` 的每日 log／calendar（跟 `readings/*` 一樣是「log 裡混不同色票類型」的做法）。`vocab-quiz.html` 改連在 `resources.html` 底下，用回一般棕橘色票。

完整變數請看 [shared.css](shared.css) 用到的這組（每頁都要備齊）：
`--paper`, `--paper-deep`, `--ink`, `--ink-soft`, `--ink-mute`, `--accent`, `--accent-soft`, `--accent-pale`, `--line`, `--bg-spot-1`, `--bg-spot-2`。

`index.html` 另外定義兩個對照色，給清單卡片左邊框用：
```css
--reading-accent: #8b3a3a;  /* readings/* 卡片左邊框 */
--about-accent:   #2a5f9e;  /* my-name-katakana.html 卡片左邊框 */
--tadoku-accent:  #7a68a6;  /* tadoku/* 卡片左邊框（shared.css 用 .lesson-link[href^="tadoku/"] 選取） */
```

#### 類型 → 樣板對照

各類頁面共用 `shared.css` 的這組基礎結構：`.wrap` / `.masthead` / `.back-link` / `.page-title` / `.page-subtitle` / `.speed-control` / `.divider` / `.tip` `.note` `.alert` `.warning` / `.compare` / `.play-btn`。

剩下的依「子類型」挑用對應區塊：

| 子類型 | 範例檔 | 主要使用的 CSS 區塊 |
|------|------|------|
| 五十音行 | [a-row](lessons/2026-04-29-a-row.html), [ka-row](lessons/2026-04-30-ka-row.html), [na-row](lessons/2026-05-03-na-row.html), [ha-row](lessons/2026-05-04-ha-row.html) | `.gojuon` + 5×`.kana-card` / `.row-btn` / `.section` + `.section-title` + `.word-item` `.word-content` `.word-ja` `.word-romaji` `.word-meaning` |
| 主題 — 數字 | [numbers](lessons/2026-05-03-numbers.html) | `.number-card` + `.number-big` / `.readings` `.reading-row` `.reading-info` / `.japanese` + `.romaji` / `.count-all` |
| 主題 — 季節 | [seasons](lessons/2026-05-04-seasons.html) | `.seasons` + `.season-card` (spring/summer/autumn/winter) / `.extras` + `.extra-item` / 自有 `.all-seasons-btn` `.small-play-btn` |
| 主題 — 句型／問候 | [ashita](lessons/2026-05-02-ashita.html) | `.category` + `.category-title` / `.phrase` `.phrase-content` `.phrase-ja` `.phrase-romaji` `.phrase-meaning` / `.warning` |
| 文法 — 助詞／音變 | [joshi-wa](lessons/2026-05-10-joshi-wa.html), [joshi-2](lessons/2026-05-10-joshi-2.html), [dakuten-sokuon](lessons/2026-05-09-dakuten-sokuon.html) | `.joshi-table` + `.col-kana` `.col-romaji` `.col-role` `.col-meaning` / `.j-mark`（行內助詞高亮）/ `.vs-grid` + `.vs-col` 對照欄 / `.next-link` 跨頁 |
| 文法 — 詞彙概念（人稱／音讀） | [jinshou](lessons/2026-05-13-jinshou.html), [onyomi-sensei](lessons/2026-05-13-onyomi-sensei.html) | 自製 `.pron-card` / `.job-card`（漢字大＋假名小＋羅馬＋意思的卡片）/ `.kanji-spot` 單字大字解析 / 速記表沿用 `.joshi-table` 同款 |
| 假名概念 | [kana](lessons/2026-05-04-kana.html) | 自有 `.tree-box` `.branch-card` (hira/kata) / `.compare-table` / `.example-row` + `.ex-hira` `.ex-kata` |
| 自我介紹（片假名） | [my-name-katakana](my-name-katakana.html) | 自有 `.card`（藍色主題、結構接近 reading hero） |
| 閱讀筆記 | *（已無現存頁，樣式僅存於 git 歷史）* | `.hero` + `.hero-title` `.hero-sub` `.hero-meta` / `.vertical-text` + `.vertical-card` / `.particles` + `.particle` / `.row` + `.kana` + `.translate` / `.grammar` |

#### 多読故事的插圖（いらすとや）

`tadoku/*` 一句話（或一組對白）配一張插圖，圖放在上方，仿 tadoku 分級讀本「一頁一個場景」的做法。插圖一律用 **[いらすとや](https://www.irasutoya.com/)**（原版 tadoku 讀本用的就是這套）。

**規則：**
- **一定要下載自存到 `images/tadoku/`，不要直連他們的 CDN。** 檔名沿用いらすとや原檔名（例如 `study_nihongo.png`），方便回溯出處。
- **只能從 irasutoya.com 本站下載**——他們的 FAQ 明講不要拿第三方網站上的いらすとや圖（「外部のサイトでいらすとやの素材と思われる画像をダウンロードして利用をすることもトラブルの元となりますのでご遠慮ください」）。
- 授權：個人／商業都免費。**商業用途單一作品超過 21 張要付費**——本站是個人學習日誌，不受此限，但別無限制地加圖。禁止「把素材本身當商品轉售」。
- 頁尾要放一行 `.credit` 標示出處（非強制，但該做）。

**找圖的方法**（搜尋頁是 JS 動態載入，抓不到，要用 Blogger JSON feed）：

```bash
curl -s "https://www.irasutoya.com/feeds/posts/default?q=<關鍵字URL編碼>&alt=json&max-results=6"
```

回傳 JSON 裡每個 `entry.content.$t` 內含 `<img src="...">`，那就是圖片網址。網址中的 `/s400/` 是尺寸參數，統一取 `s400` 即可（頁面顯示約 180px 高，s400 足夠清晰）。

**HTML 結構**（見 [tadoku-kami](tadoku/2026-07-27-tadoku-kami.html)）：`.scene[data-text]` 包住 `.scene-img` ＋ `.scene-body`（內含 `.scene-text` 的 `.japanese`／`.romaji`／`.meaning` ＋ `.play-btn`）。JS 綁 `.scene[data-text]`，不是 `.phrase`。

> ⚠️ `.japanese` / `.romaji` / `.meaning` 是 shared.css 既有的 class（`.japanese` 為 20px）；`.phrase-ja` / `.phrase-romaji` 是**另一組**給 `.phrase` 用的。兩組別混用，寫錯會變成沒有作用的死碼。

#### 共通 JS 慣例

- 每頁底部都有同一份 TTS init（見下節），並綁定 `.speed-control input` 控制 `rate`
- 每個 `.kana-card`、`.word-item`、`.phrase`、`.number-card` 等元素帶 `data-text="<日文>"`，但只有內層 `.play-btn` 綁 click 發音——元素本身不綁，避免滑鼠拖曳選字複製時誤觸發音
- 五十音行頁多一個 `.row-btn` 把該行 5 個 kana 連著唸；數字頁則用 `.count-all`

## Content Guidelines

- **Language**: Lesson content is in Traditional Chinese (繁體中文) with Japanese text. UI labels mix Chinese, Japanese, and English naturally.
- **Hiragana and katakana** are both allowed in lesson content. Hiragana rows build vocabulary from already-learned kana; katakana row lessons instead pair each kana with its hiragana counterpart and use a few common 外來語 (loanwords, not restricted to learned rows).
- 五十音行（行）課程每頁恰好 5 個 kana：附羅馬拼音、發音重點、單字、用已學 kana 拼出來的簡單句子。
- 主題課程（數字／季節／句型／假名概念）專注在日常實用。
- 閱讀筆記（readings/）拿真實日文短文當素材，標出假名讀法、單字、助詞、文法句型。
