#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
日文單字卡 → Anki .apkg 產生器（打字版、資料驅動）

每張卡：
  正面＝只顯示「單字」+ 打字欄（輸入讀音）
  翻面＝讀音 / 羅馬 / 意思 / 例句 + 自動播放發音

發音用 VOICEVOX 離線預生（speaker_id=8 春日部つむぎ ノーマル），
兩段式峰值正規化 -1.5 dBFS，與 japanese-log 教材同一把女聲。

── 用法 ──────────────────────────────────────────
1. 開 VOICEVOX app（engine 會自動上 http://127.0.0.1:50021）
2. 建 venv 並裝套件（只需一次；另需系統有 ffmpeg：brew install ffmpeg）：
     python3 -m venv venv
     ./venv/bin/pip install -r requirements.txt
3. 在 decks.json 裡的某個牌組對應的 data/*.csv 加新單字（欄位：單字,讀音,羅馬,意思,例句,tags）
4. 跑：  ./venv/bin/python build-anki-apkg.py <deck-key>
   例：  ./venv/bin/python build-anki-apkg.py n5-basic
5. 雙擊產生的 .apkg 匯入 Anki

**牌組是累加的，不是一次性檔案**：decks.json 裡每個牌組的 deck_id 固定不變，
CSV 只會越加越長。重新產生後再匯入 Anki，genanki 會用欄位內容算出穩定的 note id，
沒改過的舊字會直接對應到原本的卡（複習進度不會被洗掉），新加的字才會變成新卡。
音檔會存進 audio_cache/（gitignore，不進版控），已經合成過的字不會重新打 VOICEVOX，
只有新字才會呼叫引擎，重跑很快。

note type 用固定 model id 1607392331（名稱「日文單字卡（打字版）」），
所有用本腳本產的牌組都會歸到同一個 note type，方便統一改模板。
"""
import json, subprocess, tempfile, os, re, csv, sys, urllib.request, urllib.parse
import genanki
from jp_model import build_model

ENGINE = "http://127.0.0.1:50021"
SPEAKER = 8
PEAK_TARGET_DB = -1.5
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_CACHE = os.path.join(ROOT_DIR, "audio_cache")
os.makedirs(AUDIO_CACHE, exist_ok=True)

def post_json(url, payload=None):
    data = json.dumps(payload).encode() if payload is not None else b""
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    return urllib.request.urlopen(req, timeout=30)

def synth(reading):
    """用讀音(kana)合成保證發音正確；短字降 intonation、放慢，同 generate-audio.mjs。"""
    is_short = len(reading) <= 4 and " " not in reading
    text = reading + "。" if is_short else reading
    speed = 1.0
    if " " not in reading:
        if len(reading) == 2: speed = 0.7
        elif len(reading) <= 4: speed = 0.85
    q = json.loads(post_json(
        f"{ENGINE}/audio_query?text={urllib.parse.quote(text)}&speaker={SPEAKER}").read())
    q["speedScale"] = speed
    q["volumeScale"] = 1.0
    q["prePhonemeLength"] = 0.3
    q["postPhonemeLength"] = 0.3
    if is_short:
        q["intonationScale"] = 0.5
    return post_json(f"{ENGINE}/synthesis?speaker={SPEAKER}", q).read()

def wav_to_mp3(wav, out_path):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(wav); tmp = f.name
    try:
        det = subprocess.run(["ffmpeg", "-loglevel", "info", "-i", tmp,
                              "-af", "volumedetect", "-f", "null", "-"],
                             capture_output=True, text=True)
        m = re.search(r"max_volume:\s*(-?[\d.]+) dB", det.stderr)
        gain = round(PEAK_TARGET_DB - (float(m.group(1)) if m else -1.5), 2)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp,
                        "-af", f"volume={gain}dB",
                        "-codec:a", "libmp3lame", "-b:a", "128k", out_path], check=True)
    finally:
        os.unlink(tmp)


def load_words(csv_path):
    with open(csv_path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    seen = {}
    for r in rows:
        if r["羅馬"] in seen and seen[r["羅馬"]] != r["單字"]:
            raise SystemExit(f"羅馬欄撞名：{r['羅馬']}（{seen[r['羅馬']]} vs {r['單字']}）")
        seen[r["羅馬"]] = r["單字"]
    return rows

def main():
    if len(sys.argv) != 2:
        sys.exit("用法：./venv/bin/python build-anki-apkg.py <deck-key>\n"
                  "deck-key 見 decks.json，例如 n5-basic / conversation")
    key = sys.argv[1]
    with open(os.path.join(ROOT_DIR, "decks.json"), encoding="utf-8") as f:
        decks = json.load(f)
    if key not in decks:
        sys.exit(f"找不到牌組 '{key}'，decks.json 裡有：{', '.join(decks)}")
    cfg = decks[key]
    deck_name, deck_id, file_prefix = cfg["deck_name"], cfg["deck_id"], cfg["file_prefix"]
    words = load_words(os.path.join(ROOT_DIR, cfg["csv"]))

    print(f"🎙  生成發音 (VOICEVOX speaker={SPEAKER})...")
    media, cached, generated = [], 0, 0
    for w in words:
        mp3 = os.path.join(AUDIO_CACHE, f"{file_prefix}_{w['羅馬']}.mp3")
        if os.path.exists(mp3):
            cached += 1
        else:
            wav_to_mp3(synth(w["讀音"]), mp3)
            generated += 1
            print(f"   ✓ {w['單字']} → {os.path.basename(mp3)}")
        media.append(mp3)

    model = build_model()
    deck = genanki.Deck(deck_id, deck_name)
    for w in words:
        deck.add_note(genanki.Note(
            model=model,
            fields=[w["單字"], w["讀音"], w["羅馬"], w["意思"], w["例句"],
                    f"[sound:{file_prefix}_{w['羅馬']}.mp3]"],
            tags=w["tags"].split()))

    pkg = genanki.Package(deck); pkg.media_files = media
    out = os.path.join(ROOT_DIR, f"{deck_name.replace('｜','-')}.apkg")
    pkg.write_to_file(out)
    print(f"\n✅ 完成：{out}\n   {len(words)} 張卡（{generated} 個新音檔、{cached} 個沿用快取）")

if __name__ == "__main__":
    main()
