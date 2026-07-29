import fs from 'fs';

function katakanaToHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, function(ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0x60);
  });
}

function processHtml(html) {
  if (!html.includes('rt{')) {
    html = html.replace('</style>', 'ruby{ruby-align:center;}rt{font-size:0.55em;color:var(--accent);font-weight:500;}\n</style>');
  }

  // 將 <rt> 標籤內的片假名全數轉換為平假名
  html = html.replace(/<rt>([^<]+)<\/rt>/g, (match, kana) => {
    return `<rt>${katakanaToHiragana(kana)}</rt>`;
  });
  return html;
}

const file = 'tadoku/2026-07-29-tadoku-hirugohan.html';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = processHtml(content);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Successfully converted ${file} ruby tags to Hiragana.`);
}
