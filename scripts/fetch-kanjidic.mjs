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
