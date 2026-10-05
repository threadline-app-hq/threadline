// Threadline API server (PostgreSQL). Dependency: pg. Node 20+.
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {promisify} from 'node:util';
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
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id,id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created);
CREATE INDEX IF NOT EXISTS idx_comments_order ON comments(post_id,created,id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
CREATE TABLE IF NOT EXISTS messages(id SERIAL PRIMARY KEY, sender INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, recipient INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, created BIGINT NOT NULL, seen BOOLEAN NOT NULL DEFAULT FALSE);
CREATE INDEX IF NOT EXISTS idx_msg_pair ON messages(sender, recipient, id);
CREATE INDEX IF NOT EXISTS idx_msg_recipient ON messages(recipient, seen);
CREATE INDEX IF NOT EXISTS idx_msg_recipient_id ON messages(recipient,id);
CREATE TABLE IF NOT EXISTS stories(id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, image TEXT NOT NULL, created BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_stories_created ON stories(created);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_saves_post ON saves(post_id);
CREATE TABLE IF NOT EXISTS notifications(id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, actor INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, post_id INT REFERENCES posts(id) ON DELETE CASCADE, text TEXT NOT NULL DEFAULT '', created BIGINT NOT NULL, seen BOOLEAN NOT NULL DEFAULT FALSE);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id,seen);
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0`;

let pool;
export async function initDb(p) {
  pool = p || new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8,
    connectionTimeoutMillis:10000,idleTimeoutMillis:30000,query_timeout:15000,
    ssl: process.env.DATABASE_SSL === 'off' || /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '') ? false : { rejectUnauthorized: false } });
  for (const stmt of SCHEMA.split(';').map(x => x.trim()).filter(Boolean)) await pool.query(stmt);
}
const q = async (sql, ...a) => (await pool.query(sql, a)).rows;
const one = async (sql, ...a) => (await q(sql, ...a))[0];
const run = (sql, ...a) => pool.query(sql, a);
const count = async (sql, ...a) => Number((await one(sql, ...a)).c);

// ---- auth: scrypt password hashes, HMAC-signed bearer tokens (30 days)
const b64 = b => Buffer.from(b).toString('base64url');
const scrypt=promisify(crypto.scrypt);
const hashPw=async pw=>{const s=crypto.randomBytes(16);const h=await scrypt(pw,s,64);return s.toString('hex')+':'+h.toString('hex');};
const newCode = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = crypto.randomBytes(12); let o = ''; for (let i = 0; i < 12; i++) { o += a[b[i] % 32]; if (i % 4 === 3 && i < 11) o += '-'; } return o; };
const codeHash = (c, h) => crypto.createHash('sha256').update(h.toLowerCase() + ':' + String(c).toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
const checkPw=async(pw,stored)=>{const[s,h]=stored.split(':');const x=await scrypt(pw,Buffer.from(s,'hex'),64);return crypto.timingSafeEqual(x,Buffer.from(h,'hex'));};
const sign = (uid, version = 0) => { const body = b64(JSON.stringify({ uid, version, exp: Date.now() + 30 * 864e5 })); return body + '.' + crypto.createHmac('sha256', SECRET).update(body).digest('base64url'); };
const verify = tok => {
  const [body, sig] = (tok || '').split('.'); if (!body || !sig) return null;
  if(!/^[A-Za-z0-9_-]+$/.test(body)||!/^[A-Za-z0-9_-]+$/.test(sig)||tok.split('.').length!==2)return null;
  const good = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {const p=JSON.parse(Buffer.from(body,'base64url').toString());return Number.isInteger(p.uid)&&p.exp>Date.now()?{uid:p.uid,version:p.version||0}:null;}catch{return null;}
};

// ---- rate limit (per IP, in memory)
const hits = new Map();
const limited = (ip, key, max, windowMs) => { const k = key + ip, now = Date.now(); const a = (hits.get(k) || []).filter(t => now - t < windowMs); a.push(now); hits.set(k, a); return a.length > max; };
setInterval(() => hits.clear(), 3600e3).unref();

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (s, m) => { throw new HttpError(s, m); };

const publicUser = async (u, me) => ({ id: u.id, handle: u.handle, name: u.name, bio: u.bio, avatar: u.avatar ? '/uploads/' + u.avatar : null,
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
  return rows.map((p, i) => ({ id: p.id, image: '/uploads/' + p.image, caption: p.caption, created: p.created, user: { id: p.user_id, handle: p.handle, name: p.name, avatar: p.avatar ? '/uploads/' + p.avatar : null },
    likes: L.get(p.id) || 0, liked: M.has(p.id), saved: S.has(p.id), commentCount: C.get(p.id) || 0, comments: cm[i].reverse() }));
};
const shapePost = async (p, me) => (await shapeAll([p], me))[0];
const notify = (to, actor, type, post, text = '') => to === actor ? null : run('INSERT INTO notifications(user_id,actor,type,post_id,text,created) VALUES($1,$2,$3,$4,$5,$6)', to, actor, type, post, text.slice(0, 120), Date.now()).catch(() => {});
const POST_SQL = 'SELECT p.id, p.user_id, p.image, p.caption, p.created, u.handle, u.name, u.avatar FROM posts p JOIN users u ON u.id=p.user_id';
const page=(url,def=20)=>{const limit=Number(url.searchParams.get('limit'));const l=Number.isInteger(limit)&&limit>0?Math.min(limit,50):def;const cursor=Number(url.searchParams.get('before'));const before=Number.isSafeInteger(cursor)&&cursor>0?cursor:2e9;return{l,before};};
const userByHandle = async h => (await one('SELECT * FROM users WHERE handle_lc=$1', String(h).toLowerCase())) || bad(404, 'User not found');

// ---- image storage: Supabase Storage when configured (SUPABASE_URL + SUPABASE_SERVICE_KEY), else Postgres bytea. Falls back to Postgres if an upload fails.
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, ''), SB_KEY = process.env.SUPABASE_SERVICE_KEY || '', SB_BUCKET = process.env.SUPABASE_BUCKET || 'threadline';
const saveImage = async (buf, ext) => {
  if (SB_URL && SB_KEY) {
    const key = 's_' + crypto.randomUUID() + '.' + ext;
    try {
      const r = await fetch(`${SB_URL}/storage/v1/object/${SB_BUCKET}/${key}`, { method: 'POST', headers: { authorization: 'Bearer ' + SB_KEY, 'content-type': MIME[ext] }, body: buf, signal: AbortSignal.timeout(15000) });
      if (r.ok) return key; console.error('storage upload failed', r.status);
    } catch (e) { console.error('storage upload error', e.message); }
  }
  const key = crypto.randomUUID() + '.' + ext; await run('INSERT INTO images(key,mime,data) VALUES($1,$2,$3)', key, MIME[ext], buf); return key;
};
const dropImage=async key=>{if(key.startsWith('s_')&&SB_URL&&SB_KEY){try{const r=await fetch(`${SB_URL}/storage/v1/object/${SB_BUCKET}/${key}`,{method:'DELETE',headers:{authorization:'Bearer '+SB_KEY},signal:AbortSignal.timeout(15000)});if(!r.ok)console.error('storage deletion failed',r.status);}catch(e){console.error('storage deletion error',e.message);}}else await run('DELETE FROM images WHERE key=$1',key);};

const sniff = b => b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png'
  : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'webp' : null;

const stats = { n: 0, e4: 0, e5: 0, ms: 0 };
const routes = [];
const route = (method, pattern, auth, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), auth, fn });

route('POST', '/api/auth/signup', false, async ({ body, ip }) => {
  if (limited(ip, 'signup', 10, 3600e3)) bad(429, 'Too many signups, try later');
  const handle = String(body.handle || '').trim(), name = String(body.name || handle).trim().slice(0, 60), pw = String(body.password || '');
  if (!/^[a-zA-Z0-9._]{3,30}$/.test(handle)) bad(400, 'Handle must be 3-30 letters, numbers, dots or underscores');
  if(pw.length<8||pw.length>1024)bad(400,'Password must be 8-1024 characters');
  if (await one('SELECT 1 x FROM users WHERE handle_lc=$1', handle.toLowerCase())) bad(409, 'That handle is taken');
  let u; const code = newCode();
  try { u = await one('INSERT INTO users(handle,handle_lc,name,pw,created,recovery) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', handle, handle.toLowerCase(), name, await hashPw(pw), Date.now(), codeHash(code, handle)); }
  catch (e) { if (e.code === '23505') bad(409, 'That handle is taken'); throw e; }
  return { status: 201, data: { token: sign(u.id), user: await publicUser(u, u.id), recoveryCode: code } };
});
route('POST', '/api/auth/reset', false, async ({ body, ip }) => {
  if (limited(ip, 'reset', 8, 3600e3)) bad(429, 'Too many attempts, try again later');
  const pw = String(body.password || ''); if(pw.length<8||pw.length>1024)bad(400,'Password must be 8-1024 characters');
  const u = await one('SELECT * FROM users WHERE handle_lc=$1', String(body.handle || '').toLowerCase());
  const ok = u && u.recovery && crypto.timingSafeEqual(Buffer.from(codeHash(body.code || '', u.handle)), Buffer.from(u.recovery));
  if (!ok) bad(401, 'Handle or recovery code is wrong');
  const code = newCode(); const updated=await one('UPDATE users SET pw=$1, recovery=$2, session_version=session_version+1 WHERE id=$3 AND recovery=$4 RETURNING *', await hashPw(pw), codeHash(code, u.handle), u.id, u.recovery); if(!updated)bad(401,'Handle or recovery code is wrong');
  return { data: { token: sign(u.id,updated.session_version), user: await publicUser(u, u.id), recoveryCode: code } };
});
route('POST', '/api/auth/recovery-code', true, async ({ me, body }) => {
  if(limited(String(me),'recovery-code',8,3600e3))bad(429,'Too many attempts, try again later');if(String(body.password||'').length>1024)bad(400,'Password must be at most 1024 characters');const u = await one('SELECT * FROM users WHERE id=$1', me); if (!await checkPw(String(body.password || ''), u.pw)) bad(401, 'Wrong password');
  const code = newCode(); await run('UPDATE users SET recovery=$1 WHERE id=$2', codeHash(code, u.handle), me); return { data: { recoveryCode: code } };
});
route('POST', '/api/auth/login', false, async ({ body, ip }) => {
  if (limited(ip, 'login', 20, 15 * 60e3)) bad(429, 'Too many attempts, try again in a few minutes');
  if(String(body.password||'').length>1024)bad(400,'Password must be at most 1024 characters');
  const u = await one('SELECT * FROM users WHERE handle_lc=$1', String(body.handle || '').trim().toLowerCase());
  if (!u) { await hashPw('x'); bad(401, 'Wrong handle or password'); }
  if (!await checkPw(String(body.password || ''), u.pw)) bad(401, 'Wrong handle or password');
  return { data: { token: sign(u.id,u.session_version), user: await publicUser(u, u.id) } };
});
route('GET', '/api/me', true, async ({ me }) => ({ data: await publicUser(await one('SELECT * FROM users WHERE id=$1', me), me) }));
route('PATCH', '/api/me', true, async ({ me, body }) => {
  let avatarKey = null;
  if (body.avatar) {
    const m = /^data:image\/(?:jpeg|png|webp);base64,(.+)$/.exec(String(body.avatar)) || bad(400, 'avatar must be a jpeg, png or webp data URL');
    const buf = Buffer.from(m[1], 'base64'); if (!buf.length || buf.length > 1024 * 1024) bad(413, 'Avatar must be under 1 MB');
    const ext = sniff(buf) || bad(400, 'Unsupported or corrupt image'); avatarKey = await saveImage(buf, ext);
  }
  if(avatarKey){const old=await one('SELECT avatar FROM users WHERE id=$1',me);await run('UPDATE users SET avatar=$1 WHERE id=$2',avatarKey,me);if(old?.avatar)await dropImage(old.avatar);}
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
  const s = (url.searchParams.get('q') || '').trim().replace(/[%\\]/g, ''); if (!s) return { data: { users: [], posts: [] } };
  const rows = await q('SELECT * FROM users WHERE handle_lc LIKE $1 OR lower(name) LIKE $2 LIMIT 20', s.toLowerCase() + '%', '%' + s.toLowerCase() + '%');
  const prow = await q(`${POST_SQL} WHERE lower(p.caption) LIKE $1 ORDER BY p.id DESC LIMIT 30`, '%' + s.toLowerCase() + '%');
  return { data: { users: await Promise.all(rows.map(u => publicUser(u, me))), posts: await shapeAll(prow, me) } };
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
  const key = await saveImage(buf, ext);
  const r = await one('INSERT INTO posts(user_id,image,caption,created) VALUES($1,$2,$3,$4) RETURNING id', me, key, String(body.caption || '').slice(0, 2200), Date.now());
  return { status: 201, data: await shapePost(await one(`${POST_SQL} WHERE p.id=$1`, r.id), me) };
});
const getPost = async id => { if (!/^\d{1,9}$/.test(id)) bad(404, 'Post not found'); return (await one(`${POST_SQL} WHERE p.id=$1`, Number(id))) || bad(404, 'Post not found'); };
route('GET','/api/posts/:id',true,async({me,params})=>({data:await shapePost(await getPost(params.id),me)}));
route('DELETE', '/api/posts/:id', true, async ({ me, params }) => {
  const p = await getPost(params.id); if (p.user_id !== me) bad(403, 'Not your post');
  await run('DELETE FROM posts WHERE id=$1', p.id); await dropImage(p.image); return { status: 204 };
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
route('GET', '/api/stories', true, async ({ me }) => {
  const rows = await q('SELECT s.id,s.image,s.created,u.id uid,u.handle,u.name,u.avatar FROM stories s JOIN users u ON u.id=s.user_id WHERE s.created>$2 AND (s.user_id=$1 OR s.user_id IN (SELECT followee FROM follows WHERE follower=$1)) ORDER BY s.created ASC LIMIT 300', me, Date.now() - 864e5);
  const by = new Map(); for (const r of rows) { if (!by.has(r.uid)) by.set(r.uid, { user: { id: r.uid, handle: r.handle, name: r.name, avatar: r.avatar ? '/uploads/' + r.avatar : null }, items: [] }); by.get(r.uid).items.push({ id: r.id, image: '/uploads/' + r.image, created: r.created }); }
  const groups = [...by.values()].sort((a, b) => (b.user.id === me) - (a.user.id === me) || b.items.at(-1).created - a.items.at(-1).created);
  return { data: { groups } };
});
route('POST', '/api/stories', true, async ({ me, body, ip }) => {
  if (limited(ip, 'story', 30, 3600e3)) bad(429, 'Posting too fast');
  const m = /^data:image\/(?:jpeg|png|webp);base64,(.+)$/.exec(String(body.image || '')) || bad(400, 'image must be a base64 data URL (jpeg, png or webp)');
  const buf = Buffer.from(m[1], 'base64'); if (!buf.length || buf.length > MAX_IMAGE) bad(413, 'Image must be under 8 MB');
  const ext = sniff(buf) || bad(400, 'Unsupported or corrupt image'); const key = await saveImage(buf, ext);
  const r = await one('INSERT INTO stories(user_id,image,created) VALUES($1,$2,$3) RETURNING id', me, key, Date.now());
  return { status: 201, data: { id: r.id } };
});
route('GET', '/api/messages', true, async ({ me }) => {
  const rows = await q('SELECT m.id,m.sender,m.recipient,m.text,m.created,m.seen FROM messages m WHERE m.sender=$1 OR m.recipient=$1 ORDER BY m.id DESC LIMIT 400', me);
  const seen = new Map(); for (const r of rows) { const other = r.sender === me ? r.recipient : r.sender; if (!seen.has(other)) seen.set(other, { last: r, unread: 0 }); if (r.recipient === me && !r.seen) seen.get(other).unread++; }
  const out = [];
  for (const [id, v] of seen) { const u = await one('SELECT id,handle,name,avatar FROM users WHERE id=$1', id); if (u) out.push({ user: { id: u.id, handle: u.handle, name: u.name, avatar: u.avatar ? '/uploads/' + u.avatar : null }, text: v.last.text, created: v.last.created, mine: v.last.sender === me, unread: v.unread }); }
  return { data: { conversations: out, unread: out.reduce((a, c) => a + c.unread, 0) } };
});
route('GET', '/api/messages/:handle', true, async ({ me, params }) => {
  const u = await userByHandle(params.handle);
  const rows = await q('SELECT id,sender,text,created FROM messages WHERE (sender=$1 AND recipient=$2) OR (sender=$2 AND recipient=$1) ORDER BY id DESC LIMIT 100', me, u.id);
  if(rows.length)await run('UPDATE messages SET seen=TRUE WHERE recipient=$1 AND sender=$2 AND NOT seen AND id<=$3',me,u.id,rows[0].id);
  return { data: { user: { id: u.id, handle: u.handle, name: u.name, avatar: u.avatar ? '/uploads/' + u.avatar : null }, messages: rows.reverse().map(r => ({ id: r.id, mine: r.sender === me, text: r.text, created: r.created })) } };
});
route('POST', '/api/messages/:handle', true, async ({ me, params, body, ip }) => {
  if (limited(ip, 'dm', 120, 3600e3)) bad(429, 'Sending too fast');
  const u = await userByHandle(params.handle); if (u.id === me) bad(400, 'You cannot message yourself');
  const text = String(body.text || '').trim(); if (!text || text.length > 1000) bad(400, 'Message must be 1-1000 characters');
  const r = await one('INSERT INTO messages(sender,recipient,text,created) VALUES($1,$2,$3,$4) RETURNING id,created', me, u.id, text, Date.now());
  return { status: 201, data: { id: r.id, mine: true, text, created: r.created } };
});
route('GET', '/api/notifications', true, async ({ me }) => {
  const rows = await q('SELECT n.id,n.type,n.post_id,n.text,n.created,n.seen,u.handle,u.name,u.avatar,p.image FROM notifications n JOIN users u ON u.id=n.actor LEFT JOIN posts p ON p.id=n.post_id WHERE n.user_id=$1 ORDER BY n.id DESC LIMIT 60', me);
  return { data: { items: rows.map(r => ({ id: r.id, type: r.type, postId: r.post_id, text: r.text, created: r.created, seen: r.seen, user: { handle: r.handle, name: r.name, avatar: r.avatar ? '/uploads/' + r.avatar : null }, image: r.image ? '/uploads/' + r.image : null })), unread: await count('SELECT COUNT(*) c FROM notifications WHERE user_id=$1 AND NOT seen', me) } };
});
route('POST', '/api/notifications/read', true, async ({ me }) => { await run('UPDATE notifications SET seen=TRUE WHERE user_id=$1 AND NOT seen', me); return { status: 204 }; });
route('GET', '/api/metrics', false, async ({ ip }) => ({ data: { uptimeSec: Math.round(process.uptime()), requests: stats.n, errors5xx: stats.e5, errors4xx: stats.e4, avgMs: stats.n ? Math.round(stats.ms / stats.n) : 0, memMB: Math.round(process.memoryUsage().rss / 1048576), version: '2.1' } }));
route('GET', '/api/health', false, async () => { await one('SELECT 1 x'); return { data: { ok: true } }; });

const readBody = (req, max = 12 * 1024 * 1024) => new Promise((res, rej) => {
  let n=0;let tooLarge=false;const chunks=[];
  req.on('data', c => { n += c.length; if(n>max){if(!tooLarge){tooLarge=true;chunks.length=0;rej(new HttpError(413,'Request too large'));}}else if(!tooLarge)chunks.push(c); });
  req.on('end', () => { if(tooLarge)return;if (!chunks.length) return res({}); try{const value=JSON.parse(Buffer.concat(chunks).toString());if(value===null||typeof value!=='object'||Array.isArray(value))return rej(new HttpError(400,'JSON body must be an object'));res(value);}catch { rej(new HttpError(400, 'Invalid JSON')); } });
  req.on('error', rej);
});

export const server = http.createServer(async (req, res) => {
  const headers = { 'access-control-allow-origin': ORIGIN, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'strict-origin-when-cross-origin', 'strict-transport-security': 'max-age=31536000; includeSubDomains', 'permissions-policy': 'camera=(), microphone=(), geolocation=()', 'content-security-policy': "default-src 'self'; img-src 'self' data: blob: https://*.supabase.co; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" };
  const t0 = Date.now(); const rid = crypto.randomUUID().slice(0, 8); headers['x-request-id'] = rid;
  res.on('finish', () => { const ms = Date.now() - t0; stats.n++; stats.ms += ms; if (res.statusCode >= 500) stats.e5++; else if (res.statusCode >= 400) stats.e4++; if (process.env.NODE_ENV === 'production' && !req.url.startsWith('/assets')) console.log(JSON.stringify({ rid, m: req.method, u: req.url.split('?')[0], s: res.statusCode, ms })); });
  const send = (status, data) => { if (data === undefined) { res.writeHead(status, headers); return res.end(); } const json = Buffer.from(JSON.stringify(data));
    if (json.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { const z = zlib.gzipSync(json); res.writeHead(status, { ...headers, 'content-type': 'application/json', 'content-encoding': 'gzip', vary: 'accept-encoding' }); return res.end(z); }
    res.writeHead(status, { ...headers, 'content-type': 'application/json' }); res.end(json); };
  try {
    if(req.method==='HEAD')req.method='GET';
    const url = new URL(req.url, 'http://x'); const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    if (req.method === 'OPTIONS') return send(204);
    if (url.pathname.startsWith('/uploads/') && req.method === 'GET') {
      const k = url.pathname.slice(9);
      if (k.startsWith('s_') && SB_URL && /^s_[0-9a-f-]{36}\.(jpg|png|webp)$/.test(k)) { res.writeHead(302, { ...headers, location: `${SB_URL}/storage/v1/object/public/${SB_BUCKET}/${k}`, 'cache-control': 'public, max-age=31536000, immutable' }); return res.end(); }
      const img = await one('SELECT mime, data FROM images WHERE key=$1', url.pathname.slice(9));
      if (!img) return send(404, { error: 'Not found' });
      res.writeHead(200, { ...headers, 'content-type': img.mime, 'content-length': img.data.length, 'cache-control': 'public, max-age=31536000, immutable' });
      return res.end(img.data);
    }
    if (req.method === 'GET' && !url.pathname.startsWith('/api/') && fs.existsSync(PUBLIC)) {
      let f = path.join(PUBLIC, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[\/\\])+/, ''));
      if (!f.startsWith(PUBLIC) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(PUBLIC, 'index.html');
      const ext = path.extname(f);
      if (['.html','.js','.css','.svg','.json','.webmanifest'].includes(ext)&&/\bgzip\b/.test(req.headers['accept-encoding']||'')) { const stream=zlib.createGzip();res.writeHead(200,{...headers,'content-type':STATIC_MIME[ext]||'application/octet-stream','cache-control':'no-cache','content-encoding':'gzip',vary:'accept-encoding'});fs.createReadStream(f).pipe(stream).pipe(res);return; }
      res.writeHead(200,{...headers,'content-type':STATIC_MIME[ext]||'application/octet-stream','cache-control':'no-cache'});return fs.createReadStream(f).pipe(res);
    }
    for (const r of routes) {
      if (r.method !== req.method) continue; const m = r.re.exec(url.pathname); if (!m) continue;
      let me = null;
      if (r.auth) { const auth=verify((req.headers.authorization||'').replace(/^Bearer /,'')); const user=auth&&await one('SELECT session_version FROM users WHERE id=$1',auth.uid);if(!user||Number(user.session_version)!==auth.version)return send(401,{error:'Sign in required'});me=auth.uid; }
      const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};
      const out = await r.fn({ me, body, url, ip, params: { ...m.groups } });
      return send(out.status || 200, out.data);
    }
    send(404, { error: 'Not found' });
  } catch (e) {
    if(e instanceof URIError)return send(400,{error:'Invalid URL'});
    if (e instanceof HttpError) return send(e.status, { error: e.message });
    console.error(e); send(500, { error: 'Internal error' });
  }
});
if (process.argv[1] === fileURLToPath(import.meta.url)) { await initDb(); if (process.env.SEED === '1') { try { await (await import('./seed.mjs')).seed({ q, one, run, hashPw, dir: path.join(__dir, 'seed'), MIME }); } catch (e) { console.error('Seed skipped:', e.message); } } server.listen(PORT, () => console.log(`Threadline API on :${PORT}`)); }

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 8000).unref(); });
