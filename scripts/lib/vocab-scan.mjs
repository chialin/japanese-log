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

// ja 欄位是要直接塞進 vocab.html 卡片顯示的，但課程頁的 word-ja 常帶著課程頁
// 專屬的裝飾標籤（<span class="j-mark">助詞</span>、<strong>活用語尾</strong>），
// vocab.html 沒有那些 CSS，顯示會退化成無樣式的 span/strong。
// 只留 <ruby>/<rt>（含結尾標籤），其他標籤剝掉、文字保留。
export function sanitizeJa(html) {
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (tag, name) =>
    /^(ruby|rt)$/i.test(name) ? tag : ''
  );
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
      ja: sanitizeJa(jaHtml.trim()),
      kana: kanaOf(jaHtml),
      romaji: plainText(romaji),
      meaning: plainText(meaning),
      ...(accent ? { accent } : {}),
      kind,
    });
  };

  // word-item：改用開標籤位置切段，終點為下一個開標籤或檔案結尾
  // 這樣無 button 的參照卡不會誤吃下一張合法卡
  const wordItemMatches = Array.from(html.matchAll(/<div class="word-item[^>]*>/g));
  for (let i = 0; i < wordItemMatches.length; i++) {
    const start = wordItemMatches[i].index + wordItemMatches[i][0].length;
    const end = i + 1 < wordItemMatches.length ? wordItemMatches[i + 1].index : html.length;
    const chunk = html.slice(start, end);

    // data-text 優先取 div 開標籤上，無則 fallback 到 button 上
    const openTag = wordItemMatches[i][0];
    let dtMatch = /data-text="([^"]*)"/.exec(openTag);
    if (!dtMatch) {
      dtMatch = /<button[^>]*data-text="([^"]*)"/.exec(chunk);
    }
    if (!dtMatch) continue;  // 無 data-text 則跳過（如參照卡）
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
