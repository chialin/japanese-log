// js/tts.js — 共用日文 TTS
//
// 行為：
//   1. 先嘗試播本地預先生成的 audio/<sha256-16>.mp3（VOICEVOX 高音質）
//   2. 找不到（404）→ fallback 到瀏覽器內建 speechSynthesis（Kyoko/O-ren）
//
// 使用方式：
//   <script src="../js/tts.js"></script>   // lessons/, readings/ 路徑
//   <script src="js/tts.js"></script>       // 根目錄路徑
//
//   await JTalk.speak('ほんを よむ', button, { rate: 0.8 });
//
// hash 演算法跟 scripts/generate-audio.mjs 必須一致：sha256(text utf8) 前 16 字元

window.JTalk = (function () {
  // 自動推測 audio/ 路徑（lessons/* 或 readings/* 在子目錄，要回上一層）
  const AUDIO_BASE = (function () {
    const p = location.pathname;
    if (p.includes('/lessons/') || p.includes('/readings/')) return '../audio/';
    return './audio/';
  })();

  // ── 預載日文聲音（fallback 用）──
  let _jaVoice = null;
  function getJaVoice() {
    if (_jaVoice) return _jaVoice;
    const voices = speechSynthesis.getVoices();
    const ja = voices.filter(v => v.lang.startsWith('ja') && !v.name.includes('Otoya'));
    _jaVoice =
      ja.find(v => v.name.includes('Kyoko')) ||
      ja.find(v => v.name.includes('O-ren')) ||
      ja.find(v => v.name.includes('Hana')) ||
      ja[0] || null;
    return _jaVoice;
  }
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => { _jaVoice = null; getJaVoice(); };
    if (speechSynthesis.getVoices().length > 0) getJaVoice();
  }

  // ── SHA-256 hash → 前 16 字元 ──
  async function hashText(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  }

  // ── 按鈕狀態 ──
  function setBtnPlaying(button) {
    if (!button) return;
    // 同時加 .playing 和 .speaking — 不同 lesson 的 CSS 用不同 class 名稱
    button.classList.add('playing', 'speaking');
    if (button.classList.contains('play-btn') || button.classList.contains('small-play-btn')) {
      button.dataset._origText = button.textContent;
      button.textContent = '🔊';
    }
  }
  function setBtnIdle(button) {
    if (!button) return;
    button.classList.remove('playing', 'speaking');
    if (button.dataset._origText !== undefined) {
      button.textContent = button.dataset._origText || '▶';
      delete button.dataset._origText;
    }
  }

  // ── 中斷正在播放的東西 ──
  let _currentAudio = null;
  function stopAll() {
    try { speechSynthesis.cancel(); } catch {}
    if (_currentAudio) {
      try { _currentAudio.pause(); } catch {}
      _currentAudio = null;
    }
  }

  // ── 主函式 ──
  async function speak(text, button, opts = {}) {
    const rate = opts.rate || 1.0;
    stopAll();
    setBtnPlaying(button);

    // 1. 嘗試本地 mp3
    try {
      const filename = (await hashText(text)) + '.mp3';
      const url = AUDIO_BASE + filename;
      const audio = new Audio(url);
      audio.playbackRate = rate;
      _currentAudio = audio;

      await new Promise((resolve, reject) => {
        audio.addEventListener('ended', () => {
          if (_currentAudio === audio) _currentAudio = null;
          setBtnIdle(button);
          resolve();
        });
        audio.addEventListener('error', () => reject(new Error('local audio not available')));
        audio.play().catch(reject);
      });
      return; // ✓ 本地音檔播完
    } catch {
      // 2. fallback 到 speechSynthesis
      _currentAudio = null;
    }

    await new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = rate;
      u.pitch = 1;
      const v = getJaVoice();
      if (v) u.voice = v;
      u.onend = () => { setBtnIdle(button); resolve(); };
      u.onerror = () => { setBtnIdle(button); resolve(); };
      speechSynthesis.speak(u);
    });
  }

  return { speak, hashText, stopAll, AUDIO_BASE };
})();
