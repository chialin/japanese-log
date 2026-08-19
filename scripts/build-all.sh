#!/bin/sh
# 新增課程後一步跑完：漢字索引 → 單字索引 → Anki 牌組（任一步失敗就中止）
set -e
cd "$(dirname "$0")/.."
node scripts/build-kanji.mjs
node scripts/build-vocab.mjs
anki/venv/bin/python anki/build-anki-vocab.py
