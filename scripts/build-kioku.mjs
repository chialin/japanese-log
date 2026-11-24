// scripts/build-kioku.mjs
// 把全站的記憶貼紙（.mnemonic 藍／.mnemonic.taigi 紅）收集成一頁 kioku.html「記憶小撇步」。
//
//   來源 1：lessons/*.html 與根目錄頁（例如 jikan.html）裡的 <div class="mnemonic"> / <div class="mnemonic taigi">
//   來源 2：data/my-notes.html —— 不屬於任何一課的「我的筆記」（手寫的 HTML 片段，放在頁面最上面）
//
// kioku.html 是產物，不要手改；要改貼紙就改課程頁，要加筆記就改 data/my-notes.html，再重跑。
// 用法：node scripts/build-kioku.mjs   （build-all.sh 會一起跑）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// 從 open 標籤的位置開始，數 <div> 深度找到對應的 </div>
function takeDiv(html, start) {
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  throw new Error('找不到對應的 </div>');
}

function stickersIn(html) {
  const out = [];
  const re = /<div class="mnemonic( taigi)?"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ taigi: !!m[1], html: takeDiv(html, m.index) });
    re.lastIndex = m.index + 1;
  }
  return out;
}

// 課程頁裡的相對連結，搬到根目錄後要補 lessons/
function fixLinks(html, fromLessons) {
  if (!fromLessons) return html;
  return html.replace(/(href|src)="(?!https?:|#|mailto:|\/)([^"]*)"/g, (_, attr, url) =>
    `${attr}="${url.startsWith('../') ? url.slice(3) : 'lessons/' + url}"`);
}

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// 課名：優先用首頁 log 的標題，找不到再用 <title>
const titles = {};
for (const m of read('index.html').matchAll(/href="(lessons\/[^"]+\.html)"[\s\S]*?lesson-title">([^<]*)/g)) titles[m[1]] = m[2].trim();

const pages = [
  ...fs.readdirSync(path.join(ROOT, 'lessons'))
    .filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.html$/.test(f) && !f.endsWith('-a5.html'))
    .map((f) => 'lessons/' + f),
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && f !== 'kioku.html'),
];

const groups = [];
for (const file of pages) {
  const html = read(file);
  const st = stickersIn(html);
  if (!st.length) continue;
  const fromLessons = file.startsWith('lessons/');
  const date = (file.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
  const t = titles[file] || strip((html.match(/<title>([^<]*)<\/title>/) || [, file])[1]).split(' — ')[0];
  groups.push({ file, date, title: t, stickers: st.map((s) => ({ ...s, html: fixLinks(s.html, fromLessons) })) });
}
// 課程照日期由舊到新，沒有日期的根目錄頁放最後
groups.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));

const total = groups.reduce((n, g) => n + g.stickers.length, 0);
const nTaigi = groups.reduce((n, g) => n + g.stickers.filter((s) => s.taigi).length, 0);

let notes = '';
try { notes = read('data/my-notes.html').replace(/<!--[\s\S]*?-->/g, '').trim(); } catch {}
const nNotes = stickersIn(notes).length;

const groupHtml = groups.map((g) => {
  const [y, mo, d] = g.date ? g.date.split('-') : [];
  return `  <section class="kioku-group">
    <a class="kioku-src" href="${g.file}"><span class="kioku-date">${g.date ? `${y} / ${mo} / ${d}` : '速查表'}</span><span class="kioku-title">${g.title}</span><span class="arrow">→</span></a>
${g.stickers.map((s) => '    ' + s.html).join('\n')}
  </section>`;
}).join('\n');

