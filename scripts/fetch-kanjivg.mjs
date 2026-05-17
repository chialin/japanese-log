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
