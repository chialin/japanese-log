#!/bin/sh
# 新增課程後一步跑完：漢字索引 → 單字索引 → 書的翻頁資料 → 記憶小撇步頁（任一步失敗就中止）
set -e
cd "$(dirname "$0")/.."
node scripts/build-kanji.mjs
node scripts/build-vocab.mjs
node scripts/build-book.mjs
node scripts/build-kioku.mjs
