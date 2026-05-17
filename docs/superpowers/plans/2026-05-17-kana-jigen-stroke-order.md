# 假名字源 × 筆順 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增兩個課程頁（平假名／片假名各 46 字），呈現每個假名的來源漢字與筆順（KanjiVG 靜態編號 SVG），無 TTS。

**Architecture:** 沿用專案既有「一次性 node 產生器腳本 + 純靜態產物」模式（如 `scripts/generate-audio.mjs`）。`scripts/jigen-data.mjs` 集中假名／字源資料；`scripts/fetch-kanjivg.mjs` 一次性下載 92 個 KanjiVG SVG 到 `assets/kanjivg/`；`scripts/build-jigen-pages.mjs` 從同一份資料 + 共用樣板產出兩個 HTML。執行期零依賴、零網路。

**Tech Stack:** Node.js ESM（無第三方套件，用內建 `fetch`/`fs`）；純靜態 HTML + 既有 `shared.css`。

本專案無 build/lint/test framework。「測試」= 跑腳本後以指令驗證產物（檔案數、列數、引用路徑），並在瀏覽器開啟確認無 console error。

---

### Task 1: 假名字源資料模組

**Files:**
- Create: `scripts/jigen-data.mjs`

- [ ] **Step 1: 建立資料模組**

每筆 `[假名, 羅馬拼音, 來源漢字, 行名]`。`sameSource` 在執行期以「同羅馬拼音、平假名來源 === 片假名來源」自動算出，不手寫。

```javascript
// scripts/jigen-data.mjs
// 假名字源資料。每筆：{ kana, romaji, source(來源漢字), group(行名) }
// 平假名取整字草書、片假名取漢字部件。

export const HIRAGANA = [
  ['あ','a','安','あ行'],['い','i','以','あ行'],['う','u','宇','あ行'],['え','e','衣','あ行'],['お','o','於','あ行'],
  ['か','ka','加','か行'],['き','ki','幾','か行'],['く','ku','久','か行'],['け','ke','計','か行'],['こ','ko','己','か行'],
  ['さ','sa','左','さ行'],['し','shi','之','さ行'],['す','su','寸','さ行'],['せ','se','世','さ行'],['そ','so','曽','さ行'],
  ['た','ta','太','た行'],['ち','chi','知','た行'],['つ','tsu','川','た行'],['て','te','天','た行'],['と','to','止','た行'],
  ['な','na','奈','な行'],['に','ni','仁','な行'],['ぬ','nu','奴','な行'],['ね','ne','祢','な行'],['の','no','乃','な行'],
  ['は','ha','波','は行'],['ひ','hi','比','は行'],['ふ','fu','不','は行'],['へ','he','部','は行'],['ほ','ho','保','は行'],
  ['ま','ma','末','ま行'],['み','mi','美','ま行'],['む','mu','武','ま行'],['め','me','女','ま行'],['も','mo','毛','ま行'],
  ['や','ya','也','や行'],['ゆ','yu','由','や行'],['よ','yo','与','や行'],
  ['ら','ra','良','ら行'],['り','ri','利','ら行'],['る','ru','留','ら行'],['れ','re','礼','ら行'],['ろ','ro','呂','ら行'],
  ['わ','wa','和','わ行'],['を','wo','遠','わ行'],
  ['ん','n','无','ん'],
].map(([kana,romaji,source,group]) => ({ kana, romaji, source, group }));

export const KATAKANA = [
  ['ア','a','阿','ア行'],['イ','i','伊','ア行'],['ウ','u','宇','ア行'],['エ','e','江','ア行'],['オ','o','於','ア行'],
  ['カ','ka','加','カ行'],['キ','ki','幾','カ行'],['ク','ku','久','カ行'],['ケ','ke','介','カ行'],['コ','ko','己','カ行'],
  ['サ','sa','散','サ行'],['シ','shi','之','サ行'],['ス','su','須','サ行'],['セ','se','世','サ行'],['ソ','so','曽','サ行'],
  ['タ','ta','多','タ行'],['チ','chi','千','タ行'],['ツ','tsu','川','タ行'],['テ','te','天','タ行'],['ト','to','止','タ行'],
  ['ナ','na','奈','ナ行'],['ニ','ni','二','ナ行'],['ヌ','nu','奴','ナ行'],['ネ','ne','祢','ナ行'],['ノ','no','乃','ナ行'],
  ['ハ','ha','八','ハ行'],['ヒ','hi','比','ハ行'],['フ','fu','不','ハ行'],['ヘ','he','部','ハ行'],['ホ','ho','保','ハ行'],
  ['マ','ma','末','マ行'],['ミ','mi','三','マ行'],['ム','mu','牟','マ行'],['メ','me','女','マ行'],['モ','mo','毛','マ行'],
  ['ヤ','ya','也','ヤ行'],['ユ','yu','由','ヤ行'],['ヨ','yo','与','ヤ行'],
  ['ラ','ra','良','ラ行'],['リ','ri','利','ラ行'],['ル','ru','流','ラ行'],['レ','re','礼','ラ行'],['ロ','ro','呂','ラ行'],
  ['ワ','wa','和','ワ行'],['ヲ','wo','乎','ワ行'],
  ['ン','n','尔','ン'],
].map(([kana,romaji,source,group]) => ({ kana, romaji, source, group }));

// 某羅馬拼音的平假名與片假名是否取自同一漢字
const kataByRomaji = Object.fromEntries(KATAKANA.map(k => [k.romaji, k.source]));
const hiraByRomaji = Object.fromEntries(HIRAGANA.map(h => [h.romaji, h.source]));
export function isSameSource(romaji) {
  return hiraByRomaji[romaji] !== undefined
      && hiraByRomaji[romaji] === kataByRomaji[romaji];
}

// KanjiVG 檔名：碼點小寫 hex，最少 5 位補零（あ U+3042 → 03042）
export function kvgCode(kana) {
  return kana.codePointAt(0).toString(16).padStart(5, '0');
}

export const ALL_KANA = [...HIRAGANA, ...KATAKANA];
```

