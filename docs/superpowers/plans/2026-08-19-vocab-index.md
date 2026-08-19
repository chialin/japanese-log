# 単語帳（vocab.html）單字索引 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全站單字索引頁（搜尋＋tag＋月份篩選）＋ 可重複匯入的 Anki 牌組管線。

**Architecture:** 照 build-kanji.mjs 模式：`scripts/build-vocab.mjs` 掃課程頁靜態 HTML 產 `js/vocab-data.js`（頁面用）與 `data/vocab.json`（Anki 用）；`vocab.html` 純前端過濾；`anki/build-anki-vocab.py` 用 genanki 產月份 apkg（commit 進 repo，網頁下載卡直連）。

**Tech Stack:** 純 Node（無套件，內建 `node --test`）、純前端 JS、Python genanki（既有 `anki/venv`）。

**Spec:** `docs/superpowers/specs/2026-08-19-vocab-index-design.md`

## Global Constraints

- 零依賴靜態站：不得引入 npm 套件或 CDN 資源
- vocab.html 色票（小豆）：`--paper:#fbf3f1;--paper-deep:#f2e0dc;--ink:#2a1412;--ink-soft:#48231f;--ink-mute:#85524b;--accent:#96504b;--accent-soft:#cfa09b;--accent-pale:#f3ddda;--line:#e9cbc6;--bg-spot-1:#f9ece8;--bg-spot-2:#f1d9d2`
- 導覽列定案：文法／漢字／**檢索**（繁體，非日文「検索」）／資源；多読移入 resources.html
- Anki note type：model id `1607392331`，欄位 `單字/讀音/羅馬/意思/例句/音檔`（與 anki/build-anki-apkg.py 完全一致，抽成共用模組）
- note guid＝`genanki.guid_for(text, kana)`；月份 deck id＝`1699000000 + int(YYYYMM)`；tango-all 沿用各月份 deck
- 音檔對應：`audio/&lt;sha256(text).hexdigest()[:16]&gt;.mp3`（與 scripts/generate-audio.mjs 同規則），不重跑 VOICEVOX
- tag 命名一律繁體中文（「購物」不是「買物」）；台語拼音不帶調符
- 產物（js/vocab-data.js、data/vocab.json、anki/tango-*.apkg）一律 commit

---

### Task 1: 抽取模組 `scripts/lib/vocab-scan.mjs`

**Files:**
- Create: `scripts/lib/vocab-scan.mjs`
- Test: `scripts/test/vocab-scan.test.mjs`

**Interfaces:**
- Produces:
  - `kanaOf(html) → string`（ruby 段以 rt 取代 base 後的純假名）
  - `plainText(html) → string`（丟掉 rt、去標籤——meaning 用）
  - `extractFromHtml(html) → [{text, ja, kana, romaji, meaning, accent?, kind}]`（單頁抽取；`kind` 為 `'word'|'phrase'`；`ja` 是原始 HTML）
  - `scanLessons() → [{...entry, lesson:{date, href, title}}]`（掃 `lessons/*.html`，跳過 `_` 開頭）

- [ ] **Step 1: 寫失敗測試**

`scripts/test/vocab-scan.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kanaOf, plainText, extractFromHtml } from '../lib/vocab-scan.mjs';

test('kanaOf：ruby 換成 rt、保留非 ruby 文字', () => {
  assert.equal(kanaOf('<ruby>本<rt>ほん</rt>棚<rt>だな</rt></ruby>'), 'ほんだな');
  assert.equal(kanaOf('<ruby>食<rt>しょく</rt></ruby>パン'), 'しょくパン');
});

test('plainText：丟 rt、去標籤', () => {
  assert.equal(plainText('反義是 <ruby>偽<rt>にせ</rt>物<rt>もの</rt></ruby>（假貨）'), '反義是 偽物（假貨）');
  assert.equal(plainText('書架。<a href="#">8/18 學過</a>'), '書架。8/18 學過');
});

const WORD_ITEM = `
<div class="word-item" data-text="本棚">
  <div class="word-content">
    <div class="word-ja"><ruby>本<rt>ほん</rt>棚<rt>だな</rt></ruby></div>
    <div>
      <span class="acc"><span class="acc-k"><span class="ar">↘</span>ほん</span></span>
      <span class="acc-note">尾高型</span>
    </div>
    <div class="word-romaji">hondana</div>
    <div class="word-meaning">書架。書＋<ruby>棚<rt>たな</rt></ruby></div>
  </div>
  <button class="play-btn" aria-label="播放">▶</button>
</div>`;

test('extractFromHtml：word-item 完整欄位', () => {
  const [w] = extractFromHtml(WORD_ITEM);
  assert.equal(w.text, '本棚');
  assert.equal(w.kana, 'ほんだな');
  assert.equal(w.romaji, 'hondana');
  assert.equal(w.meaning, '書架。書＋棚');
  assert.equal(w.kind, 'word');
  assert.ok(w.accent.includes('acc-note'));
});

const PHRASE_OLD = `
<div class="phrase" data-text="またあした">
  <div class="phrase-content">
    <div class="japanese">またあした</div>
    <div class="romaji">mata ashita</div>
    <div class="meaning">明天見</div>
  </div>
  <button class="play-btn">▶</button>
</div>`;

test('extractFromHtml：phrase（.japanese 舊 class）', () => {
  const [p] = extractFromHtml(PHRASE_OLD);
  assert.equal(p.text, 'またあした');
  assert.equal(p.kana, 'またあした');
  assert.equal(p.romaji, 'mata ashita');
  assert.equal(p.kind, 'phrase');
});

const SEASON = `
<div class="season-card spring" data-text="はる">
  <div class="emoji">🌸</div>
  <div class="chinese">春天</div>
  <div class="japanese">はる</div>
  <div class="romaji">haru</div>
  <button class="play-btn">▶</button>
