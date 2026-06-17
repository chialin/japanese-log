#!/usr/bin/env node
// scripts/build-pdf.mjs
//
// 把一個本機 HTML 頁面用「系統已安裝的 Chrome / Edge」headless 印成 PDF
// （套用頁面的 @media print）。零安裝、不需任何 npm 依賴。
// 預設目標 = store-phrasebook.html → store-phrasebook.pdf。
//
// 用法：
//   node scripts/build-pdf.mjs                         # store-phrasebook.html → store-phrasebook.pdf
//   node scripts/build-pdf.mjs my-name-katakana.html   # 指定其他頁
//   node scripts/build-pdf.mjs <in.html> <out.pdf>     # 自訂輸出
//
// 注意：
//   - PDF 是靜態紙本，沒有音檔；播放鈕／速度條／返回連結已由頁面 @media print 隱藏。
//   - 彩色底框靠 CSS 的 print-color-adjust:exact 才會印出來（頁面已設）。
//   - 檔案偏大是因為 Chrome 會內嵌中日字型；屬正常。

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const inArg = process.argv[2] || 'store-phrasebook.html';
const outArg = process.argv[3] || inArg.replace(/\.html?$/i, '.pdf');

const inPath = path.resolve(ROOT, inArg);
const outPath = path.resolve(ROOT, outArg);

// 找一個 Chromium 系瀏覽器
const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

async function firstExisting(paths) {
  for (const p of paths) {
    try { await access(p); return p; } catch {}
  }
  return null;
}

try {
  await access(inPath);
} catch {
  console.error(`❌ 找不到輸入檔：${inPath}`);
  process.exit(1);
}

const chrome = await firstExisting(CANDIDATES);
if (!chrome) {
  console.error('❌ 找不到 Chrome / Edge / Brave。請安裝其中一個，或自行用瀏覽器 Cmd+P → 另存 PDF。');
  process.exit(1);
}

console.log(`🖨  ${path.basename(inPath)} → ${path.basename(outPath)}`);
console.log(`    using: ${chrome}`);

const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--print-to-pdf-no-header',          // 去掉頁首頁尾（URL／日期）
  `--print-to-pdf=${outPath}`,
  pathToFileURL(inPath).href,
];

const child = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = '';
child.stderr.on('data', d => { stderr += d.toString(); });
child.on('exit', code => {
  // Chrome 常在 stderr 印一些無害的 GCM/allocator 訊息，且結束碼可能非 0；以檔案是否產生為準
  access(outPath)
    .then(() => console.log(`✅ 完成：${outPath}`))
    .catch(() => {
      console.error(`❌ 失敗（exit ${code}）`);
      if (stderr) console.error(stderr.split('\n').slice(-5).join('\n'));
      process.exit(1);
    });
});
