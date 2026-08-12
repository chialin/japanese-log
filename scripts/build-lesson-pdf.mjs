#!/usr/bin/env node
// scripts/build-lesson-pdf.mjs
//
// 把一篇或多篇課程頁合成一份 PDF（預設 Supernote A5X 灰階排版，基礎字級 16px）。
// 用 WeasyPrint 排版，套 lesson-eink.css；瀏覽器版完全不受影響。
//
// Pre-req：brew install weasyprint
//
// 用法：
//   node scripts/build-lesson-pdf.mjs pdf/out.pdf lessons/a.html lessons/b.html
//   node scripts/build-lesson-pdf.mjs --css lesson-eink.css pdf/out.pdf lessons/a.html
//
// 做法：把每一頁的 <style> 與 <body> 內容抽出來，串成一份暫存 HTML
// （放在 lessons/ 底下，讓 ../shared.css 等相對路徑仍然解得開），交給 WeasyPrint。
// 每一課從新的一頁開始（.pdf-doc + .pdf-doc { break-before: page }）。

import { readFile, writeFile, unlink, mkdir, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

let cssArg = 'lesson-eink.css';
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--css') { cssArg = argv[++i]; continue; }
  positional.push(argv[i]);
}

const [outArg, ...inputs] = positional;
if (!outArg || inputs.length === 0) {
  console.error('用法：node scripts/build-lesson-pdf.mjs <out.pdf> <lesson.html...> [--css lesson-eink.css]');
  process.exit(1);
}

const OUT = path.resolve(ROOT, outArg);
const CSS = path.resolve(ROOT, cssArg);
const TMP = path.resolve(ROOT, 'lessons', '_pdf-tmp.html');   // 放 lessons/ 讓 ../shared.css 解得開

try { await access(CSS); }
catch { console.error(`❌ 找不到 CSS：${CSS}`); process.exit(1); }

const BIN = '/opt/homebrew/bin/weasyprint';
try { await access(BIN); }
catch { console.error('❌ 找不到 weasyprint，請先 brew install weasyprint'); process.exit(1); }

const styles = [];
const bodies = [];

for (const rel of inputs) {
  const file = path.resolve(ROOT, rel);
  const html = await readFile(file, 'utf8');

  // 頁面自己的 <style>（:root 色票與該頁專屬區塊）
  for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) styles.push(m[1]);

  let body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  body = body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<site-header><\/site-header>/g, '')
    .replace(/<site-footer><\/site-footer>/g, '')
    .replace(/<details/g, '<details open');      // 紙本沒得點，解答直接攤開
  // 速度條靠 lesson-eink.css 的 display:none 隱藏，不在這裡用字串砍（會誤吃後面的 </div>）

  const title = (html.match(/<title>(.*?)<\/title>/) || [, path.basename(file)])[1];
  bodies.push(`<div class="pdf-doc" data-src="${path.basename(file)}">\n${body}\n</div>`);
  console.log(`📄 ${path.basename(file)} — ${title}`);
}

const doc = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<title>${path.basename(OUT, '.pdf')}</title>
<link rel="stylesheet" href="../shared.css">
<style>${styles.join('\n')}</style>
</head>
<body>
${bodies.join('\n')}
</body>
</html>
`;

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(TMP, doc, 'utf8');

console.log(`🖨  → ${path.relative(ROOT, OUT)}（${path.basename(CSS)}）`);

const code = await new Promise((res) => {
  const p = spawn(BIN, [TMP, OUT, '-s', CSS], { stdio: 'inherit' });
  p.on('close', res);
});

await unlink(TMP).catch(() => {});

if (code !== 0) { console.error('❌ WeasyPrint 失敗'); process.exit(code); }
console.log('✅ 完成');
