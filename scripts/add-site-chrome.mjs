#!/usr/bin/env node
// scripts/add-site-chrome.mjs
//
// 冪等地把全站頁面套上新的 <site-header>/<site-footer>：
//   1. 移除舊的「← 返回 学習日誌」連結（class="back-link" 或早期版本的 inline style 寫法）
//   2. 移除 <header class="masthead">…</header>，把裡面 left/right 文字合併成
//      <div class="page-meta">{left} · {right}</div>，插在檔案第一個 </h1> 之後
//      （抓不到 <h1> 的頁面——目前已知 slowpaper.html / my-name-katakana.html——
//       印警告，交給後續手動處理，不自動插入）
//   3. 在 <div class="wrap"> 或 <div class="container"> 開頭標籤後插入 <site-header></site-header>
//   4. 在第一個 <script 標籤之前，找最後一個 </div>（也就是 wrap/container 收尾），
//      在它之前插入 <site-footer></site-footer>
//      —— 這一步必須在插入 js/site-chrome.js 的 <script> include（第 5 步）**之前**
//      執行：如果先插入 <head> 裡的 <script src=".../site-chrome.js">，
//      「第一個 <script 標籤」就會變成那一行，把搜尋範圍整個收窄到 <head> 內，
//      導致 </div> 永遠找不到、<site-footer> 插不進去。
//   5. 插入 js/site-chrome.js 的 <script> include（緊接 shared.css <link> 之後，
//      放在最後一步，才不會干擾第 4 步對「第一個 <script 標籤」的搜尋）
//
// 已含 <site-header 的檔案視為處理過，整檔 skip（可重複執行、冪等）。
//
// 用法：node scripts/add-site-chrome.mjs   （從 repo root 執行）

import { readdir, readFile, writeFile } from 'node:fs/promises';

async function htmlFilesIn(dir) {
  const entries = await readdir(dir);
  return entries
    .filter(n => n.endsWith('.html'))
    .map(n => (dir === '.' ? n : `${dir}/${n}`));
}

const files = [
  ...(await htmlFilesIn('.')),
  ...(await htmlFilesIn('lessons')),
  ...(await htmlFilesIn('readings')),
].sort();

let changed = 0, skipped = 0, warned = 0;

for (const file of files) {
  const src = await readFile(file, 'utf8');

  if (src.includes('<site-header')) { skipped++; console.log(`skip ${file}`); continue; }

  const prefix = file.includes('/') ? '../' : '';
  let out = src;

  // 1. 移除舊的返回首頁連結（class="back-link" 或早期 inline-style 寫法）
  out = out.replace(/[ \t]*<a href="(?:\.\.\/)?index\.html"[^>]*>[\s\S]*?返回[\s\S]*?<\/a>\n?/, '');

  // 2. 移除 masthead，抓 left/right，插入 page-meta
  const mastheadMatch = out.match(/<header class="masthead">[\s\S]*?<\/header>\n?/);
  if (mastheadMatch) {
    const block = mastheadMatch[0];
    const leftMatch = block.match(/<div class="left">([\s\S]*?)<\/div>/);
    const rightMatch = block.match(/<div class="right">([\s\S]*?)<\/div>/);
    const left = leftMatch ? leftMatch[1].trim() : '';
    const right = rightMatch ? rightMatch[1].trim() : '';
    out = out.replace(block, '');

    const h1Match = out.match(/<h1[^>]*>[\s\S]*?<\/h1>/);
    if (h1Match) {
      out = out.replace(h1Match[0], `${h1Match[0]}\n<div class="page-meta">${left} · ${right}</div>`);
    } else {
      console.warn(`⚠ ${file} — no <h1>, page-meta 需手動插入（left="${left}" right="${right}"）`);
      warned++;
    }
  } else {
    console.error(`✗ ${file} — no masthead found (unexpected)`);
  }

  // 3. 插入 <site-header>：wrap/container 開頭標籤後
  const wrapOpenMatch = out.match(/<div class="(?:wrap|container)">\n?/);
  if (wrapOpenMatch) {
    out = out.replace(wrapOpenMatch[0], `${wrapOpenMatch[0]}<site-header></site-header>\n`);
  } else {
    console.error(`✗ ${file} — no .wrap/.container div found, site-header not inserted`);
  }

  // 4. 插入 <site-footer>：第一個 <script 標籤之前最後一個 </div> 之前
  // 注意：這裡的 <script 搜尋必須在第 5 步插入 <head> 的 site-chrome.js <script> 之前執行，
  // 否則「第一個 <script 標籤」會變成剛插入的那行，把搜尋範圍收窄到 <head> 內，
  // 導致 </div> 找不到、<site-footer> 插不進去。
  const scriptIdx = out.search(/<script/);
  const searchRegion = scriptIdx === -1 ? out : out.slice(0, scriptIdx);
  const lastDivIdx = searchRegion.lastIndexOf('</div>');
  if (lastDivIdx === -1) {
    console.error(`✗ ${file} — no closing </div> found, site-footer not inserted`);
  } else {
    out = out.slice(0, lastDivIdx) + '<site-footer></site-footer>\n' + out.slice(lastDivIdx);
  }

  // 5. script include（放最後一步，避免干擾第 4 步的 <script 搜尋）
  const cssLineMatch = out.match(/^.*<link rel="stylesheet" href="(?:\.\.\/)?shared\.css"\s*\/?>.*$/m);
  if (!cssLineMatch) {
    console.error(`✗ ${file} — no shared.css link found, script include not inserted`);
  } else {
    const cssLine = cssLineMatch[0];
    out = out.replace(cssLine, `${cssLine}\n<script src="${prefix}js/site-chrome.js" defer></script>`);
  }

  await writeFile(file, out, 'utf8');
  changed++;
  console.log(`+ ${file}`);
}

console.log(`\ndone: ${changed} changed, ${skipped} skipped, ${warned} warnings (missing <h1>)`);
