#!/usr/bin/env node
/**
 * build-epub-2026-08-02.mjs — 將 2026 年 8 月 2 日的課程整理成 Supernote A5 優化版 EPUB
 *
 * 目標裝置：Supernote A5X / Nomad / A5X2（10.3" E-ink 灰階螢幕）
 * 特點：
 *  - 灰階高對比：黑字白底，粗黑邊框與縮排
 *  - 中大字級：字級加大（1.15em-1.35em），行距放寬（1.85）
 *  - E-ink 友善：無淺彩背景點陣，呈現純淨視覺
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'epub', 'japanese-log-2026-08-02.epub'));

const BOOK = {
  title: '日本語学習日誌 — 2026年8月2日',
  subtitle: '週末の行動・夫と漫画のイベントに行きました',
  author: 'Scarlett',
  lang: 'zh-Hant',
  date: '2026-08-02',
  uuid: 'urn:uuid:2026-08-02-japanese-log-a5',
};

const CSS = `/* Supernote A5（10.3" E-ink 灰階高對比中大字型） */
@page { margin: 0; }

body {
  font-family: "Noto Serif CJK TC", "Noto Serif TC", "Songti TC", serif;
  font-size: 1.15em;
  line-height: 1.85;
  margin: 0 5%;
  color: #000;
  text-align: justify;
}

h1 {
  font-size: 1.75em; line-height: 1.35; margin: 0 0 .3em;
  border-bottom: 3px solid #000; padding-bottom: .3em;
  page-break-before: always; break-before: page;
}
h1 .sub { display: block; font-size: .6em; font-weight: normal; letter-spacing: .1em; margin-top: .4em; }

h2 {
  font-size: 1.3em; margin: 1.8em 0 .6em; padding-left: .5em;
  border-left: 6px solid #000;
}
h3 { font-size: 1.1em; margin: 1.4em 0 .4em; font-weight: bold; }

p { margin: .6em 0; }

