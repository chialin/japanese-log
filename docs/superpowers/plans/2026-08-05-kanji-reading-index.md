# 漢字音讀對照表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建一個全自動的漢字音讀對照系統——掃全站 ruby 標音，產出可篩選的漢字索引頁，並在既有課程頁自動長出「這個字你看過 N 次」的徽章。

**Architecture:** 三層。① `scripts/lib/*.mjs` 是純函式（掃描／對齊／台語規則），有單元測試；② `scripts/build-kanji.mjs` 串起來產出 `kanji.html`、`js/kanji-data.js`、`js/kanji-index.js`；③ 瀏覽器端 `js/kanji-page.js`（索引頁互動）與 `js/kanji-link.js`（課程頁徽章，掛在既有的 `site-chrome.js` 載入點，舊頁零修改）。

**Tech Stack:** Node 24（只用內建模組與 `node --test`，不裝任何套件）、原生 DOM API、KANJIDIC2（EDRDG, CC BY-SA 4.0）。

## Global Constraints

- **零依賴**：不建立 `package.json`，不 `npm install`。只用 Node 內建模組（`node:fs/promises`、`node:zlib`、`node:test`、`node:assert/strict`）。
- **色票不新增**：音讀＝`var(--accent)`；訓讀＝`#a9762a`（既有 same-day 金茶）；台語線索＝既有 `.mnemonic` 紅貼紙。所有新樣式寫進 `shared.css`，不寫 inline style。
- **字體不改**：`Shippori Mincho` / `Noto Serif TC` / `Cormorant Garamond`，不可用 sans-serif。
- **產物進版控**：`data/kanji-readings.json`、`js/kanji-data.js`、`js/kanji-index.js`、`kanji.html` 都要 commit。
- **失效必須無聲**：任何一個產物檔缺失時，課程頁必須完全正常顯示且 console 無錯誤。
- **徽章門檻**：出現天數 `>= 3`。
- **檔名日期**：課程檔名前 10 碼即 ISO 日期（`2026-08-05-doko.html` → `2026-08-05`）。
- **繁體中文**：所有使用者可見文案用繁體中文，程式碼註解亦同。

---

## File Structure

**新建：**

| 檔案 | 責任 |
|---|---|
| `scripts/lib/kanji-scan.mjs` | 從 HTML 字串抽出 `<ruby>` 出現記錄 |
| `scripts/lib/kanji-align.mjs` | 把單字讀音切給各漢字，分類音讀／訓讀 |
| `scripts/lib/taigi.mjs` | 由音讀韻尾推台語線索 |
| `scripts/lib/kanji-render.mjs` | 產生 `kanji.html` 的 HTML 字串 |
| `scripts/fetch-kanjidic.mjs` | 一次性下載 KANJIDIC2，抽子集 |
| `scripts/build-kanji.mjs` | 主流程，串起上面四個 lib |
| `scripts/test/*.test.mjs` | 單元測試 |
| `js/kanji-page.js` | 索引頁互動（篩選／點字／hash） |
| `js/kanji-link.js` | 課程頁徽章與頁尾行 |
| `kanji.html` | 產物 |
| `data/kanji-readings.json` | 產物 |
| `js/kanji-data.js`、`js/kanji-index.js` | 產物 |

**修改：** `js/site-chrome.js`（載入 kanji-link）、`shared.css`（新樣式）、`resources.html`（入口）、`CLAUDE.md`（工作流）。

---

### Task 1: KANJIDIC2 子集抽取

**Files:**
- Create: `scripts/lib/kanjidic-parse.mjs`
- Create: `scripts/fetch-kanjidic.mjs`
- Test: `scripts/test/kanjidic-parse.test.mjs`

**Interfaces:**
- Consumes: 無
- Produces: `parseKanjidic(xmlText, wantedSet) -> { [kanji]: { on: string[], kun: string[] } }`
  — `on` 為片假名原樣（`"カイ"`），`kun` 保留 KANJIDIC 原格式（`"あ.う"`、`"-び"`）

- [ ] **Step 1: 寫失敗的測試**

`scripts/test/kanjidic-parse.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKanjidic } from '../lib/kanjidic-parse.mjs';

const XML = `<?xml version="1.0"?>
<kanjidic2>
<character><literal>会</literal>
<reading_meaning><rmgroup>
<reading r_type="ja_on">カイ</reading>
<reading r_type="ja_on">エ</reading>
<reading r_type="ja_kun">あ.う</reading>
<reading r_type="pinyin">hui4</reading>
</rmgroup></reading_meaning></character>
<character><literal>日</literal>
<reading_meaning><rmgroup>
<reading r_type="ja_on">ニチ</reading>
<reading r_type="ja_on">ジツ</reading>
<reading r_type="ja_kun">ひ</reading>
<reading r_type="ja_kun">-び</reading>
<reading r_type="ja_kun">-か</reading>
</rmgroup></reading_meaning></character>
<character><literal>龘</literal>
<reading_meaning><rmgroup>
<reading r_type="ja_on">トウ</reading>
</rmgroup></reading_meaning></character>
</kanjidic2>`;

test('只抽出要的漢字', () => {
  const out = parseKanjidic(XML, new Set(['会', '日']));
  assert.deepEqual(Object.keys(out).sort(), ['会', '日']);
});

test('音讀訓讀分開，且排除 pinyin', () => {
  const out = parseKanjidic(XML, new Set(['会']));
  assert.deepEqual(out['会'].on, ['カイ', 'エ']);
  assert.deepEqual(out['会'].kun, ['あ.う']);
});

test('保留 KANJIDIC 的原始格式標記', () => {
  const out = parseKanjidic(XML, new Set(['日']));
  assert.deepEqual(out['日'].kun, ['ひ', '-び', '-か']);
});

test('沒有讀音資料的漢字不會爆炸', () => {
  const out = parseKanjidic('<kanjidic2></kanjidic2>', new Set(['会']));
  assert.deepEqual(out, {});
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test scripts/test/kanjidic-parse.test.mjs`
Expected: FAIL — `Cannot find module '../lib/kanjidic-parse.mjs'`

- [ ] **Step 3: 寫最小實作**

`scripts/lib/kanjidic-parse.mjs`：

```js
// scripts/lib/kanjidic-parse.mjs
// 從 KANJIDIC2 XML 抽出指定漢字的音讀／訓讀。
// 用正規表示式而非 XML parser——Node 沒有內建 XML parser，
// 而 KANJIDIC2 的結構夠規律（每個 <character> 獨立、無巢狀同名標籤）。

/**
 * @param {string} xmlText KANJIDIC2 全文
 * @param {Set<string>} wanted 只抽這些漢字
 * @returns {Record<string, {on: string[], kun: string[]}>}
 */
export function parseKanjidic(xmlText, wanted) {
  const out = {};
  const charRe = /<character>([\s\S]*?)<\/character>/g;
  let m;
  while ((m = charRe.exec(xmlText)) !== null) {
    const body = m[1];
    const lit = /<literal>(.)<\/literal>/.exec(body);
    if (!lit || !wanted.has(lit[1])) continue;
    const pick = (type) =>
      [...body.matchAll(new RegExp(`<reading r_type="${type}">([^<]+)</reading>`, 'g'))]
        .map((r) => r[1]);
    const on = pick('ja_on');
    const kun = pick('ja_kun');
    if (on.length === 0 && kun.length === 0) continue;
    out[lit[1]] = { on, kun };
  }
  return out;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node --test scripts/test/kanjidic-parse.test.mjs`
Expected: PASS（4 tests）

- [ ] **Step 5: 寫下載腳本**

`scripts/fetch-kanjidic.mjs`：

