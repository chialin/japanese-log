# 単語帳（vocab.html）單字索引 — 設計規格

日期：2026-08-19
狀態：待實作

## 目標

解決「學過的單字散在 111 個課程頁裡找不到」的問題。三個核心查找情境：

1. **查單字**：「這個詞學過嗎？在哪一課？」
2. **中文反查日文**：「『冰箱』的日文是哪課教的？」
3. **回顧某段時間**：「8 月學了哪些字？」＋ 做成 Anki 牌組練習

## 總覽

三個新元件，全部照 `build-kanji.mjs` 的既有模式（script 產生、產物 commit、零執行期依賴）：

```
scripts/build-vocab.mjs      ← 掃全站課程頁 → js/vocab-data.js + data/vocab.json
data/vocab-tags.json         ← 單字 tag 對照表（人工維護，git 追蹤）
vocab.html                   ← 單字索引頁（棕橘色票，導覽列第五個入口「單字」）
scripts/build-anki-vocab.py  ← data/vocab.json → anki/*.apkg（月份檔 commit 進 repo）
```

## ① 資料管線 — `scripts/build-vocab.mjs`

### 掃描來源與抽取

掃 `lessons/*.html`（`_skeleton.html` 除外），抽出各卡型的單字：

| 卡型 | 抽取欄位來源 |
|------|------|
| `.word-item` | `.word-ja`（含 ruby 讀音）、`.word-romaji`、`.word-meaning`、`.acc`＋`.acc-note`（重音，選填）、`data-text` |
| `.number-card` | `.number-big`、`.reading-row` 各讀音 |
| `.season-card` / `.extra-item` | 對應的日文／romaji／意思欄位 |
| `.phrase` | `.phrase-ja`、`.phrase-romaji`、`.phrase-meaning`、`data-text` |

每筆記錄欄位：

```json
{
  "text": "本棚",                    // data-text，同時是音檔 hash 的 key
  "ja": "<ruby>本<rt>ほん</rt>棚<rt>だな</rt></ruby>",  // 原始 HTML（含 ruby）
  "kana": "ほんだな",               // 從 rt 串出來的純假名讀音
  "romaji": "hondana",
  "meaning": "書架。書＋棚，連濁 たな→だな",  // 純文字（去掉行內連結標籤）
  "accent": "…",                    // .acc 原始 HTML，沒有就省略
  "kind": "word",                   // word | phrase
  "tags": ["家具", "購物"],          // 來自 vocab-tags.json
  "lessons": [                      // 出現過的課，舊→新；第一筆＝首次教
    {"date": "2026-08-19", "href": "lessons/2026-08-19-hon.html", "title": "本のことば"}
  ]
}
```

### 去重

同一個字在多課出現時（複習、回連），**以 `text`＋`kana` 為 key 合併成一筆**，
`lessons` 列出所有出現的課。首次教的那課代表它的「月份」歸屬。

### Tag 對照表 — `data/vocab-tags.json`

- 結構：`{"本棚": ["買物"], "水曜日": ["時間・日期"], …}`（key＝`text`，一字多 tag）
- **初次實作時把現有全部單字人工分類一輪**（由 Claude 分類、Scarlett 抽查）
- tag 集合約 10–15 個，實作時定案；**命名一律用繁體中文**（不用日文寫法，例如用「購物」不用「買物」）。
  候選：食物、場所、購物、動詞、時間・日期、數字、季節・天氣、家族・人、交通、形容詞、問候・句型…
- `build-vocab.mjs` 掃到 **json 裡沒有的新字就在輸出結尾列出警告**，寫新課程時順手補上——跟「新漢字要跑 fetch-kanjidic」同一種節奏
- `.phrase` 卡自動掛「問候・句型」tag，不必逐句登記

### 產物

- `js/vocab-data.js` — `window.VOCAB_DATA = [...]`，給 vocab.html 用
- `data/vocab.json` — 同一份資料的純 JSON，給 Anki 腳本用
- 兩份都 commit（與 kanji 產物同規則）

## ② 頁面 — `vocab.html`

標題「単語帳」。**專屬色票：小豆／海老茶**（2026-08-19 定案，CLAUDE.md 色票表同步加一列）：

```css
:root{--paper:#fbf3f1;--paper-deep:#f2e0dc;--ink:#2a1412;--ink-soft:#48231f;
--ink-mute:#85524b;--accent:#96504b;--accent-soft:#cfa09b;--accent-pale:#f3ddda;
--line:#e9cbc6;--bg-spot-1:#f9ece8;--bg-spot-2:#f1d9d2;}
```