</div>`;

const EXTRA = `
<div class="extra-item">
  <div class="extra-content">
    <div class="extra-ja">はるが すき</div>
    <div class="extra-romaji">haru ga suki</div>
    <div class="extra-meaning">喜歡春天</div>
  </div>
  <button class="small-play-btn" data-text="はるが すき">▶</button>
</div>`;

test('extractFromHtml：season-card 與 extra-item', () => {
  const s = extractFromHtml(SEASON + EXTRA);
  assert.equal(s.length, 2);
  assert.deepEqual([s[0].text, s[0].meaning], ['はる', '春天']);
  assert.deepEqual([s[1].text, s[1].romaji], ['はるが すき', 'haru ga suki']);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test scripts/test/vocab-scan.test.mjs`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作 `scripts/lib/vocab-scan.mjs`**

```js
// scripts/lib/vocab-scan.mjs
// 掃課程頁的單字卡（word-item / phrase / season-card / extra-item），
// 抽出 text（=data-text，音檔 hash key）、ja(HTML)、kana、romaji、meaning、accent。
// 數字課等「JS 執行期生成卡片」的頁面掃不到，改登記在 data/vocab-extra.json。

import { readdir, readFile } from 'node:fs/promises';

const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export function kanaOf(html) {
  return stripTags(html.replace(/([^<>]*)<rt>([\s\S]*?)<\/rt>/g, '$2'));
}

export function plainText(html) {
  return stripTags(html.replace(/<rt>[\s\S]*?<\/rt>/g, ''));
}

// 取 chunk 內第一個 <div class="cls">…</div> 的內文（欄位 div 內不會再有巢狀 div）
function field(chunk, ...classes) {
  for (const cls of classes) {
    const m = new RegExp(`<div class="${cls}">([\\s\\S]*?)</div>`).exec(chunk);
    if (m) return m[1].trim();
  }
  return '';
}

// 重音那一行整個 div：<div><span class="acc">…</span><span class="acc-note">…</span></div>
function accentOf(chunk) {
  const m = /<div>\s*<span class="acc">[\s\S]*?<\/div>/.exec(chunk);
  return m ? m[0].replace(/^<div>\s*/, '').replace(/\s*<\/div>$/, '') : undefined;
}

export function extractFromHtml(html) {
  const out = [];
  const push = (text, jaHtml, romaji, meaning, kind, accent) => {
    if (!text) return;
    out.push({
      text,
      ja: jaHtml.trim(),
      kana: kanaOf(jaHtml),
      romaji: plainText(romaji),
      meaning: plainText(meaning),
      ...(accent ? { accent } : {}),
      kind,
    });
  };

  for (const m of html.matchAll(
    /<div class="word-item[^"]*"[^>]*data-text="([^"]*)"[^>]*>([\s\S]*?)<button class="play-btn"/g
  )) {
    const chunk = m[2];
    push(m[1], field(chunk, 'word-ja'), field(chunk, 'word-romaji'),
      field(chunk, 'word-meaning'), 'word', accentOf(chunk));
  }

  for (const m of html.matchAll(
    /<div class="phrase"[^>]*data-text="([^"]*)"[^>]*>([\s\S]*?)<button/g
  )) {
    const chunk = m[2];
    push(m[1], field(chunk, 'phrase-ja', 'japanese'),
      field(chunk, 'phrase-romaji', 'romaji'),
      field(chunk, 'phrase-meaning', 'meaning'), 'phrase');
  }

  for (const m of html.matchAll(
    /<div class="season-card[^"]*"[^>]*data-text="([^"]*)"[^>]*>([\s\S]*?)<button/g
  )) {
    const chunk = m[2];
    push(m[1], field(chunk, 'japanese'), field(chunk, 'romaji'),
      field(chunk, 'chinese'), 'word');
  }

  for (const m of html.matchAll(/<div class="extra-item">([\s\S]*?)<\/button>/g)) {
    const chunk = m[1];
    const dt = /<button[^>]*data-text="([^"]*)"/.exec(chunk);
    if (!dt) continue;
    push(dt[1], field(chunk, 'extra-ja'), field(chunk, 'extra-romaji'),
      field(chunk, 'extra-meaning'), 'word');
  }

  return out;
}

const titleOf = (html) => {
  const m = /<title>([^<]*)<\/title>/.exec(html);
  return m ? m[1].split('—')[0].trim() : '';
};

export async function scanLessons() {
  const out = [];
  const names = (await readdir('lessons')).filter(
    (n) => n.endsWith('.html') && !n.startsWith('_')
  ).sort();
  for (const n of names) {
    const html = await readFile(`lessons/${n}`, 'utf8');
    const lesson = {
      date: n.slice(0, 10),
      href: `lessons/${n}`,
      title: titleOf(html),
    };
    for (const e of extractFromHtml(html)) out.push({ ...e, lesson });
  }
  return out;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node --test scripts/test/vocab-scan.test.mjs`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/vocab-scan.mjs scripts/test/vocab-scan.test.mjs
git commit -m "新增單字抽取模組 vocab-scan（word-item/phrase/season/extra 四卡型）"
```

---

### Task 2: 產生器 `scripts/build-vocab.mjs` ＋ 手動補登檔

**Files:**
- Create: `scripts/build-vocab.mjs`
- Create: `data/vocab-extra.json`
- Test: `scripts/test/build-vocab.test.mjs`
- 產出: `js/vocab-data.js`、`data/vocab.json`

**Interfaces:**
- Consumes: `scanLessons()`（Task 1）
- Produces:
  - `mergeWords(records) → words[]`（export 供測試；以 `text+'|'+kana` 去重，lessons 舊→新）
  - `js/vocab-data.js`：`window.VOCAB_DATA = words` ＋ `window.VOCAB_META = {generated}`
  - `data/vocab.json`：`{generated, words}`
  - word 形狀：`{text, ja, kana, romaji, meaning, accent?, kind, tags, lessons:[{date,href,title}]}`，
    整體排序＝首課日期新→舊

- [ ] **Step 1: 寫失敗測試（合併去重）**

`scripts/test/build-vocab.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeWords } from '../build-vocab.mjs';