- [ ] **Step 2: 驗證資料正確**

Run:
```bash
node -e "import('./scripts/jigen-data.mjs').then(m=>{console.log('hira',m.HIRAGANA.length,'kata',m.KATAKANA.length);console.log('same',m.ALL_KANA.filter(k=>m.isSameSource(k.romaji)).length/2);console.log('codes ok', m.ALL_KANA.every(k=>/^[0-9a-f]{5}$/.test(m.kvgCode(k.kana))));console.log('あ',m.kvgCode('あ'),'ア',m.kvgCode('ア'));})"
```
Expected:
```
hira 46 kata 46
same 31
codes ok true
あ 03042 ア 030a2
```

- [ ] **Step 3: Commit**

```bash
git add scripts/jigen-data.mjs
git commit -m "Add kana-jigen data module"
```

---

### Task 2: 下載 KanjiVG 筆順 SVG

**Files:**
- Create: `scripts/fetch-kanjivg.mjs`
- Create (產物): `assets/kanjivg/*.svg`（92 檔）

- [ ] **Step 1: 建立抓圖腳本**

```javascript
#!/usr/bin/env node
// scripts/fetch-kanjivg.mjs
//
// 一次性下載 92 個假名的 KanjiVG 筆順 SVG 到 assets/kanjivg/<code>.svg。
// KanjiVG 原檔已含描邊路徑 + 筆順編號 <text>（樣式內嵌於 group style），
// 直接以 <img> 引用即可顯示。授權 CC-BY-SA 3.0。
//
// 用法：
//   node scripts/fetch-kanjivg.mjs            # 只抓缺的
//   node scripts/fetch-kanjivg.mjs --force    # 全部重抓

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { ALL_KANA, kvgCode } from './jigen-data.mjs';

const OUT_DIR = 'assets/kanjivg';
const BASE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji';
const force = process.argv.includes('--force');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

await mkdir(OUT_DIR, { recursive: true });

let ok = 0, skip = 0, fail = 0;
for (const { kana } of ALL_KANA) {
  const code = kvgCode(kana);
  const dest = path.join(OUT_DIR, `${code}.svg`);
  if (!force && await exists(dest)) { skip++; continue; }
  const url = `${BASE}/${code}.svg`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const svg = await res.text();
    if (!svg.includes('<svg')) throw new Error('not an svg');
    await writeFile(dest, svg, 'utf8');
    console.log(`✓ ${kana} ${code}.svg`);
    ok++;
  } catch (e) {
    console.error(`✗ ${kana} ${code} — ${e.message}`);
    fail++;
  }
}
console.log(`\ndone: ${ok} downloaded, ${skip} skipped, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 執行下載**

