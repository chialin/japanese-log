import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taigiHint } from '../lib/taigi.mjs';

test('收 く／き → 入聲 -k', () => {
  const h = taigiHint(['きょく']);
  assert.equal(h.coda, '-k');
  assert.equal(h.kana, 'く');
});

test('收 ち／つ → 入聲 -t', () => {
  assert.equal(taigiHint(['にち']).coda, '-t');
  assert.equal(taigiHint(['いち']).coda, '-t');
});

test('收 ん → 鼻音尾', () => {
  const h = taigiHint(['でん']);
  assert.equal(h.coda, '-n/-ng');
});

test('多個音讀時取第一個推得出的', () => {
  assert.equal(taigiHint(['かい', 'やく']).coda, '-k');
});

test('開音節推不出線索', () => {
  assert.equal(taigiHint(['かい']), null);
  assert.equal(taigiHint(['わ']), null);
});

test('沒有音讀時回傳 null', () => {
  assert.equal(taigiHint([]), null);
});

test('不誤判 -p（じゅう 與長音無法區分，一律不推）', () => {
  assert.equal(taigiHint(['じゅう']), null);
  assert.equal(taigiHint(['こう']), null);
});
