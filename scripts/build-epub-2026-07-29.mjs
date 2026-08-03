#!/usr/bin/env node
/**
 * build-epub-2026-07-29.mjs — 將 2026 年 7 月 29 日的三課整理成一本 EPUB
 *
 * 目標裝置：Supernote A5X（1404×1872、10.3" E-ink 灰階）
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'epub', 'japanese-log-2026-07-29.epub'));

const BOOK = {
  title: '日本語学習日誌 — 2026年7月29日',
  subtitle: '昼ごはんとお茶漬け・指示連體詞・場所の指示詞',
  author: 'Scarlett',
  lang: 'zh-Hant',
  date: '2026-07-29',
  uuid: 'urn:uuid:2026-07-29-japanese-log-a5',
};

const IMAGES = [];

const CSS = `/* Supernote A5X（1404×1872）灰階閱讀用 */
@page { margin: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Mincho ProN", "YuMincho", "Noto Serif CJK JP", "Noto Serif CJK TC", "Noto Sans CJK JP", "Songti TC", serif, sans-serif;
  font-size: 1em;
  line-height: 1.85;
  margin: 0 5%;
  color: #000;
  text-align: justify;
}

.ja, .kana, ruby, rt, td.w, td.k {
  font-family: "Hiragino Mincho ProN", "YuMincho", "Noto Serif CJK JP", "Noto Sans CJK JP", "Hiragino Sans", serif, sans-serif;
}

h1 {
  font-size: 1.7em; line-height: 1.4; margin: 0 0 .2em;
  border-bottom: 3px solid #000; padding-bottom: .3em;
  page-break-before: always; break-before: page;
}
h1 .sub { display: block; font-size: .55em; font-weight: normal; letter-spacing: .1em; margin-top: .5em; }
h2 {
  font-size: 1.25em; margin: 2em 0 .6em; padding-left: .5em;
  border-left: 6px solid #000;
}
h3 { font-size: 1.05em; margin: 1.5em 0 .4em; }

p { margin: .5em 0; }

