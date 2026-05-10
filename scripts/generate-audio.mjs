#!/usr/bin/env node
// scripts/generate-audio.mjs
//
// 掃所有 lesson / reading HTML 的 data-text=""，丟給 VOICEVOX engine
// 批次生成 mp3，存到 audio/<sha256-16>.mp3。
//
// Pre-req:
//   1. 安裝 VOICEVOX (https://voicevox.hiroshiba.jp/) 並開啟 app（會自動啟動 engine on :50021）
//   2. 系統需有 ffmpeg（brew install ffmpeg）
//
// 用法：
//   node scripts/generate-audio.mjs                    # 用預設角色（九州そら ノーマル, id=16）
//   node scripts/generate-audio.mjs --speaker 8        # 換角色
//   node scripts/generate-audio.mjs --list-speakers    # 列出所有可選角色
//   node scripts/generate-audio.mjs --force            # 強制重新生成（即使 cache 已存在）

import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ENGINE = 'http://localhost:50021';
const AUDIO_DIR = 'audio';
const ROOT = process.cwd();

// ── arg parse ────────────────────────────
const args = process.argv.slice(2);
const force = args.includes('--force');
const listOnly = args.includes('--list-speakers');
const speakerIdx = args.indexOf('--speaker');
const SPEAKER = speakerIdx >= 0 ? parseInt(args[speakerIdx + 1], 10) : 16;
const SPEED = 1.0;

// ── 1. ping engine ───────────────────────
async function pingEngine() {
  try {
    const r = await fetch(`${ENGINE}/version`);
    const v = (await r.text()).replace(/"/g, '');
    console.log(`✅ VOICEVOX engine v${v} ok`);
  } catch {
    console.error('❌ VOICEVOX engine 連不到 (' + ENGINE + ')');
    console.error('   請先打開 VOICEVOX app（會自動啟動 engine），或手動跑 engine。');
    process.exit(1);
  }
}

// ── 2. list speakers (helper) ────────────
async function listSpeakers() {
  const r = await fetch(`${ENGINE}/speakers`);
  const speakers = await r.json();
  console.log('\n可用角色：\n');
  for (const sp of speakers) {
    console.log(`  ${sp.name}`);
    for (const st of sp.styles) {
      console.log(`    ├ id=${String(st.id).padStart(3)} ${st.name}`);
    }
  }
  console.log('\n用 --speaker <id> 指定，例如：node scripts/generate-audio.mjs --speaker 16');
}

// ── 3. 掃 HTML 收集 data-text ────────────
async function collectTexts() {
  const dirs = ['lessons', 'readings'];
  const files = [];
  for (const dir of dirs) {
    try {
      const entries = await readdir(path.join(ROOT, dir));
      for (const e of entries) {
        if (e.endsWith('.html')) files.push(path.join(dir, e));
      }
    } catch {}
  }
  // 也掃根目錄的 my-name-katakana.html 之類
  const rootEntries = await readdir(ROOT);
  for (const e of rootEntries) {
    if (e.endsWith('.html') && e !== 'index.html') files.push(e);
  }

  const texts = new Map(); // text → list of files
  for (const file of files) {
    const html = await readFile(path.join(ROOT, file), 'utf8');
    const matches = html.matchAll(/data-text="([^"]+)"/g);
    for (const m of matches) {
      const text = decodeHtmlEntities(m[1]);
      if (!texts.has(text)) texts.set(text, []);
      texts.get(text).push(file);
    }
  }
  return texts;
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ── 4. hash → 檔名 ───────────────────────
function hashText(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

// ── 5. 單句生成 ──────────────────────────
async function synthesize(text) {
  // 短字（≤4 字 且無空格）特殊處理：句尾加「。」騙模型當完整句、降 intonation 避免抑揚過頭
  const isShort = text.length <= 4 && !text.includes(' ');
  const synthText = isShort ? text + '。' : text;

  // 依字長自動調 speedScale — 越短的越慢，避免 phoneme 太短聽起來「破」「促」
  let speedScale = SPEED;
  if (!text.includes(' ')) {
    if (text.length === 1) speedScale = 0.5;
    else if (text.length === 2) speedScale = 0.7;
    else if (text.length <= 4) speedScale = 0.85;
  }

  // step a: audio_query
  const queryRes = await fetch(
    `${ENGINE}/audio_query?text=${encodeURIComponent(synthText)}&speaker=${SPEAKER}`,
    { method: 'POST' }
  );
  if (!queryRes.ok) throw new Error(`audio_query failed: ${queryRes.status}`);
  const query = await queryRes.json();
  query.speedScale = speedScale;
  // 給短字（1-2 個 kana）多一點頭尾空白，避免神經模型 render 太擠造成破音
  query.prePhonemeLength = 0.25;
  query.postPhonemeLength = 0.25;
  if (isShort) {
    query.intonationScale = 0.5;
  }

  // step b: synthesis (returns WAV binary)
  const synthRes = await fetch(`${ENGINE}/synthesis?speaker=${SPEAKER}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) throw new Error(`synthesis failed: ${synthRes.status}`);
  return Buffer.from(await synthRes.arrayBuffer());
}

// ── 6. WAV → MP3 (via ffmpeg) ────────────
function wavToMp3(wavBuf, outPath) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'wav', '-i', 'pipe:0',
      '-codec:a', 'libmp3lame', '-b:a', '128k',
      outPath,
    ]);
    let stderr = '';
    ff.stderr.on('data', d => { stderr += d.toString(); });
    ff.on('error', reject);
    ff.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr}`));
    });
    ff.stdin.write(wavBuf);
    ff.stdin.end();
  });
}

// ── main ─────────────────────────────────
await pingEngine();

if (listOnly) {
  await listSpeakers();
  process.exit(0);
}

console.log(`🎙  speaker_id=${SPEAKER}, speed=${SPEED}`);

const texts = await collectTexts();
console.log(`📝 ${texts.size} 句獨立文字（去重）`);

await mkdir(AUDIO_DIR, { recursive: true });

let generated = 0, skipped = 0, failed = 0;
const total = texts.size;
let i = 0;

for (const [text, files] of texts) {
  i++;
  const filename = hashText(text) + '.mp3';
  const filepath = path.join(AUDIO_DIR, filename);

  if (!force) {
    try {
      await access(filepath);
      skipped++;
      continue;
    } catch {} // 不存在 → 生成
  }

  process.stdout.write(`[${i}/${total}] ${text.slice(0, 30).padEnd(30)} → ${filename}  `);
  try {
    const wav = await synthesize(text);
    await wavToMp3(wav, filepath);
    generated++;
    console.log('✓');
  } catch (err) {
    failed++;
    console.log('✗ ' + err.message);
  }
}

console.log(`\n完成。新生成: ${generated}, 已存在: ${skipped}, 失敗: ${failed}`);
console.log(`輸出資料夾: ${AUDIO_DIR}/`);