Run: `node scripts/fetch-kanjivg.mjs`
Expected: 結尾 `done: 92 downloaded, 0 skipped, 0 failed`（重跑則 92 skipped）。

- [ ] **Step 3: 驗證檔案數與內容**

Run:
```bash
ls assets/kanjivg/*.svg | wc -l
grep -l 'kvg:StrokeNumbers' assets/kanjivg/03042.svg
head -c 80 assets/kanjivg/030a2.svg
```
Expected: 第一行 `92`；第二行印出 `assets/kanjivg/03042.svg`（含筆順編號群組）；第三行為 SVG XML 開頭。

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-kanjivg.mjs assets/kanjivg
git commit -m "Fetch 92 KanjiVG stroke-order SVGs (CC-BY-SA 3.0)"
```

---

### Task 3: 產生兩個課程頁

**Files:**
- Create: `scripts/build-jigen-pages.mjs`
- Create (產物): `lessons/2026-05-17-hiragana-jigen.html`
- Create (產物): `lessons/2026-05-17-katakana-jigen.html`

樣式來源：`lessons/2026-05-04-kana.html`（`.card`/`.compare-table`/`.tag-hira`/`.tag-kata`/`.footer`）。`.divider`/`.tip`/`.wrap`/`.masthead`/`.back-link`/`.page-title`/`.page-subtitle`/`.next-link` 來自 `shared.css`，不重寫。新增 `.stroke`、`.jg-kana`、`.src-kanji`、group header 列樣式。

- [ ] **Step 1: 建立產生器腳本**

```javascript
#!/usr/bin/env node
// scripts/build-jigen-pages.mjs
//
// 從 jigen-data.mjs + 共用樣板，產出兩個字源×筆順課程頁。
// 一次性執行，產物 commit；執行期純靜態。
//
// 用法： node scripts/build-jigen-pages.mjs

import { writeFile } from 'node:fs/promises';
import { HIRAGANA, KATAKANA, isSameSource, kvgCode } from './jigen-data.mjs';

const ROOT_CSS = `:root{--paper:#fdf6f0;--paper-deep:#f5e8d8;--ink:#2a1810;--ink-soft:#4a3020;--ink-mute:#8a6040;--accent:#c96830;--accent-soft:#f0b48a;--accent-pale:#fce8d8;--line:#f0d0b8;--bg-spot-1:#fdf0e5;--bg-spot-2:#f8e0c8;}`;

