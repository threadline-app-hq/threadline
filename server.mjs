// Threadline API server. Zero npm dependencies: Node 22+ (built-in http, sqlite, crypto).
// Threadline API server (PostgreSQL). Dependency: pg. Node 20+.
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
const __dir = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dir, 'public');
const STATIC_MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

const PORT = Number(process.env.PORT || 8080);
const ORIGIN = process.env.CORS_ORIGIN || '*';
const SECRET = process.env.SESSION_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') { console.error('SESSION_SECRET is required in production'); process.exit(1); }
  return 'dev-only-secret';
})();
const MAX_IMAGE = 8 * 1024 * 1024;
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
pg.types.setTypeParser(20, Number); // bigint -> number

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY, handle TEXT NOT NULL, handle_lc TEXT UNIQUE NOT NULL, name TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', pw TEXT NOT NULL, created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS images(key TEXT PRIMARY KEY, mime TEXT NOT NULL, data BYTEA NOT NULL);
CREATE TABLE IF NOT EXISTS posts(id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, image TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS likes(user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY(user_id,post_id));
CREATE TABLE IF NOT EXISTS saves(user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY(user_id,post_id));
CREATE TABLE IF NOT EXISTS follows(follower INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, followee INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(follower,followee));
CREATE TABLE IF NOT EXISTS comments(id SERIAL PRIMARY KEY, post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, created BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id, created);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_saves_post ON saves(post_id);
CREATE TABLE IF NOT EXISTS notifications(id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, actor INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, post_id INT REFERENCES posts(id) ON DELETE CASCADE, text TEXT NOT NULL DEFAULT '', created BIGINT NOT NULL, seen BOOLEAN NOT NULL DEFAULT FALSE);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, id)`;

let pool;
export async function initDb(p) {
  pool = p || new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8,
    ssl: process.env.DATABASE_SSL === 'off' || /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '') ? false : { rejectUnauthorized: false } });
  for (const stmt of SCHEMA.split(';').map(x => x.trim()).filter(Boolean)) await pool.query(stmt);
}
const q = async (sql, ...a) => (await pool.query(sql, a)).rows;
const one = async (sql, ...a) => (await q(sql, ...a))[0];
const run = (sql, ...a) => pool.query(sql, a);
const count = async (sql, ...a) => Number((await one(sql, ...a)).c);

// ---- auth: scrypt password hashes, HMAC-signed bearer tokens (30 days)
const b64 = b => Buffer.from(b).toString('base64url');
const hashPw = pw => { const s = crypto.randomBytes(16); return s.toString('hex') + ':' + crypto.scryptSync(pw, s, 64).toString('hex'); };
const checkPw = (pw, stored) => { const [s, h] = stored.split(':'); const x = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64); return crypto.timingSafeEqual(x, Buffer.from(h, 'hex')); };
const sign = uid => { const body = b64(JSON.stringify({ uid, exp: Date.now() + 30 * 864e5 })); return body + '.' + crypto.createHmac('sha256', SECRET).update(body).digest('base64url'); };
const verify = tok => {
  const [body, sig] = (tok || '').split('.'); if (!body || !sig) return null;
  const good = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() ? p.uid : null;
};

// ---- rate limit (per IP, in memory)
const hits = new Map();
const limited = (ip, key, max, windowMs) => { const k = key + ip, now = Date.now(); const a = (hits.get(k) || []).filter(t => now - t < windowMs); a.push(now); hits.set(k, a); return a.length > max; };
setInterval(() => hits.clear(), 3600e3).unref();

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (s, m) => { throw new HttpError(s, m); };

const publicUser = async (u, me) => ({ id: u.id, handle: u.handle, name: u.name, bio: u.bio,
  followers: await count('SELECT COUNT(*) c FROM follows WHERE followee=$1', u.id),
  following: await count('SELECT COUNT(*) c FROM follows WHERE follower=$1', u.id),
  posts: await count('SELECT COUNT(*) c FROM posts WHERE user_id=$1', u.id),
  followedByMe: me ? !!(await one('SELECT 1 x FROM follows WHERE follower=$1 AND followee=$2', me, u.id)) : false });
const shapeAll = async (rows, me) => {
  if (!rows.length) return [];
  const ids = rows.map(r => Number(r.id)); const IN = ids.join(',');
  const [lc, mine, sv, cc, cm] = await Promise.all([
    q(`SELECT post_id, COUNT(*) c FROM likes WHERE post_id IN (${IN}) GROUP BY post_id`),
    q(`SELECT post_id FROM likes WHERE user_id=$1 AND post_id IN (${IN})`, me),
    q(`SELECT post_id FROM saves WHERE user_id=$1 AND post_id IN (${IN})`, me),
    q(`SELECT post_id, COUNT(*) c FROM comments WHERE post_id IN (${IN}) GROUP BY post_id`),
    Promise.all(ids.map(id => q('SELECT c.id, c.text, c.created, u.handle FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created DESC, c.id DESC LIMIT 3', id))),
  ]);
  const m = (a) => new Map(a.map(x => [x.post_id, Number(x.c)])); const L = m(lc), C = m(cc), M = new Set(mine.map(x => x.post_id)), S = new Set(sv.map(x => x.post_id));
  return rows.map((p, i) => ({ id: p.id, image: '/uploads/' + p.image, caption: p.caption, created: p.created, user: { id: p.user_id, handle: p.handle, name: p.name },
    likes: L.get(p.id) || 0, liked: M.has(p.id), saved: S.has(p.id), commentCount: C.get(p.id) || 0, comments: cm[i].reverse() }));
};
const shapePost = async (p, me) => (await shapeAll([p], me))[0];
const notify = (to, actor, type, post, text = '') => to === actor ? null : run('INSERT INTO notifications(user_id,actor,type,post_id,text,created) VALUES($1,$2,$3,$4,$5,$6)', to, actor, type, post, text.slice(0, 120), Date.now()).catch(() => {});
const POST_SQL = 'SELECT p.id, p.user_id, p.image, p.caption, p.created, u.handle, u.name FROM posts p JOIN users u ON u.id=p.user_id';
const page = (url, def = 20) => { const l = Math.min(Number(url.searchParams.get('limit')) || def, 50); const before = Number(url.searchParams.get('before')) || 2e9; return { l, before }; };
const userByHandle = async h => (await one('SELECT * FROM users WHERE handle_lc=$1', String(h).toLowerCase())) || bad(404, 'User not found');

const sniff = b => b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png'
  : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'webp' : null;

const stats = { n: 0, e4: 0, e5: 0, ms: 0 };
const routes = [];
const route = (method, pattern, auth, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), auth, fn });

route('POST', '/api/auth/signup', false, async ({ body, ip }) => {
  if (limited(ip, 'signup', 10, 3600e3)) bad(429, 'Too many signups, try later');
  const handle = String(body.handle || '').trim(), name = String(body.name || handle).trim().slice(0, 60), pw = String(body.password || '');
  if (!/^[a-zA-Z0-9._]{3,30}$/.test(handle)) bad(400, 'Handle must be 3-30 letters, numbers, dots or underscores');
  if (pw.length < 8) bad(400, 'Password must be at least 8 characters');
  if (await one('SELECT 1 x FROM users WHERE handle_lc=$1', handle.toLowerCase())) bad(409, 'That handle is taken');
  let u;
  try { u = await one('INSERT INTO users(handle,handle_lc,name,pw,created) VALUES($1,$2,$3,$4,$5) RETURNING *', handle, handle.toLowerCase(), name, hashPw(pw), Date.now()); }
  catch (e) { if (e.code === '23505') bad(409, 'That handle is taken'); throw e; }
  return { status: 201, data: { token: sign(u.id), user: await publicUser(u, u.id) } };
});
route('POST', '/api/auth/login', false, async ({ body, ip }) => {
  if (limited(ip, 'login', 20, 15 * 60e3)) bad(429, 'Too many attempts, try again in a few minutes');
  const u = await one('SELECT * FROM users WHERE handle_lc=$1', String(body.handle || '').toLowerCase());
  if (!u) { hashPw('x'); bad(401, 'Wrong handle or password'); }
  if (!checkPw(String(body.password || ''), u.pw)) bad(401, 'Wrong handle or password');
  return { data: { token: sign(u.id), user: await publicUser(u, u.id) } };
});
route('GET', '/api/me', true, async ({ me }) => ({ data: await publicUser(await one('SELECT * FROM users WHERE id=$1', me), me) }));
route('PATCH', '/api/me', true, async ({ me, body }) => {
  await run('UPDATE users SET name=COALESCE($1,name), bio=COALESCE($2,bio) WHERE id=$3', body.name ? String(body.name).slice(0, 60) : null, body.bio != null ? String(body.bio).slice(0, 200) : null, me);
  return { data: await publicUser(await one('SELECT * FROM users WHERE id=$1', me), me) };
});
route('GET', '/api/feed', true, async ({ me, url }) => {
  const { l, before } = page(url);
  const rows = await q(`${POST_SQL} WHERE (p.user_id=$1 OR p.user_id IN (SELECT followee FROM follows WHERE follower=$1)) AND p.id<$2 ORDER BY p.id DESC LIMIT $3`, me, before, l);
  return { data: { posts: await shapeAll(rows, me), next: rows.length === l ? rows[rows.length - 1].id : null } };
});
route('GET', '/api/explore', true, async ({ me, url }) => {
  const { l, before } = page(url, 30);
  const rows = await q(`${POST_SQL} WHERE p.id<$1 ORDER BY p.id DESC LIMIT $2`, before, l);
  return { data: { posts: await shapeAll(rows, me), next: rows.length === l ? rows[rows.length - 1].id : null } };
});
route('GET', '/api/saved', true, async ({ me }) => ({ data: { posts: await shapeAll(await q(`${POST_SQL} WHERE p.id IN (SELECT post_id FROM saves WHERE user_id=$1) ORDER BY p.id DESC LIMIT 100`, me), me) } }));
route('GET', '/api/search', true, async ({ me, url }) => {
  const s = (url.searchParams.get('q') || '').trim().replace(/[%_\\]/g, ''); if (!s) return { data: { users: [] } };
  const rows = await q('SELECT * FROM users WHERE handle_lc LIKE $1 OR lower(name) LIKE $2 LIMIT 20', s.toLowerCase() + '%', '%' + s.toLowerCase() + '%');
  return { data: { users: await Promise.all(rows.map(u => publicUser(u, me))) } };
});
route('GET', '/api/users/:handle', true, async ({ me, params }) => {
  const u = await userByHandle(params.handle);
  return { data: { user: await publicUser(u, me), posts: await shapeAll(await q(`${POST_SQL} WHERE p.user_id=$1 ORDER BY p.id DESC LIMIT 60`, u.id), me) } };
});
route('POST', '/api/users/:handle/follow', true, async ({ me, params }) => {
  const u = await userByHandle(params.handle); if (u.id === me) bad(400, 'You cannot follow yourself');
  if ((await run('INSERT INTO follows VALUES($1,$2) ON CONFLICT DO NOTHING', me, u.id)).rowCount) await notify(u.id, me, 'follow', null); return { data: await publicUser(u, me) };
});
route('DELETE', '/api/users/:handle/follow', true, async ({ me, params }) => {
  const u = await userByHandle(params.handle);
  await run('DELETE FROM follows WHERE follower=$1 AND followee=$2', me, u.id); return { data: await publicUser(u, me) };
});
route('POST', '/api/posts', true, async ({ me, body, ip }) => {
  if (limited(ip, 'post', 30, 3600e3)) bad(429, 'Posting too fast');
  const m = /^data:image\/(?:jpeg|png|webp);base64,(.+)$/.exec(String(body.image || '')) || bad(400, 'image must be a base64 data URL (jpeg, png or webp)');
  const buf = Buffer.from(m[1], 'base64'); if (!buf.length || buf.length > MAX_IMAGE) bad(413, 'Image must be under 8 MB');
  const ext = sniff(buf) || bad(400, 'Unsupported or corrupt image');
  const key = crypto.randomUUID() + '.' + ext;
  await run('INSERT INTO images(key,mime,data) VALUES($1,$2,$3)', key, MIME[ext], buf);
  const r = await one('INSERT INTO posts(user_id,image,caption,created) VALUES($1,$2,$3,$4) RETURNING id', me, key, String(body.caption || '').slice(0, 2200), Date.now());
  return { status: 201, data: await shapePost(await one(`${POST_SQL} WHERE p.id=$1`, r.id), me) };
});
const getPost = async id => { if (!/^\d{1,9}$/.test(id)) bad(404, 'Post not found'); return (await one(`${POST_SQL} WHERE p.id=$1`, Number(id))) || bad(404, 'Post not found'); };
route('DELETE', '/api/posts/:id', true, async ({ me, params }) => {
  const p = await getPost(params.id); if (p.user_id !== me) bad(403, 'Not your post');
  await run('DELETE FROM posts WHERE id=$1', p.id); await run('DELETE FROM images WHERE key=$1', p.image); return { status: 204 };
});
const toggle = (method, tail, sql, kind) => route(method, '/api/posts/:id/' + tail, true, async ({ me, params }) => { const p = await getPost(params.id); const r = await run(sql, me, p.id); if (kind && r.rowCount) await notify(p.user_id, me, kind, p.id); return { data: await shapePost(p, me) }; });
toggle('POST', 'like', 'INSERT INTO likes VALUES($1,$2) ON CONFLICT DO NOTHING', 'like');
toggle('DELETE', 'like', 'DELETE FROM likes WHERE user_id=$1 AND post_id=$2');
toggle('POST', 'save', 'INSERT INTO saves VALUES($1,$2) ON CONFLICT DO NOTHING');
toggle('DELETE', 'save', 'DELETE FROM saves WHERE user_id=$1 AND post_id=$2');
route('GET', '/api/posts/:id/comments', true, async ({ params }) => { const p = await getPost(params.id); return { data: { comments: await q('SELECT c.id,c.text,c.created,u.handle FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created, c.id', p.id) } }; });
route('POST', '/api/posts/:id/comments', true, async ({ me, params, body }) => {
  const p = await getPost(params.id); const text = String(body.text || '').trim(); if (!text || text.length > 500) bad(400, 'Comment must be 1-500 characters');
  await run('INSERT INTO comments(post_id,user_id,text,created) VALUES($1,$2,$3,$4)', p.id, me, text, Date.now()); await notify(p.user_id, me, 'comment', p.id, text); return { status: 201, data: await shapePost(p, me) };
});
route('GET', '/api/notifications', true, async ({ me }) => {
  const rows = await q('SELECT n.id,n.type,n.post_id,n.text,n.created,n.seen,u.handle,u.name,p.image FROM notifications n JOIN users u ON u.id=n.actor LEFT JOIN posts p ON p.id=n.post_id WHERE n.user_id=$1 ORDER BY n.id DESC LIMIT 60', me);
  return { data: { items: rows.map(r => ({ id: r.id, type: r.type, postId: r.post_id, text: r.text, created: r.created, seen: r.seen, user: { handle: r.handle, name: r.name }, image: r.image ? '/uploads/' + r.image : null })), unread: await count('SELECT COUNT(*) c FROM notifications WHERE user_id=$1 AND NOT seen', me) } };
});
route('POST', '/api/notifications/read', true, async ({ me }) => { await run('UPDATE notifications SET seen=TRUE WHERE user_id=$1 AND NOT seen', me); return { status: 204 }; });
route('GET', '/api/metrics', false, async ({ ip }) => ({ data: { uptimeSec: Math.round(process.uptime()), requests: stats.n, errors5xx: stats.e5, errors4xx: stats.e4, avgMs: stats.n ? Math.round(stats.ms / stats.n) : 0, memMB: Math.round(process.memoryUsage().rss / 1048576), version: '2.0' } }));
route('GET', '/api/health', false, async () => { await one('SELECT 1 x'); return { data: { ok: true } }; });

const readBody = (req, max = 12 * 1024 * 1024) => new Promise((res, rej) => {
  let n = 0; const chunks = [];
  req.on('data', c => { n += c.length; if (n > max) { rej(new HttpError(413, 'Request too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { if (!chunks.length) return res({}); try { res(JSON.parse(Buffer.concat(chunks).toString())); } catch { rej(new HttpError(400, 'Invalid JSON')); } });
  req.on('error', rej);
});

export const server = http.createServer(async (req, res) => {
  const headers = { 'access-control-allow-origin': ORIGIN, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'strict-origin-when-cross-origin', 'strict-transport-security': 'max-age=31536000; includeSubDomains', 'permissions-policy': 'camera=(), microphone=(), geolocation=()', 'content-security-policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" };
  const t0 = Date.now(); const rid = crypto.randomUUID().slice(0, 8); headers['x-request-id'] = rid;
  res.on('finish', () => { const ms = Date.now() - t0; stats.n++; stats.ms += ms; if (res.statusCode >= 500) stats.e5++; else if (res.statusCode >= 400) stats.e4++; if (process.env.NODE_ENV === 'production' && !req.url.startsWith('/assets')) console.log(JSON.stringify({ rid, m: req.method, u: req.url.split('?')[0], s: res.statusCode, ms })); });
  const send = (status, data) => { if (data === undefined) { res.writeHead(status, headers); return res.end(); } const json = Buffer.from(JSON.stringify(data));
    if (json.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { const z = zlib.gzipSync(json); res.writeHead(status, { ...headers, 'content-type': 'application/json', 'content-encoding': 'gzip', vary: 'accept-encoding' }); return res.end(z); }
    res.writeHead(status, { ...headers, 'content-type': 'application/json' }); res.end(json); };
  try {
    const url = new URL(req.url, 'http://x'); const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    if (req.method === 'OPTIONS') return send(204);
    if (url.pathname.startsWith('/uploads/') && req.method === 'GET') {
      const img = await one('SELECT mime, data FROM images WHERE key=$1', url.pathname.slice(9));
      if (!img) return send(404, { error: 'Not found' });
      res.writeHead(200, { ...headers, 'content-type': img.mime, 'content-length': img.data.length, 'cache-control': 'public, max-age=31536000, immutable' });
      return res.end(img.data);
    }
    if (req.method === 'GET' && !url.pathname.startsWith('/api/') && fs.existsSync(PUBLIC)) {
      let f = path.join(PUBLIC, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[\/\\])+/, ''));
      if (!f.startsWith(PUBLIC) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(PUBLIC, 'index.html');
      const ext = path.extname(f);
      res.writeHead(200, { ...headers, 'content-type': STATIC_MIME[ext] || 'application/octet-stream', 'cache-control': 'no-cache' });
      return fs.createReadStream(f).pipe(res);
    }
    for (const r of routes) {
      if (r.method !== req.method) continue; const m = r.re.exec(url.pathname); if (!m) continue;
      let me = null;
      if (r.auth) { me = verify((req.headers.authorization || '').replace(/^Bearer /, '')); if (!me || !(await one('SELECT 1 x FROM users WHERE id=$1', me))) return send(401, { error: 'Sign in required' }); }
      const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};
      const out = await r.fn({ me, body, url, ip, params: { ...m.groups } });
      return send(out.status || 200, out.data);
    }
    send(404, { error: 'Not found' });
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { error: e.message });
    console.error(e); send(500, { error: 'Internal error' });
  }
});
if (process.argv[1] === fileURLToPath(import.meta.url)) { await initDb(); if (process.env.SEED === '1') { try { await (await import('./seed.mjs')).seed({ q, one, run, hashPw, dir: path.join(__dir, 'seed'), MIME }); server.listen(PORT, () => console.log(`Threadline API on :${PORT}`)); } catch (e) { console.error('Seed skipped:', e.message); } } }

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 8000).unref(); });
