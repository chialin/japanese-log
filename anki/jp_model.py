# -*- coding: utf-8 -*-
"""
日文單字卡（打字版）— 共用 note type（兩支產生器共用）

model id 固定 1607392331：所有牌組同一 note type，模板改一處就好。
"""
import genanki

CSS = """
.card { font-family: "Hiragino Mincho ProN", "YuMincho", serif; text-align: center;
        background: #fdf6f0; color: #3a2e26; padding: 24px; }
.word    { font-size: 64px; font-weight: 600; }
.reading { font-size: 28px; color: #c96830; margin-top: 10px; }
.romaji  { font-size: 18px; font-style: italic; color: #9a8c80; }
.meaning { font-size: 24px; margin-top: 10px; }
.example { font-size: 20px; margin-top: 14px; color: #5a4a3e; }
.audio   { margin-top: 14px; }
hr#answer{ border: none; border-top: 1px solid #e5d5c5; margin: 18px 0; }
input    { font-size: 24px; text-align: center; font-family: inherit; }
"""
FRONT = '<div class="word">{{單字}}</div>\n{{type:讀音}}\n'
BACK = ('{{FrontSide}}\n<hr id=answer>\n'
        '<div class="reading">{{讀音}}</div>\n'
        '<div class="romaji">{{羅馬}}</div>\n'
        '<div class="meaning">{{意思}}</div>\n'
        '{{#例句}}<div class="example">{{例句}}</div>{{/例句}}\n'
        '<div class="audio">{{音檔}}</div>\n')

def build_model():
    return genanki.Model(
        1607392331, "日文單字卡（打字版）",
        fields=[{"name": "單字"}, {"name": "讀音"}, {"name": "羅馬"},
                {"name": "意思"}, {"name": "例句"}, {"name": "音檔"}],
        templates=[{"name": "看字→打讀音", "qfmt": FRONT, "afmt": BACK}],
        css=CSS,
    )