const page = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- 由 scripts/build-kioku.mjs 產生，不要手改：貼紙改課程頁，筆記改 data/my-notes.html -->
<title>記憶小撇步 — 全站的記憶貼紙與我的筆記</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg" />
<style>
/* 記憶小撇步頁 — 棕橘底色，貼紙本身維持紅（台語線索）／藍（其他記法） */
:root{--paper:#fdf6f0;--paper-deep:#f5e8d8;--ink:#2a1810;--ink-soft:#4a3020;--ink-mute:#8a6040;--accent:#c96830;--accent-soft:#f0b48a;--accent-pale:#fce8d8;--line:#f0d0b8;--bg-spot-1:#fdf0e5;--bg-spot-2:#f8e0c8;}
.kioku-bar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--paper);padding:10px 0 12px;margin:20px 0 8px;border-bottom:1px solid var(--line);}
.kioku-chip{font-family:'Shippori Mincho',serif;font-size:14px;padding:6px 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.6);color:var(--ink);cursor:pointer;}
.kioku-chip .n{font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--ink-mute);margin-left:4px;}
.kioku-chip[data-f="taigi"]{border-color:#d92818;color:#d92818;}
.kioku-chip[data-f="memo"]{border-color:#2b6cb0;color:#2b6cb0;}
.kioku-chip.on{background:var(--ink);border-color:var(--ink);color:#fff;}
.kioku-chip.on .n{color:#fff;}
.kioku-search{flex:1;min-width:160px;font-size:14px;padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.7);color:var(--ink);font-family:'Noto Serif TC',serif;}
.kioku-search:focus{outline:2px solid var(--accent-soft);}
.kioku-group{margin:28px 0 8px;}
.kioku-src{display:flex;align-items:baseline;gap:10px;text-decoration:none;color:inherit;border-bottom:1px dashed var(--line);padding-bottom:6px;}
.kioku-date{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:var(--ink-mute);flex:0 0 auto;}
.kioku-title{font-family:'Shippori Mincho',serif;font-size:15px;font-weight:700;color:var(--ink-soft);}
.kioku-src .arrow{margin-left:auto;color:var(--ink-mute);transition:transform .15s,color .15s;}
.kioku-src:hover .kioku-title,.kioku-src:hover .arrow{color:var(--accent);}
.kioku-src:hover .arrow{transform:translateX(3px);}
.kioku-notes-empty{font-size:14px;color:var(--ink-mute);line-height:1.8;border:1px dashed var(--line);padding:14px 18px;margin-top:12px;}
.kioku-none{display:none;text-align:center;color:var(--ink-mute);font-size:14px;margin:40px 0;}
.is-hidden{display:none!important;}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600;700;800&family=Noto+Serif+TC:wght@300;400;500;600&family=Klee+One:wght@400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="shared.css" />
<script src="js/site-chrome.js" defer></script>
</head>
<body>
<div class="wrap">
<site-header></site-header>

  <h1 class="page-title">記憶 <span class="accent">小撇步</span></h1>
  <div class="page-meta">記憶 · Memory Notes</div>
  <p class="page-subtitle">全站的記憶貼紙集中在這一頁，加上我自己的筆記</p>

  <p style="color:var(--ink-soft);font-size:14px;line-height:1.8;margin-bottom:6px;">
    每一課裡的記憶貼紙都收在這裡：<strong style="color:#d92818;">紅色</strong>是用台語讀音連到日文的線索，
    <strong style="color:#2b6cb0;">藍色</strong>是字形、字義、日文詞群這類其他記法。照上課日期由舊到新排，
    每一組上面的標題點下去會回到那一課。最上面是不屬於任何一課的「我的筆記」。
  </p>

  <div class="kioku-bar">
    <button class="kioku-chip on" data-f="all">全部<span class="n">${total + nNotes}</span></button>
    <button class="kioku-chip" data-f="taigi">台語線索<span class="n">${nTaigi}</span></button>
    <button class="kioku-chip" data-f="memo">其他記法<span class="n">${total - nTaigi + nNotes}</span></button>
    <input class="kioku-search" type="search" placeholder="找字：例如 局、ひがし、扉" aria-label="搜尋貼紙">
  </div>

  <section class="kioku-group" id="my-notes">
    <div class="divider">我的筆記 · My Notes</div>
${notes ? notes.split('\n').map((l) => '    ' + l).join('\n') : '    <p class="kioku-notes-empty">還沒有筆記。想到什麼記法，在對話裡跟 Claude 說，屬於某一課的會寫進那一課，不屬於任何一課的就放在這裡。</p>'}
  </section>

  <div class="divider" style="margin-top:36px;">各課的記憶貼紙 · From Lessons</div>
${groupHtml}

  <p class="kioku-none">找不到符合的貼紙。</p>

<site-footer></site-footer>
</div>
<script>
(function () {
  const chips = document.querySelectorAll('.kioku-chip');
  const search = document.querySelector('.kioku-search');
  const none = document.querySelector('.kioku-none');
  let kind = 'all';
  function apply() {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('.kioku-group').forEach((g) => {
      let any = 0;
      g.querySelectorAll('.mnemonic').forEach((m) => {
        const isTaigi = m.classList.contains('taigi');
        const okKind = kind === 'all' || (kind === 'taigi') === isTaigi;
        const okText = !q || m.textContent.toLowerCase().includes(q) || g.querySelector('.kioku-src, .divider').textContent.toLowerCase().includes(q);
        const ok = okKind && okText;
        m.classList.toggle('is-hidden', !ok);
        if (ok) any++;
      });
      // 「我的筆記」沒有篩選條件時一律顯示（含空白提示）
      const keep = g.id === 'my-notes' ? (any > 0 || (kind === 'all' && !q)) : any > 0;
      g.classList.toggle('is-hidden', !keep);
      shown += any;
    });
    none.style.display = shown ? 'none' : 'block';
  }
  chips.forEach((c) => c.addEventListener('click', () => {
    kind = c.dataset.f;
    chips.forEach((x) => x.classList.toggle('on', x === c));
    apply();
  }));
  search.addEventListener('input', apply);
})();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'kioku.html'), page);
console.log(`✅ kioku.html：${groups.length} 頁、${total} 張貼紙（台語線索 ${nTaigi}／其他記法 ${total - nTaigi}），我的筆記 ${nNotes} 則`);
