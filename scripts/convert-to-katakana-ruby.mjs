import fs from 'fs';

function hiraganaToKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, function(ch) {
    return String.fromCharCode(ch.charCodeAt(0) + 0x60);
  });
}

function convertText(html) {
  if (!html.includes('rt{')) {
    html = html.replace('</style>', 'ruby{ruby-align:center;}rt{font-size:0.55em;color:var(--accent);font-weight:500;}\n</style>');
  }

  // 僅替換 漢字（純平假名） 為 <ruby>漢字<rt>片假名</rt></ruby>
  html = html.replace(/([\u4e00-\u9faf]+)（([\u3041-\u3096／\s]+)）/g, (match, kanji, kana) => {
    const parts = kana.split('／').map(k => hiraganaToKatakana(k.trim())).join(' / ');
    return `<ruby>${kanji}<rt>${parts}</rt></ruby>`;
  });

  return html;
}

const files = [
  'lessons/2026-07-29-hirugohan-chazuke.html',
  'lessons/2026-07-29-kono-sono-ano.html',
  'lessons/2026-07-29-koko-soko-asoko.html',
  'tadoku/2026-07-29-tadoku-hirugohan.html'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = convertText(content);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Converted ${file}`);
  }
}