```js
#!/usr/bin/env node
// scripts/fetch-kanjidic.mjs
//
// 下載 KANJIDIC2，只抽出課程中實際出現過的漢字，存成 data/kanji-readings.json。
// 授權：KANJIDIC2 © EDRDG，CC BY-SA 4.0（比照 assets/kanjivg/ 的既有做法）。
//
// 用法：
//   node scripts/fetch-kanjidic.mjs           # 只在有新漢字時才需要跑
//   node scripts/fetch-kanjidic.mjs --force   # 忽略快取重抓

import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { parseKanjidic } from './lib/kanjidic-parse.mjs';
import { collectKanji } from './lib/kanji-scan.mjs';

const URL = 'http://www.edrdg.org/kanjidic/kanjidic2.xml.gz';
const CACHE = '.cache/kanjidic2.xml.gz';
const OUT = 'data/kanji-readings.json';
const force = process.argv.includes('--force');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function getXml() {
  if (!force && (await exists(CACHE))) {
    console.log('使用快取', CACHE);
    return gunzipSync(await readFile(CACHE)).toString('utf8');
  }
  console.log('下載', URL, '（約 1.4 MB）…');
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`下載失敗 HTTP ${res.status}`);
  const gz = Buffer.from(await res.arrayBuffer());
  await mkdir('.cache', { recursive: true });
  await writeFile(CACHE, gz);
  return gunzipSync(gz).toString('utf8');
}

const wanted = await collectKanji();
console.log(`課程中出現過的漢字：${wanted.size} 個`);

const xml = await getXml();
const dict = parseKanjidic(xml, wanted);

const missing = [...wanted].filter((k) => !dict[k]);
if (missing.length) console.log(`KANJIDIC 查無讀音（將歸入「その他」）：${missing.join('')}`);

await mkdir('data', { recursive: true });
await writeFile(OUT, JSON.stringify(dict, null, 0) + '\n', 'utf8');
console.log(`✅ ${OUT} — ${Object.keys(dict).length} 個漢字`);
```

- [ ] **Step 6: 把快取目錄加進 .gitignore**

```bash
grep -q '^\.cache/' .gitignore || echo '.cache/' >> .gitignore
```

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/kanjidic-parse.mjs scripts/fetch-kanjidic.mjs scripts/test/kanjidic-parse.test.mjs .gitignore
git commit -m "feat(kanji): KANJIDIC2 子集抽取"
```

---

### Task 2: 掃描全站 ruby 標音

**Files:**
- Create: `scripts/lib/kanji-scan.mjs`
- Test: `scripts/test/kanji-scan.test.mjs`

**Interfaces:**
- Consumes: 無
- Produces:
  - `extractRuby(html) -> Array<{base: string, reading: string}>`
  - `isKanji(ch) -> boolean`
  - `scanFile(path) -> Promise<Array<{base, reading, file, date, title}>>`
  - `collectKanji() -> Promise<Set<string>>` — 全站出現過的漢字（Task 1 會用）
  - `scanAll() -> Promise<Array<{base, reading, file, date, title}>>` — Task 5 會用

- [ ] **Step 1: 寫失敗的測試**

`scripts/test/kanji-scan.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRuby, isKanji } from '../lib/kanji-scan.mjs';

test('抽出單一 ruby', () => {
  const html = '<div><ruby>会話<rt>かいわ</rt></ruby></div>';
  assert.deepEqual(extractRuby(html), [{ base: '会話', reading: 'かいわ' }]);
});

test('抽出分段標註的 ruby（同一組 ruby 內多個 rt）', () => {
  const html = '<ruby>18<rt>じゅうはっ</rt>歳<rt>さい</rt></ruby>';
  assert.deepEqual(extractRuby(html), [
    { base: '18', reading: 'じゅうはっ' },
    { base: '歳', reading: 'さい' },
  ]);
});

test('忽略沒有 rt 的內容與 HTML 標籤', () => {
  const html = '<ruby>教会<rt>きょう<b>かい</b></rt></ruby>';
  assert.deepEqual(extractRuby(html), [{ base: '教会', reading: 'きょうかい' }]);
});

test('沒有 ruby 時回傳空陣列', () => {
  assert.deepEqual(extractRuby('<p>沒有標音</p>'), []);
});

