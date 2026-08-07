import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildKanjiData } from '../lib/kanji-build.mjs';

const DICT = {
  会: { on: ['カイ'], kun: ['あ.う'] },
  話: { on: ['ワ'], kun: [] },
  社: { on: ['シャ'], kun: [] },
  局: { on: ['キョク'], kun: [] },
  郵: { on: ['ユウ'], kun: [] },
  便: { on: ['ビン', 'ベン'], kun: [] },
};

const REC = [
  { base: '会話', reading: 'かいわ', file: 'lessons/2026-07-23-kaiwa.html', date: '2026-07-23', title: '口語練習' },
  { base: '会社', reading: 'かいしゃ', file: 'lessons/2026-07-10-jikoshoukai.html', date: '2026-07-10', title: '自己紹介' },
  { base: '会う', reading: 'あう', file: 'lessons/2026-07-28-hikkoshi-kaiwa.html', date: '2026-07-28', title: '引っ越し' },
  // 同一天第二篇也用到「会」——天數不重複計算
  { base: '会話', reading: 'かいわ', file: 'lessons/2026-07-23-shokugyou.html', date: '2026-07-23', title: '職業' },
  { base: '郵便局', reading: 'ゆうびんきょく', file: 'lessons/2026-08-05-doko.html', date: '2026-08-05', title: 'どこですか' },
  { base: '今日', reading: 'きょう', file: 'lessons/2026-08-05-doko.html', date: '2026-08-05', title: 'どこですか' },
];

test('天數以「天」計，同一天多篇只算一次', () => {
  const d = buildKanjiData(REC, DICT);
  assert.equal(d['会'].days, 3); // 07-10, 07-23, 07-28
});

test('音讀分支收集到該讀音下的單字，且去重', () => {
  const d = buildKanjiData(REC, DICT);
  assert.deepEqual(d['会'].on['かい'].sort(), ['会社', '会話']);
});

test('訓讀分支獨立', () => {
  const d = buildKanjiData(REC, DICT);
  assert.deepEqual(d['会'].kun['あ'], ['会う']);
});

test('多音字標記', () => {
  const d = buildKanjiData(REC, DICT);
  assert.equal(d['会'].multi, true);
  assert.equal(d['局'].multi, false);
});

test('台語線索：局 きょく → -k；会 かい → null', () => {
  const d = buildKanjiData(REC, DICT);
  assert.equal(d['局'].taigi.coda, '-k');
  assert.equal(d['会'].taigi, null);
});

test('對齊失敗的單字進 other，且不會消失', () => {
  const d = buildKanjiData(REC, DICT);
  assert.ok(d['今'] === undefined || d['今'].other.includes('今日'));
  assert.ok(d['日'].other.includes('今日'));
});

test('時間軸依日期排序，每篇各一筆', () => {
  const d = buildKanjiData(REC, DICT);
  const dates = d['会'].timeline.map((e) => e.d);
  assert.deepEqual(dates, ['2026-07-10', '2026-07-23', '2026-07-23', '2026-07-28']);
});