test('mergeWords：同字多課合併、lessons 舊→新、整體新→舊', () => {
  const L = (date) => ({ date, href: `lessons/${date}-x.html`, title: 'x' });
  const rec = (text, date) => ({
    text, ja: text, kana: text, romaji: 'x', meaning: 'x', kind: 'word', lesson: L(date),
  });
  const words = mergeWords([
    rec('棚', '2026-08-18'), rec('山', '2026-08-07'), rec('棚', '2026-08-19'),
  ]);
  assert.equal(words.length, 2);
  assert.equal(words[0].text, '棚'); // 首課 8/18 比 山 8/07 新 → 排前面
  assert.deepEqual(words[0].lessons.map((l) => l.date), ['2026-08-18', '2026-08-19']);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test scripts/test/build-vocab.test.mjs`
Expected: FAIL

- [ ] **Step 3: 實作 `scripts/build-vocab.mjs`**

```js
#!/usr/bin/env node
// scripts/build-vocab.mjs
// 掃課程頁單字卡 → js/vocab-data.js（vocab.html 用）＋ data/vocab.json（Anki 腳本用）。
// tag 來自 data/vocab-tags.json（沒登記的字會列警告）；
// JS 生成卡片的頁面（數字、日にち）登記在 data/vocab-extra.json。
// 用法：寫完新課程後 `node scripts/build-vocab.mjs`，產物一起 commit。

import { readFile, writeFile } from 'node:fs/promises';
import { scanLessons } from './lib/vocab-scan.mjs';

export function mergeWords(records) {
  const map = new Map();
  for (const { lesson, ...e } of records) {
    const key = e.text + '|' + e.kana;
    if (!map.has(key)) map.set(key, { ...e, lessons: [] });
    map.get(key).lessons.push(lesson);
  }
  const words = [...map.values()];
  for (const w of words) w.lessons.sort((a, b) => a.date.localeCompare(b.date));
  words.sort((a, b) => b.lessons[0].date.localeCompare(a.lessons[0].date));
  return words;
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

// 直接執行才跑（讓測試 import mergeWords 時不動檔案）
if (process.argv[1] && process.argv[1].endsWith('build-vocab.mjs')) {
  const records = await scanLessons();
  const extra = await readJson('data/vocab-extra.json', []);
  const words = mergeWords([...records, ...extra]);

  const tagMap = await readJson('data/vocab-tags.json', {});
  const untagged = [];
  for (const w of words) {
    w.tags = tagMap[w.text] ?? (w.kind === 'phrase' ? ['問候・句型'] : []);
    if (!w.tags.length) untagged.push(w.text);
  }

  const generated = new Date().toISOString().slice(0, 10);
  await writeFile(
    'js/vocab-data.js',
    '// 由 scripts/build-vocab.mjs 產生，請勿手動編輯\n' +
      'window.VOCAB_DATA = ' + JSON.stringify(words) + ';\n' +
      'window.VOCAB_META = ' + JSON.stringify({ generated }) + ';\n',
    'utf8'
  );
  await writeFile('data/vocab.json',
    JSON.stringify({ generated, words }, null, 1), 'utf8');

  const months = new Set(words.map((w) => w.lessons[0].date.slice(0, 7)));
  console.log(`✅ ${words.length} 筆（word ${words.filter((w) => w.kind === 'word').length}` +
    ` / phrase ${words.filter((w) => w.kind === 'phrase').length}），跨 ${months.size} 個月`);
  if (untagged.length) {
    console.log(`⚠️  ${untagged.length} 個字還沒有 tag（補進 data/vocab-tags.json 後重跑）：`);
    console.log('   ' + untagged.join('、'));
  }
}
```

- [ ] **Step 4: 建 `data/vocab-extra.json`（JS 生成頁的手動補登）**

格式（陣列，欄位同 scan 記錄；`ja` 可含 ruby HTML）：

```json
[
  {
    "text": "一",
    "ja": "<ruby>一<rt>いち</rt></ruby>",
    "kana": "いち",
    "romaji": "ichi",
    "meaning": "1",
    "kind": "word",
    "lesson": {
      "date": "2026-05-03",
      "href": "lessons/2026-05-03-numbers.html",
      "title": "數字 1〜10"
    }
  }
]
```

打開 `lessons/2026-05-03-numbers.html` 與 `lessons/2026-08-08-hinichi.html`（日にち；
以 `grep -l 'number-card' lessons/*.html` 確認確切檔名清單），把頁內 JS 資料陣列的
每一項照上面格式登記（數字 1〜10 基本唸法必收；日にち的 1日〜31日 全收，
熟字訓如 20日＝はつか照整組標）。`lesson.title` 抄該頁 `<title>` 破折號前半。

- [ ] **Step 5: 跑測試與真實產生**

Run: `node --test scripts/test/build-vocab.test.mjs` → PASS
Run: `node scripts/build-vocab.mjs`
Expected: 總數與 `grep -c 'class="word-item' lessons/*.html | awk -F: '{s+=$2} END {print s}'`
同量級（合併去重後略少）；此階段全部字都會列在「沒有 tag」警告裡（正常，Task 3 處理）。
抽查 `data/vocab.json`：`本棚` 的 kana／meaning／lesson 正確。

- [ ] **Step 6: Commit**

```bash
git add scripts/build-vocab.mjs scripts/test/build-vocab.test.mjs data/vocab-extra.json js/vocab-data.js data/vocab.json
git commit -m "新增 build-vocab 產生器：全站單字資料 vocab-data.js / vocab.json"
```

---

### Task 3: 全量 tag 分類 `data/vocab-tags.json`

**Files:**
- Create: `data/vocab-tags.json`
- 更新產出: `js/vocab-data.js`、`data/vocab.json`

**Interfaces:**
- Produces: `{"<text>": ["tag", ...]}`；tag 集合（定案）：
  `食物`、`場所`、`購物`、`動詞`、`時間・日期`、`數字`、`季節・天氣`、`家族・人`、
  `交通`、`身體・健康`、`形容詞・副詞`、`學校・工作`、`生活雜貨`、`自然`、`問候・句型`
  （15 個；一字可多 tag；`.phrase` 不用登記，自動掛 `問候・句型`）

- [ ] **Step 1: 產出未分類清單**

Run: `node scripts/build-vocab.mjs 2>&1 | tail -20`
把警告列出的字（約 1000+）整理成清單。

- [ ] **Step 2: 逐字分類寫入 `data/vocab-tags.json`**

由 Claude 依上列 15 個 tag 逐字分類（一字可掛多個，如 郵便局＝場所；本棚＝生活雜貨、購物）。
規則：對不準的寧可只掛一個大類，不硬湊；動詞課的動詞掛 `動詞` 再加語意類（如 食べます＝動詞＋食物）。

- [ ] **Step 3: 重跑到零警告**

Run: `node scripts/build-vocab.mjs`
Expected: 沒有「還沒有 tag」警告；輸出各 tag 統計正常。

- [ ] **Step 4: 抽查**

隨機抽 15 個字用 `python3 -c` 或 jq 檢查 tag 合理（例：水曜日→時間・日期、レジ→購物）。
不合理的修正後重跑。

- [ ] **Step 5: Commit**

```bash
git add data/vocab-tags.json js/vocab-data.js data/vocab.json
git commit -m "全站單字 tag 分類初版（15 類）"
```

---

### Task 4: 頁面 `vocab.html` ＋ `js/vocab-page.js`

**Files:**
- Create: `vocab.html`
- Create: `js/vocab-page.js`

**Interfaces:**
- Consumes: `window.VOCAB_DATA`／`window.VOCAB_META`（Task 2）、`JTalk.speak(text, btn, {rate})`（js/tts.js）
- Produces: 頁面行為——預設選最新月份；搜尋（text/kana/romaji 不分大小寫/meaning）×tag×月份 AND；
  批次渲染 60；Anki 下載卡 href＝`anki/tango-<月份>.apkg`、全部＝`anki/tango-all.apkg`（Task 5 產）

- [ ] **Step 1: 寫 `vocab.html`**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>単語帳 — 學過的單字都在這裡查</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg" />
<style>
/* 単語帳 — 小豆／海老茶色票 */
:root{--paper:#fbf3f1;--paper-deep:#f2e0dc;--ink:#2a1412;--ink-soft:#48231f;--ink-mute:#85524b;--accent:#96504b;--accent-soft:#cfa09b;--accent-pale:#f3ddda;--line:#e9cbc6;--bg-spot-1:#f9ece8;--bg-spot-2:#f1d9d2;}
.wrap{max-width:1020px}
.vlayout{display:grid;grid-template-columns:1fr 200px;gap:26px;align-items:start}
.vpanel{position:sticky;top:16px;border:1px solid var(--line);border-radius:12px;background:#fff;padding:14px 16px}
.vpanel h3{font-size:13px;color:var(--ink-mute);margin:0 0 8px;font-weight:600;letter-spacing:.05em}
.vpanel h3:not(:first-of-type){margin-top:16px;padding-top:14px;border-top:1px dashed var(--line)}
.vpanel summary{list-style:none;cursor:pointer;font-size:14px;color:var(--ink-soft);display:flex;justify-content:space-between;align-items:center}
.vpanel summary::-webkit-details-marker{display:none}
.vpanel summary .cur{color:var(--accent);font-weight:600}
.vpanel summary .caret{color:var(--ink-mute);font-size:12px}
.month-list{list-style:none;margin:0;padding:0;font-size:14px}
.month-list a{display:flex;justify-content:space-between;color:var(--ink-soft);text-decoration:none;padding:4px 8px;border-radius:8px}
.month-list a.on{background:var(--accent-pale);color:var(--accent);font-weight:600}
.month-list .n,.tag-cloud .n{font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--ink-mute);font-size:12px}
.tag-cloud{display:flex;flex-wrap:wrap;gap:6px}
.tag-cloud a{display:inline-flex;align-items:baseline;gap:4px;padding:3px 10px;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink-soft);text-decoration:none;font-size:13px}
.tag-cloud a.on{background:var(--accent);border-color:var(--accent);color:#fff}
.tag-cloud a.on .n{color:#fff;opacity:.8}
.anki-box{margin-top:16px;padding:10px 12px;border:1px dashed var(--accent-soft);border-radius:10px;background:var(--bg-spot-1);font-size:12px;color:var(--ink-soft)}
.anki-box .btn{display:block;text-align:center;margin-top:8px;padding:7px 0;border-radius:999px;background:var(--accent);color:#fff;text-decoration:none;font-size:13px}
.anki-box .sub{margin-top:6px;color:var(--ink-mute);font-size:11px;line-height:1.6}
.vsearch{width:100%;box-sizing:border-box;font-family:'Noto Serif TC',serif;font-size:16px;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);outline:none;margin-bottom:8px}
.result-count{font-size:13px;color:var(--ink-mute);margin:0 0 10px 4px;font-style:italic;font-family:'Cormorant Garamond',serif}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:14px}
.vcard{position:relative;background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 16px 12px}
.vcard .vtag{position:absolute;top:12px;right:12px;font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid var(--line);color:var(--ink-mute);background:var(--paper)}
.vcard .vja{font-family:'Shippori Mincho',serif;font-size:25px;color:var(--ink)}
.vcard .vromaji{font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--ink-mute);font-size:14px}
.vcard .vacc{font-size:13px;margin-top:2px}
.vcard .vmean{font-size:14px;color:var(--ink-soft);margin-top:6px}
.vcard .vfoot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px dashed var(--line);font-size:12px}
.vcard .vfoot a{color:var(--accent);text-decoration:none}
.load-more{margin:22px 0 6px;text-align:center}
.load-more .bar{font-size:12px;color:var(--ink-mute);margin-bottom:8px;font-family:'Cormorant Garamond',serif;font-style:italic}
.load-more button{font-family:'Noto Serif TC',serif;font-size:14px;color:var(--accent);background:#fff;border:1px solid var(--accent-soft);border-radius:999px;padding:8px 26px;cursor:pointer;display:none}
@media(max-width:640px){
  .vlayout{grid-template-columns:1fr}
  .vpanel{position:static;order:-1;padding:0}
  .vpanel summary{padding:10px 14px}
  .vpanel .panel-body{padding:0 16px 14px}
}
@media(min-width:641px){.vpanel summary{display:none}}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600;700;800&family=Noto+Serif+TC:wght@300;400;500;600&family=Klee+One:wght@400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="shared.css" />
<script src="js/site-chrome.js" defer></script>
</head>
<body>
<div class="wrap">
<site-header></site-header>

  <h1 class="page-title">単語<span class="accent">帳</span></h1>
  <div class="page-meta">檢索 · Vocabulary Index · 自動產生</div>
  <p class="page-subtitle">學過的單字都在這裡——用日文・假名・romaji・中文都能查</p>
  <div class="speed-control"><input type="range" min="0.5" max="1.2" step="0.1" value="1" aria-label="發音速度"></div>

  <div class="vlayout">
    <main>
      <input class="vsearch" id="q" type="search" placeholder="搜尋：日文・假名・romaji・中文">
      <div class="result-count" id="count"></div>
      <div class="card-grid" id="grid"></div>
      <div class="load-more">
        <div class="bar" id="shown-bar"></div>
        <button id="more">載入更多</button>
        <div id="sentinel"></div>
      </div>
    </main>
    <aside class="vpanel">
      <details id="filters" open>
        <summary><span>篩選：<span class="cur" id="cur-label"></span></span><span class="caret">▾</span></summary>
        <div class="panel-body">
          <h3>分類 TAG</h3>
          <div class="tag-cloud" id="tags"></div>
          <h3>月份</h3>
          <ul class="month-list" id="months"></ul>
          <div class="anki-box">
            <b>Anki 牌組</b>（隨課程更新）
            <a class="btn" id="anki-link" href="#">⬇ Anki</a>
            <div class="sub">重複匯入只會加新卡，複習進度保留。卡片帶分類與月份 tag，
            Anki 內可用 Custom Study 按 tag 練。<span id="anki-meta"></span></div>
          </div>
        </div>
      </details>
    </aside>
  </div>

<site-footer></site-footer>
</div>
<script src="js/vocab-data.js"></script>
<script src="js/tts.js"></script>
<script src="js/vocab-page.js"></script>
</body>
</html>
```

- [ ] **Step 2: 寫 `js/vocab-page.js`**

```js
// js/vocab-page.js — 単語帳的過濾與渲染（資料來自 vocab-data.js）
(function () {
  const D = window.VOCAB_DATA || [];
  const BATCH = 60;
  const monthOf = (w) => w.lessons[0].date.slice(0, 7);
  const months = [...new Set(D.map(monthOf))].sort().reverse();
  const tagCount = {};
  D.forEach((w) => w.tags.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));

  const state = { q: '', tag: null, month: months[0] || 'all', shown: BATCH };
  const $ = (id) => document.getElementById(id);
  const rateInput = document.querySelector('.speed-control input');

  function matches(w) {
    if (state.month !== 'all' && monthOf(w) !== state.month) return false;
    if (state.tag && !w.tags.includes(state.tag)) return false;
    if (state.q) {
      const q = state.q.toLowerCase();
      return w.text.includes(state.q) || w.kana.includes(state.q) ||
        w.romaji.toLowerCase().includes(q) || w.meaning.includes(state.q);
    }
    return true;
  }

  function label() {
    const m = state.month === 'all' ? '全部' : state.month.replace('2026-0', '').replace('2026-', '') + '月';
    return state.tag ? `${m} × ${state.tag}` : m;
  }

  function card(w) {
    const el = document.createElement('div');
    el.className = 'vcard';
    const first = w.lessons[0];
    const extra = w.lessons.length > 1 ? `（＋${w.lessons.length - 1} 課）` : '';
    el.innerHTML =
      `<span class="vtag">${w.tags[0] || ''}</span>` +
      `<div class="vja">${w.ja}</div>` +
      `<div class="vromaji">${w.romaji}</div>` +
      (w.accent ? `<div class="vacc">${w.accent}</div>` : '') +
      `<div class="vmean">${w.meaning}</div>` +
      `<div class="vfoot"><a href="${first.href}">${first.date.slice(5).replace('-', '/')}` +
      ` · ${first.title}${extra}</a>` +
      `<button class="play-btn" aria-label="播放">▶</button></div>`;
    el.querySelector('.play-btn').addEventListener('click', function () {
      window.JTalk.speak(w.text, this, { rate: parseFloat(rateInput.value) });
    });
    return el;
  }

  function render() {
    const hits = D.filter(matches);
    const grid = $('grid');
    grid.textContent = '';
    hits.slice(0, state.shown).forEach((w) => grid.appendChild(card(w)));
    $('count').textContent = `${label()} — ${hits.length} words`;
    $('cur-label').textContent = label();
    const shown = Math.min(state.shown, hits.length);
    $('shown-bar').textContent = hits.length > shown
      ? `已顯示 ${shown} / ${hits.length}` : `已顯示 ${shown} / ${hits.length}`;
    $('more').style.display = hits.length > shown ? 'inline-block' : 'none';
    renderSidebar();
    renderAnki();
  }

  function renderSidebar() {
    const tags = $('tags');
    tags.textContent = '';
    const mk = (labelTxt, n, on, fn) => {
      const a = document.createElement('a');
      a.href = '#';
      a.className = on ? 'on' : '';
      a.innerHTML = `${labelTxt} <span class="n">${n}</span>`;
      a.addEventListener('click', (e) => { e.preventDefault(); fn(); });
      return a;
    };
    tags.appendChild(mk('全部', D.length, !state.tag, () => setState({ tag: null })));
    Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a]).forEach((t) => {
      tags.appendChild(mk(t, tagCount[t], state.tag === t,
        () => setState({ tag: state.tag === t ? null : t })));
    });

    const ml = $('months');
    ml.textContent = '';
    const li = (labelTxt, n, key) => {
      const el = document.createElement('li');
      const a = mk(labelTxt, n, state.month === key, () => setState({ month: key }));
      el.appendChild(a);
      ml.appendChild(el);
    };
    li('全部月份', D.length, 'all');
    months.forEach((m) => li(m.replace('-', ' · ').replace(' · 0', ' · ') + '月',
      D.filter((w) => monthOf(w) === m).length, m));
  }

  function renderAnki() {
    const a = $('anki-link');
    if (state.month === 'all') {
      a.href = 'anki/tango-all.apkg';
      a.textContent = '⬇ 全部 tango-all.apkg';
    } else {
      a.href = `anki/tango-${state.month}.apkg`;
      a.textContent = `⬇ 単語帳 ${state.month}.apkg`;
    }
    a.setAttribute('download', '');
    $('anki-meta').textContent = window.VOCAB_META
      ? `最後更新 ${window.VOCAB_META.generated}` : '';
  }

  function setState(patch) {
    Object.assign(state, patch, { shown: BATCH });
    render();
  }

  $('q').addEventListener('input', function () { setState({ q: this.value.trim() }); });
  $('more').addEventListener('click', () => { state.shown += BATCH; render(); });
  new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting) &&
        $('more').style.display !== 'none') { state.shown += BATCH; render(); }
  }).observe($('sentinel'));

  // 手機預設收起（桌機 CSS 隱藏 summary、details 保持 open）
  if (window.innerWidth <= 640) $('filters').open = false;

  render();
})();
```

- [ ] **Step 3: 瀏覽器驗證**

用 preview（npx-serve）開 `http://localhost:3000/vocab.html`，逐項檢查：
1. 預設顯示最新月份、result-count 正確
2. 搜「hondana」「ほんだな」「書架」都命中本棚；清空恢復
3. 點 tag「購物」→ 疊加過濾；再點取消
4. 「全部月份」→ 批次渲染：捲到底自動補、bar 數字對
5. ▶ 播放出聲（速度膠囊切換有效）
6. 出處連結點過去正確；console 無錯誤
7. resize 到 375px：篩選列收合／展開正常
（Anki 連結此時 404 是預期，Task 5 之後才有檔）

