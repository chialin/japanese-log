---
date: 2026-06-22
updated: 2026-06-26
aliases:
  - Anki 閃卡指南
tags:
  - 日文
  - anki
---

# 🃏 Anki 閃卡製作指南（apkg 打字版）

> 目標：做出「正面看字 → 打讀音 → 翻面看讀音＋意思＋例句＋真人發音」的閃卡，
> 能間隔複習、自動播放發音、無限擴充。屬於 [[2026-06 半年溝通計畫（東京生活版）]]。
>
> **2026-06-26 起改用 apkg 工作流**：不再手動建 note type / 匯入 CSV，
> 改用 [[build-anki-apkg.py]] 一鍵產生「音檔已內嵌、模板已內建」的 `.apkg`，雙擊匯入即用。
>
> **2026-07-11 起搬進 japanese-log repo 的 `anki/` 資料夾**（跟 `assets`、`audio`、`scripts` 平行），
> 環境（venv）跟產出的 `.apkg` 都在同一個地方，不再散落在 chialin_notes。
>
> **同日改成資料驅動、牌組固定**：不再每學一批就開一個新檔案／新牌組。
> 單字改存在 `data/*.csv`（進 git 版控），`decks.json` 給每個牌組固定的 `deck_id`。
> 新單字直接 append 進對應的 CSV，重新產生後匯入 Anki 會**疊加進同一副牌**（genanki 用欄位內容算
> note id，沒改過的舊字對回原本的卡、複習進度不會被洗掉），不用手動合併檔案，也不用擔心牌組越開越多。

---

## 卡片長相（打字版）

- **正面**：只顯示「單字」+ 一個打字欄 → 你輸入讀音（`{{type:讀音}}`）
- **翻面**：自動比對你打的對不對（綠/紅）、顯示 讀音／羅馬／意思／例句，並**自動播放發音**

note type 名稱「**日文單字卡（打字版）**」，6 欄：`單字`、`讀音`、`羅馬`、`意思`、`例句`、`音檔`。
所有用本工作流產的牌組共用同一個 note type（固定 model id），之後改模板一次到位。

---

## 產生 apkg 的步驟

腳本：[[build-anki-apkg.py]]（同資料夾）。發音用 VOICEVOX 離線預生，跟教材同一把女聲
（春日部つむぎ ノーマル，speaker_id=8，峰值正規化 -1.5 dBFS）。

1. **開 VOICEVOX app**（engine 自動上 `:50021`）。沒裝見 [[2026-06 半年溝通計畫（東京生活版）]] 工具區。
2. **建 venv 並裝套件**（只需一次；另需 `brew install ffmpeg`）：
   ```bash
   cd japanese-log/anki
   python3 -m venv venv
   ./venv/bin/pip install -r requirements.txt
   ```
   `venv/` 跟 `audio_cache/` 都在 `.gitignore` 裡，不會進 git——venv 隨時可以照上面指令重建，
   `audio_cache/` 存已經合成過的 mp3（跨牌組、跨次執行沿用，不會重打 VOICEVOX），內容也已經打包進 `.apkg` 裡了。
3. **在 `decks.json` 找到要加字的牌組 key**（目前有 `n5-basic`、`conversation`），把新單字 append 進它對應的
   `data/*.csv`（欄位：`單字,讀音,羅馬,意思,例句,tags`）：
   ```csv
   海老,えび,ebi,蝦子,海老 が すき です。,n5-batch3
   卵,たまご,tamago,蛋,卵 を ふたつ ください。,n5-batch3
   ```
   > 讀音填**假名**（不是漢字）——發音直接用讀音合成，保證唸對。`tags` 用來標來源／日期，
   > 之後在 Anki browser 用 `tag:n5-batch3` 就能篩出這批。`羅馬` 欄在同一個牌組裡要唯一
   > （拿來當音檔檔名跟去重依據），撞名腳本會直接報錯。
   >
   > 開新牌組（新主題）就在 `decks.json` 加一筆新的 key，給一個沒用過的 `deck_id`（隨便一個
   > 8 位數字，不要跟其他牌組重複），`csv` 指到一個新的 `data/*.csv`。
4. **跑**：`./venv/bin/python build-anki-apkg.py <deck-key>`，例如
   `./venv/bin/python build-anki-apkg.py n5-basic` → 產生／覆寫 `<DECK_NAME>.apkg`。
5. **雙擊 .apkg 匯入 Anki**——因為 `deck_id` 固定、note id 是欄位內容算出來的，新字會加進同一副牌，
   舊字對回原本的卡（複習進度不會被洗掉）。音檔已內嵌，不用再裝外掛或自己生音檔。

> 想更省事：直接把新單字丟給 Claude，請它幫你 append 進對應 CSV、跑腳本產 apkg。

---

## 已產出的牌組

| deck key | 牌組 | 內容 | 張數 |
|------|------|------|------|
| — | `momo-fruit.apkg` | 水果攤＋新加坡 Side Menu 照片裡的常用字（桃／税込／訳あり／海老／屋台…，舊工作流產出，尚未搬進資料驅動架構） | 22 |
| `n5-basic` | `日文單字-N5基礎.apkg` | N5 具體名詞，`n5-batch1`（犬／水／學校／駅…）＋`n5-batch2`（家／友達／先生／切符…） | 30 |
| `conversation` | `日文單字-生活會話.apkg` | 會話課裡學到的單字，目前是 `nativecamp-20260710`（出身／どちら／住む／一駅／だけ…），之後其他會話課的新字也會加進這個牌組 | 15 |

---

## 模板細節（要手動調或除錯時看）

腳本內建以下模板，平常不用碰；想自訂字體/顏色再改。

**正面**
```html
<div class="word">{{單字}}</div>
{{type:讀音}}
```

**背面**
```html
{{FrontSide}}
<hr id=answer>
<div class="reading">{{讀音}}</div>
<div class="romaji">{{羅馬}}</div>
<div class="meaning">{{意思}}</div>
{{#例句}}<div class="example">{{例句}}</div>{{/例句}}
<div class="audio">{{音檔}}</div>
```

- `{{type:讀音}}` = 正面打字欄；背面會自動顯示「你打的 vs 正確答案」比對。
- `音檔` 欄填 `[sound:xxx.mp3]`，因為它在**背面**模板 → 翻到答案時自動播放。
- `{{#例句}}…{{/例句}}` = 有例句才顯示、沒填不留空行。

**樣式**沿用 japanese-log 棕色信箋風（`#fdf6f0` 紙、`#c96830` 橘字），完整 CSS 在腳本 `CSS` 變數裡。

---

## 加圖片 🖼️（選配）

note type 沒放圖片欄，想加可在腳本 model 的 `fields` 補 `{{圖片}}`，背面模板加
`{{#圖片}}<div class="pic">{{圖片}}</div>{{/圖片}}`，CSS 補 `.pic img{max-width:220px}`。
圖庫推薦 **いらすとや（irasutoya.com）**：日本免費插畫庫，商用免費、學日文最對味。

---

## （選配）反向卡：看意思說日文

想多練「輸出」可在 model 再加一個 template：正面 `{{意思}}`、背面 `{{單字}}{{讀音}}`，
看中文意思說出日文。單字量起來再加。
