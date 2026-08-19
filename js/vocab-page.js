// js/vocab-page.js — 単語帳的過濾與渲染（資料來自 vocab-data.js）
(function () {
  const D = window.VOCAB_DATA || [];
  const BATCH = 60;
  const monthOf = (w) => w.lessons[0].date.slice(0, 7);
  const months = [...new Set(D.map(monthOf))].sort().reverse();
  const tagCount = {};
  D.forEach((w) => w.tags.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));

  const state = { q: '', tag: null, month: months[0] || 'all', shown: BATCH };
  const $ = (id) => document.getElementById(id);
  const rateInput = document.querySelector('.speed-control input');

  function matches(w) {
    if (state.month !== 'all' && monthOf(w) !== state.month) return false;
    if (state.tag && !w.tags.includes(state.tag)) return false;
    if (state.q) {
      const q = state.q.toLowerCase();
      return w.text.includes(state.q) || w.kana.includes(state.q) ||
        w.romaji.toLowerCase().includes(q) || w.meaning.includes(state.q);
    }
    return true;
  }

  function label() {
    // 資料裡存在多個年份時（跨年後）月份要帶年份消歧，單一年份時只顯示「N月」
    const years = new Set(months.map((mo) => mo.slice(0, 4)));
    let m;
    if (state.month === 'all') {
      m = '全部';
    } else {
      const [y, mo] = state.month.split('-');
      m = years.size > 1 ? `${y}年${parseInt(mo, 10)}月` : `${parseInt(mo, 10)}月`;
    }
    return state.tag ? `${m} × ${state.tag}` : m;
  }

  function card(w) {
    const el = document.createElement('div');
    el.className = 'vcard';
    const first = w.lessons[0];
    const extra = w.lessons.length > 1 ? `（＋${w.lessons.length - 1} 課）` : '';
    el.innerHTML =
      `<span class="vtag">${w.tags[0] || ''}</span>` +
      `<div class="vja">${w.ja}</div>` +
      `<div class="vromaji">${w.romaji}</div>` +
      (w.accent ? `<div class="vacc">${w.accent}</div>` : '') +
      `<div class="vmean">${w.meaning}</div>` +
      `<div class="vfoot"><a href="${first.href}">${first.date.slice(5).replace('-', '/')}` +
      ` · ${first.title}${extra}</a>` +
      `<button class="play-btn" aria-label="播放">▶</button></div>`;
    el.querySelector('.play-btn').addEventListener('click', function () {
      window.JTalk.speak(w.text, this, { rate: parseFloat(rateInput.value) });
    });
    return el;
  }

  function render() {
    const hits = D.filter(matches);
    const grid = $('grid');
    grid.textContent = '';
    hits.slice(0, state.shown).forEach((w) => grid.appendChild(card(w)));
    $('count').textContent = `${label()} — ${hits.length} words`;
    $('cur-label').textContent = label();
    const shown = Math.min(state.shown, hits.length);
    $('shown-bar').textContent = hits.length > shown
      ? `已顯示 ${shown} / ${hits.length}` : `已顯示 ${shown} / ${hits.length}`;
    $('more').style.display = hits.length > shown ? 'inline-block' : 'none';
    renderSidebar();
    renderAnki();
  }

  // 點分類/月份＝切換瀏覽入口，順手清掉搜尋詞（反向「先選分類再搜尋」則保留 AND）
  function setFilter(patch) {
    $('q').value = '';
    setState({ ...patch, q: '' });
  }

  function renderSidebar() {
    const tags = $('tags');
    tags.textContent = '';
    const mk = (labelTxt, n, on, fn) => {
      const a = document.createElement('a');
      a.href = '#';
      a.className = on ? 'on' : '';
      a.innerHTML = `${labelTxt} <span class="n">${n}</span>`;
      a.addEventListener('click', (e) => { e.preventDefault(); fn(); });
      return a;
    };
    tags.appendChild(mk('全部', D.length, !state.tag, () => setFilter({ tag: null })));
    Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a]).forEach((t) => {
      tags.appendChild(mk(t, tagCount[t], state.tag === t,
        () => setFilter({ tag: state.tag === t ? null : t })));
    });

    const ml = $('months');
    ml.textContent = '';
    const li = (labelTxt, n, key) => {
      const el = document.createElement('li');
      const a = mk(labelTxt, n, state.month === key, () => setFilter({ month: key }));
      el.appendChild(a);
      ml.appendChild(el);
    };
    li('全部月份', D.length, 'all');
    months.forEach((m) => li(m.replace('-', ' · ').replace(' · 0', ' · ') + '月',
      D.filter((w) => monthOf(w) === m).length, m));
  }

  function renderAnki() {
    const a = $('anki-link');
    if (state.month === 'all') {
      a.href = 'anki/tango-all.apkg';
      a.textContent = '⬇ 全部 tango-all.apkg';
    } else {
      a.href = `anki/tango-${state.month}.apkg`;
      a.textContent = `⬇ tango-${state.month}.apkg`;
    }
    a.setAttribute('download', '');
    $('anki-meta').textContent = window.VOCAB_META
      ? `最後更新 ${window.VOCAB_META.generated}` : '';
  }

  function setState(patch) {
    Object.assign(state, patch, { shown: BATCH });
    render();
  }

  $('q').addEventListener('input', function () { setState({ q: this.value.trim() }); });
  $('more').addEventListener('click', () => { state.shown += BATCH; render(); });
  new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting) &&
        $('more').style.display !== 'none') { state.shown += BATCH; render(); }
  }).observe($('sentinel'));

  // 手機預設收起（桌機 CSS 隱藏 summary、details 保持 open）
  if (window.innerWidth <= 640) $('filters').open = false;

  render();
})();
