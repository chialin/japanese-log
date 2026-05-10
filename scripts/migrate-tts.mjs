#!/usr/bin/env node
// scripts/migrate-tts.mjs
//
// 一次性遷移腳本：把所有 lesson HTML 的內嵌 speechSynthesis 程式碼換成 JTalk.speak。
// 變更：
//   1. 在內嵌 <script> 前加上 <script src="..js/tts.js"></script>
//   2. 移除 voice setup block (let _jaVoice = null; ... getJapaneseVoice())
//   3. function speak(...) { ...speechSynthesis... } → 簡單 wrapper
//   4. rate / speedRange slider value="0.8" → "1"，>0.8x< → >1x<
//
// 跑：node scripts/migrate-tts.mjs

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function listFiles() {
  const out = [];
  for (const dir of ['lessons', 'readings']) {
    try {
      const entries = await readdir(path.join(ROOT, dir));
      for (const e of entries) if (e.endsWith('.html')) out.push(path.join(dir, e));
    } catch {}
  }
  // 根目錄
  for (const e of await readdir(ROOT)) {
    if (e.endsWith('.html') && e !== 'index.html') out.push(e);
  }
  return out;
}

function findMatchingBrace(html, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

async function migrate(file) {
  let html = await readFile(path.join(ROOT, file), 'utf8');
  const before = html;
  const log = [];

  // 0. 跳過已遷移的（含 ../js/tts.js 或 js/tts.js script 標籤）
  if (/<script src="(\.\.\/)?js\/tts\.js"><\/script>/.test(html)) {
    log.push('  - already migrated, skip');
    return { file, changed: false, log };
  }

  // 1. 沒有 speechSynthesis 就跳過
  if (!html.includes('speechSynthesis')) {
    log.push('  - no speechSynthesis, skip');
    return { file, changed: false, log };
  }

  // 2. 加 <script src="../js/tts.js"></script> 在第一個內嵌 <script> 前
  const isLessonOrReading = file.startsWith('lessons/') || file.startsWith('readings/');
  const ttsPath = isLessonOrReading ? '../js/tts.js' : 'js/tts.js';
  html = html.replace(/(\n)(<script>)/, `$1<script src="${ttsPath}"></script>\n$2`);
  log.push(`  + <script src="${ttsPath}"></script>`);

  // 3. 移除 voice setup block — 從 let _jaVoice = null; 開始到第一個 if (speechSynthesis.getVoices()...)
  //    可能前面有一行 // 註解
  const voiceBlockRe = /(\s*\/\/[^\n]*\n)?\s*let _jaVoice = null;[\s\S]*?(?:\/\/[^\n]*\n)?\s*if \(speechSynthesis\.getVoices\(\)\.length > 0\) getJapaneseVoice\(\);[ \t]*\n?/;
  if (voiceBlockRe.test(html)) {
    html = html.replace(voiceBlockRe, '\n');
    log.push('  - removed voice setup block');
  } else {
    log.push('  ⚠ voice setup block not matched');
  }

  // 4. 找 function speak( 並用 brace counter 找對應結束括號
  const speakStart = html.indexOf('function speak(');
  if (speakStart >= 0) {
    const braceStart = html.indexOf('{', speakStart);
    const braceEnd = findMatchingBrace(html, braceStart);
    if (braceEnd > 0) {
      // 偵測該檔用哪個 slider id
      const sliderId = /id="speedRange"/.test(html) ? 'speedRange' : 'rate';
      const wrapper = `function speak(text, button) {
    return JTalk.speak(text, button, { rate: parseFloat(document.getElementById('${sliderId}').value || 1) });
  }`;
      html = html.slice(0, speakStart) + wrapper + html.slice(braceEnd + 1);
      log.push(`  ↻ replaced speak() (slider=${sliderId})`);
    }
  }

  // 5. slider 預設 0.8 → 1
  let sliderChanged = false;
  html = html.replace(/(<input[^>]*\bvalue=)"0\.8"/g, (m, p1) => {
    sliderChanged = true;
    return p1 + '"1"';
  });
  // 顯示文字 0.8x → 1x
  html = html.replace(/>0\.8x</g, '>1x<');
  if (sliderChanged) log.push('  ↻ slider value="0.8" → "1"');

  // 6. 清理：「if (speechSynthesis.onvoiceschanged !== undefined) ...」這類殘留
  html = html.replace(/\s*if \(speechSynthesis\.onvoiceschanged !== undefined\) speechSynthesis\.onvoiceschanged = \(\) => \{\};?\s*/g, '');
  html = html.replace(/\s*if \(speechSynthesis\.onvoiceschanged !== undefined\) \{\s*speechSynthesis\.onvoiceschanged = checkJapaneseVoice;\s*\}/g, '');

  if (html !== before) {
    await writeFile(path.join(ROOT, file), html);
    return { file, changed: true, log };
  }
  return { file, changed: false, log };
}

const files = await listFiles();
console.log(`掃到 ${files.length} 個 HTML\n`);
for (const f of files) {
  const { file, changed, log } = await migrate(f);
  console.log(`${changed ? '✓' : '·'} ${file}`);
  for (const l of log) console.log(l);
}
