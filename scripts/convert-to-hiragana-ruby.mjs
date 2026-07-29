import fs from 'fs';
import path from 'path';

function katakanaToHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, function(ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0x60);
  });
}

function processHtml(html) {
  if (!html.includes('rt{')) {
    html = html.replace('</style>', 'ruby{ruby-align:center;}rt{font-size:0.55em;color:var(--accent);font-weight:500;}\n</style>');
  }

  // 1. 將 漢字（平假名） 轉為 <ruby>漢字<rt>平假名</rt></ruby>
  html = html.replace(/([\u4e00-\u9faf]+)（([\u3041-\u3096／\s]+)）/g, (match, kanji, kana) => {
    return `<ruby>${kanji}<rt>${kana}</rt></ruby>`;
  });

  // 2. 將 <rt> 標籤內的片假名全數轉換為平假名
  html = html.replace(/<rt>([^<]+)<\/rt>/g, (match, kana) => {
    return `<rt>${katakanaToHiragana(kana)}</rt>`;
  });

  return html;
}

const dir = 'tadoku';
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = processHtml(content);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully processed ${filePath} for Hiragana ruby tags.`);
  }
}
