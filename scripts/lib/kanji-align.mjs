// scripts/lib/kanji-align.mjs
// 把單字的整體讀音切給組成它的各個漢字，並判定每段是音讀還是訓讀。
//
// 做法：對每個漢字取出所有候選讀音（含連濁／促音變化），由長到短嘗試比對
// 讀音字串的前綴，回溯搜尋出一組能完整用完讀音的切法。
// 對不上（熟字訓、含數字的詞）就回傳 null，由呼叫端歸入「その他」。

import { isKanji } from './kanji-scan.mjs';

export function kataToHira(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

const RENDAKU = { か:'が', き:'ぎ', く:'ぐ', け:'げ', こ:'ご', さ:'ざ', し:'じ', す:'ず', せ:'ぜ', そ:'ぞ',
  た:'だ', ち:'ぢ', つ:'づ', て:'で', と:'ど', は:'ば', ひ:'び', ふ:'ぶ', へ:'べ', ほ:'ぼ' };
const HANDAKU = { は:'ぱ', ひ:'ぴ', ふ:'ぷ', へ:'ぺ', ほ:'ぽ' };

/** 一個讀音的所有可能實際形式（原形＋連濁＋半濁＋促音） */
export function readingVariants(r) {
  const out = new Set([r]);
  const first = r[0];
  if (RENDAKU[first]) out.add(RENDAKU[first] + r.slice(1));
  if (HANDAKU[first]) out.add(HANDAKU[first] + r.slice(1));
  if (/[つちくき]$/.test(r)) out.add(r.slice(0, -1) + 'っ');
  return [...out];
}

/** 去掉 KANJIDIC 訓讀標記：'あ.う' → 'あ'、'-び' → 'び' */
const stripKun = (k) => k.replace(/^-/, '').split('.')[0];

function candidates(ch, dict) {
  const entry = dict[ch];
  if (!entry) return [];
  const list = [];
  for (const on of entry.on) for (const v of readingVariants(kataToHira(on))) list.push({ r: v, type: 'on' });
  for (const kun of entry.kun) for (const v of readingVariants(stripKun(kun))) list.push({ r: v, type: 'kun' });
  // 長的先試：避免 にち 被 に 這種短候選先吃掉
  return list.sort((a, b) => b.r.length - a.r.length);
}

/**
 * @returns {Array<{ch:string, reading:string, type:'on'|'kun'|'kana'}> | null}
 */
export function align(base, reading, dict) {
  const chars = [...base];
  const picked = new Array(chars.length);

  function walk(i, pos) {
    if (i === chars.length) return pos === reading.length;
    const ch = chars[i];
    if (!isKanji(ch)) {
      // 送假名／中黏字必須字面吻合
      if (reading.startsWith(ch, pos)) {
        picked[i] = { ch, reading: ch, type: 'kana' };
        return walk(i + 1, pos + ch.length);
      }
      return false;
    }
    for (const c of candidates(ch, dict)) {
      if (!reading.startsWith(c.r, pos)) continue;
      picked[i] = { ch, reading: c.r, type: c.type };
      if (walk(i + 1, pos + c.r.length)) return true;
    }
    return false;
  }

  return walk(0, 0) ? picked.slice() : null;
}
