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
    const homeLink = home
      ? ''
      : `<a class="home-link" href="${prefix}index.html">學習日誌</a>`;
    // 只有載了 tts.js 的頁面才顯示音量控制（index 等頁沒有發音功能）
    const hasTTS = !!document.querySelector('script[src$="tts.js"]');
    const stored = (function () {
      try {
        const v = parseFloat(localStorage.getItem('jtalk-volume'));
        return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.5;
      } catch { return 0.5; }
    })();
    const volume = hasTTS ? `
            <div class="site-volume" title="發音音量">
              <span class="vol-icon">${stored === 0 ? '🔇' : '🔈'}</span>
              <input type="range" class="vol-slider" min="0" max="1" step="0.05"
                     value="${stored}" aria-label="發音音量">
            </div>` : '';
    this.innerHTML = `
      <div class="site-header">
        <div class="site-header-inner${home ? ' home-page' : ''}">
          ${homeLink}
          <nav class="site-nav">
            <a href="${prefix}my-name-katakana.html">關於我</a><span class="sep">·</span>
            <a href="${prefix}resources.html">資源</a><span class="sep">·</span>
            <a href="${prefix}vocab-quiz.html">練習</a>${volume}
          </nav>
        </div>
      </div>
    `;

    const slider = this.querySelector('.vol-slider');
    if (slider) {
      const icon = this.querySelector('.vol-icon');
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        icon.textContent = v === 0 ? '🔇' : '🔈';
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