- [ ] **Step 4: Commit**

```bash
git add vocab.html js/vocab-page.js
git commit -m "新增単語帳頁 vocab.html：搜尋×tag×月份過濾、批次渲染（小豆色票）"
```

---

### Task 5: Anki 產生器 `anki/build-anki-vocab.py`

**Files:**
- Create: `anki/jp_model.py`（從 build-anki-apkg.py 抽出共用 note type）
- Modify: `anki/build-anki-apkg.py`（改 import 共用 model，行為不變）
- Create: `anki/build-anki-vocab.py`
- 產出: `anki/tango-YYYY-MM.apkg` × 各月、`anki/tango-all.apkg`

**Interfaces:**
- Consumes: `data/vocab.json`（Task 2/3）、`audio/<sha256(text)[:16]>.mp3`
- Produces: `jp_model.build_model() → genanki.Model`（id 1607392331，欄位
  單字/讀音/羅馬/意思/例句/音檔，模板與 CSS 與現行完全相同）

- [ ] **Step 1: 抽出 `anki/jp_model.py`**

把 build-anki-apkg.py 的 `CSS`／`FRONT`／`BACK` 常數與 model 建構搬過來：

```python
# anki/jp_model.py — 「日文單字卡（打字版）」note type（兩支產生器共用）
# model id 固定 1607392331：所有牌組同一 note type，模板改一處就好。
import genanki

CSS = """
.card { font-family: "Hiragino Mincho ProN", "YuMincho", serif; text-align: center;
        background: #fdf6f0; color: #3a2e26; padding: 24px; }
.word    { font-size: 64px; font-weight: 600; }
.reading { font-size: 28px; color: #c96830; margin-top: 10px; }
.romaji  { font-size: 18px; font-style: italic; color: #9a8c80; }
.meaning { font-size: 24px; margin-top: 10px; }
.example { font-size: 20px; margin-top: 14px; color: #5a4a3e; }
.audio   { margin-top: 14px; }
hr#answer{ border: none; border-top: 1px solid #e5d5c5; margin: 18px 0; }
input    { font-size: 24px; text-align: center; font-family: inherit; }
"""
FRONT = '<div class="word">{{單字}}</div>\n{{type:讀音}}\n'
BACK = ('{{FrontSide}}\n<hr id=answer>\n'
        '<div class="reading">{{讀音}}</div>\n'
        '<div class="romaji">{{羅馬}}</div>\n'
        '<div class="meaning">{{意思}}</div>\n'
        '{{#例句}}<div class="example">{{例句}}</div>{{/例句}}\n'
        '<div class="audio">{{音檔}}</div>\n')

def build_model():
    return genanki.Model(
        1607392331, "日文單字卡（打字版）",
        fields=[{"name": "單字"}, {"name": "讀音"}, {"name": "羅馬"},
                {"name": "意思"}, {"name": "例句"}, {"name": "音檔"}],
        templates=[{"name": "看字→打讀音", "qfmt": FRONT, "afmt": BACK}],
        css=CSS,
    )
```

