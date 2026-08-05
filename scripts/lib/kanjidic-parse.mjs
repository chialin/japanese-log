// scripts/lib/kanjidic-parse.mjs
// 從 KANJIDIC2 XML 抽出指定漢字的音讀／訓讀。
// 用正規表示式而非 XML parser——Node 沒有內建 XML parser，
// 而 KANJIDIC2 的結構夠規律（每個 <character> 獨立、無巢狀同名標籤）。

/**
 * @param {string} xmlText KANJIDIC2 全文
 * @param {Set<string>} wanted 只抽這些漢字
 * @returns {Record<string, {on: string[], kun: string[]}>}
 */
export function parseKanjidic(xmlText, wanted) {
  const out = {};
  const charRe = /<character>([\s\S]*?)<\/character>/g;
  let m;
  while ((m = charRe.exec(xmlText)) !== null) {
    const body = m[1];
    const lit = /<literal>(.)<\/literal>/.exec(body);
    if (!lit || !wanted.has(lit[1])) continue;
    const pick = (type) =>
      [...body.matchAll(new RegExp(`<reading r_type="${type}">([^<]+)</reading>`, 'g'))]
        .map((r) => r[1]);
    const on = pick('ja_on');
    const kun = pick('ja_kun');
    if (on.length === 0 && kun.length === 0) continue;
    out[lit[1]] = { on, kun };
  }
  return out;
}
