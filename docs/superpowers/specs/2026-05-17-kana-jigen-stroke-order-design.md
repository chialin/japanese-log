# 假名字源 × 筆順 — 設計文件

日期：2026-05-17
類型：japanese-log `lessons/*` 課程頁（棕橘色票，**無 TTS**）

## 目標

新增兩個課程頁，呈現每個假名「從哪個漢字來」以及「怎麼寫（筆順）」：

- `lessons/2026-05-17-hiragana-jigen.html` — 平假名 46 字
- `lessons/2026-05-17-katakana-jigen.html` — 片假名 46 字

兩頁結構完全一致，只差資料與互跳方向。

## 範圍

- 每頁 46 字（あ〜ん／ア〜ン，含 を／ヲ、ん／ン）。
- 筆順：靜態編號 SVG（不動畫），由 KanjiVG 原檔提供（內含描邊路徑＋筆順編號）。
- 不含 TTS：不放 `speed-control`、不載 `../js/tts.js`、無 `speak()`、無 `data-text`。
- 不新增可計數 kana：`index.html` 兩個 `<li>` 皆 `data-kana="0" data-words="0"`（概念回顧頁，與既有 `2026-05-04-kana.html` 一致，避免灌水 stats）。

## 資料來源：KanjiVG

- 來源：KanjiVG（https://kanjivg.tagaini.net/），授權 **CC-BY-SA 3.0**。
- 取得方式：依 Unicode 碼點命名下載原始 SVG（例：あ U+3042 → `03042.svg`；ア U+30A2 → `030a2.svg`），檔名為 5 位小寫 hex。
- 一次性下載 92 個檔案，存放於 `assets/kanjivg/`（commit 進 repo）。**執行期純靜態、零外部依賴**，符合專案「每個檔案可直接在瀏覽器開」的規範。
- KanjiVG 原檔已含筆順編號 `<text>` 群組，直接 `<img>` 或 inline 引用即可顯示帶 ①②③ 的描邊圖。
- 頁尾須標註出處與授權（CC-BY-SA 3.0 + 連結），滿足 attribution + share-alike。

### 取得腳本

新增 `scripts/fetch-kanjivg.mjs`：讀下方字源表中的目標假名清單 → 算 Unicode 碼點 → 從 KanjiVG GitHub raw（`https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/<code>.svg`）下載 → 存 `assets/kanjivg/<kana>.svg`。一次性執行，產物 commit；非執行期依賴。

## 字源資料（寫死於頁面）

平假名（取漢字草書整體）：
あ←安 い←以 う←宇 え←衣 お←於 / か←加 き←幾 く←久 け←計 こ←己 / さ←左 し←之 す←寸 せ←世 そ←曽 / た←太 ち←知 つ←川 て←天 と←止 / な←奈 に←仁 ぬ←奴 ね←祢 の←乃 / は←波 ひ←比 ふ←不 へ←部 ほ←保 / ま←末 み←美 む←武 め←女 も←毛 / や←也 ゆ←由 よ←与 / ら←良 り←利 る←留 れ←礼 ろ←呂 / わ←和 を←遠 / ん←无

片假名（取漢字部件）：
ア←阿 イ←伊 ウ←宇 エ←江 オ←於 / カ←加 キ←幾 ク←久 ケ←介 コ←己 / サ←散 シ←之 ス←須 セ←世 ソ←曽 / タ←多 チ←千 ツ←川 テ←天 ト←止 / ナ←奈 ニ←二 ヌ←奴 ネ←祢 ノ←乃 / ハ←八 ヒ←比 フ←不 ヘ←部 ホ←保 / マ←末 ミ←三 ム←牟 メ←女 モ←毛 / ヤ←也 ユ←由 ヨ←与 / ラ←良 リ←利 ル←流 レ←礼 ロ←呂 / ワ←和 ヲ←乎 / ン←尔

「同源」判定：平假名與片假名取自**同一個漢字**者，共 31 組（宇・於・加・幾・久・己・之・世・曽・川・天・止・奈・奴・祢・乃・比・不・部・保・末・女・毛・也・由・与・良・利・礼・呂・和）→ 該列備註欄加「同源」標籤。本判定由程式以「同羅馬拼音、平假名來源 === 片假名來源」自動算出。

## 頁面版面（兩頁共用）

複製既有概念頁樣式來源：`lessons/2026-05-04-kana.html`（`.card` / `.compare-table` / `.tag-hira` / `.tag-kata` / `.footer`）。`:root` 棕橘色票照 `_skeleton.html` 寫死，不改。

由上到下：

