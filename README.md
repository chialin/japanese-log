# 日本語 学習日誌

我的日文學習紀錄。

## 線上瀏覽

部署後會在：`https://你的 GitHub 帳號.github.io/japanese-log/`

## 結構

```
japanese-log/
├── index.html              ← 首頁，列出所有紀錄
├── lessons/
│   ├── 2026-05-02-ashita.html
│   ├── 2026-05-03-numbers.html
│   ├── 2026-05-04-seasons.html
│   └── 2026-05-05-na-row.html
└── README.md
```

## 部署到 GitHub Pages 的步驟

### 1. 建立 GitHub repo

```bash
cd japanese-log
git init
git add .
git commit -m "Initial commit: 日本語学習日誌"
```

到 GitHub 建立新 repo（建議命名 `japanese-log`，public）。

```bash
git remote add origin https://github.com/你的帳號/japanese-log.git
git branch -M main
git push -u origin main
```

### 2. 啟用 GitHub Pages

1. 進入 repo 的 **Settings**
2. 左側選單 **Pages**
3. **Source** 選 `Deploy from a branch`
4. **Branch** 選 `main` / `(root)`
5. 按 **Save**

等 1-2 分鐘，網站就會在 `https://你的帳號.github.io/japanese-log/` 出現。

### 3.（選用）綁定到 chialin.me 子網域

未來想接到 `learn.chialin.me` 或 `japanese.chialin.me`：

1. GitHub Pages 設定頁，**Custom domain** 填入子網域
2. 你的 DNS 服務（看 chialin.me 是哪家）加 CNAME 記錄：
   ```
   japanese.chialin.me → 你的帳號.github.io
   ```
3. 等 DNS 生效（通常 10 分鐘到幾小時）

## 未來怎麼新增紀錄

每天學完，做兩件事：

### 1. 在 `lessons/` 新增 HTML 檔

檔名格式：`YYYY-MM-DD-主題.html`，例如：
- `2026-05-06-ha-row.html`
- `2026-05-07-greetings.html`

可以複製現有的某個 HTML 來改（保持風格一致）。

### 2. 編輯 `index.html` 加入新項目

在 `<ul class="lesson-list">` 最上面（最新的在最上方）插入：

```html
<li>
  <a class="lesson-link" href="lessons/2026-05-06-ha-row.html">
    <div class="lesson-meta">2026 · MAY 6 · WED</div>
    <div class="lesson-title">📝 は行 <span class="arrow">→</span></div>
    <div class="lesson-summary">は・ひ・ふ・へ・ほ + 單字</div>
  </a>
</li>
```

順手把 `<div class="stat-value">` 的數字更新一下。

### 3. push

```bash
git add .
git commit -m "Add: は行五音"
git push
```

1-2 分鐘後線上就更新了。

## 未來升級方向

當每日紀錄穩定之後（例如累積 30+ 篇），可以考慮：

- **改用 Astro**：自動產生月曆/熱力圖/時間軸三視圖
- **整合進 chialin.me 主站**：從個人網站直接連入
- **加上搜尋功能**：找以前學過的單字
- **加上行事曆視圖**：看到自己的 streak

但這些都是 nice-to-have。**最重要的是先持續記錄**——資料格式（每篇一個 HTML 檔）已經穩定，未來搬遷不會痛。

## 設計參考

- 視覺：簡約、生活感，跟 [chialin.me](https://chialin.me) / [blog.chialin.me](https://blog.chialin.me) 同調性
- 字體：Noto Serif TC、Hiragino Sans
- 主色：粉色 `#d63384`、米白 `#faf7f2`
- 發音：用瀏覽器內建的 Web Speech API（不需 API key）

## 想到再寫的反思文章

當有比較多想法時，寫成正式文章發在 [blog.chialin.me](https://blog.chialin.me)，文章裡連回這個學習日誌。
