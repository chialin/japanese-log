import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kanaOf, plainText, extractFromHtml } from '../lib/vocab-scan.mjs';

test('kanaOf：ruby 換成 rt、保留非 ruby 文字', () => {
  assert.equal(kanaOf('<ruby>本<rt>ほん</rt>棚<rt>だな</rt></ruby>'), 'ほんだな');
  assert.equal(kanaOf('<ruby>食<rt>しょく</rt></ruby>パン'), 'しょくパン');
});

test('plainText：丟 rt、去標籤', () => {
  assert.equal(plainText('反義是 <ruby>偽<rt>にせ</rt>物<rt>もの</rt></ruby>（假貨）'), '反義是 偽物（假貨）');
  assert.equal(plainText('書架。<a href="#">8/18 學過</a>'), '書架。8/18 學過');
});

const WORD_ITEM = `
<div class="word-item" data-text="本棚">
  <div class="word-content">
    <div class="word-ja"><ruby>本<rt>ほん</rt>棚<rt>だな</rt></ruby></div>
    <div>
      <span class="acc"><span class="acc-k"><span class="ar">↘</span>ほん</span></span>
      <span class="acc-note">尾高型</span>
    </div>
    <div class="word-romaji">hondana</div>
    <div class="word-meaning">書架。書＋<ruby>棚<rt>たな</rt></ruby></div>
  </div>
  <button class="play-btn" aria-label="播放">▶</button>
</div>`;

test('extractFromHtml：word-item 完整欄位', () => {
  const [w] = extractFromHtml(WORD_ITEM);
  assert.equal(w.text, '本棚');
  assert.equal(w.kana, 'ほんだな');
  assert.equal(w.romaji, 'hondana');
  assert.equal(w.meaning, '書架。書＋棚');
  assert.equal(w.kind, 'word');
  assert.ok(w.accent.includes('acc-note'));
});

const WORD_ITEM_BUTTON_TEXT = `
<div class="word-item">
  <div class="word-content">
    <div class="word-ja">あお</div>
    <div class="word-romaji">ao</div>
    <div class="word-meaning">藍色、青色</div>
  </div>
  <button class="play-btn" data-text="あお">▶</button>
</div>`;

test('extractFromHtml：word-item（data-text 掛在 button 上，舊課程格式）', () => {
  const [w] = extractFromHtml(WORD_ITEM_BUTTON_TEXT);
  assert.equal(w.text, 'あお');
  assert.equal(w.kana, 'あお');
  assert.equal(w.romaji, 'ao');
  assert.equal(w.meaning, '藍色、青色');
  assert.equal(w.kind, 'word');
});

const PHRASE_OLD = `
<div class="phrase" data-text="またあした">
  <div class="phrase-content">
    <div class="japanese">またあした</div>
    <div class="romaji">mata ashita</div>
    <div class="meaning">明天見</div>
  </div>
  <button class="play-btn">▶</button>
</div>`;

test('extractFromHtml：phrase（.japanese 舊 class）', () => {
  const [p] = extractFromHtml(PHRASE_OLD);
  assert.equal(p.text, 'またあした');
  assert.equal(p.kana, 'またあした');
  assert.equal(p.romaji, 'mata ashita');
  assert.equal(p.kind, 'phrase');
});

const SEASON = `
<div class="season-card spring" data-text="はる">
  <div class="emoji">🌸</div>
  <div class="chinese">春天</div>
  <div class="japanese">はる</div>
  <div class="romaji">haru</div>
  <button class="play-btn">▶</button>
</div>`;

const EXTRA = `
<div class="extra-item">
  <div class="extra-content">
    <div class="extra-ja">はるが すき</div>
    <div class="extra-romaji">haru ga suki</div>
    <div class="extra-meaning">喜歡春天</div>
  </div>
  <button class="small-play-btn" data-text="はるが すき">▶</button>
</div>`;

test('extractFromHtml：season-card 與 extra-item', () => {
  const s = extractFromHtml(SEASON + EXTRA);
  assert.equal(s.length, 2);
  assert.deepEqual([s[0].text, s[0].meaning], ['はる', '春天']);
  assert.deepEqual([s[1].text, s[1].romaji], ['はるが すき', 'haru ga suki']);
});

const WORD_ITEM_NO_BUTTON_THEN_VALID = `
<div class="word-item">
  <div class="word-content">
    <div class="word-ja">海</div>
    <div class="word-romaji">umi</div>
    <div class="word-meaning">海</div>
  </div>
</div>

<div class="word-item" data-text="お元気ですか">
  <div class="word-content">
    <div class="word-ja">お元気ですか？</div>
    <div class="word-romaji">o-genki desu ka</div>
    <div class="word-meaning">你好嗎？</div>
  </div>
  <button class="play-btn">▶</button>
</div>`;

test('extractFromHtml：無 button 的參照卡不該吞掉下一張合法卡（regression for 2026-07-21-kaiwa-aisatsu）', () => {
  const result = extractFromHtml(WORD_ITEM_NO_BUTTON_THEN_VALID);
  // 應該抽到 1 筆（合法卡「お元気ですか」）、參照卡（無 data-text）被跳過
  assert.equal(result.length, 1);
  assert.equal(result[0].text, 'お元気ですか');
  assert.equal(result[0].meaning, '你好嗎？');
  assert.equal(result[0].kind, 'word');
});
