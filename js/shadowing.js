// js/shadowing.js — 跟讀播放器
//
// 頁面上放一個 <div class="shadow-player"></div>，句子用 .shadow-line[data-text]：
//   <div class="shadow-line" data-text="最近、引っ越しをしました">
//     <div class="shadow-text">
//       <div class="shadow-ja">…</div><div class="shadow-romaji">…</div><div class="shadow-zh">…</div>
//     </div>
//     <button class="play-btn" aria-label="播放">▶</button>
//   </div>
// 播放靠 js/tts.js 的 JTalk.speak（先 mp3、再 speechSynthesis），速度讀頁面上的 #rate。
//
// 四個模式（由淺到深）：
//   repeat 跟述　　　播一句 → 停下來讓你唸（停多久＝這句的長度 × 倍數）→ 下一句
//   sync   看字同步　連續播，看著字跟著一起唸
//   shadow 影子跟讀　連續播，日文模糊掉，點句子才顯示
//   recall 看中文說　只看中文，先自己說，停一下再播答案
(function () {
  const root = document.querySelector('.shadow-player');
  const lines = [...document.querySelectorAll('.shadow-line[data-text]')];
  if (!root || !lines.length || !window.JTalk) return;

  const MODES = {
    repeat: { label: '跟述', hint: '播一句、停一下，換你照著唸一次' },
    sync:   { label: '看字同步', hint: '不停頓，看著字跟音檔同時唸' },
    shadow: { label: '影子跟讀', hint: '不看字，慢半拍緊跟著唸；卡住就點句子看一眼' },
    recall: { label: '看中文說', hint: '只看中文，先自己說出日文，再聽答案對一下' },
  };

  // ── 設定（記在這台裝置上；讀不到就用預設）──
  const KEY = 'shadow-settings';
  const settings = Object.assign(
    { mode: 'repeat', repeats: 1, gap: 1.5, furigana: true, romaji: false },
    (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })()
  );
  if (!MODES[settings.mode]) settings.mode = 'repeat';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {} };

  const rateEl = document.getElementById('rate');
  const rate = () => (rateEl ? parseFloat(rateEl.value) : 0.8);

  // ── 介面 ──
  const opt = (v, cur, text) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${text}</option>`;
  root.innerHTML = `
    <div class="sp-modes" role="tablist">
      ${Object.entries(MODES).map(([k, m]) =>
        `<button type="button" class="sp-mode" data-mode="${k}" role="tab">${m.label}</button>`).join('')}
    </div>
    <div class="sp-hint"></div>
    <div class="sp-transport">
      <button type="button" class="sp-btn" data-act="prev" aria-label="上一句">⏮</button>
      <button type="button" class="sp-btn sp-main" data-act="toggle">▶ 開始</button>
      <button type="button" class="sp-btn" data-act="next" aria-label="下一句">⏭</button>
      <button type="button" class="sp-btn sp-rec" data-act="rec" title="錄下自己唸這一句，再跟原音對照">🎙 錄音對照</button>
    </div>
    <div class="sp-status" aria-live="polite"></div>
    <div class="sp-options">
      <label>每句 <select data-set="repeats">${[1, 2, 3, 5].map(n => opt(n, settings.repeats, n + ' 次')).join('')}</select></label>
      <label>停頓 <select data-set="gap">${[1, 1.5, 2, 3].map(n => opt(n, settings.gap, '× ' + n)).join('')}</select></label>
      <label><input type="checkbox" data-set="furigana"${settings.furigana ? ' checked' : ''}> 振り仮名</label>
      <label><input type="checkbox" data-set="romaji"${settings.romaji ? ' checked' : ''}> 羅馬字</label>
    </div>`;

  const $ = (sel) => root.querySelector(sel);
  const mainBtn = $('[data-act="toggle"]');
  const recBtn = $('[data-act="rec"]');
  const statusEl = $('.sp-status');

  function applySettings() {
    root.querySelectorAll('.sp-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === settings.mode));
    $('.sp-hint').textContent = MODES[settings.mode].hint;
    document.body.classList.toggle('sp-hide-ja', settings.mode === 'shadow' || settings.mode === 'recall');
    document.body.classList.toggle('sp-no-furigana', !settings.furigana);
    document.body.classList.toggle('sp-no-romaji', !settings.romaji);
    lines.forEach(l => l.classList.remove('revealed'));
  }

  // ── 播放迴圈 ──
  // runId 遞增＝作廢上一輪；每個 await 之後都要檢查自己還是不是現任
  let runId = 0;
  let current = 0;
  let running = false;

  const sleep = (ms, id) => new Promise(res => {
    const t0 = performance.now();
    (function tick() {
      if (id !== runId || performance.now() - t0 >= ms) return res();
      setTimeout(tick, 50);
    })();
  });

  function mark(i) {
    current = i;
    lines.forEach((l, j) => l.classList.toggle('is-current', j === i));
    lines[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function playLine(i) {
    const line = lines[i];
    const t0 = performance.now();
    await JTalk.speak(line.dataset.text, line.querySelector('.play-btn'), { rate: rate() });
    return performance.now() - t0;   // 實際播了多久（已含速度），拿來算停頓
  }

  function setStatus(i, r) {
    const rep = settings.repeats > 1 ? ` · 第 ${r + 1} / ${settings.repeats} 次` : '';
    statusEl.textContent = `第 ${i + 1} / ${lines.length} 句${rep}`;
  }

  async function run(from) {
    const id = ++runId;
    running = true;
    mainBtn.textContent = '⏸ 停止';
    for (let i = from; i < lines.length; i++) {
      mark(i);
      for (let r = 0; r < settings.repeats; r++) {
        setStatus(i, r);
        if (settings.mode === 'recall') {
          // 還沒聽過就不知道多長，用字數粗估讓你先說
          lines[i].classList.remove('revealed');
          await sleep((lines[i].dataset.text.length * 220 / rate() + 800) * settings.gap, id);
          if (id !== runId) return;
          const dur = await playLine(i);
          if (id !== runId) return;
          lines[i].classList.add('revealed');
          await sleep(dur * 0.6 + 400, id);
        } else {
          const dur = await playLine(i);
          if (id !== runId) return;
          await sleep(settings.mode === 'repeat' ? dur * settings.gap + 300 : 700, id);
        }
        if (id !== runId) return;
      }
    }
    stop();
    statusEl.textContent = '全部唸完了，可以換一個模式再來一次';
  }

  function stop() {
    runId++;
    running = false;
    JTalk.stopAll();
    mainBtn.textContent = '▶ 開始';
  }

  function jump(i) {
    const n = Math.max(0, Math.min(lines.length - 1, i));
    if (running) run(n); else { mark(n); setStatus(n, 0); }
  }

  // ── 錄音對照：錄自己 → 停 → 播原音 → 播自己的 ──
  let recorder = null;
  async function toggleRecord() {
    if (recorder) { recorder.stop(); return; }
    stop();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      statusEl.textContent = '沒有拿到麥克風權限，錄音對照用不了';
      return;
    }
    const i = current;
    mark(i);
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      recorder = null;
      recBtn.classList.remove('recording');
      recBtn.textContent = '🎙 錄音對照';
      const url = URL.createObjectURL(new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/webm' }));
      const id = ++runId;
      statusEl.textContent = '先聽原音……';
      await playLine(i);
      if (id !== runId) return;
      await sleep(400, id);
      statusEl.textContent = '……再聽你自己的';
      const mine = new Audio(url);
      mine.volume = JTalk.getVolume();
      mine.onended = () => { statusEl.textContent = '對照完了，可以再錄一次'; URL.revokeObjectURL(url); };
      mine.play().catch(() => {});
    };
    recorder.start();
    recBtn.classList.add('recording');
    recBtn.textContent = '⏹ 唸完按這裡';
    statusEl.textContent = `第 ${i + 1} 句：開始唸吧`;
  }
  if (!window.MediaRecorder || !navigator.mediaDevices) recBtn.hidden = true;

  // ── 綁事件 ──
  root.addEventListener('click', e => {
    const modeBtn = e.target.closest('.sp-mode');
    if (modeBtn) {
      settings.mode = modeBtn.dataset.mode; save(); applySettings();
      if (running) run(current);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'toggle') running ? stop() : run(current);
    else if (act.dataset.act === 'prev') jump(current - 1);
    else if (act.dataset.act === 'next') jump(current + 1);
    else if (act.dataset.act === 'rec') toggleRecord();
  });

  root.addEventListener('change', e => {
    const k = e.target.dataset.set;
    if (!k) return;
    settings[k] = e.target.type === 'checkbox' ? e.target.checked : parseFloat(e.target.value);
    save(); applySettings();
  });

  lines.forEach((line, i) => {
    // 單句的 ▶：只播這一句，並把播放器的位置移到這裡
    line.querySelector('.play-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      stop(); mark(i); setStatus(i, 0);
      playLine(i);
    });
    // 模糊模式下點句子偷看一眼
    line.querySelector('.shadow-text')?.addEventListener('click', () => {
      if (document.body.classList.contains('sp-hide-ja')) line.classList.toggle('revealed');
    });
  });

  applySettings();
  setStatus(0, 0);
})();
