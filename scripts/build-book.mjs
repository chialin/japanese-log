// scripts/build-book.mjs
// 掃兩本「書」的目錄頁，產生 js/book-data.js，給每一課開頭的位置列和底部的上一篇／下一篇用。
//
//   grammar.html  文法書：<section class="book-part" ...> 十一章＋附錄
//   kamoku.html   課程：  <section class="book-part" ...> 五部
//
// 目錄頁是手寫的（新增一課＝把卡片貼進對應的章／部），順序就是頁面上卡片的順序。
// 這支腳本只負責把順序轉成資料；js/site-chrome.js 在課程頁讀它、插入位置列與翻頁。
//
// 也順便檢查：首頁 log 裡的每一課（lessons/*）都要剛好出現在其中一本書裡，漏掉或重複會列警告。
//
// 用法：node scripts/build-book.mjs   （build-all.sh 會一起跑）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const BOOKS = [
  { key: 'grammar', file: 'grammar.html', name: '文法書' },
  { key: 'kamoku', file: 'kamoku.html', name: '課程' },
];

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const data = {};
const seen = new Map(); // lesson file → book file（檢查重複）
const warnings = [];

for (const book of BOOKS) {
  const html = read(book.file);
  const sections = [...html.matchAll(
    /<section class="book-part" id="([^"]+)" data-tag="([^"]+)" data-name="([^"]+)">([\s\S]*?)<\/section>/g,
  )];
  if (!sections.length) throw new Error(`${book.file} 找不到 <section class="book-part">`);

  // 整本書攤平成一條閱讀順序
  const flat = [];
  for (const [, id, tag, name, body] of sections) {
    const cards = [...body.matchAll(/<a class="lesson-link[^"]*" href="(lessons\/[^"]+\.html)">([\s\S]*?)<\/a>/g)];
    cards.forEach(([, href, inner], i) => {
      const t = inner.match(/<div class="lesson-title">([\s\S]*?)<span class="arrow">/);
      flat.push({
        href,
        title: strip(t ? t[1] : inner),
        part: { id, tag, name },
        no: i + 1,
        total: cards.length,
      });
    });
  }

  flat.forEach((x, i) => {
    if (seen.has(x.href)) warnings.push(`重複：${x.href} 同時在 ${seen.get(x.href)} 和 ${book.file}`);
    seen.set(x.href, book.file);
    const brief = (y) => y && { href: y.href, title: y.title, part: `${y.part.tag} ${y.part.name}` };
    data[x.href] = {
      book: book.name,
      bookHref: book.file,
      partId: x.part.id,
      part: `${x.part.tag} ${x.part.name}`,
      no: x.no,
      total: x.total,
      prev: brief(flat[i - 1]),
      next: brief(flat[i + 1]),
    };
  });
  console.log(`📖 ${book.file}：${sections.length} 段、${flat.length} 課`);
}

// 首頁 log 裡的每一課都要被收進某一本書
const logged = [...read('index.html').matchAll(/<a class="lesson-link[^"]*"\s+href="(lessons\/[^"]+\.html)"/g)].map((m) => m[1]);
for (const href of logged) {
  if (!data[href]) warnings.push(`沒收進任何一本書：${href}（文法課加進 grammar.html，其他加進 kamoku.html）`);
}

const out = `// 由 scripts/build-book.mjs 產生，不要手改\nwindow.BOOK_DATA = ${JSON.stringify(data)};\n`;
fs.writeFileSync(path.join(ROOT, 'js/book-data.js'), out);
console.log(`✅ js/book-data.js：${Object.keys(data).length} 課`);
if (warnings.length) {
  console.log(`⚠️  ${warnings.length} 個警告：`);
  warnings.forEach((w) => console.log('   ' + w));
}
