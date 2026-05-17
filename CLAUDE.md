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
index.html                       ← 首頁：stats + calendar + log（棕色主題）
shared.css                       ← 全站共用元件樣式（masthead/word-item/play-btn/...）
my-name-katakana.html            ← 「私の名前」自我介紹（藍色主題）
lessons/YYYY-MM-DD-topic.html    ← 每日課程（棕色主題）
readings/YYYY-MM-DD-topic.html   ← 閱讀筆記（深紅主題）
```

每個 HTML 都長同一個樣子：
1. 自己的 `<style>` 裡只放 `:root` 色票（其餘版面交給 `shared.css`）
2. 然後 `<link rel="stylesheet" href="(../)?shared.css">`
3. `<body>` 裡用 `<div class="wrap">`、`<header class="masthead">`、`<a class="back-link">` 開頭

新增頁面**必先選定類型**——類型決定色票、目錄位置、可用樣板區塊。

### index.html — How Stats and Calendar Work

Stats (Lessons / Words / Kana) are **computed at runtime from HTML attributes** — there is no separate data file.

Each `<a class="lesson-link">` in `#lesson-list` carries:
- `data-kana="5"` — number of kana taught in that lesson
- `data-words="8"` — number of vocabulary words
- `data-date="2026-05-03"` — ISO date (drives the calendar)

The `<div class="stats" id="stats">` element has `data-kana-base` and `data-words-base` for any kana/words learned before the log started.

The calendar is built dynamically from `data-date` attributes. The script **auto-detects the two most recent months** that contain at least one lesson and renders only those two — no manual update needed when a new month starts.

### Adding a New Page

**Step 1 — 決定類型**（決定目錄、色票、可用樣板區塊）：

| 類型 | 放在 | 起手用什麼 |
|------|------|------|
| `lessons/*`（每日課程，含五十音行／主題／文法／概念） | `lessons/YYYY-MM-DD-<slug>.html` | **複製 [`lessons/_skeleton.html`](lessons/_skeleton.html)**，依「子類型」加上對應 CSS 區塊（見下表） |
| 閱讀筆記 | `readings/YYYY-MM-DD-topic.html` | 複製 [reading-cho](readings/2026-05-05-reading-cho.html) |
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

`lesson-meta` 結尾的 `· Lesson` / `· Reading` 是純文字標籤，給人讀的；機器靠 `href` 前綴 (`readings/` / `lessons/` / `my-name-katakana.html`) 自動換左邊框顏色（CSS attribute selector）。

Stats 與 calendar 會自動重算——`data-kana` / `data-words` / `data-date` 提供即可，新月份不必動 calendar 邏輯。

**Step 5 — 確保 favicon link 存在**（特別是非複製 `lessons/_skeleton.html` 的手寫頁、或新類型的產生器頁）：最簡單做法是執行 `node scripts/add-favicon.mjs`（冪等，已有 `rel="icon"` 的頁會自動跳過；root 頁注入 `favicon.svg`、`lessons/` 與 `readings/` 注入 `../favicon.svg`）。favicon 功能已於 2026-05-17 完成（見 [docs/superpowers/specs/2026-05-17-favicon-design.md](docs/superpowers/specs/2026-05-17-favicon-design.md)），`_skeleton.html` 已內含該 link，但手寫新頁或新產生器樣板不會自動帶上。

### TTS — Web Speech API

All audio uses the browser's built-in `speechSynthesis`. No API key needed.

**Voice preference order (female Japanese voices only):**
`Kyoko → O-ren → Hana`

Fallback to any `ja`-lang voice if none of those three are found. Male voice `Otoya` is excluded.

Speed slider: `0.5x` to `1.2x`, default **`0.8x`** (slightly slower for learning).

The standard TTS pattern used across lesson files:
```js
function getJapaneseVoice() {
  const voices = speechSynthesis.getVoices();
  const jaVoices = voices.filter(v => v.lang.startsWith('ja'));
  return (
    jaVoices.find(v => v.name.includes('Kyoko')) ||
    jaVoices.find(v => v.name.includes('O-ren')) ||
    jaVoices.find(v => v.name.includes('Hana'))  ||
    jaVoices[0] || null
  );
}
```

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

完整變數請看 [shared.css](shared.css) 用到的這組（每頁都要備齊）：
`--paper`, `--paper-deep`, `--ink`, `--ink-soft`, `--ink-mute`, `--accent`, `--accent-soft`, `--accent-pale`, `--line`, `--bg-spot-1`, `--bg-spot-2`。

`index.html` 另外定義兩個對照色，給清單卡片左邊框用：
```css
--reading-accent: #8b3a3a;  /* readings/* 卡片左邊框 */
--about-accent:   #2a5f9e;  /* my-name-katakana.html 卡片左邊框 */
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
| 閱讀筆記 | [reading-cho](readings/2026-05-05-reading-cho.html) | `.hero` + `.hero-title` `.hero-sub` `.hero-meta` / `.vertical-text` + `.vertical-card` / `.particles` + `.particle` / `.row` + `.kana` + `.translate` / `.grammar` |

#### 共通 JS 慣例

- 每頁底部都有同一份 TTS init（見下節），並綁定 `.speed-control input` 控制 `rate`
- 每個 `.kana-card`、`.word-item`、`.phrase`、`.number-card` 等元素帶 `data-text="<日文>"`，點擊就唸
- 五十音行頁多一個 `.row-btn` 把該行 5 個 kana 連著唸；數字頁則用 `.count-all`

## Content Guidelines

- **Language**: Lesson content is in Traditional Chinese (繁體中文) with Japanese text. UI labels mix Chinese, Japanese, and English naturally.
- **Hiragana and katakana** are both allowed in lesson content. Hiragana rows build vocabulary from already-learned kana; katakana row lessons instead pair each kana with its hiragana counterpart and use a few common 外來語 (loanwords, not restricted to learned rows).
- 五十音行（行）課程每頁恰好 5 個 kana：附羅馬拼音、發音重點、單字、用已學 kana 拼出來的簡單句子。
- 主題課程（數字／季節／句型／假名概念）專注在日常實用。
- 閱讀筆記（readings/）拿真實日文短文當素材，標出假名讀法、單字、助詞、文法句型。
