// scripts/lib/kanji-build.mjs
// 把掃描結果 + KANJIDIC 子集，整理成「一個漢字一筆」的資料結構。

import { isKanji } from './kanji-scan.mjs';
import { align, kataToHira } from './kanji-align.mjs';
import { taigiHint } from './taigi.mjs';

const pushUnique = (arr, v) => { if (!arr.includes(v)) arr.push(v); };

export function buildKanjiData(records, dict) {
  /** @type {Record<string, any>} */
  const out = {};
  const dayseen = {}; // 漢字 → Set<date>

  const ensure = (ch) => {
    if (!out[ch]) {
      out[ch] = { days: 0, on: {}, kun: {}, other: [], taigi: null, multi: false, timeline: [] };
      dayseen[ch] = new Set();
    }
    return out[ch];
  };

  for (const rec of records) {
    const seg = align(rec.base, rec.reading, dict);
    const chars = [...rec.base].filter(isKanji);
    if (chars.length === 0) continue;

    if (seg) {
      for (const s of seg) {
        if (!isKanji(s.ch)) continue;
        const e = ensure(s.ch);
        const bucket = s.type === 'on' ? e.on : e.kun;
        if (!bucket[s.reading]) bucket[s.reading] = [];
        pushUnique(bucket[s.reading], rec.base);
      }
    } else {
      for (const ch of chars) pushUnique(ensure(ch).other, rec.base);
    }

    for (const ch of chars) {
      const e = ensure(ch);
      dayseen[ch].add(rec.date);
      e.timeline.push({ d: rec.date, f: rec.file, t: rec.title, w: rec.base });
    }
  }

  for (const [ch, e] of Object.entries(out)) {
    e.days = dayseen[ch].size;
    e.multi = Object.keys(e.on).length + Object.keys(e.kun).length >= 2;
    const onFromDict = (dict[ch]?.on ?? []).map(kataToHira);
    e.taigi = taigiHint(onFromDict);
    e.timeline.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  }
  return out;
}
