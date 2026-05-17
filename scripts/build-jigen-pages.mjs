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

function page({ data, kindZh, kindEn, subtitle, tipHtml, whyHtml, historyHtml, nextHref, nextKicker, nextTitle, nextSub }) {
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
