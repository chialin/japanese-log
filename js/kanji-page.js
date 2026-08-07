// js/kanji-page.js — 漢字索引頁的互動：篩選、點字展開、hash 深連結
(function () {
  const data = window.KANJI_DATA;
  const grid = document.getElementById('kanji-grid');
  const detail = document.getElementById('kanji-detail');
  if (!data || !grid || !detail) return;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 同一課裡同一個詞出現多次時，timeline 會有重複的 (d, f, w) 三元組，
  // 這裡依首次出現順序去重，避免時間軸重複顯示同一列。
  function dedupTimeline(timeline) {
    const seen = new Set();
    const out = [];
    for (const t of timeline) {
      const key = t.d + '|' + t.f + '|' + t.w;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
    return out;
  }

  function branchRows(map, kind) {
    return Object.entries(map).map(([r, words]) =>
      `<div class="kbranch ${kind}"><span class="kb-rd">${esc(r)}</span>` +
      `<span class="kb-words">${words.map(esc).join('・')}</span></div>`
    ).join('');
  }

  function taigiCard(ch, e) {
    if (!e.taigi) return '';
    const same = Object.entries(data)
      .filter(([c, x]) => c !== ch && x.taigi && x.taigi.coda === e.taigi.coda)
      .slice(0, 4).map(([c]) => c).join('・');
    return `<div class="mnemonic">🧠 <strong>台語線索</strong><br>` +
      `音讀收 <strong>${esc(e.taigi.kana)}</strong> → 中古${esc(e.taigi.label)} ` +
      `<strong>${esc(e.taigi.coda)}</strong> → 台語也收 <strong>${esc(e.taigi.coda)}</strong>，唸唸看。` +
      (same ? `<br>同款收 ${esc(e.taigi.coda)} 的字：${esc(same)}` : '') + `</div>`;
  }

  function renderMissing(ch) {
    detail.innerHTML =
      `<div class="kcard">
        <div class="khead"><div class="kbig">${esc(ch)}</div></div>
        <p>這個字還不在表裡（可能是剛寫的新課還沒跑 <code>node scripts/build-kanji.mjs</code>）。</p>
      </div>`;
    grid.querySelectorAll('.kanji-tile').forEach((b) => b.classList.remove('on'));
  }

  function render(ch) {
    const e = data[ch];
    if (!e) return;
    const tags = [];
    if (e.days >= 3) tags.push('高頻');
    if (e.multi) tags.push('多音字');
    if (!e.multi && Object.keys(e.on).length === 1) tags.push('單一音讀');

    const timeline = dedupTimeline(e.timeline);

    detail.innerHTML =
      `<div class="kcard">
        <div class="khead">
          <div class="kbig">${esc(ch)}</div>
          <div class="kmeta">
            <div>${tags.map((t) => `<span class="ktag">${t}</span>`).join(' ')}</div>
            <div class="kcount">遇過 ${e.days} 天${Object.keys(e.on).length + Object.keys(e.kun).length ? ` · ${Object.keys(e.on).length + Object.keys(e.kun).length} 種讀音` : ''}</div>
          </div>
        </div>
        ${Object.keys(e.on).length ? `<div class="klbl">— 音讀 · On —</div>${branchRows(e.on, 'on')}` : ''}
        ${Object.keys(e.kun).length ? `<div class="klbl">— 訓讀 · Kun —</div>${branchRows(e.kun, 'kun')}` : ''}
        ${e.other.length ? `<div class="klbl">— 其他（拆不開的讀法）—</div>
          <div class="kbranch other"><span class="kb-words">${e.other.map(esc).join('・')}</span></div>` : ''}
        <div class="klbl">— 你遇到它的順序 —</div>
        <div class="ktimeline">${timeline.map((t) =>
          `<div class="kev"><span class="kev-d">${esc(t.d.slice(5).replace('-', '/'))}</span>` +
          `<a href="${esc(t.f)}">${esc(t.t || t.f)}</a> — ${esc(t.w)}</div>`).join('')}</div>
        ${taigiCard(ch, e)}
      </div>`;

    grid.querySelectorAll('.kanji-tile').forEach((b) =>
      b.classList.toggle('on', b.dataset.kanji === ch));
  }

  grid.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.kanji-tile');
    if (!btn) return;
    const ch = btn.dataset.kanji;
    render(ch);
    try { history.replaceState(null, '', '#' + encodeURIComponent(ch)); } catch {}
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.querySelectorAll('.kanji-filter').forEach((f) => {
    f.addEventListener('click', () => {
      document.querySelectorAll('.kanji-filter').forEach((x) => x.classList.remove('on'));
      f.classList.add('on');
      const key = f.dataset.filter;
      grid.querySelectorAll('.kanji-tile').forEach((t) => {
        const show =
          key === 'all' ? true :
          key === 'hot' ? Number(t.dataset.days) >= 3 :
          key === 'multi' ? t.dataset.multi === '1' :
          t.dataset.taigi === '1';
        t.classList.toggle('filtered-out', !show);
      });
    });
  });

  const fromHash = decodeURIComponent(location.hash.slice(1));
  const first = grid.querySelector('.kanji-tile');
  if (fromHash && data[fromHash]) {
    render(fromHash);
    detail.scrollIntoView({ block: 'start' });
  } else if (fromHash) {
    renderMissing(fromHash);
    detail.scrollIntoView({ block: 'start' });
  } else {
    render(first && first.dataset.kanji);
  }
})();
