import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const home = dirname(fileURLToPath(import.meta.url));
const publicRoot = resolve(home, 'public');
const databasePath = process.env.F1_PREVIEW_DB || resolve(home, 'data', 'preview.sqlite');
await mkdir(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec(`
  PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS submissions (
    lesson TEXT NOT NULL, student TEXT NOT NULL, receipt TEXT NOT NULL,
    submitted INTEGER NOT NULL, data TEXT NOT NULL,
    PRIMARY KEY (lesson, student)
  );
`);

const lessons = {
  L1: { title: '認識機械人', items: { fill: 10, robot: 10, match: 10, d1: 4, d2: 4, ipo: 10, log: 2 } },
  L2: { title: '小車走正方形', items: { trials: 20, real: 30, link: 0, log: 0 } },
  L3: { title: '巡線機械人', items: { surf: 10, speed: 15, real: 25, link: 0, log: 0 } },
  L4: { title: '流程圖與巡線優化', items: { sym: 5, flow: 10, log20: 10, real: 25, link: 0, log: 0 } },
};
const roster = [
  { id: '1A-01', cls: '1A', num: '01', name: '示範同學' },
  { id: '1A-02', cls: '1A', num: '02', name: '測試同學乙' },
  { id: '1A-03', cls: '1A', num: '03', name: '測試同學丙' },
  { id: '1A-04', cls: '1A', num: '04', name: '測試同學丁' },
];
const insert = db.prepare('INSERT OR IGNORE INTO submissions VALUES (?, ?, ?, ?, ?)');
const getSubmission = db.prepare('SELECT * FROM submissions WHERE lesson = ? AND student = ?');
for (const [lesson, id, score] of [['L1', '1A-02', 42], ['L1', '1A-03', 38], ['L2', '1A-02', 45], ['L3', '1A-03', 40]]) {
  insert.run(lesson, id, 'SAMPLE-' + lesson + '-' + id, Date.UTC(2026, 10, 19, 2), JSON.stringify({ total: score, max: 50, items: [], sample: true }));
}

const password = process.env.F1_PREVIEW_PASSWORD || 'robot-demo';
const sessions = new Map();
const sessionDuration = 60 * 60 * 1000;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
};

function reply(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) throw new Error('資料太長，請縮短後重試。');
    parts.push(chunk);
  }
  const body = JSON.parse(Buffer.concat(parts).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('繳交資料格式有誤。');
  return body;
}

