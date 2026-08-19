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

test('mergeWords：同課同字兩筆 → lessons 去重', () => {
  const L = (date, href = `lessons/${date}-x.html`) => ({ date, href, title: 'x' });
  const rec = (text, date, href) => ({
    text, ja: text, kana: text, romaji: 'x', meaning: 'x', kind: 'word', lesson: L(date, href),
  });
  // 同課（2026-05-04）的はい出現兩次（單字區＋例句區）
  const words = mergeWords([
    rec('はい', '2026-05-04', 'lessons/2026-05-04-ha-row.html'),
    rec('はい', '2026-05-04', 'lessons/2026-05-04-ha-row.html'),
  ]);
  assert.equal(words.length, 1);
  assert.equal(words[0].lessons.length, 1); // 去重後只有一筆
  assert.equal(words[0].lessons[0].date, '2026-05-04');
});