1. `back-link` → `../index.html`
2. `masthead`：左「文字解說 · Kana」／中「今 日 の 学 習」／右「2026 / 05 / 17」
3. `page-title`：平假名頁 `平假名 字<span class="accent">源</span>`；片假名頁 `片假名 字<span class="accent">源</span>`。`page-subtitle`：一句話說明（從哪個漢字來、怎麼寫）
4. `.tip` callout：平假名＝整字草書化、片假名＝取漢字一個部件
5. **divider 一、字源 × 筆順對應表**
   - `.compare-table`，欄位：`音 ｜ 假名 ｜ ← 字源 ｜ 筆順 ｜ 備註`
     - 音：羅馬拼音（a / ka …）
     - 假名：大字（沿用 `.ex-hira` 或 `.ex-kata` 風格的大字色）
     - 字源：來源漢字（大字）
     - 筆順：`<img class="stroke" src="../assets/kanjivg/<kana>.svg" alt="<kana> 筆順" loading="lazy">`，固定寬高（約 64–80px）
     - 備註：同源者 `<span class="tag-...">同源</span>`，其餘留白或補一句形狀提示
   - 依行分組：每組前一列 group header（淺底＋行名「あ行」…），共 11 組
6. **divider 二、為什麼長這樣**：`.card`，說明草書化／取偏旁，列好記例子（平假名頁：あ←安、お←於 的草書脈絡；片假名頁：カ←加的「力」、ハ←八、ミ←三、ネ←禰的「示」）
7. **divider 三、歷史脈絡**：`.card`，平安時代成形；平假名＝宮廷女性「女手」、片假名＝僧侶漢文訓讀行間速記
8. `.next-link`：平假名頁 → 片假名頁；片假名頁 → 平假名頁
9. `.footer`：回首頁連結 ＋ 日期 ＋ KanjiVG 出處與授權標註

## 新增 CSS（兩頁各自 `<style>` 內，僅本頁需要的）

- `.stroke`：筆順 SVG 圖固定尺寸、置中、淺色邊框或無框；`background:#fff` 確保描邊可見。
- group header 列樣式（沿用 `compare-table` thead 風格的淡化版，或 `tag-` 風格底色）。
- 其餘（`.card` / `.compare-table` / `.tag-hira` / `.tag-kata` / `.footer`）直接從 `2026-05-04-kana.html` 複製。

## index.html 變更

`<ul id="lesson-list">` 開頭插入兩個 `<li>`（片假名在上、平假名在下，皆 2026-05-17，新→舊；同日順序讓片假名字源排最前）：

```html
<li>
  <a class="lesson-link" href="lessons/2026-05-17-katakana-jigen.html"
     data-kana="0" data-words="0" data-date="2026-05-17">
    <div class="lesson-meta">2026 · May 17 · Sun · Lesson</div>
    <div class="lesson-title">片假名 字源 × 筆順 <span class="arrow">→</span></div>
    <div class="lesson-summary">每個片假名來自哪個漢字部件 ＋ 筆順</div>
  </a>
</li>
<li>
  <a class="lesson-link" href="lessons/2026-05-17-hiragana-jigen.html"
     data-kana="0" data-words="0" data-date="2026-05-17">
    <div class="lesson-meta">2026 · May 17 · Sun · Lesson</div>
    <div class="lesson-title">平假名 字源 × 筆順 <span class="arrow">→</span></div>
    <div class="lesson-summary">每個平假名來自哪個漢字草書 ＋ 筆順</div>
  </a>
</li>
```

## 交付物

1. `scripts/fetch-kanjivg.mjs`（一次性抓圖腳本）
2. `assets/kanjivg/*.svg`（92 檔）
3. `lessons/2026-05-17-hiragana-jigen.html`
4. `lessons/2026-05-17-katakana-jigen.html`
5. `index.html`（插入兩 `<li>`）

## 驗證

- 兩頁直接以瀏覽器開啟，無 console error，無外部網路請求（圖皆走本地相對路徑）。
- 92 個 SVG 全部正確顯示，描邊與筆順編號清晰。
- 字源對應表 46 列正確、依行分組、同源標籤正確。
- `index.html` stats 不因新頁變動（`data-kana=0`、`data-words=0`）；calendar 出現 2026-05-17。
- 兩頁 `.next-link` 互跳路徑正確。

## 非目標（YAGNI）

- 不做筆順動畫。
- 不做 TTS／發音。
- 不為濁音／半濁音／拗音／長音加字源（僅 46 基本字）。
- 不改 `shared.css`、不改既有頁面（除 `index.html` 插入）。