function validPassword(value) {
  const actual = Buffer.from(typeof value === 'string' ? value : '');
  const expected = Buffer.from(password);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function studentMatch(cls, num, name) {
  const normalNum = typeof num === 'string' && /^\d{1,2}$/.test(num) ? num.padStart(2, '0') : '';
  return roster.find(s => s.cls === cls && s.num === normalNum && s.name === name);
}

function submit(res, body) {
  const lesson = typeof body.lesson === 'string' && Object.hasOwn(lessons, body.lesson) ? lessons[body.lesson] : null;
  const student = studentMatch(body.cls, body.num, body.name);
  const partner = body.partner && studentMatch(body.cls, body.partner.num, body.partner.name);
  if (!student || (body.partner && (!partner || partner.id === student.id))) {
    return reply(res, 400, { error: '試用版只接受首頁列出的示範班別、學號和姓名。請檢查你和組員的資料。' });
  }
  if (!lesson || !Array.isArray(body.items) || (partner && body.lesson === 'L1')) {
    return reply(res, 400, { error: '課堂或作答資料有誤。' });
  }
  const scores = new Map(body.items.map(item => [item?.key, item]));
  const items = Object.entries(lesson.items).map(([key, max]) => {
    const item = scores.get(key);
    if (!item || item.done !== true || !Number.isFinite(item.score) || item.score < 0 || item.score > max) return null;
    return { key, score: item.score, max };
  });
  if (items.includes(null) || scores.size !== items.length || body.items.length !== items.length) {
    return reply(res, 400, { error: '仍有必做項目未完成。請按清單補做後再繳交。' });
  }
  const members = (partner ? [student.id, partner.id] : [student.id]).sort();
  const total = Math.round(items.reduce((sum, item) => sum + item.score, 0) * 10) / 10;
  const max = items.reduce((sum, item) => sum + item.max, 0);
  const makeCode = typeof body.makeCode === 'string' && /^https:\/\/(?:makecode\.com\/_|makecode\.microbit\.org\/(?:_|#pub:_?|S))[-\w]+$/.test(body.makeCode) ? body.makeCode : '';
  if (body.lesson !== 'L1' && !makeCode) return reply(res, 400, { error: '請填寫有效的 MakeCode 分享連結。' });
  const data = JSON.stringify({ total, max, members, items, makeCode });
  db.exec('BEGIN IMMEDIATE');
  try {
    const prior = members.map(id => getSubmission.get(body.lesson, id)).find(Boolean);
    if (prior) {
      db.exec('COMMIT');
      if (prior.data !== data) return reply(res, 409, { error: '這堂已有繳交紀錄。如需更正，請通知老師。' });
      return reply(res, 200, { receipt: prior.receipt, submitted: prior.submitted, total, max });
    }
    const receipt = randomBytes(5).toString('hex').toUpperCase();
    const submitted = Date.now();
    for (const id of members) insert.run(body.lesson, id, receipt, submitted, data);
    db.exec('COMMIT');
    return reply(res, 201, { receipt, submitted, total, max });
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

async function api(req, res, pathname) {
  if (req.headers['sec-fetch-site'] === 'cross-site' ||
    (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host)) {
    return reply(res, 403, { error: '請從試用版頁面繼續。' });
  }
  const token = (req.headers.cookie || '').match(/(?:^|;\s*)f1teacher=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (req.method === 'GET' && pathname === '/api/records') {
    if (!token || !(sessions.get(token) > Date.now())) return reply(res, 401, { error: '請先登入老師區。' });
    const records = db.prepare('SELECT * FROM submissions ORDER BY submitted DESC').all().map(({ data, ...row }) => ({ ...row, ...JSON.parse(data) }));
    return reply(res, 200, { roster, lessons: Object.entries(lessons).map(([id, lesson]) => ({ id, title: lesson.title })), records });
  }
  if (req.method !== 'POST') return reply(res, 404, { error: '找不到頁面。' });
  if (pathname === '/api/logout') {
    sessions.delete(token);
    return reply(res, 200, {}, { 'Set-Cookie': 'f1teacher=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0' });
  }
  let body;
  try { body = await readBody(req); }
  catch { return reply(res, 400, { error: '資料格式有誤，或資料超出長度限制。' }); }
  if (pathname === '/api/submit') return submit(res, body);
  if (pathname === '/api/login' || pathname === '/api/check-teacher') {
    if (!validPassword(body.password)) return reply(res, 401, { error: '老師密碼不正確。' });
    if (pathname === '/api/check-teacher') return reply(res, 200, {});
    const key = randomBytes(32).toString('hex');
    for (const [id, expiry] of sessions) if (expiry <= Date.now() || id === token) sessions.delete(id);
    sessions.set(key, Date.now() + sessionDuration);
    return reply(res, 200, {}, { 'Set-Cookie': 'f1teacher=' + key + '; HttpOnly; SameSite=Strict; Path=/api; Max-Age=3600' });
  }
  return reply(res, 404, { error: '找不到頁面。' });
}

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 405, { error: '不支援此請求。' });
    let file = resolve(publicRoot, '.' + pathname);
    if (file !== publicRoot && !file.startsWith(publicRoot + sep)) return reply(res, 404, { error: '找不到頁面。' });
    let fileStat = await stat(file).catch(() => null);
    if (fileStat?.isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(308, { Location: pathname + '/' });
        return res.end();
      }
      file = resolve(file, 'index.html');
      fileStat = await stat(file).catch(() => null);
    }
    if (!fileStat?.isFile()) return reply(res, 404, { error: '找不到頁面。' });
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': fileStat.size,
      'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) reply(res, 500, { error: '暫時未能處理，請稍後重試。' });
    else res.end();
  }
});
const port = Number(process.env.F1_PREVIEW_PORT || 8765);
server.listen(port, '127.0.0.1', () => console.log('F1-DT preview: http://127.0.0.1:' + port + '/'));
