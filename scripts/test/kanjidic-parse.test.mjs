import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKanjidic } from '../lib/kanjidic-parse.mjs';

const XML = `<?xml version="1.0"?>
<kanjidic2>
<character><literal>会</literal>
<reading_meaning><rmgroup>
<reading r_type="ja_on">カイ</reading>
<reading r_type="ja_on">エ</reading>
<reading r_type="ja_kun">あ.う</reading>
<reading r_type="pinyin">hui4</reading>
</rmgroup></reading_meaning></character>
<character><literal>日</literal>
<reading_meaning><rmgroup>
<reading r_type="ja_on">ニチ</reading>
<reading r_type="ja_on">ジツ</reading>
<reading r_type="ja_kun">ひ</reading>
<reading r_type="ja_kun">-び</reading>
<reading r_type="ja_kun">-か</reading>
</rmgroup></reading_meaning></character>
<character><literal>龘</literal>
<reading_meaning><rmgroup>
<reading r_type="ja_on">トウ</reading>
</rmgroup></reading_meaning></character>
</kanjidic2>`;

test('只抽出要的漢字', () => {
  const out = parseKanjidic(XML, new Set(['会', '日']));
  assert.deepEqual(Object.keys(out).sort(), ['会', '日']);
});

test('音讀訓讀分開，且排除 pinyin', () => {
  const out = parseKanjidic(XML, new Set(['会']));
  assert.deepEqual(out['会'].on, ['カイ', 'エ']);
  assert.deepEqual(out['会'].kun, ['あ.う']);
});

test('保留 KANJIDIC 的原始格式標記', () => {
  const out = parseKanjidic(XML, new Set(['日']));
  assert.deepEqual(out['日'].kun, ['ひ', '-び', '-か']);
});

test('沒有讀音資料的漢字不會爆炸', () => {
  const out = parseKanjidic('<kanjidic2></kanjidic2>', new Set(['会']));
  assert.deepEqual(out, {});
});