`build-anki-apkg.py`：刪掉本地的 CSS/FRONT/BACK 與 `genanki.Model(...)` 區塊，改成
`from jp_model import build_model`、`model = build_model()`。

- [ ] **Step 2: 回歸驗證舊腳本**

Run: `cd anki && ./venv/bin/python build-anki-apkg.py n5-basic`
Expected: 正常產出（音檔全在 audio_cache，不需開 VOICEVOX）。產完把 apkg 還原：
`git checkout -- '日文單字-N5基礎.apkg'`（或確認 diff 只是重新打包）。

- [ ] **Step 3: 寫 `anki/build-anki-vocab.py`**

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
data/vocab.json → Anki 牌組（単語帳）

預設（無參數）：每月一檔 anki/tango-YYYY-MM.apkg ＋ 整副 anki/tango-all.apkg，
全部 commit 進 repo，vocab.html 的下載卡直連。

- note guid = guid_for(text, kana)：重複匯入只加新卡、複習進度保留
- 月份 deck：単語帳::YYYY-MM（deck id = 1699000000 + YYYYMM，固定不變）
- 每張 note 帶 tags：分類 tag（空白換成底線）＋月份（2026-08）
- 音檔直接用站內 audio/<sha256(text)[:16]>.mp3（波音リツ），缺檔留空並警告
- kind=phrase 預設不收，--include-phrases 加回
- 自訂輸出（不 commit）：--tag 購物 / --from 2026-06-01 --to 2026-07-31，需搭 --out x.apkg

