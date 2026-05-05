# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A pure static-HTML Japanese learning log. No build system, no package manager, no dependencies — every file opens directly in a browser. Deployed via GitHub Pages from the `main` branch root.

The learner (Scarlett) is studying from zero, currently on hiragana only (no katakana in lesson content yet). Each lesson page teaches either a 五十音 row (5 kana + vocabulary) or a thematic topic (numbers, seasons, phrases).

## No Build Commands

There is no build, lint, or test step. Development workflow:
- Open HTML files directly in a browser to preview
- `git add . && git commit -m "..." && git push` — GitHub Pages auto-deploys in ~1–2 minutes

## Architecture

### File Structure

```
index.html                    ← Main index with stats, calendar, and lesson list
my-name-katakana.html         ← Special one-off page (name in katakana)
lessons/YYYY-MM-DD-topic.html ← One file per lesson
```

### index.html — How Stats and Calendar Work

Stats (Lessons / Words / Kana) are **computed at runtime from HTML attributes** — there is no separate data file.

Each `<a class="lesson-link">` in `#lesson-list` carries:
- `data-kana="5"` — number of kana taught in that lesson
- `data-words="8"` — number of vocabulary words
- `data-date="2026-05-03"` — ISO date (drives the calendar)

The `<div class="stats" id="stats">` element has `data-kana-base` and `data-words-base` for any kana/words learned before the log started.

The calendar is built dynamically from `data-date` attributes. The script **auto-detects the two most recent months** that contain at least one lesson and renders only those two — no manual update needed when a new month starts.

### Adding a New Lesson

1. Create `lessons/YYYY-MM-DD-topic.html` — copy the closest existing lesson for structure
2. In `index.html`, prepend a new `<li>` to `<ul id="lesson-list">` (newest first):

```html
<li>
  <a class="lesson-link" href="lessons/YYYY-MM-DD-topic.html"
     data-kana="5" data-words="10" data-date="YYYY-MM-DD">
    <div class="lesson-meta">2026 · MAY 6 · WED</div>
    <div class="lesson-title">📝 は行五音 + 單字 <span class="arrow">→</span></div>
    <div class="lesson-summary">は・ひ・ふ・へ・ほ + 單字與句子</div>
  </a>
</li>
```

Stats recalculate automatically. The calendar also updates automatically — no extra steps needed even when lessons spill into a new month.

### TTS — Web Speech API

All audio uses the browser's built-in `speechSynthesis`. No API key needed.

**Voice preference order (female Japanese voices only):**
`Kyoko → O-ren → Hana`

Fallback to any `ja`-lang voice if none of those three are found. Male voice `Otoya` is excluded.

Speed slider: `0.5x` to `1.2x`, default **`0.8x`** (slightly slower for learning).

The standard TTS pattern used across lesson files:
```js
function getJapaneseVoice() {
  const voices = speechSynthesis.getVoices();
  const jaVoices = voices.filter(v => v.lang.startsWith('ja'));
  return (
    jaVoices.find(v => v.name.includes('Kyoko')) ||
    jaVoices.find(v => v.name.includes('O-ren')) ||
    jaVoices.find(v => v.name.includes('Hana'))  ||
    jaVoices[0] || null
  );
}
```

### Design System

**index.html** uses CSS custom properties:
```css
--ink: #1a1a2e
--paper: #faf7f2       /* page background */
--accent: #d63384      /* pink, primary highlight */
--accent-soft: #ffd6e8
--line: #e8e2d5
--muted: #6c757d
```
Fonts: `Noto Serif TC`, `Shippori Mincho`, Georgia (serif, literary feel).

**Lesson pages** use a different, warmer palette (no CSS variables):
- Background: gradient `#fef6e4 → #f3d2c1`
- Navy body text: `#001858`
- Pink accent: `#f582ae`
- Light blue: `#8bd3dd`

Font: system sans-serif (`-apple-system`, `Hiragino Sans`, `Microsoft JhengHei`).

Keep these two visual registers consistent — index = refined/serif, lessons = friendly/sans.

## Content Guidelines

- **Language**: Lesson content is in Traditional Chinese (繁體中文) with Japanese text. UI labels mix Chinese, Japanese, and English naturally.
- **Hiragana only** for all new lesson content — no katakana in lesson body text yet (katakana is only in `my-name-katakana.html`).
- Each 50-on row lesson (行) covers exactly 5 kana with romaji, notable pronunciation tips, vocabulary, and simple sentences using kana learned so far.
- Topic lessons (numbers, seasons, phrases) focus on practical daily use.
