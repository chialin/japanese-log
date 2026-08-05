import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIndexPage } from '../lib/kanji-render.mjs';

const ENTRIES = [
  ['日', { days: 8, on: { にち: ['日本'] }, kun: { か: ['三日'] }, other: [], multi: true,
           taigi: { coda: '-t', kana: 'ち', label: '入聲' }, timeline: [] }],
  ['会', { days: 4, on: { かい: ['会話'] }, kun: {}, other: [], multi: false,
           taigi: null, timeline: [] }],
];

test('產出完整 HTML 文件', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('shared.css'));
  assert.ok(html.includes('favicon.svg'), '必須有 favicon link');
  assert.ok(html.includes('site-chrome.js'));
});

test('索引格含每個漢字，且帶出現天數', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(html.includes('data-kanji="日"'));
  assert.ok(html.includes('data-kanji="会"'));
  assert.ok(html.includes('data-days="8"'));
});

test('高頻字（>=3 天）標記 hot', () => {
  const html = renderIndexPage(ENTRIES);
  const tile = /<button[^>]*data-kanji="日"[^>]*>/.exec(html)[0];
  assert.ok(tile.includes('hot'));
});

test('多音字與台語線索的篩選旗標寫在 data 屬性上', () => {
  const html = renderIndexPage(ENTRIES);
  const hi = /<button[^>]*data-kanji="日"[^>]*>/.exec(html)[0];
  assert.ok(hi.includes('data-multi="1"'));
  assert.ok(hi.includes('data-taigi="1"'));
  const kai = /<button[^>]*data-kanji="会"[^>]*>/.exec(html)[0];
  assert.ok(kai.includes('data-multi="0"'));
  assert.ok(kai.includes('data-taigi="0"'));
});

test('不內嵌漢字詳細內容（詳細區由 JS 渲染）', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(!html.includes('日本'), '單字不應出現在靜態 HTML 裡');
  assert.ok(html.includes('id="kanji-detail"'), '應有空的詳細區容器');
});

test('載入資料檔與互動腳本', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(html.includes('js/kanji-data.js'));
  assert.ok(html.includes('js/kanji-page.js'));
});

test('標註 KANJIDIC2 授權', () => {
  const html = renderIndexPage(ENTRIES);
  assert.ok(html.includes('KANJIDIC'));
  assert.ok(html.includes('CC BY-SA'));
});
