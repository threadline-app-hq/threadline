// Query-batching contract test. Populated feed/profile/search must keep
// exact response contracts while using a bounded query count (no per-post
// or per-user N+1). Run with CAPTURE=<file> to record the reference
// responses, CHECK=<file> to deep-compare against them.
import { newDb } from 'pg-mem'; import { server, initDb } from '../server.mjs'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const port = 19000 + Math.floor(Math.random() * 500);
const mem = newDb(); const { Pool } = mem.adapters.createPg(); const pool = new Pool();
await initDb(pool);
await new Promise(r => server.listen(port, r));
const B = `http://localhost:${port}`;
const call = async (m, u, body, tok) => { const r = await fetch(B + u, { method: m, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: r.status === 204 ? null : await r.json().catch(() => null) }; };
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
try {
  const alice = (await call('POST', '/api/auth/signup', { handle: 'alice', name: 'Alice', password: 'password123' })).j;
  const bob = (await call('POST', '/api/auth/signup', { handle: 'bob', password: 'password123' })).j;
  const cara = (await call('POST', '/api/auth/signup', { handle: 'cara', password: 'password123' })).j;
  await call('POST', '/api/users/alice/follow', null, bob.token);
  const ids = [];
  for (let i = 0; i < 5; i++) ids.push((await call('POST', '/api/posts', { image: png, caption: 'post ' + i }, alice.token)).j.id);
  for (let i = 0; i < 5; i++) await pool.query('UPDATE posts SET created=$1 WHERE id=$2', [1000 + i, ids[i]]);
  const seedComment = (postId, userId, text, created) => pool.query('INSERT INTO comments(post_id,user_id,text,created) VALUES($1,$2,$3,$4)', [postId, userId, text, created]);
  for (let i = 0; i < 6; i++) await seedComment(ids[0], i % 2 ? 3 : 2, 'c' + i, 100 + i); // preview keeps c3,c4,c5 ascending
  await seedComment(ids[1], 2, 'early', 50); await seedComment(ids[1], 3, 'late', 60);
  await seedComment(ids[3], 2, 'tie1', 70); await seedComment(ids[3], 3, 'tie2', 70); await seedComment(ids[3], 2, 'tie3', 70); // created tie -> id order
  await call('POST', `/api/posts/${ids[0]}/like`, null, bob.token);
  await call('POST', `/api/posts/${ids[0]}/save`, null, bob.token);
  await call('POST', `/api/posts/${ids[1]}/like`, null, cara.token);

  let queries = 0; const orig = pool.query.bind(pool);
  pool.query = (...a) => { queries++; return orig(...a); };
  const feed = (await call('GET', '/api/feed?limit=5', null, bob.token)).j; const feedQ = queries; queries = 0;
  const prof = (await call('GET', '/api/users/alice', null, bob.token)).j; const profQ = queries; queries = 0;
  const srch = (await call('GET', '/api/search?q=a', null, bob.token)).j; const srchQ = queries; queries = 0;
  const meRes = (await call('GET', '/api/me', null, bob.token)).j; const meQ = queries; queries = 0;

  if (process.env.CAPTURE) {
    fs.writeFileSync(process.env.CAPTURE, JSON.stringify({ feed, prof, srch, meRes, feedQ, profQ, srchQ, meQ }, null, 1));
    console.log('captured. queries:', JSON.stringify({ feedQ, profQ, srchQ, meQ }));
  } else {
    // --- exact response contract
    assert.equal(feed.posts.length, 5);
    const byId = Object.fromEntries(feed.posts.map(p => [p.id, p]));
    assert.deepEqual(byId[ids[0]].comments.map(c => c.text), ['c3', 'c4', 'c5']);
    assert.deepEqual(byId[ids[1]].comments.map(c => c.text), ['early', 'late']);
    assert.deepEqual(byId[ids[2]].comments, []);
    assert.deepEqual(byId[ids[3]].comments.map(c => c.text), ['tie1', 'tie2', 'tie3']);
    assert.deepEqual(byId[ids[4]].comments, []);
    assert.equal(byId[ids[0]].commentCount, 6);
    assert.equal(byId[ids[1]].commentCount, 2);
    assert.equal(byId[ids[3]].commentCount, 3);
    assert.equal(byId[ids[0]].likes, 1); assert.equal(byId[ids[0]].liked, true); assert.equal(byId[ids[0]].saved, true);
    assert.equal(byId[ids[1]].likes, 1); assert.equal(byId[ids[1]].liked, false); assert.equal(byId[ids[1]].saved, false);
    // comment object shape: exactly id/text/created/handle
    assert.deepEqual(Object.keys(byId[ids[0]].comments[0]).sort(), ['created', 'handle', 'id', 'text']);
    assert.equal(byId[ids[0]].comments[2].handle, 'cara'); // c5 was by cara (user id 3)
    // profile contract
    assert.equal(prof.user.handle, 'alice');
    assert.equal(prof.user.followers, 1); assert.equal(prof.user.following, 0); assert.equal(prof.user.posts, 5);
    assert.equal(prof.user.followedByMe, true);
    assert.equal(prof.posts.length, 5);
    // /api/me contract
    assert.equal(meRes.handle, 'bob'); assert.equal(meRes.following, 1); assert.equal(meRes.followedByMe, false);
    // search contract: 'a' matches alice+cara users, no captions
    assert.deepEqual(srch.users.map(u => u.handle).sort(), ['alice', 'cara']);
    assert.equal(srch.users.find(u => u.handle === 'cara').followedByMe, false);
    assert.equal(srch.posts.length, 0);
    if (process.env.CHECK) {
      const ref = JSON.parse(fs.readFileSync(process.env.CHECK, 'utf8'));
      const strip = o => JSON.parse(JSON.stringify(o, (k, v) => k === 'image' && typeof v === 'string' && v.startsWith('/uploads/') ? '/uploads/*' : v)); // upload keys are random UUIDs
      assert.deepEqual(strip({ feed, prof, srch, meRes }), strip({ feed: ref.feed, prof: ref.prof, srch: ref.srch, meRes: ref.meRes }));
      console.log('responses identical to pre-change capture. baseline queries:', JSON.stringify({ feedQ: ref.feedQ, profQ: ref.profQ, srchQ: ref.srchQ, meQ: ref.meQ }));
    }
    // --- query-count ceiling (auth 1 + route queries)
    assert.ok(feedQ <= 7, `feed queries ${feedQ} > 7`);
    assert.ok(profQ <= 9, `profile queries ${profQ} > 9`);
    assert.ok(srchQ <= 6, `search queries ${srchQ} > 6`);
    assert.ok(meQ <= 3, `me queries ${meQ} > 3`);
    console.log('queries now:', JSON.stringify({ feedQ, profQ, srchQ, meQ }));
    console.log('query-batching tests passed');
  }
} catch (e) { console.error(e); process.exitCode = 1; } finally { server.close(); setTimeout(() => process.exit(), 100); }
