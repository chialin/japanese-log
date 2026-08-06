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
  const CARDS = '.word-item, .turn, .ta-card, .scene';
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
      const btn = card.querySelector('.play-btn');
      // btn 不一定是 card 的直接子節點（例如 .scene 的 .play-btn 包在 .scene-body 裡），
      // insertBefore 只認直接子節點，所以插入點要用 btn 實際的 parentNode。
      const target = btn ? btn.parentNode : card;
      target.insertBefore(a, btn || null);
    }
  });

  // ② 頁尾行
  if (seenAll.size) {
    const list = [...seenAll]
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
