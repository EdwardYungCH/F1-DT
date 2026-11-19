import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const temp = await mkdtemp(resolve(tmpdir(), 'f1-preview-test-'));
const base = 'http://127.0.0.1:18777';
let child;
async function start() {
  child = spawn(process.execPath, [resolve(root, 'server.mjs')], {
    env: { ...process.env, F1_PREVIEW_DB: resolve(temp, 'test.sqlite'), F1_PREVIEW_PORT: '18777' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(() => { throw new Error('Server exited during startup'); }),
  ]);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const ended = once(child, 'exit');
  child.kill();
  await ended;
}
const api = (route, body, cookie) => fetch(base + '/api/' + route, {
  method: body ? 'POST' : 'GET',
  headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
  body: body && JSON.stringify(body),
});
async function teacher() {
  const response = await api('login', { password: 'robot-demo' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  return response.headers.get('set-cookie').split(';')[0];
}
const score = (key, score) => ({ key, score, done: true });
const first = { lesson: 'L1', cls: '1A', num: '01', name: '示範同學',
  items: [score('fill', 10), score('robot', 8 / 9 * 10), score('match', 10), score('d1', 4),
    score('d2', 4), score('ipo', 10), score('log', 2)] };

try {
  await start();
  const paths = ['/', '/teacher/', ...['L1','L2','L3','L4'].map(lesson => '/' + lesson + '/')];
  for (const path of paths) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    if (path.startsWith('/L')) {
      assert.match(html, /submission\.js/);
      for (const [, href] of html.matchAll(/(?:src|href)="((?:\.\.\/assets|\.\.\/sim)\/[^"]+\.[a-z]+)"/gi)) {
        assert.equal((await fetch(new URL(href, base + path))).status, 200, href);
      }
    }
  }
  assert.equal((await api('records')).status, 401);
  assert.equal((await api('login', { password: 'wrong' })).status, 401);
  const teacherA = await teacher();
  const teacherB = await teacher();
  assert.notEqual(teacherA, teacherB);
  assert.equal((await api('submit', { ...first, items: first.items.slice(0,-1) })).status, 400);
  assert.equal((await api('submit', { ...first, name: '未登記資料' })).status, 400);
  const response = await api('submit', first);
  assert.equal(response.status, 201);
  const receipt = await response.json();
  assert.equal(receipt.total, 48.9);
  assert.deepEqual(await (await api('submit', first)).json(), receipt);
  assert.equal((await api('submit', { ...first, items: first.items.map(i => ({ ...i, score: 0 })) })).status, 409);
  const a = await (await api('records', null, teacherA)).json();
  const b = await (await api('records', null, teacherB)).json();
  assert.deepEqual(a, b);
  assert.equal(a.records.filter(record => record.receipt === receipt.receipt).length, 1);
  const paired = await api('submit', { ...first, lesson: 'L2', partner: { num: '04', name: '測試同學丁' },
    items: [score('trials', 20), score('real', 30), score('link', 0), score('log', 0)],
    makeCode: 'https://makecode.com/_DEMO12345' });
  assert.equal(paired.status, 201);
  const group = await paired.json();
  const c = await (await api('records', null, teacherB)).json();
  assert.equal(c.records.filter(record => record.receipt === group.receipt).length, 2);
  await api('logout', {}, teacherA);
  assert.equal((await api('records', null, teacherA)).status, 401);
  await stop();
  await start();
  const afterRestart = await (await api('records', null, await teacher())).json();
  assert.ok(afterRestart.records.some(record => record.receipt === receipt.receipt));
  console.log('PASS: four lessons and assets; login isolation; roster and missing-item checks; receipt, duplicate handling, two separate sessions, pair credit and persistence through restart.');
} finally {
  await stop();
  await rm(temp, { recursive: true, force: true });
}
