#!/usr/bin/env node
/**
 * build-epub.mjs — 把某一天的課程重新整理成一本 EPUB
 *
 * 目標裝置：Supernote A5X（1404×1872、10.3" E-ink 灰階）
 *  - 灰階排版：不靠顏色分辨資訊，改用邊框、粗細、縮排
 *  - 不用底色填滿（E-ink 上會變髒的網點），只用 1px 邊框 + 左側粗線
 *  - 字級用 em，讓閱讀器自己的縮放仍然有效；行距放寬到 1.85
 *  - 圖片寬度用百分比，避免在高 DPI 螢幕上變成小郵票
 *
 * 用法：node scripts/build-epub.mjs [輸出路徑.epub]
 * 內容是手寫在這支檔案裡的（重新編排過，不是把網頁直接倒出來）。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 一定要轉成絕對路徑：打包時 zip 是在暫存目錄裡執行的，相對路徑會指到別的地方
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'epub', 'japanese-log-2026-07-28.epub'));

const BOOK = {
  title: '日本語学習日誌 — 2026年7月28日',
  subtitle: '経験・近況・これそれあれ',
  author: 'Scarlett',
  lang: 'zh-Hant',
  date: '2026-07-28',
  uuid: 'urn:uuid:2026-07-28-japanese-log-a5',
};

/* ─────────────────────────────  素材  ───────────────────────────── */

// 對話用的插圖（跟網站共用 images/tadoku/）
const IMAGES = [
  'home_kitaku_girl.png',
  'taisyoku_hanataba_young_woman.png',
  'car_truck_hikkoshi.png',
  'train_jousya_woman.png',
  'train_manin_business.png',
  'study_nihongo.png',
];

/* ─────────────────────────────  版型  ───────────────────────────── */

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

/* ── 標題階層 ── */
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

