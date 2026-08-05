import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRuby, isKanji } from '../lib/kanji-scan.mjs';

test('抽出單一 ruby', () => {
  const html = '<div><ruby>会話<rt>かいわ</rt></ruby></div>';
  assert.deepEqual(extractRuby(html), [{ base: '会話', reading: 'かいわ' }]);
});

test('抽出分段標註的 ruby（同一組 ruby 內多個 rt）', () => {
  const html = '<ruby>18<rt>じゅうはっ</rt>歳<rt>さい</rt></ruby>';
  assert.deepEqual(extractRuby(html), [
    { base: '18', reading: 'じゅうはっ' },
    { base: '歳', reading: 'さい' },
  ]);
});

test('忽略沒有 rt 的內容與 HTML 標籤', () => {
  const html = '<ruby>教会<rt>きょう<b>かい</b></rt></ruby>';
  assert.deepEqual(extractRuby(html), [{ base: '教会', reading: 'きょうかい' }]);
});

test('沒有 ruby 時回傳空陣列', () => {
  assert.deepEqual(extractRuby('<p>沒有標音</p>'), []);
});

test('isKanji 只認漢字', () => {
  assert.equal(isKanji('会'), true);
  assert.equal(isKanji('か'), false);
  assert.equal(isKanji('ア'), false);
  assert.equal(isKanji('1'), false);
});
