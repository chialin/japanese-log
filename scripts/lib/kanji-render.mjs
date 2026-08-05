// scripts/lib/kanji-render.mjs
// 產生 kanji.html —— 只含索引格，詳細內容由 js/kanji-page.js 在瀏覽器端渲染。

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'hot', label: '3 天以上' },
  { key: 'multi', label: '多音字' },
  { key: 'taigi', label: '台語線索' },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const tile = ([ch, e]) => {
  const cls = 'kanji-tile' + (e.days >= 3 ? ' hot' : '');
  const days = Number(e.days) || 0;
  return `<button class="${cls}" data-kanji="${esc(ch)}" data-days="${days}" ` +
    `data-multi="${e.multi ? 1 : 0}" data-taigi="${e.taigi ? 1 : 0}">` +
    `<span class="kt-char">${esc(ch)}</span><span class="kt-n">${days}</span></button>`;
};

export function renderIndexPage(entries) {
  const hot = entries.filter(([, e]) => e.days >= 3).length;
  const counts = {
    all: entries.length,
    hot,
    multi: entries.filter(([, e]) => e.multi).length,
    taigi: entries.filter(([, e]) => e.taigi).length,
  };
  const filters = FILTERS.map(
    (f) => `<button class="kanji-filter${f.key === 'all' ? ' on' : ''}" data-filter="${f.key}">` +
      `${f.label} <span class="kf-n">${counts[f.key]}</span></button>`
  ).join('\n      ');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>漢字音讀對照 — 學過的字互相連結</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg" />
<style>
/* 由 scripts/build-kanji.mjs 產生，請勿手動編輯 */
:root{--paper:#fdf6f0;--paper-deep:#f5e8d8;--ink:#2a1810;--ink-soft:#4a3020;--ink-mute:#8a6040;--accent:#c96830;--accent-soft:#f0b48a;--accent-pale:#fce8d8;--line:#f0d0b8;--bg-spot-1:#fdf0e5;--bg-spot-2:#f8e0c8;}
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

  <h1 class="page-title">漢字<span class="accent">音讀</span>對照</h1>
  <div class="page-meta">資源 · Kanji Index · 自動產生</div>
  <p class="page-subtitle">學過的字在哪些課出現過、各唸什麼 — 點漢字看詳細</p>

  <div class="tip">
    💡 <strong>怎麼用</strong><br>
    橘底＝出現 3 天以上的高頻字。點任一個字，下方會展開它的<strong>讀音分支</strong>與<strong>你遇到它的順序</strong>。
    音讀（棕橘）多半跟台語相通，訓讀（金茶）是日文固有詞。
  </div>

  <div class="kanji-filters">
      ${filters}
  </div>

  <div class="kanji-grid" id="kanji-grid">
    ${entries.map(tile).join('\n    ')}
  </div>

  <div id="kanji-detail"></div>

  <p class="kanji-credit">
    讀音資料來自 <a href="http://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noopener">KANJIDIC2</a>
    © EDRDG，授權 CC BY-SA 4.0。
  </p>

<site-footer></site-footer>
</div>

<script src="js/kanji-data.js"></script>
<script src="js/kanji-page.js"></script>
</body>
</html>
`;
}
