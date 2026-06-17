#!/usr/bin/env node
// scripts/build-book-pdf.mjs
//
// 用 WeasyPrint 把 store-phrasebook.html 排成「書籍版」PDF（A5、頁碼、頁眉、
// 目錄頁碼、章節扉頁）。套用 book-print.css（只給 PDF 用，不影響瀏覽器互動版）。
//
// Pre-req：
//   brew install weasyprint        # 一次即可（已含 pango/cairo 等）
//
// 用法：
//   node scripts/build-book-pdf.mjs                 # → store-phrasebook.pdf（一般 A5 書）
//   node scripts/build-book-pdf.mjs --eink          # → store-phrasebook-supernote.pdf（Supernote/灰階：大字高對比、填滿 3:4 螢幕）
//   node scripts/build-book-pdf.mjs out.pdf         # 自訂輸出檔名
//
// 字型用 macOS 內建 ヒラギノ明朝 / Songti / Baskerville，離線可跑、PDF 會自動 subset（幾百 KB）。
// 對照：scripts/build-pdf.mjs 是「Chrome 直接列印網頁」版（檔大、無頁碼），這支才是書籍版。

import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const EINK = args.includes('--eink');           // Supernote / 灰階 e-ink：大字、高對比、填滿 3:4 螢幕
const posArg = args.find(a => !a.startsWith('--'));

const INPUT = path.resolve(ROOT, 'store-phrasebook.html');
const STYLE = path.resolve(ROOT, EINK ? 'book-eink.css' : 'book-print.css');
const OUTPUT = path.resolve(ROOT, posArg || (EINK ? 'store-phrasebook-supernote.pdf' : 'store-phrasebook.pdf'));

for (const [label, p] of [['HTML', INPUT], ['CSS', STYLE]]) {
  try { await access(p); }
  catch { console.error(`❌ 找不到${label}：${p}`); process.exit(1); }
}

// 找 weasyprint（brew 裝在 /opt/homebrew/bin）
const BIN = await (async () => {
  for (const c of ['weasyprint', '/opt/homebrew/bin/weasyprint', '/usr/local/bin/weasyprint']) {
    try { await access(c.startsWith('/') ? c : '/dev/null'); } catch {}
  }
  return 'weasyprint'; // 交給 PATH 解析；找不到下方會報錯
})();

console.log(`📖 WeasyPrint: store-phrasebook.html → ${path.basename(OUTPUT)}`);

const child = spawn(BIN, [INPUT, OUTPUT, '-s', STYLE, '--presentational-hints'], {
  stdio: ['ignore', 'inherit', 'pipe'],
});
let stderr = '';
child.stderr.on('data', d => { stderr += d.toString(); });
child.on('error', err => {
  if (err.code === 'ENOENT') {
    console.error('❌ 找不到 weasyprint。請先安裝：brew install weasyprint');
  } else {
    console.error('❌ ' + err.message);
  }
  process.exit(1);
});
child.on('exit', code => {
  // WeasyPrint 對抓不到的 Google Fonts 會印 warning，無害；以輸出檔為準
  access(OUTPUT)
    .then(() => {
      const warns = (stderr.match(/WARNING/g) || []).length;
      if (warns) console.log(`ℹ️  WeasyPrint 有 ${warns} 個 warning（多半是略過線上字型，已用系統明體，無妨）`);
      console.log(`✅ 完成：${OUTPUT}`);
    })
    .catch(() => {
      console.error(`❌ 失敗（exit ${code}）`);
      if (stderr) console.error(stderr.split('\n').slice(-8).join('\n'));
      process.exit(1);
    });
});