/* ── 日文／羅馬字／中文三行式 ── */
.item { margin: 1em 0; padding: .1em 0 .1em .8em; border-left: 2px solid #999; page-break-inside: avoid; }
.ja { font-size: 1.3em; line-height: 1.6; }
.kana { font-size: .95em; color: #444; }
.romaji { font-size: .9em; font-style: italic; color: #555; letter-spacing: .03em; }
.cn { font-size: .95em; margin-top: .15em; }

/* ── 句型骨架 ── */
.frame { border: 2px solid #000; padding: .9em 1em; margin: 1.2em 0; page-break-inside: avoid; }
.frame .ja { font-size: 1.45em; text-align: center; }
.frame .romaji { text-align: center; }
.frame .desc { font-size: .95em; margin-top: .8em; }

/* ── 提示框：靠邊框粗細區分，不用顏色 ── */
.note, .alert { border: 1px solid #666; padding: .7em .9em; margin: 1.1em 0; font-size: .95em; page-break-inside: avoid; }
.alert { border: 1px solid #000; border-left-width: 8px; }
.note { border-left-width: 8px; border-left-style: double; }
.note .head, .alert .head { font-weight: bold; display: block; margin-bottom: .3em; }

/* ── 對照兩欄（灰階下改成上下堆疊，避免窄欄斷字） ── */
.vs { border: 1px solid #666; padding: .7em .9em; margin: .8em 0; page-break-inside: avoid; }
.vs .head { font-size: 1.2em; font-weight: bold; }
.vs .sub { font-size: .85em; font-style: italic; color: #555; margin-bottom: .3em; }

/* ── 表格（速記表） ── */
table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: .95em; word-break: break-word; }
th, td { border: 1px solid #666; padding: .45em .5em; text-align: left; vertical-align: top; word-break: break-word; }
th { border-bottom-width: 2px; font-weight: bold; }
td.w { font-size: 1.15em; font-weight: bold; }
td.k { color: #333; }

/* ── 對話 ── */
.scene { margin: 1.6em 0; page-break-inside: avoid; }
.scene img { display: block; width: 32%; max-width: 420px; margin: 0 auto .5em; }
.turn { margin: .7em 0 .7em 0; padding-left: 2.4em; text-indent: -2.4em; }
.turn .who { font-weight: bold; display: inline-block; width: 2.4em; text-indent: 0; }
.turn .ja { font-size: 1.25em; }
.turn .romaji, .turn .cn { padding-left: 2.4em; text-indent: 0; display: block; }

/* ── 方位羅盤：用表格排，E-ink 上最穩 ── */
table.compass { width: 70%; margin: 1em auto; }
table.compass td { text-align: center; border: 1px solid #999; padding: .6em .2em; }
table.compass td.empty { border: none; }
table.compass .d { font-size: 1.6em; }

/* ── 兩欄單字整理 ── */
table.kk { width: 100%; }
table.kk td { width: 50%; }

.lead { font-size: .95em; margin: .6em 0 1em; }
hr { border: none; border-top: 1px solid #999; margin: 2em 0; }

/* ── 封面／目次 ── */
.cover { text-align: center; margin-top: 22%; }
.cover .t { font-size: 2.2em; line-height: 1.4; border-bottom: 3px solid #000; border-top: 3px solid #000; padding: .5em 0; }
.cover .s { font-size: 1.1em; margin-top: 1em; letter-spacing: .15em; }
.cover .m { font-size: .9em; margin-top: 3em; font-style: italic; color: #444; }
nav ol { list-style: none; padding-left: 0; }
nav li { margin: .7em 0; font-size: 1.05em; border-bottom: 1px dotted #999; padding-bottom: .4em; }
nav a { text-decoration: none; color: #000; }
`;

/* ─────────────────────────────  小工具  ───────────────────────────── */

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

/** 三行式單字／例句 */
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
const turn = (who, ja, romaji, cn) => `<div class="turn"><span class="who">${who}</span><span class="ja">${ja}</span>
  <span class="romaji">${romaji}</span>
  <span class="cn">${cn}</span></div>`;

/* ─────────────────────────────  章節  ───────────────────────────── */

const chapters = [];

/* 封面 */
chapters.push({
  id: 'cover', title: '封面', file: 'cover.xhtml', inToc: false,
  html: page(BOOK.title, `<div class="cover">
  <div class="t">日本語<br />学習日誌</div>
  <div class="s">2026 年 7 月 28 日（火）</div>
  <p class="m">経験を聞く・近況を話す・これそれあれ<br />口語課 30 分鐘</p>
</div>`),
});

/* 目次（EPUB3 nav，同時當成可讀的目次頁） */

/* 第一章 */
chapters.push({
  id: 'ch1', title: '第一章　経験を聞く — 〜たことがありますか', file: 'ch1.xhtml',
  html: page('第一章 経験を聞く', `<h1>第一章　経験を聞く<span class="sub">〜たことがありますか</span></h1>

<p class="lead">問「有沒有做過某件事」的句型。重點在<strong>經驗</strong>，不是現在或未來，
所以動詞一定要先變成過去的「た形」。</p>

<h2>一　句型骨架</h2>

${frame('日本に来たことがありますか',
        'nihon ni kita koto ga arimasu ka',
        '拆開來是三塊：<strong>動詞的た形</strong>＋<strong>こと</strong>（這件事）＋<strong>があります</strong>（存在）。<br />直譯是「有沒有『來過日本』這件事」，也就是「你有來過日本嗎？」<br />来ます→<strong>来た</strong>、行きます→<strong>行った</strong>、食べます→<strong>食べた</strong>。')}

${note('為什麼是「日本に」',
 'に 標的是<strong>移動的終點</strong>（往哪裡去／來），来ます・行きます 這類移動動詞前面都配 に。<br />對照：日本<strong>で</strong>食べました（在日本吃了）——で 才是「動作發生的場所」。')}

<h2>二　怎麼回答</h2>

${item('はい、あります', 'hai, arimasu', '有的（去過）。最基本的肯定，不用把整句重複一遍。')}
${item('何回もあります', 'nankai mo arimasu', '去過好幾次。何回＝幾次，加 も 變「好幾次」。', 'なんかい も あります')}
${item('いいえ、ありません', 'iie, arimasen', '沒有（沒去過）。あります 的否定是 ありません。')}

${alert('何回 vs 何回も',
 '<strong>何回ですか</strong>＝「幾次？」（在<em>問</em>次數）；<strong>何回もあります</strong>＝「好幾次」（在<em>答</em>，強調次數多）。<br />差別就在那個 も——它把疑問詞變成「不特定的很多」。')}

<h2>三　追問地點</h2>

${item('どこに行きましたか', 'doko ni ikimashita ka', '你去了哪裡？（どこ＝哪裡，配移動動詞用 に）', 'どこに いきましたか')}
${item('九州に行きました', 'kyuushuu ni ikimashita', '我去了九州。', 'きゅうしゅうに いきました')}
${item('九州に行ったことがあります', 'kyuushuu ni itta koto ga arimasu', '我去過九州。行きます 的た形是 行った（促音）。')}

<h3>今日の単語</h3>
<table>
<tr><th>寫法</th><th>假名</th><th>意思</th></tr>
<tr><td class="w">〜たことがあります</td><td class="k">〜た ことが あります</td><td>曾經做過〜（經驗）</td></tr>
<tr><td class="w">何回も</td><td class="k">なんかいも</td><td>好幾次</td></tr>
<tr><td class="w">どこに</td><td class="k">どこに</td><td>去哪裡（往哪裡）</td></tr>
<tr><td class="w">九州</td><td class="k">きゅうしゅう</td><td>九州（日本最南邊的大島）</td></tr>
</table>

${note('一句話帶走', '想問「有沒有做過某件事」，就把動詞換成<strong>た形</strong>再接 <strong>ことがありますか</strong>——来た＋ことがありますか、行った＋ことがありますか、食べた＋ことがありますか。')}`),
});

/* 第二章 */
chapters.push({
  id: 'ch2', title: '第二章　近況を話す — 引っ越し・仕事・家族', file: 'ch2.xhtml',
  html: page('第二章 近況を話す', `<h1>第二章　近況を話す<span class="sub">引っ越し・仕事・家族</span></h1>

<h2>一　「回到原本的地方」的招呼</h2>

<p class="lead">這組招呼<strong>不只用在家</strong>。只要是「離開一下又回到原本的地方」都成立——
回家、回辦公室、回座位，甚至視訊課上離開鏡頭後又回來，老師都會說一句 おかえりなさい。</p>

<div class="vs">
  <div class="head">おかえりなさい</div>
  <div class="sub">okaerinasai</div>
  <div>「你回來啦！」<strong>留在原地的人</strong>對<strong>剛回來的人</strong>說。熟一點可以只說 おかえり。</div>
</div>

<div class="vs">
  <div class="head">ただいま</div>
  <div class="sub">tadaima</div>
  <div>「我回來了。」<strong>回來的那一方</strong>說。完整說法是 ただいま帰りました，日常只講前半。</div>
</div>

${note('哪些場合會聽到',
 '・<strong>視訊課</strong>：你離開鏡頭一下再回來 → 老師「おかえりなさい」／你「ただいま」<br />' +
 '・<strong>家裡</strong>：家人進門 →「おかえり」（熟人之間省略 なさい）<br />' +
 '・<strong>公司</strong>：同事出差或外出回來 →「おかえりなさい」<br />' +
 '反過來，<strong>出發的那一刻</strong>是另一組：走的人說 いってきます，留下的人說 いってらっしゃい。四句一起記最好用。')}

<h2>二　近況：辭職了、搬到日本了</h2>

${frame('日本に引っ越ししました',
        'nihon ni hikkoshi shimashita',
        '引っ越し（ひっこし）＝搬家，是名詞；後面接 します 就變成動詞。<br />這種「名詞＋します」的動詞很多：勉強します（唸書）、仕事します（工作）。<br />搬去的目的地一樣用 <strong>に</strong>，跟第一章「日本に来ました」同一個用法。')}

${item('最近、仕事をやめました', 'saikin, shigoto o yamemashita', '最近把工作辭掉了。', 'さいきん、しごとを やめました')}
${item('日本に引っ越ししました', 'nihon ni hikkoshi shimashita', '搬到日本來了。', 'にほんに ひっこし しました')}
${item('夫の仕事です', 'otto no shigoto desu', '是因為我先生的工作。', 'おっとの しごと です')}

${alert('やめました 有兩個漢字',
 '<strong>辞めました</strong>＝辭掉（工作、職位）；<strong>止めました</strong>＝停止（做某事）。<br />這裡講的是辭職，寫成「仕事を辞めました」；口語常常就直接寫假名 やめました。')}

<h2>三　いつ？ — ３か月前・４月</h2>

${frame('３か月前', 'san kagetsu mae',
        '<strong>か月</strong>（かげつ）＝「〜個月」的計量單位，<strong>前</strong>（まえ）＝「〜之前」。<br />同套用法：１年前（一年前）、２週間前（兩週前）、５分前（五分鐘前）。')}

${item('４月', 'shigatsu', '四月。注意唸 <strong>しがつ</strong>，不是 よんがつ——月份的 4 一律唸 し。', 'しがつ')}
${item('１年か２年', 'ichinen ka ninen', '一年或兩年。A か B ＝ A 或 B（不確定的兩選一）。', 'いちねん か にねん')}

${alert('兩個不同的「か」',
 '句尾的 か＝疑問（ですか？）；<strong>夾在兩個名詞中間</strong>的 か＝「或者」。<br />１年か２年（一年或兩年）、コーヒーかお茶（咖啡或茶）。')}

<h2>四　家族の呼び方 — 夫 vs ご主人</h2>

<div class="vs">
  <div class="head">夫</div>
  <div class="sub">otto — 講自己的</div>
  <div><strong>我先生</strong>。跟別人提到自己老公時用。例：夫の仕事です（是我先生的工作）。口語也有人講 主人（しゅじん）。</div>
</div>

<div class="vs">
  <div class="head">ご主人</div>
  <div class="sub">goshujin — 講對方的</div>
  <div><strong>您先生</strong>。問對方的老公時用，前面的 ご 是敬語接頭語。例：ご主人はお元気ですか。</div>
</div>

${alert('別把 ご主人 用在自己老公身上',
 'ご主人 是抬高<strong>對方</strong>家人的說法。講自己的老公要說「夫」，說成「私のご主人」等於在對自己人用敬語，聽起來很怪。')}

<h2>五　日本語の勉強 — 少し・まぁまぁ</h2>

${item('日本語を勉強しています', 'nihongo o benkyou shite imasu', '我正在學日文。〜ています＝持續在做（不是只有今天）。', 'にほんごを べんきょう しています')}
${item('少しわかります', 'sukoshi wakarimasu', '懂一點點。少し（すこし）＝一點點。')}
${item('まぁまぁです', 'maamaa desu', '還可以、普普通通。不好也不壞的萬用回答。')}

${note('少し vs まぁまぁ',
 '<strong>少し</strong> 是<em>量少</em>（只會一點）；<strong>まぁまぁ</strong> 是<em>程度普通</em>（沒有到好，但也不差）。被稱讚日文好的時候兩個都很好用。')}

<h2>六　聞こえます — 「聽得見」不是「聽」</h2>

<div class="vs">
  <div class="head">聞きます</div>
  <div class="sub">kikimasu — 主動去聽</div>
  <div>自己<strong>刻意</strong>去聽：音楽<strong>を</strong>聞きます（聽音樂）。前面用 を。</div>
</div>

<div class="vs">
  <div class="head">聞こえます</div>
  <div class="sub">kikoemasu — 自然聽得見</div>
  <div>聲音<strong>自己傳進耳朵</strong>：音<strong>が</strong>聞こえます（聽得見聲音）。前面用 が，不是 を。</div>
</div>

${item('聞こえます', 'kikoemasu', '聽得見。視訊上課被問「聽得到嗎」就這樣答。', 'きこえます')}
${item('聞こえました', 'kikoemashita', '（剛剛）聽到了。過去式。', 'きこえました')}
${item('すみません、聞こえません', 'sumimasen, kikoemasen', '不好意思，我聽不到。否定是 聞こえません。')}

${note('や 和 と 的差別',
 '<strong>と</strong>＝把東西<em>全部列完</em>：渋谷と新宿（就這兩個）。<br />' +
 '<strong>や</strong>＝<em>舉幾個例子</em>，言下之意還有別的：渋谷や新宿（澀谷、新宿<strong>之類的</strong>）。<br />' +
 '第五章對話裡的「渋谷や新宿はとても人が多いです」用 や，因為人多的地方不只這兩個。')}`),
});

/* 第三章 */
chapters.push({
  id: 'ch3', title: '第三章　ことばの整理 — 方位・き/く・色', file: 'ch3.xhtml',
  html: page('第三章 ことばの整理', `<h1>第三章　ことばの整理<span class="sub">方位・き／く・色</span></h1>

<h2>一　方位 — 北・南・東・西</h2>

<table class="compass">
<tr>
  <td class="empty"></td>
  <td><div class="d">北</div><div class="kana">きた</div><div class="romaji">kita</div></td>
  <td class="empty"></td>
</tr>
<tr>
  <td><div class="d">西</div><div class="kana">にし</div><div class="romaji">nishi</div></td>
  <td>方位<br />ほうい</td>
  <td><div class="d">東</div><div class="kana">ひがし</div><div class="romaji">higashi</div></td>
</tr>
<tr>
  <td class="empty"></td>
  <td><div class="d">南</div><div class="kana">みなみ</div><div class="romaji">minami</div></td>
  <td class="empty"></td>
</tr>
</table>

${note('車站出口天天用',
 '北口（きたぐち）、南口（みなみぐち）、東口（ひがしぐち）、西口（にしぐち）。<br />' +
 '但地名裡常常改唸<strong>音讀</strong>：東京（<strong>とう</strong>きょう）、西日本（<strong>にし</strong>にほん）、北海道（<strong>ほっ</strong>かいどう）。')}

<h2>二　き・く で始まることば</h2>

<p class="lead">今天散在各處的幾個單字，開頭都是 き 或 く，而且都是「越加越長」的關係——排在一起一次記牢。</p>

<table class="kk">
<tr><th>き 組</th><th>く 組</th></tr>
<tr>
  <td><div class="ja">木</div><div class="kana">き — 1 拍</div><div class="cn">樹、木頭（ki）</div></td>
  <td><div class="ja">国</div><div class="kana">くに — 2 拍</div><div class="cn">國家（kuni）</div></td>
</tr>
<tr>
  <td><div class="ja">北</div><div class="kana">きた — 2 拍</div><div class="cn">北（kita＝き＋た）</div></td>
  <td><div class="ja">靴</div><div class="kana">くつ — 2 拍</div><div class="cn">鞋子（kutsu）</div></td>
</tr>
<tr>
  <td><div class="ja">黄色</div><div class="kana">きいろ — 3 拍</div><div class="cn">黃色（kiiro＝き拉長＋ろ）</div></td>
  <td><div class="ja">車</div><div class="kana">くるま — 3 拍</div><div class="cn">車子（kuruma）</div></td>
</tr>
</table>

${note('怎麼分',
 'き 一個音就是<strong>木</strong>；加 た 變<strong>北</strong>；把き拉長再加ろ變<strong>黃色</strong>。<br />' +
 'く 這邊三個都是名詞：くに（國）／くつ（鞋）／くるま（車）——くに 和 くつ 都是兩拍最容易互換，記「つ＝鞋子踩地的聲音」就分得開。')}

<h2>三　色 — 何色が好きですか</h2>

${item('黄色', 'kiiro', '黃色', 'きいろ')}
${item('黒', 'kuro', '黑色', 'くろ')}
${item('青', 'ao', '藍色', 'あお')}

${item('何色が好きですか', 'naniiro ga suki desu ka', '你喜歡什麼顏色？', 'なにいろ が すき ですか')}
${item('青が好きです', 'ao ga suki desu', '我喜歡藍色。「喜歡的對象」用 が 不是 を。')}
${item('黒い靴です', 'kuroi kutsu desu', '是黑色的鞋子。黒→黒い（形容詞形）修飾名詞。')}

${alert('好き 前面是 が',
 '中文說「我喜歡<strong>藍色</strong>」像是受詞，但日文的 好き 是<strong>形容詞</strong>（喜歡的），<br />所以講成「青<strong>が</strong>好きです」，不是「青を好きです」。')}`),
});

/* 第四章 */
chapters.push({
  id: 'ch4', title: '第四章　これ・それ・あれ（レッスン8）', file: 'ch4.xhtml',
  html: page('第四章 これ・それ・あれ', `<h1>第四章　これ・それ・あれ<span class="sub">レッスン 8 — This, That</span></h1>

<p class="lead">中文只有「這／那」兩層，日文有<strong>三層</strong>。判斷標準不是距離幾公尺，而是<strong>東西離誰比較近</strong>。</p>

<h2>一　三層距離</h2>

<table>
<tr><th>詞</th><th>意思</th><th>東西在哪裡</th></tr>
<tr><td class="w">これ<br /><span class="romaji">kore</span></td><td>這個</td><td>在<strong>我</strong>這邊（說話的人手上／旁邊）</td></tr>
<tr><td class="w">それ<br /><span class="romaji">sore</span></td><td>那個（你那邊的）</td><td>在<strong>你</strong>那邊（聽話的人手上／旁邊）</td></tr>
<tr><td class="w">あれ<br /><span class="romaji">are</span></td><td>那個（遠處的）</td><td><strong>離兩個人都遠</strong>（在那邊、對面）</td></tr>
</table>

${note('容易搞混的是「それ」',
 '中文的「那個」同時對應日文的 それ 和 あれ。訣竅：東西在<strong>對方</strong>手上 → それ；東西在<strong>兩人之外的遠處</strong> → あれ。<br />例：對方拿著一本書，你要問「那是什麼？」講「それは何ですか」，不是 あれ。')}

<h2>二　句型骨架</h2>

${frame('これは車です', 'kore wa kuruma desu',
        '跟之前學的「A は B です」完全同一個框架，只是把 A 換成 これ／それ／あれ。<br />' +
        '問句一樣是句尾加 か：これは何ですか（這是什麼？）。<br />' +
        '回答時對方會自然改用另一個指示詞——你問「それは何ですか」（你那邊的是什麼），對方答「これは本です」（我這邊的是書）。<strong>視角換了，詞就換</strong>。')}

${item('これは車です', 'kore wa kuruma desu', '這是車子。', 'これは くるま です')}
${item('これはスマホです', 'kore wa sumaho desu', '這是智慧型手機。', 'これは すまほ です')}
${item('それは何ですか', 'sore wa nan desu ka', '你那個是什麼？（何ですか 唸 <strong>なん</strong>ですか，不是 なにですか）')}
${item('あれは荻窪駅です', 'are wa ogikubo eki desu', '那（遠處的）是荻窪車站。遠遠指著才用 あれ。')}
${item('これは私の靴です', 'kore wa watashi no kutsu desu', '這是我的鞋子。')}

<h2>三　今日の単語</h2>

${item('車', 'kuruma', '車子、汽車', 'くるま')}
${item('スマホ', 'sumaho', '智慧型手機 — スマートフォン 的縮寫，外來語寫片假名', 'すまほ')}
${item('携帯', 'keitai', '手機 — 携帯電話 的簡稱，泛指行動電話', 'けいたい')}
${item('靴', 'kutsu', '鞋子 — 靴を履きます＝穿鞋', 'くつ')}

${note('スマホ 和 携帯 差在哪',
 '<strong>携帯（けいたい）</strong>是舊一點的說法，泛指所有手機（含以前的折疊機）；<strong>スマホ</strong>專指智慧型手機。<br />現在年輕人多講 スマホ，但 携帯 完全通用，「携帯番号（けいたいばんごう）＝手機號碼」更是固定講法。')}

${alert('くるま 和 くつ 開頭一樣',
 '車（くるま）／靴（くつ）都是 く 開頭，初期很容易講錯。記法：<strong>くつ短短的兩拍，就像鞋子</strong>；車多一個 る，長一點。（見第三章「く 組」）')}

<h2>四　數字複習 — ８・１４</h2>

<table>
<tr><th>數字</th><th>唸法</th><th>備註</th></tr>
<tr><td class="w">８</td><td class="k">はち（hachi）</td><td>八</td></tr>
<tr><td class="w">１４</td><td class="k">じゅうよん（juuyon）</td><td>十四＝十（じゅう）＋四（よん）</td></tr>
</table>

${alert('4 有兩個唸法，看場合',
 '數數字時唸 <strong>よん</strong>（14＝じゅう<strong>よん</strong>）；<br />' +
 '但講<strong>月份</strong>時一律唸 <strong>し</strong>（4月＝<strong>し</strong>がつ，不是 よんがつ）。<br />這也是為什麼「四月」和「十四」聽起來完全不同。')}

<h2>五　套進去練</h2>

${item('これは私のスマホです', 'kore wa watashi no sumaho desu', '這是我的手機。')}
${item('それは携帯ですか', 'sore wa keitai desu ka', '你那個是手機嗎？')}
${item('あれは車です', 'are wa kuruma desu', '那（遠處的）是車子。')}
${item('これは黒い靴です', 'kore wa kuroi kutsu desu', '這是黑色的鞋子。（接上第三章的顏色）')}

${note('一句話帶走',
 '<strong>こ</strong>＝我這邊、<strong>そ</strong>＝你那邊、<strong>あ</strong>＝都很遠。先分清楚東西<em>離誰近</em>，再套「〜は〜です」就對了。')}`),
});

/* 第五章 — 對話全文（多読） */
chapters.push({
  id: 'ch5', title: '第五章　会話全文 — 久しぶりに会った二人', file: 'ch5.xhtml',
  html: page('第五章 会話全文', `<h1>第五章　会話全文<span class="sub">久しぶりに会った二人が近況を話す</span></h1>

<p class="lead">把前面幾章的句型串成一整段對話。先看圖猜情境，再讀日文；讀不懂的地方跳過去，不要查字典。</p>

<div class="scene">
  <img src="images/home_kitaku_girl.png" alt="帰宅" />
  ${turn('Ａ', 'おかえりなさい。', 'Okaerinasai.', '你回來啦。')}
  ${turn('Ｂ', 'ただいま。', 'Tadaima.', '我回來了。')}
</div>

<div class="scene">
  <img src="images/taisyoku_hanataba_young_woman.png" alt="退職" />
  ${turn('Ａ', 'お仕事はどうですか。', 'Oshigoto wa dou desu ka.', '工作還好嗎？')}
  ${turn('Ｂ', '最近やめました。日本に引っ越ししました。', 'Saikin yamemashita. Nihon ni hikkoshi shimashita.', '最近辭掉了。搬到日本來了。')}
</div>

<div class="scene">
  <img src="images/car_truck_hikkoshi.png" alt="引っ越し" />
  ${turn('Ａ', 'いつですか。', 'Itsu desu ka.', '什麼時候（搬的）？')}
  ${turn('Ｂ', '３か月前、４月です。夫の仕事です。', 'Sankagetsu mae, shigatsu desu. Otto no shigoto desu.', '三個月前，四月。因為我先生的工作。')}
</div>

<div class="scene">
  <img src="images/train_jousya_woman.png" alt="電車" />
  ${turn('Ａ', 'どこですか。', 'Doko desu ka.', '（搬到）哪裡呢？')}
  ${turn('Ｂ', '東京の中央線、荻窪（おぎくぼ）です。', 'Toukyou no Chuuousen, Ogikubo desu.', '東京的中央線，荻窪。')}
</div>

<div class="scene">
  <img src="images/train_manin_business.png" alt="満員電車" />
  ${turn('Ａ', '荻窪はどうですか。', 'Ogikubo wa dou desu ka.', '荻窪怎麼樣？')}
  ${turn('Ｂ', '平和です。とても静かです。', 'Heiwa desu. Totemo shizuka desu.', '很安寧，非常安靜。')}
  ${turn('Ｂ', '渋谷や新宿はとても人が多いです。', 'Shibuya ya Shinjuku wa totemo hito ga ooi desu.', '澀谷、新宿那種地方人非常多。')}
</div>

<div class="scene">
  <img src="images/study_nihongo.png" alt="勉強" />
  ${turn('Ａ', '日本に何年いますか。', 'Nihon ni nannen imasu ka.', '會在日本待幾年？')}
  ${turn('Ｂ', '１年か２年です。今、日本語を勉強しています。', 'Ichinen ka ninen desu. Ima, nihongo o benkyou shite imasu.', '一年或兩年。現在正在學日文。')}
</div>

<hr />
<p class="romaji">插圖：いらすとや（www.irasutoya.com）</p>`),
});

/* 附錄 — 速記表 */
const VOCAB = [
  ['おかえりなさい', 'おかえりなさい', '你回來啦（留在原地的人說）'],
  ['ただいま', 'ただいま', '我回來了（回來的那一方說）'],
  ['仕事', 'しごと', '工作'],
  ['やめました', 'やめました', '辭掉了（辞めました）'],
  ['引っ越し', 'ひっこし', '搬家（＋します 變動詞）'],
  ['東京', 'とうきょう', '東京'],
  ['中央線', 'ちゅうおうせん', '中央線'],
  ['荻窪', 'おぎくぼ', '荻窪（中央線車站）'],
  ['３か月前', 'さんかげつまえ', '三個月前'],
  ['４月', 'しがつ', '四月'],
  ['夫', 'おっと', '（我的）先生'],
  ['ご主人', 'ごしゅじん', '（您的）先生'],
  ['平和', 'へいわ', '和平、安寧'],
  ['静か', 'しずか', '安靜'],
  ['多い', 'おおい', '多的'],
  ['〜や〜', 'や', '〜之類的（舉例列舉）'],
  ['A か B', 'か', 'A 或 B'],
  ['勉強しています', 'べんきょうしています', '正在學習'],
  ['少し', 'すこし', '一點點'],
  ['まぁまぁ', 'まぁまぁ', '還可以、普普'],
  ['聞こえます', 'きこえます', '聽得見'],
  ['〜たことがあります', '〜た ことが あります', '曾經做過〜（經驗）'],
  ['何回も', 'なんかいも', '好幾次'],
  ['どこに', 'どこに', '去哪裡（往哪裡）'],
  ['九州', 'きゅうしゅう', '九州'],
  ['木', 'き', '樹、木頭'],
  ['北・南', 'きた・みなみ', '北、南'],
  ['東・西', 'ひがし・にし', '東、西'],
  ['国', 'くに', '國家'],
  ['黄色', 'きいろ', '黃色'],
  ['黒', 'くろ', '黑色'],
  ['青', 'あお', '藍色'],
  ['これ・それ・あれ', 'これ・それ・あれ', '這個／你那個／那個（遠）'],
  ['車', 'くるま', '車子'],
  ['スマホ', 'すまほ', '智慧型手機'],
  ['携帯', 'けいたい', '手機（携帯電話）'],
  ['靴', 'くつ', '鞋子'],
  ['８', 'はち', '八'],
  ['１４', 'じゅうよん', '十四'],
];

chapters.push({
  id: 'app', title: '附録　今日の単語まとめ', file: 'appendix.xhtml',
  html: page('附録 今日の単語まとめ', `<h1>附録<span class="sub">今日の単語まとめ — ${VOCAB.length} 語</span></h1>

<table>
<tr><th>寫法</th><th>假名</th><th>意思</th></tr>
${VOCAB.map(([w, k, m]) => `<tr><td class="w">${w}</td><td class="k">${k}</td><td>${m}</td></tr>`).join('\n')}
</table>`),
});

/* ─────────────────────────────  打包  ───────────────────────────── */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epub-'));
const oebps = path.join(tmp, 'OEBPS');
fs.mkdirSync(path.join(oebps, 'images'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'META-INF'), { recursive: true });

// mimetype 必須第一個、且不壓縮
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
for (const img of IMAGES) {
  const dst = path.join(oebps, 'images', img);
  fs.copyFileSync(path.join(ROOT, 'images', 'tadoku', img), dst);
  // E-ink 是灰階：先轉灰階，對比比較可控，檔案也小一些（macOS sips；失敗就保留彩色）
  try {
    execFileSync('sips', ['-m', '/System/Library/ColorSync/Profiles/Generic Gray Profile.icc', dst],
                 { stdio: 'ignore' });
  } catch { /* 非 macOS 或沒有該色彩描述檔時略過 */ }
}

const toc = chapters.filter(c => c.inToc !== false);

// EPUB3 導覽 + 可讀目次頁
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

// EPUB2 相容 NCX（Supernote 的閱讀器吃這個比較保險）
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
${IMAGES.map((f, i) => `  <item id="img${i}" href="images/${f}" media-type="image/png"/>`).join('\n')}
</manifest>
<spine toc="ncx">
${chapters.map(c => `  <itemref idref="${c.id}"/>`).join('\n')}
  <itemref idref="nav"/>
</spine>
</package>
`);

// 打包：mimetype 不壓縮且必須排第一
fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (fs.existsSync(OUT)) fs.rmSync(OUT);
execFileSync('zip', ['-X0', '-q', OUT, 'mimetype'], { cwd: tmp });
execFileSync('zip', ['-Xr9D', '-q', OUT, 'META-INF', 'OEBPS'], { cwd: tmp });
fs.rmSync(tmp, { recursive: true, force: true });

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`✅ ${OUT}  (${kb} KB, ${chapters.length} 個檔案章節, ${IMAGES.length} 張圖, ${VOCAB.length} 個單字)`);
