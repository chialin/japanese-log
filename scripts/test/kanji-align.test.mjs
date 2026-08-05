import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kataToHira, readingVariants, align } from '../lib/kanji-align.mjs';

const DICT = {
  会: { on: ['カイ', 'エ'], kun: ['あ.う'] },
  話: { on: ['ワ'], kun: ['はな.す', 'はなし'] },
  教: { on: ['キョウ'], kun: ['おし.える'] },
  日: { on: ['ニチ', 'ジツ'], kun: ['ひ', '-び', '-か'] },
  三: { on: ['サン'], kun: ['み', 'み.つ'] },
  誕: { on: ['タン'], kun: [] },
  生: { on: ['セイ', 'ショウ'], kun: ['い.きる', 'う.まれる', 'なま'] },
  薬: { on: ['ヤク'], kun: ['くすり'] },
  局: { on: ['キョク'], kun: [] },
};

test('片假名轉平假名', () => {
  assert.equal(kataToHira('カイ'), 'かい');
  assert.equal(kataToHira('キョウ'), 'きょう');
});

test('變音形式：連濁與促音', () => {
  const v = readingVariants('ひ');
  assert.ok(v.includes('ひ'));
  assert.ok(v.includes('び'), '連濁 ひ→び');
  assert.ok(v.includes('ぴ'), '半濁 ひ→ぴ');
  const y = readingVariants('やく');
  assert.ok(y.includes('やっ'), '促音 やく→やっ');
});

test('會話 → 会(かい,音) 話(わ,音)', () => {
  const r = align('会話', 'かいわ', DICT);
  assert.deepEqual(r, [
    { ch: '会', reading: 'かい', type: 'on' },
    { ch: '話', reading: 'わ', type: 'on' },
  ]);
});

test('教会 → 教(きょう,音) 会(かい,音)', () => {
  const r = align('教会', 'きょうかい', DICT);
  assert.deepEqual(r.map((x) => x.reading), ['きょう', 'かい']);
  assert.ok(r.every((x) => x.type === 'on'));
});

test('会う → 会(あ,訓) + 送假名 う', () => {
  const r = align('会う', 'あう', DICT);
  assert.deepEqual(r, [
    { ch: '会', reading: 'あ', type: 'kun' },
    { ch: 'う', reading: 'う', type: 'kana' },
  ]);
});

test('誕生日 → 日 讀成連濁的 び（訓）', () => {
  const r = align('誕生日', 'たんじょうび', DICT);
  assert.equal(r[2].ch, '日');
  assert.equal(r[2].reading, 'び');
  assert.equal(r[2].type, 'kun');
});

test('薬局 → 薬 促音化成 やっ', () => {
  const r = align('薬局', 'やっきょく', DICT);
  assert.deepEqual(r.map((x) => x.reading), ['やっ', 'きょく']);
});

test('長讀音優先，にち 不會被 に 之類的短候選截斷', () => {
  const r = align('日曜日', 'にちようび', { ...DICT, 曜: { on: ['ヨウ'], kun: [] } });
  assert.deepEqual(r.map((x) => x.reading), ['にち', 'よう', 'び']);
});

test('對不上時回傳 null（熟字訓）', () => {
  assert.equal(align('今日', 'きょう', { 今: { on: ['コン'], kun: ['いま'] }, 日: DICT['日'] }), null);
});

test('字典沒有該漢字時回傳 null', () => {
  assert.equal(align('龘', 'とう', DICT), null);
});
