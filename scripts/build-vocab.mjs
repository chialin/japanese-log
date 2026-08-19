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
