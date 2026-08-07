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
import { renderIndexPage } from './lib/kanji-render.mjs';

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

await writeFile('kanji.html', renderIndexPage(entries), 'utf8');

const hot = entries.filter(([, e]) => e.days >= 3).length;
console.log(`✅ ${entries.length} 個漢字（出現 3 天以上：${hot}）`);
console.log(`   js/kanji-data.js  ${(JSON.stringify(data).length / 1024).toFixed(1)} KB`);
console.log(`   js/kanji-index.js ${(JSON.stringify(index).length / 1024).toFixed(1)} KB`);