test('isKanji 只認漢字', () => {
  assert.equal(isKanji('会'), true);
  assert.equal(isKanji('か'), false);
  assert.equal(isKanji('ア'), false);
  assert.equal(isKanji('1'), false);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test scripts/test/kanji-scan.test.mjs`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 寫最小實作**

`scripts/lib/kanji-scan.mjs`：

```js
// scripts/lib/kanji-scan.mjs
// 掃描課程 HTML 的 <ruby> 標音，抽出「哪個漢字、在哪個單字、哪一頁、哪一天」。

import { readdir, readFile } from 'node:fs/promises';

const DIRS = ['lessons', 'tadoku', 'readings'];

export function isKanji(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf);
}

const stripTags = (s) => s.replace(/<[^>]+>/g, '');

/**
 * 抽出 HTML 裡所有 ruby 的 base/reading 配對。
 * 一組 <ruby> 內可能有多段 base+rt（CLAUDE.md 要求讀音逐段對齊），逐段拆開。
 */
export function extractRuby(html) {
  const out = [];
  for (const m of html.matchAll(/<ruby>([\s\S]*?)<\/ruby>/g)) {
    const inner = m[1];
    // 逐段：base 文字 + 緊接的 <rt>…</rt>
    for (const seg of inner.matchAll(/([^<]*)<rt>([\s\S]*?)<\/rt>/g)) {
      const base = stripTags(seg[1]).trim();
      const reading = stripTags(seg[2]).trim();
      if (base && reading) out.push({ base, reading });
    }
  }
  return out;
}

async function htmlFiles() {
  const files = [];
  for (const dir of DIRS) {
    let names;
    try { names = await readdir(dir); } catch { continue; }
    for (const n of names) {
      if (!n.endsWith('.html') || n.startsWith('_')) continue;
      files.push(`${dir}/${n}`);
    }
  }
  return files.sort();
}

const titleOf = (html) => {
  const m = /<title>([^<]*)<\/title>/.exec(html);
  return m ? m[1].split('—')[0].trim() : '';
};

export async function scanFile(path) {
  const html = await readFile(path, 'utf8');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(path.split('/')[1]?.slice(0, 10))
    ? path.split('/')[1].slice(0, 10)
    : '';
  const title = titleOf(html);
  return extractRuby(html).map((r) => ({ ...r, file: path, date, title }));
}

export async function scanAll() {
  const all = [];
  for (const f of await htmlFiles()) all.push(...(await scanFile(f)));
  return all;
}

export async function collectKanji() {
  const set = new Set();
  for (const rec of await scanAll()) {
    for (const ch of rec.base) if (isKanji(ch)) set.add(ch);
  }
  return set;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node --test scripts/test/kanji-scan.test.mjs`
Expected: PASS（5 tests）

- [ ] **Step 5: 對真實資料做一次抽測**

```bash
node -e "
import('./scripts/lib/kanji-scan.mjs').then(async (m) => {
  const all = await m.scanAll();
  const k = await m.collectKanji();
  console.log('ruby 記錄:', all.length, '／不重複漢字:', k.size);
  console.log(all.slice(0,3));
});
"
```

Expected: 記錄數 ≥ 380、漢字數 ≈ 207，且印出的三筆有 `base`/`reading`/`file`/`date`

- [ ] **Step 6: 產生 KANJIDIC 子集（Task 1 的腳本現在可以跑了）**

```bash
node scripts/fetch-kanjidic.mjs
ls -lh data/kanji-readings.json
```

Expected: 檔案存在，內含約 200 個漢字

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/kanji-scan.mjs scripts/test/kanji-scan.test.mjs data/kanji-readings.json
git commit -m "feat(kanji): 掃描全站 ruby 標音 + 產生 KANJIDIC 子集"
```

---

### Task 3: 讀音對齊與音訓分類

**Files:**
- Create: `scripts/lib/kanji-align.mjs`
- Test: `scripts/test/kanji-align.test.mjs`

**Interfaces:**
- Consumes: `isKanji` from `kanji-scan.mjs`
- Produces:
  - `kataToHira(s) -> string`
  - `readingVariants(r) -> string[]` — 含連濁／半濁／促音變化
  - `align(base, reading, dict) -> Array<{ch, reading, type}> | null`
    — `type` 為 `'on' | 'kun' | 'kana'`；對不上回傳 `null`

- [ ] **Step 1: 寫失敗的測試**

`scripts/test/kanji-align.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kataToHira, readingVariants, align } from '../lib/kanji-align.mjs';

const DICT = {
  会: { on: ['カイ', 'エ'], kun: ['あ.う'] },
  話: { on: ['ワ'], kun: ['はな.す', 'はなし'] },
  教: { on: ['キョウ'], kun: ['おし.える'] },
  日: { on: ['ニチ', 'ジツ'], kun: ['ひ', '-び', '-か'] },
  三: { on: ['サン'], kun: ['み', 'み.つ'] },
  誕: { on: ['タン'], kun: [] },
  生: { on: ['セイ', 'ショウ'], kun: ['い.きる', 'う.まれる', 'なま'] },
  薬: { on: ['ヤク'], kun: ['くすり'] },
  局: { on: ['キョク'], kun: [] },
};

test('片假名轉平假名', () => {
  assert.equal(kataToHira('カイ'), 'かい');
  assert.equal(kataToHira('キョウ'), 'きょう');
});

test('變音形式：連濁與促音', () => {
  const v = readingVariants('ひ');
  assert.ok(v.includes('ひ'));
  assert.ok(v.includes('び'), '連濁 ひ→び');
  assert.ok(v.includes('ぴ'), '半濁 ひ→ぴ');
  const y = readingVariants('やく');
  assert.ok(y.includes('やっ'), '促音 やく→やっ');
});

test('會話 → 会(かい,音) 話(わ,音)', () => {
  const r = align('会話', 'かいわ', DICT);
  assert.deepEqual(r, [
    { ch: '会', reading: 'かい', type: 'on' },
    { ch: '話', reading: 'わ', type: 'on' },
  ]);
});

test('教会 → 教(きょう,音) 会(かい,音)', () => {
  const r = align('教会', 'きょうかい', DICT);
  assert.deepEqual(r.map((x) => x.reading), ['きょう', 'かい']);
  assert.ok(r.every((x) => x.type === 'on'));
});

test('会う → 会(あ,訓) + 送假名 う', () => {
  const r = align('会う', 'あう', DICT);
  assert.deepEqual(r, [
    { ch: '会', reading: 'あ', type: 'kun' },
    { ch: 'う', reading: 'う', type: 'kana' },
  ]);
});

test('誕生日 → 日 讀成連濁的 び（訓）', () => {
  const r = align('誕生日', 'たんじょうび', DICT);
  assert.equal(r[2].ch, '日');
  assert.equal(r[2].reading, 'び');
  assert.equal(r[2].type, 'kun');
});

test('薬局 → 薬 促音化成 やっ', () => {
  const r = align('薬局', 'やっきょく', DICT);
  assert.deepEqual(r.map((x) => x.reading), ['やっ', 'きょく']);
});

test('長讀音優先，にち 不會被 に 之類的短候選截斷', () => {
  const r = align('日曜日', 'にちようび', { ...DICT, 曜: { on: ['ヨウ'], kun: [] } });
  assert.deepEqual(r.map((x) => x.reading), ['にち', 'よう', 'び']);
});

test('對不上時回傳 null（熟字訓）', () => {
  assert.equal(align('今日', 'きょう', { 今: { on: ['コン'], kun: ['いま'] }, 日: DICT['日'] }), null);
});

test('字典沒有該漢字時回傳 null', () => {
  assert.equal(align('龘', 'とう', DICT), null);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test scripts/test/kanji-align.test.mjs`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 寫最小實作**

`scripts/lib/kanji-align.mjs`：

```js
// scripts/lib/kanji-align.mjs
// 把單字的整體讀音切給組成它的各個漢字，並判定每段是音讀還是訓讀。
//
// 做法：對每個漢字取出所有候選讀音（含連濁／促音變化），由長到短嘗試比對
// 讀音字串的前綴，回溯搜尋出一組能完整用完讀音的切法。
// 對不上（熟字訓、含數字的詞）就回傳 null，由呼叫端歸入「その他」。

import { isKanji } from './kanji-scan.mjs';

export function kataToHira(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

const RENDAKU = { か:'が', き:'ぎ', く:'ぐ', け:'げ', こ:'ご', さ:'ざ', し:'じ', す:'ず', せ:'ぜ', そ:'ぞ',
  た:'だ', ち:'ぢ', つ:'づ', て:'で', と:'ど', は:'ば', ひ:'び', ふ:'ぶ', へ:'べ', ほ:'ぼ' };
const HANDAKU = { は:'ぱ', ひ:'ぴ', ふ:'ぷ', へ:'ぺ', ほ:'ぽ' };

/** 一個讀音的所有可能實際形式（原形＋連濁＋半濁＋促音） */
export function readingVariants(r) {
  const out = new Set([r]);
  const first = r[0];
  if (RENDAKU[first]) out.add(RENDAKU[first] + r.slice(1));
  if (HANDAKU[first]) out.add(HANDAKU[first] + r.slice(1));
  if (/[つちくき]$/.test(r)) out.add(r.slice(0, -1) + 'っ');
  return [...out];
}

/** 去掉 KANJIDIC 訓讀標記：'あ.う' → 'あ'、'-び' → 'び' */
const stripKun = (k) => k.replace(/^-/, '').split('.')[0];

function candidates(ch, dict) {
  const entry = dict[ch];
  if (!entry) return [];
  const list = [];
  for (const on of entry.on) for (const v of readingVariants(kataToHira(on))) list.push({ r: v, type: 'on' });
  for (const kun of entry.kun) for (const v of readingVariants(stripKun(kun))) list.push({ r: v, type: 'kun' });
  // 長的先試：避免 にち 被 に 這種短候選先吃掉
  return list.sort((a, b) => b.r.length - a.r.length);
}

/**
 * @returns {Array<{ch:string, reading:string, type:'on'|'kun'|'kana'}> | null}
 */
export function align(base, reading, dict) {
  const chars = [...base];
  const picked = new Array(chars.length);

  function walk(i, pos) {
    if (i === chars.length) return pos === reading.length;
    const ch = chars[i];
    if (!isKanji(ch)) {
      // 送假名／中黏字必須字面吻合
      if (reading.startsWith(ch, pos)) {
        picked[i] = { ch, reading: ch, type: 'kana' };
        return walk(i + 1, pos + ch.length);
      }
      return false;
    }
    for (const c of candidates(ch, dict)) {
      if (!reading.startsWith(c.r, pos)) continue;
      picked[i] = { ch, reading: c.r, type: c.type };
      if (walk(i + 1, pos + c.r.length)) return true;
    }
    return false;
  }

  return walk(0, 0) ? picked.slice() : null;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node --test scripts/test/kanji-align.test.mjs`
Expected: PASS（10 tests）

- [ ] **Step 5: 對真實資料量測對齊率**

```bash
node -e "
Promise.all([
  import('./scripts/lib/kanji-scan.mjs'),
  import('./scripts/lib/kanji-align.mjs'),
  import('node:fs/promises').then(fs => fs.readFile('data/kanji-readings.json','utf8')),
]).then(([scan, al, raw]) => scan.scanAll().then(all => {
  const dict = JSON.parse(raw);
  let ok = 0, fail = [];
  for (const r of all) {
    if (al.align(r.base, r.reading, dict)) ok++; else fail.push(r.base + '(' + r.reading + ')');
  }
  console.log('對齊率:', ok + '/' + all.length, (100*ok/all.length).toFixed(1) + '%');
  console.log('對不上的前 20 筆:', [...new Set(fail)].slice(0,20).join(' '));
}));
"
```

Expected: 對齊率 ≥ 70%；對不上的清單裡應該以**含數字的詞**（18歳）與**熟字訓**（今日）為主。若出現大量常見詞對不上，回頭檢查 `readingVariants` 是否漏了變化。

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/kanji-align.mjs scripts/test/kanji-align.test.mjs
git commit -m "feat(kanji): 讀音對齊與音訓分類"
```

---

### Task 4: 台語線索規則

**Files:**
- Create: `scripts/lib/taigi.mjs`
- Test: `scripts/test/taigi.test.mjs`

**Interfaces:**
- Consumes: 無
- Produces: `taigiHint(onReadings: string[]) -> {coda: string, kana: string, label: string} | null`
  — `onReadings` 為平假名音讀陣列；回傳 `null` 表示推不出線索

**設計註記（與規格的一處收斂）：** 規格的對應表列了四種韻尾，但 `-p`（十 じゅう ← じふ）
在現代假名裡跟長音 `-ou` 無法區分，硬判會出錯。本實作**只處理三種明確可判的韻尾**
（`-t`、`-k`、`-n/-ng`），推不出來就不顯示貼紙——寧可少講，不要講錯。

- [ ] **Step 1: 寫失敗的測試**

`scripts/test/taigi.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taigiHint } from '../lib/taigi.mjs';

test('收 く／き → 入聲 -k', () => {
  const h = taigiHint(['きょく']);
  assert.equal(h.coda, '-k');
  assert.equal(h.kana, 'く');
});

test('收 ち／つ → 入聲 -t', () => {
  assert.equal(taigiHint(['にち']).coda, '-t');
  assert.equal(taigiHint(['いち']).coda, '-t');
});

test('收 ん → 鼻音尾', () => {
  const h = taigiHint(['でん']);
  assert.equal(h.coda, '-n/-ng');
});

test('多個音讀時取第一個推得出的', () => {
  assert.equal(taigiHint(['かい', 'やく']).coda, '-k');
});

test('開音節推不出線索', () => {
  assert.equal(taigiHint(['かい']), null);
  assert.equal(taigiHint(['わ']), null);
});

test('沒有音讀時回傳 null', () => {
  assert.equal(taigiHint([]), null);
});

test('不誤判 -p（じゅう 與長音無法區分，一律不推）', () => {
  assert.equal(taigiHint(['じゅう']), null);
  assert.equal(taigiHint(['こう']), null);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test scripts/test/taigi.test.mjs`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 寫最小實作**

`scripts/lib/taigi.mjs`：

```js
// scripts/lib/taigi.mjs
// 由日語音讀的韻尾推回中古漢語的入聲／鼻音尾——台語保留了同一套韻尾，
// 所以學習者唸台語就能自我驗證。不查台語辭典（教育部辭典為 CC BY-ND，
// 且學習者本人講台語，唸出來比機器給的拼音可靠）。
//
// 只處理三種明確可判的韻尾。-p（十 じゅう ← 歷史假名 じふ）在現代假名裡
// 跟長音 -ou 無法區分，硬判會出錯，一律不推。

const RULES = [
  { test: /[くき]$/, coda: '-k', mid: '入聲' },
  { test: /[ちつ]$/, coda: '-t', mid: '入聲' },
  { test: /ん$/,     coda: '-n/-ng', mid: '鼻音尾' },
];

/**
 * @param {string[]} onReadings 平假名音讀
 * @returns {{coda:string, kana:string, label:string}|null}
 */
export function taigiHint(onReadings) {
  for (const r of onReadings) {
    for (const rule of RULES) {
      if (rule.test.test(r)) {
        return { coda: rule.coda, kana: r.slice(-1), label: rule.mid };
      }
    }
  }
  return null;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node --test scripts/test/taigi.test.mjs`
Expected: PASS（7 tests）

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/taigi.mjs scripts/test/taigi.test.mjs
git commit -m "feat(kanji): 台語韻尾線索規則"
```

---

### Task 5: 主流程 — 產出資料檔

**Files:**
- Create: `scripts/lib/kanji-build.mjs`
- Create: `scripts/build-kanji.mjs`
- Test: `scripts/test/kanji-build.test.mjs`

**Interfaces:**
- Consumes: `scanAll`、`align`、`taigiHint`
- Produces: `buildKanjiData(records, dict) -> Record<string, KanjiEntry>`

```
KanjiEntry = {
  days: number,              // 出現天數（同一天多篇只算一天）
  on: { [reading]: string[] },   // 讀音 → 單字陣列（去重）
  kun: { [reading]: string[] },
  other: string[],               // 對齊失敗的單字
  taigi: {coda, kana, label} | null,
  multi: boolean,                // on+kun 讀音種類 >= 2
  timeline: Array<{d, f, t, w}>  // 日期／檔案／課程標題／單字
}
```

- [ ] **Step 1: 寫失敗的測試**

`scripts/test/kanji-build.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildKanjiData } from '../lib/kanji-build.mjs';

const DICT = {
  会: { on: ['カイ'], kun: ['あ.う'] },
  話: { on: ['ワ'], kun: [] },
  社: { on: ['シャ'], kun: [] },
  局: { on: ['キョク'], kun: [] },
  郵: { on: ['ユウ'], kun: [] },
  便: { on: ['ビン', 'ベン'], kun: [] },
};

const REC = [
  { base: '会話', reading: 'かいわ', file: 'lessons/2026-07-23-kaiwa.html', date: '2026-07-23', title: '口語練習' },
  { base: '会社', reading: 'かいしゃ', file: 'lessons/2026-07-10-jikoshoukai.html', date: '2026-07-10', title: '自己紹介' },
  { base: '会う', reading: 'あう', file: 'lessons/2026-07-28-hikkoshi-kaiwa.html', date: '2026-07-28', title: '引っ越し' },
  // 同一天第二篇也用到「会」——天數不重複計算
  { base: '会話', reading: 'かいわ', file: 'lessons/2026-07-23-shokugyou.html', date: '2026-07-23', title: '職業' },
  { base: '郵便局', reading: 'ゆうびんきょく', file: 'lessons/2026-08-05-doko.html', date: '2026-08-05', title: 'どこですか' },
  { base: '今日', reading: 'きょう', file: 'lessons/2026-08-05-doko.html', date: '2026-08-05', title: 'どこですか' },
];

test('天數以「天」計，同一天多篇只算一次', () => {
  const d = buildKanjiData(REC, DICT);
  assert.equal(d['会'].days, 3); // 07-10, 07-23, 07-28
});

test('音讀分支收集到該讀音下的單字，且去重', () => {
  const d = buildKanjiData(REC, DICT);
  assert.deepEqual(d['会'].on['かい'].sort(), ['会社', '会話']);
});

test('訓讀分支獨立', () => {
  const d = buildKanjiData(REC, DICT);
  assert.deepEqual(d['会'].kun['あ'], ['会う']);
});

test('多音字標記', () => {
  const d = buildKanjiData(REC, DICT);
  assert.equal(d['会'].multi, true);
  assert.equal(d['局'].multi, false);
});

test('台語線索：局 きょく → -k；会 かい → null', () => {
  const d = buildKanjiData(REC, DICT);
  assert.equal(d['局'].taigi.coda, '-k');
  assert.equal(d['会'].taigi, null);
});

test('對齊失敗的單字進 other，且不會消失', () => {
  const d = buildKanjiData(REC, DICT);
  assert.ok(d['今'] === undefined || d['今'].other.includes('今日'));
  assert.ok(d['日'].other.includes('今日'));
});

test('時間軸依日期排序，每篇各一筆', () => {
  const d = buildKanjiData(REC, DICT);
  const dates = d['会'].timeline.map((e) => e.d);
  assert.deepEqual(dates, ['2026-07-10', '2026-07-23', '2026-07-23', '2026-07-28']);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test scripts/test/kanji-build.test.mjs`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 寫最小實作**

`scripts/lib/kanji-build.mjs`：

```js
// scripts/lib/kanji-build.mjs
// 把掃描結果 + KANJIDIC 子集，整理成「一個漢字一筆」的資料結構。

import { isKanji } from './kanji-scan.mjs';
import { align, kataToHira } from './kanji-align.mjs';
import { taigiHint } from './taigi.mjs';

const pushUnique = (arr, v) => { if (!arr.includes(v)) arr.push(v); };

export function buildKanjiData(records, dict) {
  /** @type {Record<string, any>} */
  const out = {};
  const dayseen = {}; // 漢字 → Set<date>

  const ensure = (ch) => {
    if (!out[ch]) {
      out[ch] = { days: 0, on: {}, kun: {}, other: [], taigi: null, multi: false, timeline: [] };
      dayseen[ch] = new Set();
    }
    return out[ch];
  };

  for (const rec of records) {
    const seg = align(rec.base, rec.reading, dict);
    const chars = [...rec.base].filter(isKanji);
    if (chars.length === 0) continue;

    if (seg) {
      for (const s of seg) {
        if (!isKanji(s.ch)) continue;
        const e = ensure(s.ch);
        const bucket = s.type === 'on' ? e.on : e.kun;
        if (!bucket[s.reading]) bucket[s.reading] = [];
        pushUnique(bucket[s.reading], rec.base);
      }
    } else {
      for (const ch of chars) pushUnique(ensure(ch).other, rec.base);
    }

    for (const ch of chars) {
      const e = ensure(ch);
      dayseen[ch].add(rec.date);
      e.timeline.push({ d: rec.date, f: rec.file, t: rec.title, w: rec.base });
    }
  }

  for (const [ch, e] of Object.entries(out)) {
    e.days = dayseen[ch].size;
    e.multi = Object.keys(e.on).length + Object.keys(e.kun).length >= 2;
    const onFromDict = (dict[ch]?.on ?? []).map(kataToHira);
    e.taigi = taigiHint(onFromDict);
    e.timeline.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  }
  return out;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node --test scripts/test/kanji-build.test.mjs`
Expected: PASS（7 tests）

- [ ] **Step 5: 寫主腳本（先只產資料檔，HTML 留到 Task 6）**

`scripts/build-kanji.mjs`：

```js
#!/usr/bin/env node
// scripts/build-kanji.mjs
//
// 掃全站 ruby 標音，產出漢字對照表的三個檔案：
//   kanji.html         索引頁（Task 6 之後才會產出）
//   js/kanji-data.js   全量資料（只有 kanji.html 會載入）
//   js/kanji-index.js  漢字 → 出現天數（課程頁徽章用，約 2KB）
//
// 用法：寫完新課程後跑 `node scripts/build-kanji.mjs`，產物一起 commit。

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { scanAll } from './lib/kanji-scan.mjs';
import { buildKanjiData } from './lib/kanji-build.mjs';

const dict = JSON.parse(await readFile('data/kanji-readings.json', 'utf8'));
const records = await scanAll();
const data = buildKanjiData(records, dict);

const entries = Object.entries(data).sort((a, b) => b[1].days - a[1].days || a[0].localeCompare(b[0]));

await mkdir('js', { recursive: true });

await writeFile(
  'js/kanji-data.js',
  '// 由 scripts/build-kanji.mjs 產生，請勿手動編輯\n' +
    'window.KANJI_DATA = ' + JSON.stringify(Object.fromEntries(entries)) + ';\n',
  'utf8'
);

const index = Object.fromEntries(entries.map(([ch, e]) => [ch, e.days]));
await writeFile(
  'js/kanji-index.js',
  '// 由 scripts/build-kanji.mjs 產生，請勿手動編輯\n' +
    'window.KANJI_INDEX = ' + JSON.stringify(index) + ';\n',
  'utf8'
);

const hot = entries.filter(([, e]) => e.days >= 3).length;
console.log(`✅ ${entries.length} 個漢字（出現 3 天以上：${hot}）`);
console.log(`   js/kanji-data.js  ${(JSON.stringify(data).length / 1024).toFixed(1)} KB`);
console.log(`   js/kanji-index.js ${(JSON.stringify(index).length / 1024).toFixed(1)} KB`);
```

- [ ] **Step 6: 跑主腳本，檢查產物大小符合規格預期**

```bash
node scripts/build-kanji.mjs
ls -lh js/kanji-data.js js/kanji-index.js
node -e "
global.window={}; import('./js/kanji-data.js').catch(()=>{});
" 2>/dev/null
node -e "
const fs=require('fs'); const s=fs.readFileSync('js/kanji-data.js','utf8');
const d=JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}')+1));
console.log('日:', JSON.stringify(d['日'], null, 1).slice(0,400));
"
```

Expected: `kanji-index.js` 約 2–3 KB、`kanji-data.js` 約 30–60 KB；`日` 的 `on` 應含 `にち`，`kun` 應含 `か` 或 `び`

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/kanji-build.mjs scripts/build-kanji.mjs scripts/test/kanji-build.test.mjs js/kanji-data.js js/kanji-index.js
git commit -m "feat(kanji): 主流程產出 kanji-data.js 與 kanji-index.js"
```

---

### Task 6: 索引頁 kanji.html ＋ 樣式

**Files:**
- Create: `scripts/lib/kanji-render.mjs`
- Create: `js/kanji-page.js`
- Modify: `scripts/build-kanji.mjs`（加上產出 HTML）
- Modify: `shared.css`（新增樣式，接在 `.mnemonic` 區塊之後）
- Test: `scripts/test/kanji-render.test.mjs`

**Interfaces:**
- Consumes: `buildKanjiData` 的輸出
- Produces: `renderIndexPage(entries) -> string`（完整 HTML 文件字串）

- [ ] **Step 1: 寫失敗的測試**

`scripts/test/kanji-render.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIndexPage } from '../lib/kanji-render.mjs';

const ENTRIES = [
  ['日', { days: 8, on: { にち: ['日本'] }, kun: { か: ['三日'] }, other: [], multi: true,
           taigi: { coda: '-t', kana: 'ち', label: '入聲' }, timeline: [] }],
  ['会', { days: 4, on: { かい: ['会話'] }, kun: {}, other: [], multi: false,
           taigi: null, timeline: [] }],
];

test('產出完整 HTML 文件', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('shared.css'));
  assert.ok(html.includes('favicon.svg'), '必須有 favicon link');
  assert.ok(html.includes('site-chrome.js'));
});

test('索引格含每個漢字，且帶出現天數', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(html.includes('data-kanji="日"'));
  assert.ok(html.includes('data-kanji="会"'));
  assert.ok(html.includes('data-days="8"'));
});

