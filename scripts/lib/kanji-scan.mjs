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
