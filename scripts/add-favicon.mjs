#!/usr/bin/env node
// scripts/add-favicon.mjs
//
// 冪等注入 favicon link 到全站 HTML 的 <head>（緊接 <title> 行之後）。
// GitHub Pages 為專案頁，不能依賴根網域 /favicon.ico，故用相對路徑：
//   根目錄頁 → favicon.svg ；lessons/、readings/、tadoku/ → ../favicon.svg
// 已含 rel="icon" 的檔會 skip（jigen 頁由 build 樣板提供，會在此 skip）。
//
// 用法： node scripts/add-favicon.mjs   （從 repo root 執行）

import { readdir, readFile, writeFile } from 'node:fs/promises';

const ICON_RE = /rel=["']icon["']/;

function linkLine(indent, prefix) {
  return `${indent}<link rel="icon" type="image/svg+xml" href="${prefix}favicon.svg" />`;
}

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
  ...(await htmlFilesIn('tadoku')),
].sort();

let injected = 0, skipped = 0;
for (const file of files) {
  const src = await readFile(file, 'utf8');
  if (ICON_RE.test(src)) { skipped++; console.log(`skip ${file}`); continue; }

  const lines = src.split('\n');
  const idx = lines.findIndex(l => l.includes('</title>'));
  if (idx === -1) {
    console.error(`✗ ${file} — no </title> line, left untouched`);
    skipped++;
    continue;
  }
  const titleLine = lines[idx];
  const indent = titleLine.slice(0, titleLine.length - titleLine.trimStart().length);
  const prefix = file.includes('/') ? '../' : '';
  lines.splice(idx + 1, 0, linkLine(indent, prefix));
  await writeFile(file, lines.join('\n'), 'utf8');
  injected++;
  console.log(`+ ${file}`);
}
console.log(`\ndone: ${injected} injected, ${skipped} skipped`);