const PAGE_CSS = `
.card{background:rgba(255,255,255,.5);border:1px solid var(--line);margin-bottom:16px;overflow:hidden;}
.card-header{padding:12px 20px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.4);}
.card-badge{font-family:'Shippori Mincho',serif;font-size:14px;font-weight:600;letter-spacing:.05em;color:var(--ink);}
.card-body{padding:16px 20px;font-size:14px;color:var(--ink-soft);line-height:1.9;}
.card-body ul{padding-left:20px;margin-top:8px;}.card-body li{margin-bottom:4px;}.card-body strong{color:var(--ink);}
.jg-table{width:100%;border-collapse:collapse;font-size:14px;}
.jg-table thead th{background:var(--ink);color:var(--paper);padding:10px 14px;text-align:left;font-family:'Shippori Mincho',serif;font-weight:500;font-size:14px;}
.jg-table tbody td{padding:10px 14px;border-bottom:1px solid var(--line);color:var(--ink-soft);vertical-align:middle;}
.jg-table tbody tr:hover{background:rgba(201,104,48,.04);}
.jg-group td{background:var(--accent-pale);color:var(--accent);font-family:'Shippori Mincho',serif;font-weight:700;letter-spacing:.08em;padding:8px 14px;}
.jg-romaji{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:16px;color:var(--ink-mute);}
.jg-kana{font-family:'Klee One','Shippori Mincho',serif;font-size:34px;font-weight:600;color:var(--accent);line-height:1;}
.src-kanji{font-family:'Shippori Mincho',serif;font-size:30px;font-weight:600;color:var(--ink);}
.src-arrow{color:var(--ink-mute);margin:0 6px;font-size:14px;}
.stroke{width:64px;height:64px;background:#fff;border:1px solid var(--line);display:block;}
.tag-same{display:inline-block;padding:2px 8px;font-size:13px;font-weight:600;font-family:'Shippori Mincho',serif;background:var(--accent-pale);color:var(--accent);}
.footer{margin-top:32px;padding-top:20px;border-top:1px solid var(--line);font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:var(--ink-mute);text-align:center;}
.footer a{color:var(--accent);text-decoration:none;}.footer a:hover{text-decoration:underline;}
.attrib{margin-top:14px;font-size:12px;color:var(--ink-mute);font-style:normal;font-family:'Noto Serif TC',serif;}
.attrib a{color:var(--ink-mute);}
@media(max-width:500px){.jg-kana{font-size:26px;}.src-kanji{font-size:22px;}.stroke{width:52px;height:52px;}}`;

function rows(data) {
  let html = '';
  let curGroup = null;
  for (const { kana, romaji, source, group } of data) {
    if (group !== curGroup) {
      curGroup = group;
      html += `        <tr class="jg-group"><td colspan="5">${group}</td></tr>\n`;
    }
    const code = kvgCode(kana);
    const same = isSameSource(romaji)
      ? '<span class="tag-same">同源</span>'
      : '';
    html += `        <tr>
          <td class="jg-romaji">${romaji}</td>
          <td><span class="jg-kana">${kana}</span></td>
          <td><span class="src-arrow">←</span><span class="src-kanji">${source}</span></td>
          <td><img class="stroke" src="../assets/kanjivg/${code}.svg" alt="${kana} 筆順" loading="lazy"></td>
          <td>${same}</td>
        </tr>\n`;
  }
  return html;
}