（與 readings/* 深紅 #8b3a3a 同屬紅系——readings 目前無現存頁面，若日後恢復再調整區隔。）
`index.html` 若要給 vocab 相關卡片加左邊框對照色，用 `--accent:#96504b`。

版面：

- **寬版**：頁內覆寫 `.wrap{max-width:1020px}`（全站其他頁不動）
- **桌機**：左邊卡片牆（`auto-fill minmax(225px,1fr)`）＋右側 200px sticky 側欄
- **手機（≤640px）**：側欄變成搜尋框上方的**收合篩選列**（`<details>`，預設收起，
  summary 顯示目前條件如「篩選：8月 × 買物 ▾」；桌機以 JS 強制展開並隱藏 summary）

### 側欄（上→下）

1. **分類 TAG 雲**：圓 chip＋斜體數量，可換行；點選單選切換（再點取消）
2. **月份清單**：每月一列＋字數；**預設選中最新的月份**（所以初次渲染只有當月的量）
3. **Anki 下載卡**：跟著選中的月份走——選 8月就顯示「⬇ 単語帳 2026-08.apkg」，
   連到 `anki/` 裡預產好的檔；選「全部」時顯示整副 `tango-all.apkg`。
   附說明文字：重複匯入只加新卡、複習進度保留、最後更新日期

### 過濾邏輯

- 搜尋框：同時比對 `text`／`kana`／`romaji`（不分大小寫）／`meaning`，即打即濾
- 月份 × tag × 搜尋字三者為 AND 疊加；結果數顯示在卡片區上方（如「8月 × 買物 — 12 words」）
- 「全部月份」要自己點，避免一進頁就渲染 1100 筆

### 卡片與渲染

- 卡片：右上 tag 徽章、`ja`（ruby）、romaji、意思、（有就顯示）重音標記、
  底部＝首次出處連結＋ `.play-btn`（`JTalk.speak(text, btn, {rate})`，沿用 `js/tts.js`；
  頁面掛 `.speed-control`，預設 1x）
- 出現多課的字，卡片出處顯示首次那課，其餘課數以「＋n」附註（點開卡片不展開、不做 modal，先保持簡單）
- **批次渲染**：任何過濾結果先渲染 60 張，底部哨兵元素進入視口（IntersectionObserver）
  自動補 60，並顯示「已顯示 x / y」；另留一顆「載入更多」按鈕當後備

### 導覽列（全站調整）

導覽列維持四個入口，但成員換血：**文法／漢字／単語／資源**。

- `js/site-chrome.js` 的 `<site-header>`：「多読」移除，改放「単語」（vocab.html），位置緊鄰「漢字」
- 「多読」入口改成 `resources.html` 裡的一張入口卡（連到 tadoku.html，其餘不動；
  tadoku.html 與 tadoku/* 頁面本身不改）
- CLAUDE.md 的導覽列說明同步更新

## ③ Anki — `scripts/build-anki-vocab.py`

- 讀 `data/vocab.json`，用 genanki 產 apkg
- **note type 沿用現有牌組**（build-anki-apkg.py 的格式：正面打讀音、翻面自動發音，
  model id 固定 1607392331），新舊卡片外觀一致
- **guid 穩定**＝hash(`text`＋`kana`)：重複匯入只加新卡、不動舊卡與複習進度；
  同字再出現在新課也不會生成重複卡
- **Anki tags**：每張 note 寫入它的分類 tag ＋月份（`2026-08`）——
  在 Anki 用 Custom Study / `tag:買物` 就能按分類練，補足網頁端不做動態產檔的缺口
- **音檔**直接打包站內 `audio/<sha256-16>.mp3`（同一 hash 規則），不重跑 VOICEVOX。
  新音檔為波音リツ（id=9），與舊牌組つむぎ不同語者，已確認可接受
- `kind: "phrase"` 預設**不進**牌組（整句打字太重），`--include-phrases` 可加回
- 輸出（進 `anki/`、跟課程一起 commit）：
  - `anki/tango-YYYY-MM.apkg` — 每月一檔（牌組名 `単語帳::YYYY-MM`），網頁月份下載卡用
  - `anki/tango-all.apkg` — 整副（含月份子牌組），網頁「全部」時用
- 本機自訂（不 commit、輸出到指定路徑）：`--tag 買物`、`--from 2026-06-01 --to 2026-07-31`

## ④ 工作流整合

新增課程後的步驟變成：`build-kanji.mjs` → `build-vocab.mjs`（新字沒 tag 會警告，補進
`data/vocab-tags.json` 再跑一次）→ `build-anki-vocab.py` → 產物一起 commit。
提供 `scripts/build-all.sh` 一步跑完三個（依序執行，任何一步失敗就中止）。
CLAUDE.md 的「Adding a New Page」章節同步加上這個步驟。

## 不做的事（YAGNI）

- 網頁端動態產 apkg（需要 WASM SQLite＋抓音檔打包，違反零依賴架構）
- 搜尋結果 CSV 匯出（純前端可行，之後有需求再加）
- 全文搜尋（索引顆粒度是單字，不是頁面內文）
- 傳統頁碼（批次渲染取代）
- readings/、tadoku/ 的掃描（多読不教新單字 `data-words="0"`；readings 目前是空目錄）

## 驗收

1. `node scripts/build-vocab.mjs` 跑完，1100± 筆全部有 tag、無警告
2. vocab.html 開站：預設顯示當月；搜「hondana」「ほんだな」「書架」都找得到本棚，點出處連回 8/19 課
3. 手機寬度：篩選列收合／展開正常，卡片單欄
4. 選月份後 Anki 卡連結指向對的檔；apkg 匯入 Anki 出現 `単語帳::YYYY-MM`、卡片帶 tag、發音可播
5. 重複匯入同一 apkg：不產生重複卡、複習進度不動
6. `mockups/` 資料夾刪除
