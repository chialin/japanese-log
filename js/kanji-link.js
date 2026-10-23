// js/kanji-link.js
// 課程頁上：① 高頻漢字旁加徽章 ② 頁尾插一行「本課出現的漢字」
// 由 site-chrome.js 動態載入。找不到 KANJI_INDEX 就靜默跳過。
(function () {
  const idx = window.KANJI_INDEX;
  if (!idx) return;

  const HOT = 3;                       // 出現天數門檻
  const prefix = /\/(lessons|readings|tadoku)\//.test(location.pathname) ? '../' : '';
  const isKanji = (ch) => {
    const c = ch.codePointAt(0);
    return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf);
  };
  const link = (ch) => prefix + 'kanji.html#' + encodeURIComponent(ch);

  // ① 徽章：掛在含 ruby 的卡片上
  const CARDS = '.word-item, .turn, .ta-card, .scene, td.col-ja';
  const seenAll = new Set();

  document.querySelectorAll('ruby').forEach((ruby) => {
    const chars = [...ruby.textContent].filter(isKanji);
    chars.forEach((c) => seenAll.add(c));
    const card = ruby.closest(CARDS);
    if (!card) return;
    const hot = [...new Set(chars)].filter((c) => (idx[c] || 0) >= HOT);
    for (const ch of hot) {
      if (card.querySelector(`.kanji-chip[data-kanji="${ch}"]`)) continue;
      const a = document.createElement('a');
      a.className = 'kanji-chip';
      a.dataset.kanji = ch;
      a.href = link(ch);
      a.textContent = `${ch} ×${idx[ch]} →`;
      // 徽章統一收在卡片最後的 .kanji-chips 一整列裡 —— 徽章一多就不會把
      // 日文句子擠成一字一行（卡片是 flex 時靠 flex-basis:100% 自成一列）。
      // 放進卡片的文字欄（block），不要當 flex 卡片的直接子節點 ——
      // 直接掛在 .word-item / .turn 這種 flex row 上會跟日文句子搶寬度。
      // 注意：querySelector 用逗號列多個 selector 時是照「文件順序」挑，不是照列的順序，
      // 所以這裡一個一個試，確保先拿到最內層的文字欄（.scene-text 而不是 flex 的 .scene-body）。
      const BODY = ['.word-content', '.turn-body', '.scene-text', '.scene-body'];
      let body = card;
      for (const sel of BODY) { const el = card.querySelector(sel); if (el) { body = el; break; } }
      let box = body.querySelector(':scope > .kanji-chips');
      if (!box) {
        box = document.createElement('div');
        box.className = 'kanji-chips';
        body.appendChild(box);
      }
      box.appendChild(a);
    }
  });

  // ② 頁尾行 — 只列表裡實際有的字，避免連到 kanji.html#新 卻沒資料
  const seen = [...seenAll].filter((ch) => idx[ch] != null);
  if (seen.length) {
    const list = seen
      .sort((a, b) => (idx[b] || 0) - (idx[a] || 0))
      .map((ch) => `<a href="${link(ch)}">${ch}</a>`)
      .join('・');
    const div = document.createElement('div');
    div.className = 'kanji-footer';
    div.innerHTML = `📚 本課出現的漢字：${list} — ` +
      `<a href="${prefix}kanji.html">到漢字表看它們在別課的用法 →</a>`;
    const footer = document.querySelector('site-footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(div, footer);
  }
})();