.item { margin: 1em 0; padding: .1em 0 .1em .8em; border-left: 2px solid #999; page-break-inside: avoid; }
.ja { font-size: 1.3em; line-height: 1.6; }
.kana { font-size: .95em; color: #444; }
.romaji { font-size: .9em; font-style: italic; color: #555; letter-spacing: .03em; }
.cn { font-size: .95em; margin-top: .15em; }

.frame { border: 2px solid #000; padding: .9em 1em; margin: 1.2em 0; page-break-inside: avoid; }
.frame .ja { font-size: 1.45em; text-align: center; }
.frame .romaji { text-align: center; }
.frame .desc { font-size: .95em; margin-top: .8em; }

.note, .alert { border: 1px solid #666; padding: .7em .9em; margin: 1.1em 0; font-size: .95em; page-break-inside: avoid; }
.alert { border: 1px solid #000; border-left-width: 8px; }
.note { border-left-width: 8px; border-left-style: double; }
.note .head, .alert .head { font-weight: bold; display: block; margin-bottom: .3em; }

.vs { border: 1px solid #666; padding: .7em .9em; margin: .8em 0; page-break-inside: avoid; }
.vs .head { font-size: 1.2em; font-weight: bold; }
.vs .sub { font-size: .85em; font-style: italic; color: #555; margin-bottom: .3em; }

table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: .95em; }
th, td { border: 1px solid #666; padding: .45em .5em; text-align: left; vertical-align: top; }
th { border-bottom-width: 2px; font-weight: bold; }
td.w { font-size: 1.15em; white-space: nowrap; }
td.k { color: #333; white-space: nowrap; }

.lead { font-size: .95em; margin: .6em 0 1em; }
hr { border: none; border-top: 1px solid #999; margin: 2em 0; }

.cover { text-align: center; margin-top: 22%; }
.cover .t { font-size: 2.2em; line-height: 1.4; border-bottom: 3px solid #000; border-top: 3px solid #000; padding: .5em 0; }
.cover .s { font-size: 1.1em; margin-top: 1em; letter-spacing: .15em; }
.cover .m { font-size: .9em; margin-top: 3em; font-style: italic; color: #444; }
nav ol { list-style: none; padding-left: 0; }
nav li { margin: .7em 0; font-size: 1.05em; border-bottom: 1px dotted #999; padding-bottom: .4em; }
nav a { text-decoration: none; color: #000; }
`;

const page = (title, body) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${BOOK.lang}" lang="${BOOK.lang}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
${body}
</body>
</html>
`;

const item = (ja, romaji, cn, kana) => `<div class="item">
  <div class="ja">${ja}</div>${kana ? `\n  <div class="kana">${kana}</div>` : ''}
  <div class="romaji">${romaji}</div>
  <div class="cn">${cn}</div>
</div>`;

const note = (head, body) => `<div class="note"><span class="head">${head}</span>${body}</div>`;
const alert = (head, body) => `<div class="alert"><span class="head">${head}</span>${body}</div>`;
const frame = (ja, romaji, desc) => `<div class="frame">
  <div class="ja">${ja}</div>
  <div class="romaji">${romaji}</div>
  <div class="desc">${desc}</div>
</div>`;

const chapters = [];

/* 封面 */
chapters.push({
  id: 'cover', title: '封面', file: 'cover.xhtml', inToc: false,
  html: page(BOOK.title, `<div class="cover">
  <div class="t">日本語<br />学習日誌</div>
  <div class="s">2026 年 7 月 29 日（水）</div>
  <p class="m">昼ごはんとお茶漬け・指示連體詞・場所の指示詞<br />口語課 ＋ 教科書文法</p>
</div>`),
});

/* 第一章 */
chapters.push({
  id: 'ch1', title: '第一章　昼ごはんとお茶漬け — 口語與因果句型', file: 'ch1.xhtml',
  html: page('第一章 昼ごはんとお茶漬け', `<h1>第一章　昼ごはんとお茶漬け<span class="sub">口語與因果句型</span></h1>

<p class="lead">今天的口語練習：在家裡做午餐、兩個人一起做、喜歡茶泡飯與天氣熱的因果句型。</p>

<h2>一　因果句型 — 〜から／ですから</h2>

${frame('今日はとても暑いですから、家で昼ごはんを作りました',
        'kyou wa totemo atsui desu kara, ie de hirugohan o tsukurimashita',
        '句尾接 <strong>から</strong> 表示原因理由（因為...所以...）。<br />也可以拆成兩句：今日はとても暑いです。<strong>ですから</strong>、家で昼ごはんを作りました。')}

${item('今日はとても暑いです', 'kyou wa totemo atsui desu', '今天非常熱。', 'きょうは とても あついです')}
${item('ですから、家で昼ごはんを作りました', 'desukara, ie de hirugohan o tsukurimashita', '所以，在留/在家裡做了午餐。', 'ですから、うちで ひるごはんを つくりました')}
${item('二人でいっしょに作りました', 'futari de issho ni tsukurimashita', '兩個人一起做了。', 'ふたりで いっしょに つくりました')}

<h2>二　並列與喜好</h2>

${item('野菜と魚とごはんを食べました', 'yasai to sakana to gohan o tabemashita', '吃了蔬菜、魚與白飯。', 'やさいと さかなと ごはんを たべました')}
${item('お茶漬けが好きです', 'ochazuke ga suki desu', '我喜歡茶泡飯。喜好標示用 が。', 'おちゃづけが すきです')}
${item('かんたんです', 'kantan desu', '很簡單。')}

${note('重點複習', '・地點 / 人數限定用 <strong>で</strong>：家で（在家）、二人で（兩人地）<br />・名詞並列用 <strong>と</strong>：野菜と魚とごはん<br />・喜好用 <strong>が 好きです</strong>')}
`),
});

/* 第二章 */
chapters.push({
  id: 'ch2', title: '第二章　この・その・あの — 形容詞與指示連體詞', file: 'ch2.xhtml',
  html: page('第二章 この・その・あの', `<h1>第二章　この・その・あの<span class="sub">形容詞與指示連體詞</span></h1>

<p class="lead">指示連體詞（この／その／あの）後面<strong>一定要接名詞</strong>，用來描述物品的屬性與狀態。</p>

<h2>一　これ vs この の差別</h2>

<div class="vs">
  <div class="head">これ・それ・あれ</div>
  <div class="sub">代名詞 (Demonstrative Pronoun)</div>
  <div>本身是名詞，獨立當主詞：<strong>これ</strong>は車です。（這是車子。）</div>
</div>

<div class="vs">
  <div class="head">この・その・あの</div>
  <div class="sub">連體詞 (Demonstrative Determiner)</div>
  <div>後面必須緊接名詞：<strong>この本</strong>は古いです。（這本書很舊。）</div>
</div>

<h2>二　反義形容詞與例句</h2>

${item('この本は古いです', 'kono hon wa furui desu', '這本書很舊。', 'この ほんは ふるいです')}
${item('この絵は小さいです', 'kono e wa chiisai desu', '這幅畫很小。', 'この えは ちいさいです')}
${item('あの家は大きいです', 'ano ie wa ookii desu', '那間房子很大。', 'あの いえは おおきいです')}
${item('あの車は新しいです', 'ano kuruma wa atarashii desu', '那台車很新。', 'あの くるまは あたらしいです')}
${item('そのパソコンは古いです', 'sono pasokon wa furui desu', '你那台電腦很舊。')}
${item('そのくつは新しいです', 'sono kutsu wa atarashii desu', '你那雙鞋子很新。')}

${alert('形容詞反義組', '・古い（ふるい / 舊） ↔ 新しい（あたらしい / 新）<br />・大きい（おおきい / 大） ↔ 小さい（ちいさい / 小）')}
`),
});

/* 第三章 */
chapters.push({
  id: 'ch3', title: '第三章　ここ・そこ・あそこ — 場所の指示詞', file: 'ch3.xhtml',
  html: page('第三章 ここ・そこ・あそこ', `<h1>第三章　ここ・そこ・あそこ<span class="sub">場所の指示詞</span></h1>

<p class="lead">指示場所位置的代名詞：這裡（ここ）、那裡（そこ）、那裡遠處（あそこ）。</p>

<h2>一　場所の說明</h2>

${frame('施設名詞 ＋ は ＋ ここ／そこ／あそこ ＋ です',
        'shisetsu wa koko / soko / asoko desu',
        '用來說明設施或建築物位於哪裡。')}

${item('バス停はここです', 'basutei wa koko desu', '公車站是在這裡（我身邊）。', 'ばすていは ここです')}
${item('学校はそこです', 'gakkou wa soko desu', '學校是在那裡（你身邊）。', 'がっこうは そこです')}
${item('図書館はあそこです', 'toshokan wa asoko desu', '圖書館是在那裡（雙方遠處）。', 'としょかんは あそこです')}
${item('病院はあそこです', 'byouin wa asoko desu', '醫院是在那裡（雙方遠處）。', 'びょういんは あそこです')}

<h2>二　本課新單字</h2>

<table>
<tr><th>寫法</th><th>假名</th><th>意思</th></tr>
<tr><td class="w">警察</td><td class="k">けいさつ</td><td>警察 / 警察局</td></tr>
<tr><td class="w">煙</td><td class="k">けむり</td><td>煙、煙霧</td></tr>
<tr><td class="w">消しゴム</td><td class="k">けしごむ</td><td>橡皮擦</td></tr>
<tr><td class="w">会社</td><td class="k">かいしゃ</td><td>公司</td></tr>
<tr><td class="w">自動販売機</td><td class="k">じどうはんばいき</td><td>自動販賣機</td></tr>
<tr><td class="w">病院</td><td class="k">びょういん</td><td>醫院</td></tr>
<tr><td class="w">バス停</td><td class="k">ばすてい</td><td>公車站</td></tr>
<tr><td class="w">学校</td><td class="k">がっこう</td><td>學校</td></tr>
<tr><td class="w">図書館</td><td class="k">としょかん</td><td>圖書館</td></tr>
</table>
`),
});

/* 附錄 — 速記表 */
const VOCAB = [
  ['昼ごはん', 'ひるごはん', '午餐'],
  ['家', 'うち / いえ', '家、家裡'],
  ['二人', 'ふたり', '兩個人'],
  ['いっしょに', 'いっしょに', '一起'],
  ['作りました', 'つくりました', '做了'],
  ['お茶漬け', 'おちゃづけ', '茶泡飯'],
  ['野菜', 'やさい', '蔬菜'],
  ['魚', 'さかな', '魚'],
  ['ごはん', 'ごはん', '白飯 / 餐點'],
  ['好き', 'すき', '喜歡'],
  ['簡単', 'かんたん', '簡單'],
  ['今日', 'きょう', '今天'],
  ['とても', 'とても', '非常、很'],
  ['暑い', 'あつい', '熱'],
  ['ですから / 〜から', 'ですから', '所以 / 因為...所以...'],
  ['この', 'この', '這個（連體詞）'],
  ['その', 'その', '那個（連體詞）'],
  ['あの', 'あの', '那個（連體詞）'],
  ['本', 'ほん', '書本'],
  ['絵', 'え', '圖畫、畫作'],
  ['車', 'くるま', '汽車'],
  ['パソコン', 'ぱそこん', '電腦'],
  ['靴 / くつ', 'くつ', '鞋子'],
  ['古い', 'ふるい', '舊的'],
  ['新しい', 'あたらしい', '新的'],
  ['大きい', 'おおきい', '大的'],
  ['小さい', 'ちいさい', '小的'],
  ['ここ', 'ここ', '這裡'],
  ['そこ', 'そこ', '那裡（對方那邊）'],
  ['あそこ', 'あそこ', '那裡（雙方遠處）'],
  ['写真', 'しゃしん', '照片'],
  ['警察', 'けいさつ', '警察'],
  ['煙', 'けむり', '煙、煙霧'],
  ['消しゴム', 'けしごむ', '橡皮擦'],
  ['会社', 'かいしゃ', '公司'],
  ['自動販売機', 'じどうはんばいき', '自動販賣機'],
  ['病院', 'びょういん', '醫院'],
  ['バス停', 'ばすてい', '公車站'],
  ['学校', 'がっこう', '學校'],
  ['図書館', 'としょかん', '圖書館'],
];

chapters.push({
  id: 'app', title: '附録　今日の単語まとめ', file: 'appendix.xhtml',
  html: page('附録 今日の単語まとめ', `<h1>附録<span class="sub">今日の単語まとめ — ${VOCAB.length} 語</span></h1>

<table>
<tr><th>寫法</th><th>假名</th><th>意思</th></tr>
${VOCAB.map(([w, k, m]) => `<tr><td class="w">${w}</td><td class="k">${k}</td><td>${m}</td></tr>`).join('\n')}
</table>`),
});

/* 打包 */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epub-'));
const oebps = path.join(tmp, 'OEBPS');
fs.mkdirSync(path.join(oebps, 'images'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'META-INF'), { recursive: true });

fs.writeFileSync(path.join(tmp, 'mimetype'), 'application/epub+zip');

fs.writeFileSync(path.join(tmp, 'META-INF', 'container.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`);

fs.writeFileSync(path.join(oebps, 'style.css'), CSS);
for (const ch of chapters) fs.writeFileSync(path.join(oebps, ch.file), ch.html);

const toc = chapters.filter(c => c.inToc !== false);

fs.writeFileSync(path.join(oebps, 'nav.xhtml'), `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${BOOK.lang}" lang="${BOOK.lang}">
<head><meta charset="utf-8" /><title>目次</title><link rel="stylesheet" type="text/css" href="style.css" /></head>
<body>
<nav epub:type="toc" id="toc">
<h1>目次</h1>
<ol>
${toc.map(c => `  <li><a href="${c.file}">${c.title}</a></li>`).join('\n')}
</ol>
</nav>
</body>
</html>
`);

fs.writeFileSync(path.join(oebps, 'toc.ncx'), `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
  <meta name="dtb:uid" content="${BOOK.uuid}"/>
  <meta name="dtb:depth" content="1"/>
  <meta name="dtb:totalPageCount" content="0"/>
  <meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>${BOOK.title}</text></docTitle>
<navMap>
${toc.map((c, i) => `  <navPoint id="${c.id}" playOrder="${i + 1}">
    <navLabel><text>${c.title}</text></navLabel>
    <content src="${c.file}"/>
  </navPoint>`).join('\n')}
</navMap>
</ncx>
`);

fs.writeFileSync(path.join(oebps, 'content.opf'), `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:identifier id="bookid">${BOOK.uuid}</dc:identifier>
  <dc:title>${BOOK.title}</dc:title>
  <dc:creator>${BOOK.author}</dc:creator>
  <dc:language>${BOOK.lang}</dc:language>
  <dc:date>${BOOK.date}</dc:date>
  <dc:description>${BOOK.subtitle}</dc:description>
  <meta property="dcterms:modified">${BOOK.date}T00:00:00Z</meta>
</metadata>
<manifest>
  <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  <item id="css" href="style.css" media-type="text/css"/>
${chapters.map(c => `  <item id="${c.id}" href="${c.file}" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine toc="ncx">
${chapters.map(c => `  <itemref idref="${c.id}"/>`).join('\n')}
  <itemref idref="nav"/>
</spine>
</package>
`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (fs.existsSync(OUT)) fs.rmSync(OUT);
execFileSync('zip', ['-X0', '-q', OUT, 'mimetype'], { cwd: tmp });
execFileSync('zip', ['-Xr9D', '-q', OUT, 'META-INF', 'OEBPS'], { cwd: tmp });
fs.rmSync(tmp, { recursive: true, force: true });

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`✅ ${OUT}  (${kb} KB, ${chapters.length} 個檔案章節, ${VOCAB.length} 個單字)`);
