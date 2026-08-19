import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeWords } from '../build-vocab.mjs';

test('mergeWords：同字多課合併、lessons 舊→新、整體新→舊', () => {
  const L = (date) => ({ date, href: `lessons/${date}-x.html`, title: 'x' });
  const rec = (text, date) => ({
    text, ja: text, kana: text, romaji: 'x', meaning: 'x', kind: 'word', lesson: L(date),
  });
  const words = mergeWords([
    rec('棚', '2026-08-18'), rec('山', '2026-08-07'), rec('棚', '2026-08-19'),
  ]);
  assert.equal(words.length, 2);
  assert.equal(words[0].text, '棚'); // 首課 8/18 比 山 8/07 新 → 排前面
  assert.deepEqual(words[0].lessons.map((l) => l.date), ['2026-08-18', '2026-08-19']);
});