.item { margin: 1.1em 0; padding: .2em 0 .2em .8em; border-left: 2px solid #666; page-break-inside: avoid; }
.ja { font-size: 1.35em; line-height: 1.6; font-weight: bold; }
.kana { font-size: .95em; color: #333; }
.romaji { font-size: .9em; font-style: italic; color: #444; letter-spacing: .02em; }
.cn { font-size: .95em; margin-top: .2em; color: #111; }

.frame { border: 2px solid #000; padding: 1em 1.2em; margin: 1.3em 0; page-break-inside: avoid; }
.frame .ja { font-size: 1.45em; text-align: center; }
.frame .romaji { text-align: center; }
.frame .desc { font-size: .95em; margin-top: .8em; }

.note, .alert { border: 1px solid #444; padding: .8em 1em; margin: 1.2em 0; font-size: 1em; page-break-inside: avoid; }
.alert { border: 2px solid #000; border-left-width: 8px; }
.note { border-left-width: 8px; border-left-style: solid; border-left-color: #000; }
.note .head, .alert .head { font-weight: bold; display: block; margin-bottom: .3em; font-size: 1.05em; }

table { width: 100%; border-collapse: collapse; margin: 1.2em 0; font-size: 1em; }
th, td { border: 1px solid #444; padding: .55em .6em; text-align: left; vertical-align: top; }
th { border-bottom: 2px solid #000; font-weight: bold; background: #eee; }
td.w { font-size: 1.2em; font-weight: bold; white-space: nowrap; }
td.k { color: #222; white-space: nowrap; }

.cover { text-align: center; margin-top: 20%; }
.cover .t { font-size: 2.2em; line-height: 1.4; border-bottom: 3px solid #000; border-top: 3px solid #000; padding: .6em 0; }
.cover .s { font-size: 1.15em; margin-top: 1.2em; letter-spacing: .15em; }
.cover .m { font-size: .95em; margin-top: 3em; font-style: italic; color: #444; }
nav ol { list-style: none; padding-left: 0; }
nav li { margin: .8em 0; font-size: 1.1em; border-bottom: 1px dotted #888; padding-bottom: .4em; }
nav a { text-decoration: none; color: #000; font-weight: bold; }
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
</html>`;

const coverXhtml = page('封面', `
<div class="cover">
  <div class="t">日本語学習日誌</div>
  <div class="s">${BOOK.subtitle}</div>
  <div class="m">2026 年 8 月 2 日 · Supernote A5 Edition</div>
</div>
`);

const ch1Xhtml = page('一、課堂對話實例', `
<h1>一、課堂對話實例 <span class="sub">会話 (Kaiwa)</span></h1>

<div class="alert">
  <span class="head">💡 本課要記的事</span>
  ① 詢問與回答過去動作：昨日は 何をしましたか？ / 〜に 行きました<br/>
  ② 動作同行者與目的地助詞：〜と（和…）、〜に（目的地）<br/>
  ③ い形容詞過去式：去 い ＋ かったです（おもしろかったです）<br/>
  ④ 日常習慣表達：普通（通常）＋ 〜動詞ます（漫画を 読みます）
</div>

<h2>💬 對話句型紀錄</h2>

<div class="item">
  <div class="ja">昨日は 何を しましたか？</div>
  <div class="kana">きのうは なにを しましたか</div>
  <div class="romaji">kinou wa nani o shimashita ka?</div>
  <div class="cn">中文：昨天做了什麼呢？（詢問過去發生的動作）</div>
</div>

<div class="item">
  <div class="ja">夫と 漫画の イベントに 行きました。</div>
  <div class="kana">おっとと まんがの いべんとに いきました</div>
  <div class="romaji">otto to manga no ibento ni ikimashita.</div>
  <div class="cn">中文：我和丈夫去了漫畫活動。（と：和…、に：往…目的地）</div>
</div>

<div class="item">
  <div class="ja">面白かったです。</div>
  <div class="kana">おもしろかったです</div>
  <div class="romaji">omoshirokatta desu.</div>
  <div class="cn">中文：當時很有趣。（面白（おもしろ）い 的過去式）</div>
</div>

<div class="item">
  <div class="ja">私は 普通 日本の 漫画を 読みます。</div>
  <div class="kana">わたしは ふつう にほんの まんかを よみます</div>
  <div class="romaji">watashi wa futsuu nihon no manga o yomimasu.</div>
  <div class="cn">中文：我通常看日本漫畫。（普通：通常、平時習慣）</div>
</div>

<div class="item">
  <div class="ja">週刊ジャンプ</div>
  <div class="kana">しゅうかんじゃんぷ</div>
  <div class="romaji">shūkan janpu</div>
  <div class="cn">中文：週刊少年Jump（日本知名的週刊少年漫畫雜誌）</div>
</div>
`);

const ch2Xhtml = page('二、重點單字表', `
<h1>二、重點單字表 <span class="sub">単語 (Tango)</span></h1>

<table>
  <thead>
    <tr>
      <th>日文 (漢字/假名)</th>
      <th>假名 / 讀音</th>
      <th>詞性</th>
      <th>中文釋義</th>
    </tr>
  </thead>
  <tbody>
    <tr><td class="w">昨日</td><td class="k">きのう (kinou)</td><td>名詞</td><td>昨天</td></tr>
    <tr><td class="w">夫</td><td class="k">おっと (otto)</td><td>名詞</td><td>丈夫（稱呼自己的丈夫）</td></tr>
    <tr><td class="w">漫画</td><td class="k">まんが (manga)</td><td>名詞</td><td>漫畫</td></tr>
    <tr><td class="w">イベント</td><td class="k">いべんと (ibento)</td><td>名詞</td><td>活動 / event</td></tr>
    <tr><td class="w">行く / 行きます</td><td class="k">いきます (ikimasu)</td><td>動詞 (Ⅰ類)</td><td>去（過去式：行きました）</td></tr>
    <tr><td class="w">面白い</td><td class="k">おもしろい (omoshiroi)</td><td>い形容詞</td><td>有趣的（過去式：おもしろかったです）</td></tr>
    <tr><td class="w">私</td><td class="k">わたし (watashi)</td><td>代名詞</td><td>我</td></tr>
    <tr><td class="w">普通</td><td class="k">ふつう (futsuu)</td><td>副詞/名詞</td><td>通常、平時、一般</td></tr>
    <tr><td class="w">日本</td><td class="k">にほん (nihon)</td><td>名詞</td><td>日本</td></tr>
    <tr><td class="w">読む / 読みます</td><td class="k">よみます (yomimasu)</td><td>動詞 (Ⅰ類)</td><td>看、閱讀（書/漫畫）</td></tr>
    <tr><td class="w">週刊ジャンプ</td><td class="k">しゅうかんじゃんぷ</td><td>專有名詞</td><td>週刊少年Jump</td></tr>
  </tbody>
</table>
`);

const ch3Xhtml = page('三、核心文法與句型解析', `
<h1>三、核心文法與句型解析 <span class="sub">文法・文型 (Bunpou)</span></h1>

<h2>1. [時間] は 何をしましたか？（詢問過去動作）</h2>
<p>動詞 <strong>します</strong>（做）的過去形為 <strong>しました</strong>。搭配時間副詞（昨日、先週）詢問過去發生的行為。</p>
<div class="frame">
  <div class="ja">昨日は 何を しましたか？</div>
  <div class="romaji">kinou wa nani o shimashita ka?</div>
  <div class="desc">中文：昨天做了什麼？</div>
</div>

<h2>2. [對象] と [地點] に 行きました（同行者與目的地）</h2>
<p>・<strong>助詞 と</strong>：表示共同行動的陪伴對象（「和…一起」）。<br/>
・<strong>助詞 に</strong>：表示移動的「目的地 / 方向」。</p>
<div class="frame">
  <div class="ja">夫と イベントに 行きました。</div>
  <div class="romaji">otto to ibento ni ikimashita.</div>
  <div class="desc">中文：和丈夫去了活動現場。</div>
</div>

<h2>3. い形容詞過去式：〜かったです</h2>
<p>い形容詞描述過去感受或狀態時，去字尾 <strong>い</strong> ＋ <strong>かったです</strong>。</p>
<div class="frame">
  <div class="ja">面白かったです。</div>
  <div class="romaji">omoshirokatta desu.</div>
  <div class="desc">面白い ➔ 面白かったです（當時很有趣）。</div>
</div>

<h2>4. [主詞] は 普通 [賓詞] を [動詞]（日常習慣）</h2>
<p><strong>普通（ふつう）</strong> 在動詞前作為副詞，表示「平時、通常、習慣上」。動詞使用現在非過去式 〜ます 表示常態。</p>
<div class="frame">
  <div class="ja">私は 普通 日本の 漫画を 読みます。</div>
  <div class="romaji">watashi wa futsuu nihon no manga o yomimasu.</div>
  <div class="desc">中文：我通常看日本漫畫。</div>
</div>
`);

const ch4Xhtml = page('四、隨堂練習與解答', `
<h1>四、隨堂練習與解答 <span class="sub">練習問題 (Renshū)</span></h1>

<div class="note">
  <span class="head">📝 練習 A：助詞與文法填空題</span>
  ⓐ 昨日は 友達（　と　）映画館（　に　）行きました。<br/>
  ⓑ 私は 普通 日本の雑誌（　を　）読みます。<br/>
  ⓒ 昨日のイベントは とても（　おもしろかったです　）です。（面白い 過去式）
</div>

<div class="note">
  <span class="head">📝 練習 B：中譯日練習解答</span>
  ⓐ 昨天做了什麼？ ➔ 昨日は 何を しましたか？<br/>
  ⓑ 我和丈夫去了公園。 ➔ 夫と 公園に 行きました。<br/>
  ⓒ 我通常看雜誌。 ➔ 私は 普通 雑誌を 読みます。
</div>
`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epub-build-'));
const oebps = path.join(tmp, 'OEBPS');
const metaInf = path.join(tmp, 'META-INF');
fs.mkdirSync(oebps, { recursive: true });
fs.mkdirSync(metaInf, { recursive: true });

fs.writeFileSync(path.join(tmp, 'mimetype'), 'application/epub+zip');
fs.writeFileSync(path.join(metaInf, 'container.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

fs.writeFileSync(path.join(oebps, 'style.css'), CSS);

const chapters = [
  { id: 'cover', file: 'cover.xhtml', title: '封面', html: coverXhtml, inToc: false },
  { id: 'ch1', file: 'ch1.xhtml', title: '一、課堂對話實例', html: ch1Xhtml },
  { id: 'ch2', file: 'ch2.xhtml', title: '二、重點單字表', html: ch2Xhtml },
  { id: 'ch3', file: 'ch3.xhtml', title: '三、核心文法與句型解析', html: ch3Xhtml },
  { id: 'ch4', file: 'ch4.xhtml', title: '四、隨堂練習與解答', html: ch4Xhtml },
];

for (const c of chapters) {
  fs.writeFileSync(path.join(oebps, c.file), c.html);
}

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
console.log(`✅ ${OUT}  (${kb} KB)`);