function page({ data, kindZh, kindEn, titleAccent, subtitle, tipHtml, whyHtml, historyHtml, nextHref, nextKicker, nextTitle, nextSub }) {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${kindZh} 字源 × 筆順 — ${kindEn} Origins</title>
<style>
${ROOT_CSS}
${PAGE_CSS}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600;700;800&family=Noto+Serif+TC:wght@300;400;500;600&family=Klee+One:wght@400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="../shared.css" />
</head>
<body>
<div class="wrap">
  <a href="../index.html" class="back-link">← 返回 学習日誌</a>

  <header class="masthead">
    <div class="left">文字解說 · Kana</div>
    <div class="center">今 日 の 学 習</div>
    <div class="right">2026 / 05 / 17</div>
  </header>

  <h1 class="page-title">${kindZh} 字<span class="accent">源</span></h1>
  <p class="page-subtitle">${subtitle}</p>

  <div class="tip">
    💡 <strong>一句話</strong><br>
    ${tipHtml}
  </div>

  <div class="divider">一、字源 × 筆順對應表</div>

  <div class="card">
    <table class="jg-table">
      <thead>
        <tr><th>音</th><th>${kindZh}</th><th>← 字源</th><th>筆順</th><th>備註</th></tr>
      </thead>
      <tbody>
${rows(data)}      </tbody>
    </table>
  </div>

  <div class="divider">二、為什麼長這樣</div>

  <div class="card">
    <div class="card-header"><span class="card-badge">${kindZh}的來歷</span></div>
    <div class="card-body">${whyHtml}</div>
  </div>

  <div class="divider">三、歷史脈絡</div>

  <div class="card">
    <div class="card-header"><span class="card-badge">平安時代</span></div>
    <div class="card-body">${historyHtml}</div>
  </div>

  <a href="${nextHref}" class="next-link">
    <span class="next-kicker">${nextKicker}</span>
    <span class="next-title">${nextTitle} <span class="next-arrow">→</span></span>
    <span class="next-sub">${nextSub}</span>
  </a>

  <div class="footer">
    <a href="../index.html">← 回到首頁</a>　·　2026年5月17日　·　日本語学習日誌 🌸
    <div class="attrib">
      筆順圖出自 <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a>，
      授權 <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC-BY-SA 3.0</a>。
    </div>
  </div>
</div>
</body>
</html>
`;
}

const hira = page({
  data: HIRAGANA,
  kindZh: '平假名', kindEn: 'Hiragana',
  subtitle: '每個平假名是哪個漢字的草書，又怎麼寫',
  tipHtml: '平假名是把一個<strong>漢字整體</strong>用<strong>草書</strong>連筆簡化而成 —— 所以線條圓潤。例：あ ← 安、お ← 於。',
  whyHtml: '平安時代的人把萬葉假名（借漢字標音）寫得越來越草，整個字一筆連下來就成了平假名。<ul><li><strong>あ ← 安</strong>：「安」的草書整體</li><li><strong>た ← 太</strong>、<strong>な ← 奈</strong>：保留原字輪廓</li><li>備註標「同源」者，表示同音的片假名取自<strong>同一個漢字</strong>（只是片假名取部件、平假名取整體草書）</li></ul>',
  historyHtml: '平假名約於 9 世紀（平安時代）成形，最初是宮廷女性書寫和歌、日記所用，故稱「<strong>女手</strong>」。後來成為日文書寫的主體，用於原生詞彙與所有文法結構（助詞、動詞變化）。',
  nextHref: '2026-05-17-katakana-jigen.html',
  nextKicker: '— 對照 / 片假名 —',
  nextTitle: '片假名 字源 × 筆順',
  nextSub: '同樣的音，片假名取自漢字的哪個部件',
});

const kata = page({
  data: KATAKANA,
  kindZh: '片假名', kindEn: 'Katakana',
  subtitle: '每個片假名取自漢字的哪個部件，又怎麼寫',
  tipHtml: '片假名是取一個漢字的<strong>一個部件（一角／偏旁）</strong>而成 —— 所以線條方正。例：カ ← 加 的「力」、ハ ← 八。',
  whyHtml: '片假名源自僧侶閱讀漢文時，在行間做訓讀標註的速記符號 —— 只取漢字的一小塊。<ul><li><strong>カ ← 加</strong> 的「力」、<strong>ハ ← 八</strong>、<strong>ミ ← 三</strong></li><li><strong>ネ ← 祢</strong> 的「示」、<strong>ヘ ← 部</strong> 的「阝」</li><li>備註標「同源」者，表示同音的平假名取自<strong>同一個漢字</strong>（平假名取整體草書、片假名取部件）</li></ul>',
  historyHtml: '片假名約於 9 世紀（平安時代）由僧侶在漢文訓讀的行間速記發展而來。今日主要用於<strong>外來語</strong>、<strong>外國人名地名</strong>與強調。與平假名一一對應、同音不同形。',
  nextHref: '2026-05-17-hiragana-jigen.html',
  nextKicker: '— 對照 / 平假名 —',
  nextTitle: '平假名 字源 × 筆順',
  nextSub: '同樣的音，平假名取自漢字草書整體',
});

await writeFile('lessons/2026-05-17-hiragana-jigen.html', hira, 'utf8');
await writeFile('lessons/2026-05-17-katakana-jigen.html', kata, 'utf8');
console.log('wrote lessons/2026-05-17-hiragana-jigen.html');
console.log('wrote lessons/2026-05-17-katakana-jigen.html');
```

- [ ] **Step 2: 執行產生器**

Run: `node scripts/build-jigen-pages.mjs`
Expected:
```
wrote lessons/2026-05-17-hiragana-jigen.html
wrote lessons/2026-05-17-katakana-jigen.html
```

- [ ] **Step 3: 驗證產物結構**

Run:
```bash
grep -c 'class="jg-romaji"' lessons/2026-05-17-hiragana-jigen.html
grep -c 'class="jg-group"' lessons/2026-05-17-hiragana-jigen.html
grep -c 'tag-same' lessons/2026-05-17-katakana-jigen.html
grep -o '../assets/kanjivg/[0-9a-f]*\.svg' lessons/2026-05-17-hiragana-jigen.html | sort -u | wc -l
grep -c 'js/tts.js\|speak(\|data-text' lessons/2026-05-17-hiragana-jigen.html || echo "no-tts OK"
```
Expected: 第一行 `46`（46 個資料列，每列一個 `jg-romaji` 欄）；第二行 `11`（11 行群組）；第三行 `31`（同源數）；第四行 `46`（46 個唯一 SVG 引用）；第五行 `no-tts OK`（確認無 TTS）。

- [ ] **Step 4: 瀏覽器目視確認**

開啟 `lessons/2026-05-17-hiragana-jigen.html` 與 `lessons/2026-05-17-katakana-jigen.html`：
- 表格 46 列、依行分組，筆順 SVG 全部顯示（黑色描邊 + 灰色筆順編號），無破圖
- DevTools Console 無 error、Network 無對外請求（SVG 走本地相對路徑）
- 棕橘色票一致、兩頁 `.next-link` 互跳正確

- [ ] **Step 5: Commit**

```bash
git add scripts/build-jigen-pages.mjs lessons/2026-05-17-hiragana-jigen.html lessons/2026-05-17-katakana-jigen.html
git commit -m "Add hiragana/katakana 字源×筆順 lesson pages"
```

---

### Task 4: index.html 加入兩個課程連結

**Files:**
- Modify: `index.html`（`<ul id="lesson-list">` 開頭）

- [ ] **Step 1: 找到清單開頭**

Run: `grep -n 'id="lesson-list"' index.html`
Expected: 印出 `<ul id="lesson-list">` 的行號。記下其後第一個 `<li>` 的位置。

- [ ] **Step 2: 在清單最前插入兩個 `<li>`**

在 `<ul id="lesson-list">` 之後、原本第一個 `<li>` 之前，插入（片假名在上、平假名在下；同為 2026-05-17，新→舊排序故置於清單最頂）：

```html
        <li>
          <a class="lesson-link" href="lessons/2026-05-17-katakana-jigen.html"
             data-kana="0" data-words="0" data-date="2026-05-17">
            <div class="lesson-meta">2026 · May 17 · Sun · Lesson</div>
            <div class="lesson-title">片假名 字源 × 筆順 <span class="arrow">→</span></div>
            <div class="lesson-summary">每個片假名取自哪個漢字部件 ＋ 筆順</div>
          </a>
        </li>
        <li>
          <a class="lesson-link" href="lessons/2026-05-17-hiragana-jigen.html"
             data-kana="0" data-words="0" data-date="2026-05-17">
            <div class="lesson-meta">2026 · May 17 · Sun · Lesson</div>
            <div class="lesson-title">平假名 字源 × 筆順 <span class="arrow">→</span></div>
            <div class="lesson-summary">每個平假名來自哪個漢字草書 ＋ 筆順</div>
          </a>
        </li>
```

> 注意：縮排需對齊 `index.html` 內既有 `<li>`（用 grep 出的既有 `<li>` 行確認實際縮排寬度，照抄）。

- [ ] **Step 3: 驗證插入正確**

Run:
```bash
grep -n '2026-05-17-katakana-jigen\|2026-05-17-hiragana-jigen' index.html
node -e "const h=require('fs').readFileSync('index.html','utf8');const i=h.indexOf('id=\"lesson-list\"');const k=h.indexOf('2026-05-17-katakana-jigen');const g=h.indexOf('2026-05-17-hiragana-jigen');console.log('order ok', i<k && k<g);"
```
Expected: 兩個檔名各出現一次；第二行 `order ok true`（片假名連結在平假名連結之前、皆在清單開頭）。

- [ ] **Step 4: 瀏覽器確認首頁**

開啟 `index.html`：
- 清單最上兩張卡片為片假名／平假名字源，左邊框為 lesson 棕色
- Stats 的 Lessons +2，**Words / Kana 數字不變**（`data-words=0`、`data-kana=0`）
- Calendar 出現 2026-05-17 標記，無 console error

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Link 字源×筆順 pages from index"
```

---

### Task 5: 最終整體驗證

- [ ] **Step 1: 全產物清點**

Run:
```bash
ls assets/kanjivg/*.svg | wc -l
ls lessons/2026-05-17-*-jigen.html
git status --porcelain
```
Expected: `92`；兩個 jigen html 列出；`git status` 乾淨（全部已 commit）。

- [ ] **Step 2: 零外部依賴確認**

Run: `grep -rn 'raw.githubusercontent\|kanjivg.tagaini\|http://localhost' lessons/2026-05-17-hiragana-jigen.html lessons/2026-05-17-katakana-jigen.html`
Expected: 僅頁尾 attribution 的 `kanjivg.tagaini.net` 與 CC 連結（文字連結，非資源載入）；無 `raw.githubusercontent`、無 `localhost`。SVG 與 CSS 全為相對路徑。

- [ ] **Step 3: 對照 spec 收尾**

逐項對照 `docs/superpowers/specs/2026-05-17-kana-jigen-stroke-order-design.md` 的「驗證」與「交付物」清單，全部打勾。如有缺漏回到對應 Task 修正。

---

## Self-Review

**1. Spec coverage**

| Spec 要求 | 對應 Task |
|---|---|
| 兩頁 hiragana/katakana-jigen，各 46 字 | Task 1（資料）+ Task 3（產出） |
| 依行分組 | Task 3 `rows()` 的 group header 列 |
| 筆順靜態編號 SVG（KanjiVG） | Task 2 下載 + Task 3 `<img class="stroke">` |
| 同源標籤 | Task 1 `isSameSource` + Task 3 `tag-same` |
| 無 TTS | Task 3 樣板不含 tts.js/speak/data-text；Step 3 grep 驗證 |
| 為什麼長這樣 / 歷史脈絡 兩段卡片 | Task 3 `whyHtml` / `historyHtml` |
| 兩頁互跳 next-link | Task 3 `nextHref` 等參數 |
| 頁尾 KanjiVG CC-BY-SA 標註 | Task 3 `.attrib` 區塊 |
| index.html 兩 `<li>`，data-kana=0 data-words=0 | Task 4 |
| 一次性腳本、執行期零依賴 | Task 2/3 為一次性腳本；Task 5 Step 2 驗證 |
| 不改 shared.css、不改既有頁面 | 僅 index.html 插入；無其他既有檔案修改 |

無缺漏。

**2. Placeholder scan:** 無 TBD/TODO；所有腳本、HTML 樣板、CSS、commit 指令均為完整可執行內容。

**3. Type consistency:** `kvgCode`/`isSameSource`/`HIRAGANA`/`KATAKANA`/`ALL_KANA` 在 Task 1 定義，Task 2/3 import 使用，命名一致。檔名規則（碼點 5 位 hex）在 fetch 與 build 兩處皆用同一 `kvgCode`，引用路徑一致（`../assets/kanjivg/<code>.svg`）。`.jg-table`/`.jg-group`/`.jg-kana`/`.src-kanji`/`.stroke`/`.tag-same`/`.attrib` 在 PAGE_CSS 定義且在 `rows()`/`page()` 使用，無孤立 class。