用法：cd anki && ./venv/bin/python build-anki-vocab.py [選項]
"""
import argparse, hashlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import genanki
from jp_model import build_model

ANKI_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(ANKI_DIR)
DECK_BASE = 1699000000

def audio_of(text):
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    path = os.path.join(ROOT, "audio", h + ".mp3")
    return (path, h + ".mp3") if os.path.exists(path) else (None, None)

def month_of(w):
    return w["lessons"][0]["date"][:7]

def note_for(w, model):
    path, fname = audio_of(w["text"])
    tags = [t.replace(" ", "_") for t in w["tags"]] + [month_of(w)]
    note = genanki.Note(
        model=model,
        fields=[w["text"], w["kana"], w["romaji"], w["meaning"], "",
                f"[sound:{fname}]" if fname else ""],
        tags=tags,
        guid=genanki.guid_for(w["text"], w["kana"]),
    )
    return note, path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--include-phrases", action="store_true")
    ap.add_argument("--tag")
    ap.add_argument("--from", dest="date_from")
    ap.add_argument("--to", dest="date_to")
    ap.add_argument("--out")
    args = ap.parse_args()

    with open(os.path.join(ROOT, "data", "vocab.json"), encoding="utf-8") as f:
        words = json.load(f)["words"]
    if not args.include_phrases:
        words = [w for w in words if w["kind"] == "word"]

    model = build_model()
    custom = args.tag or args.date_from or args.date_to
    if custom:
        if not args.out:
            sys.exit("自訂範圍請搭配 --out 輸出路徑")
        if args.tag:
            words = [w for w in words if args.tag in w["tags"]]
        if args.date_from:
            words = [w for w in words if w["lessons"][0]["date"] >= args.date_from]
        if args.date_to:
            words = [w for w in words if w["lessons"][0]["date"] <= args.date_to]
        deck = genanki.Deck(DECK_BASE + 999999, "単語帳::カスタム")
        media, missing = [], 0
        for w in words:
            note, path = note_for(w, model)
            deck.add_note(note)
            if path: media.append(path)
            else: missing += 1
        pkg = genanki.Package(deck); pkg.media_files = media
        pkg.write_to_file(args.out)
        print(f"✅ {args.out}：{len(words)} 張卡（缺音檔 {missing}）")
        return

    by_month = {}
    for w in words:
        by_month.setdefault(month_of(w), []).append(w)

    all_decks, all_media, missing = [], [], []
    for month in sorted(by_month):
        deck = genanki.Deck(DECK_BASE + int(month.replace("-", "")),
                            f"単語帳::{month}")
        media = []
        for w in by_month[month]:
            note, path = note_for(w, model)
            deck.add_note(note)
            if path: media.append(path)
            else: missing.append(w["text"])
        pkg = genanki.Package(deck); pkg.media_files = media
        out = os.path.join(ANKI_DIR, f"tango-{month}.apkg")
        pkg.write_to_file(out)
        print(f"  ✓ tango-{month}.apkg  {len(by_month[month])} 張")
        all_decks.append(deck); all_media.extend(media)

    pkg = genanki.Package(all_decks); pkg.media_files = all_media
    pkg.write_to_file(os.path.join(ANKI_DIR, "tango-all.apkg"))
    print(f"✅ tango-all.apkg  共 {len(words)} 張卡、{len(by_month)} 個月")
    if missing:
        print(f"⚠️  {len(missing)} 個字沒有對應 mp3（音檔欄留空）："
              + "、".join(missing[:20]) + ("…" if len(missing) > 20 else ""))

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 執行與驗證**

Run: `cd anki && ./venv/bin/python build-anki-vocab.py`
驗證：
1. 各月份檔＋tango-all 都產出；張數合計＝vocab.json 的 word 數
2. `unzip -l anki/tango-all.apkg | head`：有 collection.anki2 與 media
3. `python3 -c` 開 zip 讀 `media` json：檔名是 16 碼 hash.mp3
4. 缺 mp3 警告清單合理（例如純視覺條目）
5. （手動，建議）匯入 Anki 桌面版：出現 `単語帳::2026-08`，卡片顯示、發音、
   tag 齊全；**再匯入一次同檔** → 0 新卡、進度不動

- [ ] **Step 5: Commit**

```bash
git add anki/jp_model.py anki/build-anki-apkg.py anki/build-anki-vocab.py anki/tango-*.apkg
git commit -m "新增 Anki 単語帳產生器：月份 apkg＋tango-all，guid 穩定可重複匯入"
```

---

### Task 6: 導覽列・資源頁・工作流整合・收尾

**Files:**
- Modify: `js/site-chrome.js`（導覽列四入口）
- Modify: `resources.html`（多読入口卡）
- Create: `scripts/build-all.sh`
- Modify: `CLAUDE.md`（導覽列、色票表、新增課程工作流、tag 維護）
- Delete: `mockups/`

**Interfaces:**
- Consumes: vocab.html（Task 4）、apkg 檔（Task 5）

- [ ] **Step 1: 改導覽列**

`js/site-chrome.js` 把：

```js
            ${navItem('grammar.html', '文法')}
            ${navItem('kanji.html', '漢字')}
            ${navItem('resources.html', '資源')}
            ${navItem('tadoku.html', '多読')}
```

改成：

```js
            ${navItem('grammar.html', '文法')}
            ${navItem('kanji.html', '漢字')}
            ${navItem('vocab.html', '檢索')}
            ${navItem('resources.html', '資源')}
```

- [ ] **Step 2: resources.html 加多読入口卡**

在 `<ul class="lesson-list">` 的「多読起步 閱讀清單」那張卡**後面**插入：

```html
    <li>
      <a class="lesson-link" href="tadoku.html">
        <div class="lesson-meta">多読 · Tadoku Stories</div>
        <div class="lesson-title">自製迷你多読小故事 <span class="arrow">→</span></div>
        <div class="lesson-summary">一頁一場景的自製小故事，全部可發音 — 原導覽列「多読」入口移到這裡</div>
      </a>
    </li>
```

- [ ] **Step 3: 建 `scripts/build-all.sh`**

```bash
#!/bin/sh
# 新增課程後一步跑完：漢字索引 → 單字索引 → Anki 牌組（任一步失敗就中止）
set -e
cd "$(dirname "$0")/.."
node scripts/build-kanji.mjs
node scripts/build-vocab.mjs
anki/venv/bin/python anki/build-anki-vocab.py
```

Run: `chmod +x scripts/build-all.sh && scripts/build-all.sh` → 三步都成功。

- [ ] **Step 4: 更新 CLAUDE.md**

1. 導覽列段落：「文法／漢字／檢索（`vocab.html`）／資源」，註明多読入口
   改在 resources.html、tadoku.html 本身與 tadoku/* 不變
2. 色票表加一列：`vocab.html（単語帳） | 小豆／海老茶 | #fbf3f1 | #96504b`
3. 「Adding a New Page」Step 6 改為：跑 `scripts/build-all.sh`（＝build-kanji ＋
   build-vocab ＋ build-anki-vocab；新單字沒 tag 時 build-vocab 會警告，
   補進 `data/vocab-tags.json` 再重跑；產物 kanji/vocab/apkg 一起 commit）
4. 檔案結構樹加 `vocab.html`、`data/vocab*.json`、`anki/tango-*.apkg`

- [ ] **Step 5: 全站瀏覽器驗證**

preview 開站檢查：
1. 首頁導覽列＝家／文法／漢字／檢索／資源；「檢索」點入 vocab.html、active 高亮
2. lessons 子頁導覽列 prefix 正確（`../vocab.html`）
3. resources.html 多読卡點入 tadoku.html
4. vocab.html Anki 下載卡點擊可下載（200，不再 404）
5. 手機寬度全站導覽列不折行爆版

- [ ] **Step 6: 刪 mockups、最終 commit**

```bash
rm -rf mockups
git add -A js/site-chrome.js resources.html scripts/build-all.sh CLAUDE.md
git commit -m "導覽列改文法/漢字/檢索/資源，多読移入資源頁；新增 build-all 工作流"
```

（`mockups/` 未曾入版控，`rm -rf` 即消失。）

---

## Self-Review 紀錄

- Spec 覆蓋：資料管線（T1–T3）、頁面（T4）、Anki（T5）、導覽列＋工作流＋CLAUDE.md（T6）✓；
  「數字卡 JS 生成掃不到」以 `data/vocab-extra.json` 補登（spec 的 .number-card 掃描改為手動登記，
  偏離已知會於實作總結告知）
- 型別一致：`mergeWords` 輸出形狀＝vocab-data.js／vocab.json 的 word 形狀＝
  vocab-page.js 與 build-anki-vocab.py 的讀取欄位 ✓；`kanaOf/plainText` 名稱各任務一致 ✓
- 無 TBD／占位；每個程式步驟附完整程式碼 ✓
