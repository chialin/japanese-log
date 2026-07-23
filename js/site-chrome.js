// js/site-chrome.js
// <site-header> / <site-footer> — 全站共用導覽列與頁尾
// Web Component，模板字串內嵌在這支檔案裡（不用 fetch，file:// 開檔也沒有 CORS 問題）

function siteChromePrefix() {
  return /\/(lessons|readings)\//.test(location.pathname) ? '../' : '';
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
    // 品牌：非首頁為「回學習日誌」連結，首頁為不可點落款
    const brand = home
      ? `<span class="brand">學習日誌</span>`
      : `<a class="home-link" href="${prefix}index.html">學習日誌</a>`;
    const navItem = (file, label) =>
      `<a href="${prefix}${file}"${isActive(file) ? ' class="active"' : ''}>${label}</a>`;

    // 只有載了 tts.js 的頁面才顯示音量控制（index 等頁沒有發音功能）
    const hasTTS = !!document.querySelector('script[src$="tts.js"]');
    const stored = (function () {
      try {
        const v = parseFloat(localStorage.getItem('jtalk-volume'));
        return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.5;
      } catch { return 0.5; }
    })();
    // 耳機 icon（Lucide headphones，取代舊 🔈/🔇 emoji）
    const headphones = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`;
    const control = hasTTS ? `
            <div class="site-control${stored === 0 ? ' muted' : ''}" title="發音音量">
              <span class="vol-icon">${headphones}</span>
              <input type="range" class="vol-slider" min="0" max="1" step="0.05"
                     value="${stored}" aria-label="發音音量">
            </div>` : '';
    this.innerHTML = `
      <div class="site-header">
        <div class="site-header-inner${home ? ' home-page' : ''}">
          ${brand}
          <nav class="site-nav">
            ${navItem('my-name-katakana.html', '關於我')}
            ${navItem('resources.html', '資源')}
            ${navItem('vocab-quiz.html', '練習')}
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
        <div><a href="https://chialin.me">chialin.me</a> · <a href="https://blog.chialin.me">blog</a> · <a href="${prefix}credits.html">credits</a></div>
        <div class="seal">日</div>
        <div>毎日少しずつ。</div>
      </footer>
    `;
  }
}

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
