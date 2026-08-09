// js/site-chrome.js
// <site-header> / <site-footer> — 全站共用導覽列與頁尾
// Web Component，模板字串內嵌在這支檔案裡（不用 fetch，file:// 開檔也沒有 CORS 問題）

function siteChromePrefix() {
  return /\/(lessons|readings|tadoku)\//.test(location.pathname) ? '../' : '';
}

function isHomePage() {
  return /(^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith('/');
}

class SiteHeader extends HTMLElement {
  connectedCallback() {
    const prefix = siteChromePrefix();
    const home = isHomePage();
    // 目前頁面：導覽對應項高亮（用絕對 pathname 判斷，與 prefix 無關）
    const isActive = (file) => location.pathname.endsWith('/' + file);
    // 首頁入口：家的圖示，收在導覽膠囊最左邊（Lucide house）
    const houseIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>`;
    const homeNav =
      `<a class="nav-home${home ? ' active' : ''}" href="${prefix}index.html" aria-label="回學習日誌">${houseIcon}</a>` +
      `<span class="nav-sep" aria-hidden="true"></span>`;
    const navItem = (file, label) =>
      `<a href="${prefix}${file}"${isActive(file) ? ' class="active"' : ''}>${label}</a>`;

    // 音量控制：全站每頁都顯示（值寫進 localStorage，沒發音的頁面調整也會被記住）
    const stored = (function () {
      try {
        const v = parseFloat(localStorage.getItem('jtalk-volume'));
        return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.5;
      } catch { return 0.5; }
    })();
    // 耳機 icon（Lucide headphones，取代舊 🔈/🔇 emoji）
    const headphones = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`;
    const control = `
            <div class="site-control${stored === 0 ? ' muted' : ''}" title="發音音量">
              <span class="vol-icon">${headphones}</span>
              <input type="range" class="vol-slider" min="0" max="1" step="0.05"
                     value="${stored}" aria-label="發音音量">
            </div>`;
    this.innerHTML = `
      <div class="site-header">
        <div class="site-header-inner${home ? ' home-page' : ''}">
          <nav class="site-nav">
            ${homeNav}
            ${navItem('grammar.html', '文法')}
            ${navItem('kanji.html', '漢字')}
            ${navItem('resources.html', '資源')}
            ${navItem('tadoku.html', '多読')}
          </nav>
          ${control}
        </div>
      </div>
    `;

    const slider = this.querySelector('.vol-slider');
    if (slider) {
      const ctrl = this.querySelector('.site-control');
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        ctrl.classList.toggle('muted', v === 0); // 靜音時耳機 icon 變淡
        // JTalk 可能還沒載入（tts.js 在 body 尾），先寫 storage 保底
        if (window.JTalk && window.JTalk.setVolume) window.JTalk.setVolume(v);
        else { try { localStorage.setItem('jtalk-volume', v); } catch {} }
      });
    }
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    const prefix = siteChromePrefix();
    this.innerHTML = `
      <footer class="footer-area">
        <div><a href="${prefix}my-name-katakana.html">關於我</a> · <a href="https://chialin.me">chialin.me</a> · <a href="https://blog.chialin.me">blog</a> · <a href="${prefix}credits.html">credits</a></div>
        <div class="seal">日</div>
        <div>毎日少しずつ。</div>
      </footer>
    `;
  }
}

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);

// ── 速度控制升級：把各頁舊 range slider 就地換成「慢/原速/快」三段膠囊 ──
// 各頁 markup 仍是 <div class="speed-control"> 內含 <input type="range">；
// 這裡隱藏原元件、疊上膠囊，並把選到的 rate 寫回 input（dispatch input），
// 讓每頁既有的 speak() ＝ JTalk.speak(..., { rate: input.value }) 不需改動照常運作。
// rate 用 localStorage('jtalk-rate') 跨頁記住（比照音量）。
// 段值都落在各頁 range 的 step 網格上（主課程 step=0.1 / kana 頁 step=0.05），
// 避免 input.value 被瀏覽器吸附而與 localStorage 記的值不一致。
const SPEED_SEGMENTS = [
  { label: '慢',   rate: 0.8 },
  { label: '原速', rate: 1.0 },
  { label: '快',   rate: 1.2 },
];
const DEFAULT_RATE = 1.0; // 無記憶時一律原速（2026-06-24 定案的預設 1x）

function upgradeSpeedControl(sc) {
  if (sc.dataset.upgraded) return;
  const input = sc.querySelector('input[type="range"]');
  if (!input) return;
  sc.dataset.upgraded = '1';

  // 初始 rate：優先 localStorage（跨頁記住），否則預設原速 —— 不看各頁寫死的 value
  let rate = DEFAULT_RATE;
  try {
    const v = parseFloat(localStorage.getItem('jtalk-rate'));
    if (Number.isFinite(v)) rate = v;
  } catch {}
  const nearest = SPEED_SEGMENTS.reduce((a, b) =>
    Math.abs(b.rate - rate) < Math.abs(a.rate - rate) ? b : a);

  function applyRate(r) {
    input.value = r;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    try { localStorage.setItem('jtalk-rate', r); } catch {}
  }
  applyRate(nearest.rate); // 讓每頁 speak() 一開始就讀到正確 rate

  const label = document.createElement('span');
  label.className = 'speed-label';
  label.textContent = '速度';

  const seg = document.createElement('div');
  seg.className = 'speed-seg';
  SPEED_SEGMENTS.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = s.label;
    if (s === nearest) btn.classList.add('active');
    btn.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      applyRate(s.rate);
    });
    seg.appendChild(btn);
  });

  sc.append(label, seg);

  // 併入 meta 行：日期靠左、膠囊靠右（同一列）
  const meta = document.querySelector('.page-meta');
  if (meta && meta.parentNode && !meta.closest('.meta-row')) {
    const row = document.createElement('div');
    row.className = 'meta-row';
    meta.parentNode.insertBefore(row, meta);
    row.appendChild(meta);
    row.appendChild(sc);
  }
}

document.querySelectorAll('.speed-control').forEach(upgradeSpeedControl);

// ── 漢字連結：只在課程／閱讀／多読頁載入，先載 index 再載邏輯 ──
(function () {
  if (!/\/(lessons|readings|tadoku)\//.test(location.pathname)) return;
  const prefix = '../';
  const load = (src) =>
    new Promise((res) => {
      const s = document.createElement('script');
      s.src = prefix + src;
      s.onload = res;
      s.onerror = res;          // 檔案不存在也不能擋住頁面
      document.head.appendChild(s);
    });
  load('js/kanji-index.js').then(() => load('js/kanji-link.js'));
})();
