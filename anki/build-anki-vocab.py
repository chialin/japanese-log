#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
data/vocab.json → Anki 牌組（単語帳）

預設（無參數）：每月一檔 anki/tango-YYYY-MM.apkg ＋ 整副 anki/tango-all.apkg，
全部 commit 進 repo，vocab.html 的下載卡直連。

- note guid = guid_for(text, kana)：重複匯入只加新卡、複習進度保留
- 月份 deck：単語帳::YYYY-MM（deck id = 1699000000 + YYYYMM，固定不變）
- 每張 note 帶 tags：分類 tag（空白換成底線）＋月份（2026-08）
- 音檔直接用站內 audio/<sha256(text)[:16]>.mp3（波音リツ），缺檔留空並警告
- kind=phrase 預設不收，--include-phrases 加回
- 自訂輸出（不 commit）：--tag 購物 / --from 2026-06-01 --to 2026-07-31，需搭 --out x.apkg

用法：cd anki && ./venv/bin/python build-anki-vocab.py [選項]
"""
import argparse, hashlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import genanki
from jp_model import build_model

ANKI_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(ANKI_DIR)
DECK_BASE = 1699000000

def audio_of(text):
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    path = os.path.join(ROOT, "audio", h + ".mp3")
    return (path, h + ".mp3") if os.path.exists(path) else (None, None)

def month_of(w):
    return w["lessons"][0]["date"][:7]

def note_for(w, model):
    path, fname = audio_of(w["text"])
    tags = [t.replace(" ", "_") for t in w["tags"]] + [month_of(w)]
    note = genanki.Note(
        model=model,
        fields=[w["text"], w["kana"], w["romaji"], w["meaning"], "",
                f"[sound:{fname}]" if fname else ""],
        tags=tags,
        guid=genanki.guid_for(w["text"], w["kana"]),
    )
    return note, path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--include-phrases", action="store_true")
    ap.add_argument("--tag")
    ap.add_argument("--from", dest="date_from")
    ap.add_argument("--to", dest="date_to")
    ap.add_argument("--out")
    args = ap.parse_args()

    with open(os.path.join(ROOT, "data", "vocab.json"), encoding="utf-8") as f:
        words = json.load(f)["words"]
    if not args.include_phrases:
        words = [w for w in words if w["kind"] == "word"]

    model = build_model()
    custom = args.tag or args.date_from or args.date_to
    if custom:
        if not args.out:
            sys.exit("自訂範圍請搭配 --out 輸出路徑")
        if args.tag:
            words = [w for w in words if args.tag in w["tags"]]
        if args.date_from:
            words = [w for w in words if w["lessons"][0]["date"] >= args.date_from]
        if args.date_to:
            words = [w for w in words if w["lessons"][0]["date"] <= args.date_to]
        deck = genanki.Deck(DECK_BASE + 999999, "単語帳::カスタム")
        media, missing = [], 0
        for w in words:
            note, path = note_for(w, model)
            deck.add_note(note)
            if path: media.append(path)
            else: missing += 1
        pkg = genanki.Package(deck); pkg.media_files = media
        pkg.write_to_file(args.out)
        print(f"✅ {args.out}：{len(words)} 張卡（缺音檔 {missing}）")
        return

    by_month = {}
    for w in words:
        by_month.setdefault(month_of(w), []).append(w)

    all_decks, all_media, missing = [], [], []
    for month in sorted(by_month):
        deck = genanki.Deck(DECK_BASE + int(month.replace("-", "")),
                            f"単語帳::{month}")
        media = []
        for w in by_month[month]:
            note, path = note_for(w, model)
            deck.add_note(note)
            if path: media.append(path)
            else: missing.append(w["text"])
        pkg = genanki.Package(deck); pkg.media_files = media
        out = os.path.join(ANKI_DIR, f"tango-{month}.apkg")
        pkg.write_to_file(out)
        print(f"  ✓ tango-{month}.apkg  {len(by_month[month])} 張")
        all_decks.append(deck); all_media.extend(media)

    pkg = genanki.Package(all_decks); pkg.media_files = all_media
    pkg.write_to_file(os.path.join(ANKI_DIR, "tango-all.apkg"))
    print(f"✅ tango-all.apkg  共 {len(words)} 張卡、{len(by_month)} 個月")
    if missing:
        print(f"⚠️  {len(missing)} 個字沒有對應 mp3（音檔欄留空）："
              + "、".join(missing[:20]) + ("…" if len(missing) > 20 else ""))

if __name__ == "__main__":
    main()