test('高頻字（>=3 天）標記 hot', () => {
  const html = renderIndexPage(ENTRIES);
  const tile = /<button[^>]*data-kanji="日"[^>]*>/.exec(html)[0];
  assert.ok(tile.includes('hot'));
});

test('多音字與台語線索的篩選旗標寫在 data 屬性上', () => {
  const html = renderIndexPage(ENTRIES);
  const hi = /<button[^>]*data-kanji="日"[^>]*>/.exec(html)[0];
  assert.ok(hi.includes('data-multi="1"'));
  assert.ok(hi.includes('data-taigi="1"'));
  const kai = /<button[^>]*data-kanji="会"[^>]*>/.exec(html)[0];
  assert.ok(kai.includes('data-multi="0"'));
  assert.ok(kai.includes('data-taigi="0"'));
});

test('不內嵌漢字詳細內容（詳細區由 JS 渲染）', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(!html.includes('日本'), '單字不應出現在靜態 HTML 裡');
  assert.ok(html.includes('id="kanji-detail"'), '應有空的詳細區容器');
});

test('載入資料檔與互動腳本', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(html.includes('js/kanji-data.js'));
  assert.ok(html.includes('js/kanji-page.js'));
});

test('標註 KANJIDIC2 授權', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(html.includes('KANJIDIC'));
  assert.ok(html.includes('CC BY-SA'));
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test scripts/test/kanji-render.test.mjs`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 寫 renderer**

`scripts/lib/kanji-render.mjs`：

```js
// scripts/lib/kanji-render.mjs
// 產生 kanji.html —— 只含索引格，詳細內容由 js/kanji-page.js 在瀏覽器端渲染。

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'hot', label: '3 天以上' },
  { key: 'multi', label: '多音字' },
  { key: 'taigi', label: '台語線索' },
];

