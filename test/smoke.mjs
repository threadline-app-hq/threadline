import { newDb } from 'pg-mem'; import { server, initDb } from '../server.mjs'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const port = 18080 + Math.floor(Math.random() * 500);
const mem = newDb(); const { Pool } = mem.adapters.createPg();
await initDb(process.env.DATABASE_URL ? undefined : new Pool());
await new Promise(r => server.listen(port, r));
const p = { kill: () => server.close() };
const B = `http://localhost:${port}`;
const call = async (m, u, body, tok) => { const r = await fetch(B + u, { method: m, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: r.status === 204 ? null : await r.json().catch(() => null) }; };
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
try {
  assert.equal((await call('GET', '/api/feed')).s, 401);
  assert.equal((await call('POST', '/api/auth/signup', { handle: 'a', password: 'longenough' })).s, 400);
  const a = (await call('POST', '/api/auth/signup', { handle: 'alice', name: 'Alice', password: 'password123' })).j;
  const b = (await call('POST', '/api/auth/signup', { handle: 'bob', password: 'password123' })).j;
  assert.equal((await call('POST', '/api/auth/signup', { handle: 'ALICE', password: 'password123' })).s, 409);
  assert.equal((await call('POST', '/api/auth/login', { handle: 'alice', password: 'wrongwrong' })).s, 401);
  assert.ok((await call('POST', '/api/auth/login', { handle: 'alice', password: 'password123' })).j.token);
  const post = await call('POST', '/api/posts', { image: png, caption: 'hello' }, a.token); assert.equal(post.s, 201);
  assert.equal((await call('POST', '/api/posts', { image: 'data:image/png;base64,AAAA' }, a.token)).s, 400);
  assert.equal((await call('GET', '/api/feed', null, b.token)).j.posts.length, 0);
  await call('POST', '/api/users/alice/follow', null, b.token);
  assert.equal((await call('GET', '/api/feed', null, b.token)).j.posts.length, 1);
  const id = post.j.id;
  assert.equal((await call("POST", `/api/posts/${id}/like`, null, b.token)).j.likes, 1);
  assert.equal((await call("POST", `/api/posts/${id}/like`, null, b.token)).j.likes, 1);
  { const n = (await call('GET', '/api/notifications', null, a.token)).j; assert.equal(n.unread, 2); assert.deepEqual(n.items.map(i => i.type).sort(), ['follow', 'like']); assert.equal((await call('POST', '/api/notifications/read', null, a.token)).s, 204); assert.equal((await call('GET', '/api/notifications', null, a.token)).j.unread, 0); }
  assert.equal((await call('GET', '/api/metrics')).j.version, '2.0');
  { const r = await call('PATCH', '/api/me', { avatar: png }, a.token); assert.equal(r.s, 200); assert.ok(r.j.avatar.startsWith('/uploads/')); }
  assert.equal((await call('GET', '/api/search?q=hello', null, a.token)).j.posts.length, 1);
  assert.equal((await call('DELETE', `/api/posts/${id}/like`, null, b.token)).j.likes, 0);
  assert.equal((await call('POST', `/api/posts/${id}/comments`, { text: 'nice' }, b.token)).j.commentCount, 1);
  assert.equal((await call('POST', `/api/posts/${id}/save`, null, b.token)).j.saved, true);
  assert.equal((await call('GET', '/api/saved', null, b.token)).j.posts.length, 1);
  assert.equal((await call('GET', '/api/search?q=ali', null, b.token)).j.users[0].handle, 'alice');
  assert.equal((await call('DELETE', `/api/posts/${id}`, null, b.token)).s, 403);
  const img = await fetch(B + post.j.image); assert.equal(img.status, 200); assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal((await call('DELETE', `/api/posts/${id}`, null, a.token)).s, 204);
  console.log('All smoke tests passed');
} catch (e) { console.error(e); process.exitCode = 1; } finally { p.kill(); setTimeout(() => process.exit(), 100); }
