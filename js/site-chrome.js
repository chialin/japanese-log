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
    this.innerHTML = `
      <div class="site-header">
        <div class="site-header-inner${home ? ' home-page' : ''}">
          ${homeLink}
          <nav class="site-nav">
            <a href="${prefix}my-name-katakana.html">關於我</a><span class="sep">·</span>
            <a href="${prefix}resources.html">資源</a><span class="sep">·</span>
            <a href="${prefix}vocab-quiz.html">練習</a>
          </nav>
        </div>
      </div>
    `;
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