const tile = ([ch, e]) => {
  const cls = 'kanji-tile' + (e.days >= 3 ? ' hot' : '');
  return `<button class="${cls}" data-kanji="${ch}" data-days="${e.days}" ` +
    `data-multi="${e.multi ? 1 : 0}" data-taigi="${e.taigi ? 1 : 0}">` +
    `<span class="kt-char">${ch}</span><span class="kt-n">${e.days}</span></button>`;
};

export function renderIndexPage(entries) {
  const hot = entries.filter(([, e]) => e.days >= 3).length;
  const counts = {
    all: entries.length,
    hot,
    multi: entries.filter(([, e]) => e.multi).length,
    taigi: entries.filter(([, e]) => e.taigi).length,
  };
  const filters = FILTERS.map(
    (f) => `<button class="kanji-filter${f.key === 'all' ? ' on' : ''}" data-filter="${f.key}">` +
      `${f.label} <span class="kf-n">${counts[f.key]}</span></button>`
  ).join('\n      ');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>漢字音讀對照 — 學過的字互相連結</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg" />
<style>
/* 由 scripts/build-kanji.mjs 產生，請勿手動編輯 */
:root{--paper:#fdf6f0;--paper-deep:#f5e8d8;--ink:#2a1810;--ink-soft:#4a3020;--ink-mute:#8a6040;--accent:#c96830;--accent-soft:#f0b48a;--accent-pale:#fce8d8;--line:#f0d0b8;--bg-spot-1:#fdf0e5;--bg-spot-2:#f8e0c8;}
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

  <h1 class="page-title">漢字<span class="accent">音讀</span>對照</h1>
  <div class="page-meta">資源 · Kanji Index · 自動產生</div>
  <p class="page-subtitle">學過的字在哪些課出現過、各唸什麼 — 點漢字看詳細</p>

  <div class="tip">
    💡 <strong>怎麼用</strong><br>
    橘底＝出現 3 天以上的高頻字。點任一個字，下方會展開它的<strong>讀音分支</strong>與<strong>你遇到它的順序</strong>。
    音讀（棕橘）多半跟台語相通，訓讀（金茶）是日文固有詞。
  </div>

  <div class="kanji-filters">
      ${filters}
  </div>

  <div class="kanji-grid" id="kanji-grid">
    ${entries.map(tile).join('\n    ')}
  </div>

  <div id="kanji-detail"></div>

  <p class="kanji-credit">
    讀音資料來自 <a href="http://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noopener">KANJIDIC2</a>
    © EDRDG，授權 CC BY-SA 4.0。
  </p>

<site-footer></site-footer>
</div>

<script src="js/kanji-data.js"></script>
<script src="js/kanji-page.js"></script>
</body>
</html>
`;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node --test scripts/test/kanji-render.test.mjs`
Expected: PASS（7 tests）

- [ ] **Step 5: 寫前端互動腳本**

`js/kanji-page.js`：

```js
// js/kanji-page.js — 漢字索引頁的互動：篩選、點字展開、hash 深連結
(function () {
  const data = window.KANJI_DATA;
  const grid = document.getElementById('kanji-grid');
  const detail = document.getElementById('kanji-detail');
  if (!data || !grid || !detail) return;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function branchRows(map, kind) {
    return Object.entries(map).map(([r, words]) =>
      `<div class="kbranch ${kind}"><span class="kb-rd">${esc(r)}</span>` +
      `<span class="kb-words">${words.map(esc).join('・')}</span></div>`
    ).join('');
  }

  function taigiCard(ch, e) {
    if (!e.taigi) return '';
    const same = Object.entries(data)
      .filter(([c, x]) => c !== ch && x.taigi && x.taigi.coda === e.taigi.coda)
      .slice(0, 4).map(([c]) => c).join('・');
    return `<div class="mnemonic">🧠 <strong>台語線索</strong><br>` +
      `音讀收 <strong>${esc(e.taigi.kana)}</strong> → 中古${esc(e.taigi.label)} ` +
      `<strong>${esc(e.taigi.coda)}</strong> → 台語也收 <strong>${esc(e.taigi.coda)}</strong>，唸唸看。` +
      (same ? `<br>同款收 ${esc(e.taigi.coda)} 的字：${esc(same)}` : '') + `</div>`;
  }

  function render(ch) {
    const e = data[ch];
    if (!e) return;
    const tags = [];
    if (e.days >= 3) tags.push('高頻');
    if (e.multi) tags.push('多音字');
    if (!e.multi && Object.keys(e.on).length === 1) tags.push('單一音讀');

    detail.innerHTML =
      `<div class="kcard">
        <div class="khead">
          <div class="kbig">${esc(ch)}</div>
          <div class="kmeta">
            <div>${tags.map((t) => `<span class="ktag">${t}</span>`).join(' ')}</div>
            <div class="kcount">遇過 ${e.days} 天 · ${Object.keys(e.on).length + Object.keys(e.kun).length} 種讀音</div>
          </div>
        </div>
        ${Object.keys(e.on).length ? `<div class="klbl">— 音讀 · On —</div>${branchRows(e.on, 'on')}` : ''}
        ${Object.keys(e.kun).length ? `<div class="klbl">— 訓讀 · Kun —</div>${branchRows(e.kun, 'kun')}` : ''}
        ${e.other.length ? `<div class="klbl">— 其他（熟字訓等）—</div>
          <div class="kbranch other"><span class="kb-words">${e.other.map(esc).join('・')}</span></div>` : ''}
        <div class="klbl">— 你遇到它的順序 —</div>
        <div class="ktimeline">${e.timeline.map((t) =>
          `<div class="kev"><span class="kev-d">${esc(t.d.slice(5).replace('-', '/'))}</span>` +
          `<a href="${esc(t.f)}">${esc(t.t || t.f)}</a> — ${esc(t.w)}</div>`).join('')}</div>
        ${taigiCard(ch, e)}
      </div>`;

    grid.querySelectorAll('.kanji-tile').forEach((b) =>
      b.classList.toggle('on', b.dataset.kanji === ch));
  }

  grid.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.kanji-tile');
    if (!btn) return;
    const ch = btn.dataset.kanji;
    history.replaceState(null, '', '#' + encodeURIComponent(ch));
    render(ch);
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.querySelectorAll('.kanji-filter').forEach((f) => {
    f.addEventListener('click', () => {
      document.querySelectorAll('.kanji-filter').forEach((x) => x.classList.remove('on'));
      f.classList.add('on');
      const key = f.dataset.filter;
      grid.querySelectorAll('.kanji-tile').forEach((t) => {
        const show =
          key === 'all' ? true :
          key === 'hot' ? Number(t.dataset.days) >= 3 :
          key === 'multi' ? t.dataset.multi === '1' :
          t.dataset.taigi === '1';
        t.style.display = show ? '' : 'none';
      });
    });
  });

  const fromHash = decodeURIComponent(location.hash.slice(1));
  const first = grid.querySelector('.kanji-tile');
  render(data[fromHash] ? fromHash : first && first.dataset.kanji);
  if (data[fromHash]) detail.scrollIntoView({ block: 'start' });
})();
```

- [ ] **Step 6: 加樣式到 shared.css**

在 `shared.css` 的 `.mnemonic` 區塊之後、`/* ── Highlight inline ── */` 之前插入：

```css
/* ── 漢字音讀對照（kanji.html ＋ 課程頁徽章）── */
.kanji-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.kanji-filter {
  font-family: 'Noto Serif TC', serif; font-size: 13px; cursor: pointer;
  background: rgba(255,255,255,.6); border: 1px solid var(--line);
  color: var(--ink-soft); padding: 5px 12px;
}
.kanji-filter.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.kanji-filter .kf-n { font-family: 'Cormorant Garamond', serif; font-style: italic; opacity: .75; }

.kanji-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 6px; margin-bottom: 24px; }
.kanji-tile {
  background: rgba(255,255,255,.7); border: 1px solid var(--line);
  padding: 8px 2px 6px; text-align: center; cursor: pointer;
  transition: border-color .15s, background .15s;
}
.kanji-tile:hover { border-color: var(--accent); }
.kanji-tile.hot { border-color: var(--accent-soft); background: var(--accent-pale); }
.kanji-tile.on { background: var(--accent); border-color: var(--accent); }
.kt-char { display: block; font-family: 'Klee One','Shippori Mincho',serif; font-size: 24px; font-weight: 600; color: var(--ink); line-height: 1.15; }
.kt-n { display: block; font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 11px; color: var(--ink-mute); }
.kanji-tile.on .kt-char, .kanji-tile.on .kt-n { color: #fff; }

.kcard { background: rgba(255,255,255,.6); border: 1px solid var(--line); border-top: 3px solid var(--accent); padding: 20px 22px; margin-bottom: 16px; }
.khead { display: flex; align-items: center; gap: 16px; border-bottom: 1px dashed var(--line); padding-bottom: 12px; margin-bottom: 12px; }
.kbig { font-family: 'Klee One','Shippori Mincho',serif; font-size: 52px; font-weight: 700; line-height: 1; color: var(--ink); }
.kmeta { flex: 1; }
.ktag { display: inline-block; background: var(--accent-pale); color: var(--accent); font-size: 11px; padding: 1px 8px; margin-right: 4px; }
.kcount { font-family: 'Cormorant Garamond', serif; font-style: italic; color: var(--ink-mute); font-size: 13px; margin-top: 4px; }
.klbl { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-mute); margin: 12px 0 4px; }
.kbranch { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; font-size: 14px; }
.kb-rd { flex: 0 0 84px; text-align: center; font-family: 'Klee One','Shippori Mincho',serif; font-weight: 700; font-size: 16px; background: var(--accent-pale); color: var(--accent); padding: 3px 10px; }
.kbranch.kun .kb-rd { background: #f5e6cf; color: #a9762a; }
.kb-words { flex: 1; color: var(--ink-soft); line-height: 1.9; padding-top: 3px; }
.ktimeline { position: relative; padding-left: 16px; }
.ktimeline::before { content: ''; position: absolute; left: 3px; top: 8px; bottom: 8px; width: 1px; background: var(--line); }
.kev { position: relative; padding: 5px 0; font-size: 13.5px; color: var(--ink-soft); }
.kev::before { content: ''; position: absolute; left: -16px; top: 11px; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
.kev-d { font-family: 'Cormorant Garamond', serif; font-style: italic; color: var(--ink-mute); font-size: 12px; margin-right: 8px; }
.kev a { color: var(--ink); text-decoration: none; border-bottom: 1px dotted var(--accent); }
.kanji-credit { font-size: 12px; color: var(--ink-mute); margin-top: 20px; }
.kanji-credit a { color: var(--accent); }

/* 課程頁徽章（Task 8） */
.kanji-chip {
  display: inline-block; background: rgba(255,255,255,.85); border: 1px solid var(--accent-soft);
  border-radius: 3px; color: var(--accent); font-size: 12px; padding: 1px 7px;
  text-decoration: none; margin-left: 6px; white-space: nowrap;
}
.kanji-chip:hover { background: var(--accent-pale); }
.kanji-footer {
  background: rgba(255,255,255,.5); border-left: 3px solid var(--accent-soft);
  padding: 12px 18px; margin-top: 24px; font-size: 14px; color: var(--ink-soft); line-height: 1.9;
}
.kanji-footer a { color: var(--accent); }
```

- [ ] **Step 7: 讓 build 腳本產出 HTML**

在 `scripts/build-kanji.mjs` 的 import 區加：

```js
import { renderIndexPage } from './lib/kanji-render.mjs';
```

在寫完 `js/kanji-index.js` 之後、`console.log` 之前加：

```js
await writeFile('kanji.html', renderIndexPage(entries), 'utf8');
```

- [ ] **Step 8: 跑 build 並在瀏覽器驗證**

```bash
node scripts/build-kanji.mjs && ls -lh kanji.html
```

用瀏覽器工具開 `file://<repo>/kanji.html` 驗證：
1. 索引格顯示全部漢字，高頻字有橘底
2. 點「日」→ 下方展開讀音分支與時間軸，網址變成 `kanji.html#日`
3. 四個篩選都會過濾（「台語線索」只留有紅貼紙的字）
4. 重新載入 `kanji.html#会` → 直接展開「会」
5. console 無錯誤

- [ ] **Step 9: Commit**

```bash
git add scripts/lib/kanji-render.mjs scripts/test/kanji-render.test.mjs scripts/build-kanji.mjs js/kanji-page.js shared.css kanji.html
git commit -m "feat(kanji): 索引頁 kanji.html 與互動樣式"
```

---

### Task 7: 課程頁徽章與頁尾行

**Files:**
- Create: `js/kanji-link.js`
- Modify: `js/site-chrome.js`（檔尾追加載入邏輯）

**Interfaces:**
- Consumes: `window.KANJI_INDEX`（Task 5 產物）
- Produces: 無（純瀏覽器端副作用）

- [ ] **Step 1: 寫 kanji-link.js**

```js
// js/kanji-link.js
// 課程頁上：① 高頻漢字旁加徽章 ② 頁尾插一行「本課出現的漢字」
// 由 site-chrome.js 動態載入。找不到 KANJI_INDEX 就靜默跳過。
(function () {
  const idx = window.KANJI_INDEX;
  if (!idx) return;

  const HOT = 3;                       // 出現天數門檻
  const prefix = /\/(lessons|readings|tadoku)\//.test(location.pathname) ? '../' : '';
  const isKanji = (ch) => {
    const c = ch.codePointAt(0);
    return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf);
  };
  const link = (ch) => prefix + 'kanji.html#' + encodeURIComponent(ch);

  // ① 徽章：掛在含 ruby 的卡片上
  const CARDS = '.word-item, .turn, .ta-card, .phrase, .job-card, .kk-item';
  const seenAll = new Set();

  document.querySelectorAll('ruby').forEach((ruby) => {
    const chars = [...ruby.textContent].filter(isKanji);
    chars.forEach((c) => seenAll.add(c));
    const card = ruby.closest(CARDS);
    if (!card) return;
    const hot = [...new Set(chars)].filter((c) => (idx[c] || 0) >= HOT);
    for (const ch of hot) {
      if (card.querySelector(`.kanji-chip[data-kanji="${ch}"]`)) continue;
      const a = document.createElement('a');
      a.className = 'kanji-chip';
      a.dataset.kanji = ch;
      a.href = link(ch);
      a.textContent = `${ch} ×${idx[ch]} →`;
      const btn = card.querySelector('.play-btn');
      card.insertBefore(a, btn || null);
    }
  });

  // ② 頁尾行
  if (seenAll.size) {
    const list = [...seenAll]
      .sort((a, b) => (idx[b] || 0) - (idx[a] || 0))
      .map((ch) => `<a href="${link(ch)}">${ch}</a>`)
      .join('・');
    const div = document.createElement('div');
    div.className = 'kanji-footer';
    div.innerHTML = `📚 本課出現的漢字：${list} — ` +
      `<a href="${prefix}kanji.html">到漢字表看它們在別課的用法 →</a>`;
    const footer = document.querySelector('site-footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(div, footer);
  }
})();
```

- [ ] **Step 2: 讓 site-chrome.js 載入它**

在 `js/site-chrome.js` 檔尾追加：

```js
// ── 漢字連結：只在課程／閱讀／多読頁載入，先載 index 再載邏輯 ──
(function () {
  if (!/\/(lessons|readings|tadoku)\//.test(location.pathname)) return;
  const prefix = '../';
  const load = (src) =>
    new Promise((res) => {
      const s = document.createElement('script');
      s.src = prefix + src;
      s.onload = res;
      s.onerror = res;          // 檔案不存在也不能擋住頁面
      document.head.appendChild(s);
    });
  load('js/kanji-index.js').then(() => load('js/kanji-link.js'));
})();
```

- [ ] **Step 3: 在瀏覽器驗證三篇未修改過的舊課程**

開這三頁（都沒有被這個功能改過）：
- `lessons/2026-07-11-eki-announcement.html`
- `lessons/2026-06-24-sunde-imasu.html`
- `lessons/2026-05-13-jinshou.html`

每一頁檢查：
1. 高頻漢字的單字卡右側出現 `會 ×N →` 樣式的徽章（實際字視內容而定）
2. 頁尾 `site-footer` 上方出現「📚 本課出現的漢字：…」
3. console 無錯誤
4. 點徽章跳到 `kanji.html#<字>` 並自動展開該字

- [ ] **Step 4: 驗證失效情境（Global Constraints 要求）**

```bash
mv js/kanji-index.js /tmp/kanji-index.js.bak
```

重新載入任一課程頁，確認：頁面完全正常、沒有徽章、沒有頁尾行、**console 無錯誤**。然後還原：

```bash
mv /tmp/kanji-index.js.bak js/kanji-index.js
```

- [ ] **Step 5: Commit**

```bash
git add js/kanji-link.js js/site-chrome.js
git commit -m "feat(kanji): 課程頁徽章與頁尾漢字行（舊頁零修改回溯生效）"
```

---

### Task 8: 入口、工作流文件與整體驗收

**Files:**
- Modify: `resources.html`（加入口卡片）
- Modify: `CLAUDE.md`（工作流 ＋ Design System）

- [ ] **Step 1: 在 resources.html 加入口**

先看現有卡片結構：

```bash
grep -n "class=\"res-\|<li>\|<a class" resources.html | head -20
```

依照該檔既有的卡片格式，新增一張連到 `kanji.html` 的卡片，文案：

- 標題：`漢字音讀對照`
- 說明：`學過的字在哪些課出現過、各唸什麼 — 音讀多半跟台語相通`

- [ ] **Step 2: 更新 CLAUDE.md 的新增頁面流程**

在 `**Step 5 — 確保 favicon link 存在**` 那段之後加入：

```markdown
**Step 6 — 跑 `node scripts/build-kanji.mjs`**：重新產生 `kanji.html`、`js/kanji-data.js`、
`js/kanji-index.js`（掃全站 `<ruby>` 標音），產物**跟著這次的課程一起 commit**。
跟 `generate-audio.mjs` 同性質——內容改了就要重跑。

> 只有在出現**全新的漢字**時才需要另外跑一次 `node scripts/fetch-kanjidic.mjs`
> 更新 `data/kanji-readings.json`（會連網下載 KANJIDIC2）。腳本會列出查無讀音的字。
```

- [ ] **Step 3: 更新 CLAUDE.md 的 Design System**

在 `#### 記憶小撇步 .mnemonic` 段落之後加入：

```markdown
#### 漢字音讀對照（2026-08-05 新增）

[kanji.html](kanji.html) 是**產物，不要手改**——由 `node scripts/build-kanji.mjs` 從全站
`<ruby>` 標音自動產生。課程頁的漢字徽章與頁尾「本課出現的漢字」由 `js/kanji-link.js`
在執行期插入（掛在 `js/site-chrome.js` 上），**新頁不必做任何事**就會自己長出來。

要讓一個漢字進入這個系統，唯一條件是**在課程頁用 `<ruby>` 標音**。內文裡沒標音的漢字不會被收。

音讀＝`--accent` 棕橘、訓讀＝`#a9762a` 金茶、台語線索＝`.mnemonic` 紅貼紙，與全站一致。
```

- [ ] **Step 4: 跑完整驗收（規格的 10 條標準）**

```bash
node --test scripts/test/*.test.mjs
node scripts/build-kanji.mjs
```

逐條確認：

1. `kanji.html` 索引格列出全部漢字，出現 ≥3 天的有橘底標示
2. 「日」卡片分出 にち／じつ／ひ・び／か，各支單字掛對
3. 「会」顯示音讀 かい，`会う` 在訓讀 あ
4. 三篇舊課程有徽章與頁尾行（Task 7 Step 3 已驗）
5. 徽章連結跳到 `kanji.html#<字>` 並展開
6. 移走 `js/kanji-index.js` 後所有頁面正常、無 console error（Task 7 Step 4 已驗）
7. 台語貼紙只在有音讀韻尾線索的字出現，局 きょく → -k
8. 點字磚詳細區即時更新、網址變 hash、不重載
8b. 四個篩選正確過濾
9. 直接開 `kanji.html#日` 自動展開並捲到詳細區
10. 課程頁只載入 `kanji-index.js`（用瀏覽器 network 檢查，不應出現 `kanji-data.js`）

- [ ] **Step 5: Commit**

```bash
git add resources.html CLAUDE.md
git commit -m "feat(kanji): 資源頁入口與工作流文件"
```

- [ ] **Step 6: 推上線**

```bash
git push
```

---

## 自我檢查（撰寫時已執行）

- **規格覆蓋**：規格的 6 個元件對應 Task 1–7；工作流變更對應 Task 8；10 條驗收標準全部出現在 Task 8 Step 4。
- **一處刻意收斂**：規格台語對應表列的 `-p` 韻尾（十 じゅう）在現代假名裡與長音無法區分，
  Task 4 只實作 `-t`／`-k`／`-n/-ng` 三種，並用測試把「不誤判 -p」鎖住。已在 Task 4 標註理由。
- **命名一致**：`KANJI_DATA` / `KANJI_INDEX`、`buildKanjiData` / `renderIndexPage` / `align` / `taigiHint`
  在各 Task 間拼寫一致；`.kanji-tile` / `.kanji-chip` / `.kcard` 的 CSS 類名與 JS 選擇器一致。
