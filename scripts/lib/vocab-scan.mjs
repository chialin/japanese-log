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
    /<div class="word-item[^>]*>([\s\S]*?)<\/button>/g
  )) {
    const chunk = m[1];
    const fullDiv = m[0].match(/<div[^>]*>/)[0];  // 取開標籤
    let dtMatch = /data-text="([^"]*)"/.exec(fullDiv);
    if (!dtMatch) {
      // fallback 取 button 上的 data-text（舊課程格式）
      dtMatch = /<button[^>]*data-text="([^"]*)"/.exec(m[0]);
    }
    if (!dtMatch) continue;
    push(dtMatch[1], field(chunk, 'word-ja'), field(chunk, 'word-romaji'),
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
