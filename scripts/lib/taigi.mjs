// scripts/lib/taigi.mjs
// 由日語音讀的韻尾推回中古漢語的入聲／鼻音尾——台語保留了同一套韻尾，
// 所以學習者唸台語就能自我驗證。不查台語辭典（教育部辭典為 CC BY-ND，
// 且學習者本人講台語，唸出來比機器給的拼音可靠）。
//
// 只處理三種明確可判的韻尾。-p（十 じゅう ← 歷史假名 じふ）在現代假名裡
// 跟長音 -ou 無法區分，硬判會出錯，一律不推。

const RULES = [
  { test: /[くき]$/, coda: '-k', mid: '入聲' },
  { test: /[ちつ]$/, coda: '-t', mid: '入聲' },
  { test: /ん$/,     coda: '-n/-ng', mid: '鼻音尾' },
];

/**
 * @param {string[]} onReadings 平假名音讀
 * @returns {{coda:string, kana:string, label:string}|null}
 */
export function taigiHint(onReadings) {
  for (const r of onReadings) {
    for (const rule of RULES) {
      if (rule.test.test(r)) {
        return { coda: rule.coda, kana: r.slice(-1), label: rule.mid };
      }
    }
  }
  return null;
}
