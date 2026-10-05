import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, hasToken, setToken, setOnAuthLost, img, Post, User, Comment } from './api';
import './style.css';

type Tab = 'home' | 'explore' | 'create' | 'saved' | 'profile';
const Ic = ({ d, fill, size = 24 }: { d: string; fill?: boolean; size?: number }) =>
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const I = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5', plus: 'M12 5v14M5 12h14',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  comment: 'M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.5A8.4 8.4 0 1 1 21 11.5z', bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', close: 'M18 6L6 18M6 6l12 12', moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
};
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const ring = (h: number) => `conic-gradient(from 200deg, hsl(${h} 90% 60%), hsl(${h + 60} 90% 58%), hsl(${h + 120} 90% 60%), hsl(${h} 90% 60%))`;
const ago = (t: number) => { const s = Math.max(1, (Date.now() - t) / 1000); return s < 60 ? 'now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; };

function Avatar({ handle, name, size = 40, story }: { handle: string; name?: string; size?: number; story?: boolean }) {
  const h = hue(handle);
  return <span className="av-wrap" style={{ width: size + (story ? 8 : 0), height: size + (story ? 8 : 0), background: story ? ring(h) : 'transparent' }}>
    <span className="av" style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, hsl(${h} 70% 62%), hsl(${h + 50} 70% 48%))` }}>{(name || handle)[0].toUpperCase()}</span></span>;
}

async function toDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file); const max = 1440; const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.85);
}

function Auth({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login'); const [handle, setHandle] = useState(''); const [name, setName] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setErr(''); setBusy(true);
    try { const r = mode === 'login' ? await api.login(handle, pw) : await api.signup(handle, name || handle, pw); setToken(r.token); onAuth(r.user); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); } };
  return <div className="authwrap"><form className="authcard" onSubmit={submit}>
    <h1 className="logo">Threadline</h1><p className="tag">Photos from people you care about.</p>
    <input placeholder="Username" value={handle} onChange={e => setHandle(e.target.value)} autoCapitalize="none" autoComplete="username" required />
    {mode === 'signup' && <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />}
    <input placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 8 : 1} />
    {err && <p className="err" role="alert">{err}</p>}
    <button className="primary" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
    <p className="swap">{mode === 'login' ? 'New here?' : 'Have an account?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }}>{mode === 'login' ? 'Sign up' : 'Log in'}</button></p>
  </form></div>;
}

function PostCard({ post, me, onChange, onOpen, onUser, onDelete }: { post: Post; me: User; onChange: (p: Post) => void; onOpen?: () => void; onUser: (h: string) => void; onDelete: (id: number) => void }) {
  const [text, setText] = useState(''); const [burst, setBurst] = useState(false); const [err, setErr] = useState('');
  const act = async (f: () => Promise<Post>) => { try { onChange(await f()); } catch (e: any) { setErr(e.message); } };
  const like = () => act(() => api.like(post.id, !post.liked));
  const dbl = () => { setBurst(true); setTimeout(() => setBurst(false), 700); if (!post.liked) like(); };
  const send = async (e: React.FormEvent) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(''); act(() => api.comment(post.id, t)); };
  return <article className="post">
    <header><button onClick={() => onUser(post.user.handle)}><Avatar handle={post.user.handle} name={post.user.name} size={32} /></button><div><b>{post.user.handle}</b></div><span className="ago">{ago(post.created)}</span>
      {post.user.id === me.id && <button className="out" aria-label="Delete post" onClick={() => confirm('Delete this post?') && onDelete(post.id)}><Ic d={I.trash} size={18} /></button>}</header>
    <div className="media" onDoubleClick={dbl}><img src={img(post.image)} alt={post.caption || 'Photo'} loading="lazy" />{burst && <span className="burst" aria-hidden><Ic d={I.heart} fill size={90} /></span>}</div>
    <div className="actions">
      <button key={'l' + post.liked} className={post.liked ? 'liked pulse' : ''} onClick={like} aria-label="Like"><Ic d={I.heart} fill={post.liked} /></button>
      <button onClick={onOpen} aria-label="Comments"><Ic d={I.comment} /></button>
      <button key={'s' + post.saved} className={'push' + (post.saved ? ' pulse' : '')} onClick={() => act(() => api.save(post.id, !post.saved))} aria-label="Save"><Ic d={I.bookmark} fill={post.saved} /></button>
    </div>
    <div className="meta"><b key={post.likes} className="count">{post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}</b>
      {post.caption && <p><b>{post.user.handle}</b> {post.caption}</p>}
      {post.comments.map(c => <p key={c.id}><b>{c.handle}</b> {c.text}</p>)}
      {post.commentCount > post.comments.length && <button className="link" onClick={onOpen}>View all {post.commentCount} comments</button>}
      {err && <p className="err">{err}</p>}</div>
    <form className="comment" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment…" maxLength={500} /><button disabled={!text.trim()}>Post</button></form>
  </article>;
}

function Modal({ post, me, onChange, onClose, onUser, onDelete }: { post: Post; me: User; onChange: (p: Post) => void; onClose: () => void; onUser: (h: string) => void; onDelete: (id: number) => void }) {
  const [all, setAll] = useState<Comment[]>([]);
  useEffect(() => { api.comments(post.id).then(r => setAll(r.comments)).catch(() => {}); }, [post.id, post.commentCount]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="scrim" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
    <button className="x" onClick={onClose} aria-label="Close"><Ic d={I.close} /></button>
    <PostCard post={{ ...post, comments: all.length ? all : post.comments }} me={me} onChange={onChange} onUser={h => { onClose(); onUser(h); }} onDelete={id => { onClose(); onDelete(id); }} /></div></div>;
}

const Grid = ({ posts, onOpen }: { posts: Post[]; onOpen: (p: Post) => void }) => !posts.length ? <p className="empty">Nothing here yet.</p> :
  <div className="grid">{posts.map(p => <button key={p.id} onClick={() => onOpen(p)}><img src={img(p.image)} alt="" loading="lazy" />
    <span className="hover"><Ic d={I.heart} fill size={18} /> {p.likes} <Ic d={I.comment} fill size={18} /> {p.commentCount}</span></button>)}</div>;

function Create({ done }: { done: () => void }) {
  const [src, setSrc] = useState<string>(); const [cap, setCap] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const ref = useRef<HTMLInputElement>(null);
  return <div className="create"><h2>New post</h2>
    <div className={'drop' + (src ? ' has' : '')} onClick={() => ref.current?.click()}>{src ? <img src={src} alt="Preview" /> : <><Ic d={I.plus} size={36} /><p>Choose a photo</p></>}</div>
    <input ref={ref} type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) { try { setSrc(await toDataUrl(f)); setErr(''); } catch { setErr('That file could not be read as an image.'); } } }} />
    <textarea placeholder="Write a caption…" value={cap} onChange={e => setCap(e.target.value)} rows={3} maxLength={2200} />
    {err && <p className="err">{err}</p>}
    <button className="primary" disabled={!src || busy} onClick={async () => { setBusy(true); try { await api.createPost(src!, cap); done(); } catch (e: any) { setErr(e.message); setBusy(false); } }}>{busy ? 'Sharing…' : 'Share'}</button></div>;
}

export function App() {
  const [me, setMe] = useState<User | null>(null); const [ready, setReady] = useState(!hasToken());
  const [tab, setTab] = useState<Tab>('home'); const [feed, setFeed] = useState<Post[]>([]); const [explore, setExplore] = useState<Post[]>([]); const [saved, setSaved] = useState<Post[]>([]);
  const [prof, setProf] = useState<{ user: User; posts: Post[] } | null>(null); const [open, setOpen] = useState<Post | null>(null); const [dark, setDark] = useState(() => localStorage.getItem('tl_dark') === '1');
  const [q, setQ] = useState(''); const [results, setResults] = useState<User[]>([]); const [toast, setToast] = useState(''); const [loading, setLoading] = useState(false);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };
  useEffect(() => { setOnAuthLost(() => { setMe(null); }); if (hasToken()) api.me().then(setMe).catch(() => setToken('')).finally(() => setReady(true)); }, []);
  useEffect(() => { localStorage.setItem('tl_dark', dark ? '1' : '0'); }, [dark]);
  const loadProfile = useCallback(async (h: string) => { try { setProf(await api.profile(h)); setTab('profile'); } catch (e: any) { say(e.message); } }, []);
  const refresh = useCallback(async () => {
    if (!me) return; setLoading(true);
    try { const [f, e, s] = await Promise.all([api.feed(), api.explore(), api.saved()]); setFeed(f.posts); setExplore(e.posts); setSaved(s.posts); if (tab === 'profile' && prof) setProf(await api.profile(prof.user.handle)); } catch (e: any) { say(e.message); } finally { setLoading(false); }
  }, [me, tab, prof?.user.handle]);
  useEffect(() => { if (me) refresh(); }, [me, tab]);
  useEffect(() => { if (!q.trim()) { setResults([]); return; } const t = setTimeout(() => api.search(q).then(r => setResults(r.users)).catch(() => {}), 250); return () => clearTimeout(t); }, [q]);
  const upd = (p: Post) => { const m = (l: Post[]) => l.map(x => x.id === p.id ? p : x); setFeed(m); setExplore(m); setSaved(s => p.saved ? (s.some(x => x.id === p.id) ? m(s) : [p, ...s]) : s.filter(x => x.id !== p.id)); setProf(pr => pr && { ...pr, posts: m(pr.posts) }); setOpen(o => o && o.id === p.id ? p : o); };
  const del = async (id: number) => { try { await api.deletePost(id); const f = (l: Post[]) => l.filter(x => x.id !== id); setFeed(f); setExplore(f); setSaved(f); setProf(pr => pr && { ...pr, posts: f(pr.posts) }); say('Post deleted'); } catch (e: any) { say(e.message); } };
  const follow = async (u: User) => { try { const nu = await api.follow(u.handle, !u.followedByMe); setResults(r => r.map(x => x.id === nu.id ? nu : x)); setProf(p => p && p.user.id === nu.id ? { ...p, user: nu } : p); api.feed().then(r => setFeed(r.posts)); } catch (e: any) { say(e.message); } };
  const logout = () => { setToken(''); setMe(null); setFeed([]); setProf(null); setTab('home'); };
  const cls = 'ig' + (dark ? ' dark' : '');
  if (!ready) return <div className={cls}><div className="loading"><span className="spinner" /></div></div>;
  if (!me) return <div className={cls}><Auth onAuth={u => { setMe(u); setTab('home'); }} /></div>;
  const nav: [Tab, string][] = [['home', I.home], ['explore', I.search], ['create', I.plus], ['saved', I.bookmark], ['profile', I.user]];
  const go = (t: Tab) => { if (t === 'profile') loadProfile(me.handle); else setTab(t); };
  const card = (p: Post) => <PostCard key={p.id} post={p} me={me} onChange={upd} onOpen={() => setOpen(p)} onUser={loadProfile} onDelete={del} />;
  return <div className={cls}>
    <aside className="side"><h1 className="logo">Threadline</h1>
      {nav.map(([t, d]) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => go(t)}><Ic d={d} fill={tab === t && t !== 'create'} /><span>{t[0].toUpperCase() + t.slice(1)}</span></button>)}
      <button className="push" onClick={() => setDark(!dark)}><Ic d={I.moon} /><span>{dark ? 'Light' : 'Dark'} mode</span></button>
      <button onClick={logout}><Ic d={I.close} /><span>Log out</span></button></aside>
    <header className="top"><h1 className="logo">Threadline</h1><span><button onClick={() => setDark(!dark)} aria-label="Toggle dark mode"><Ic d={I.moon} /></button> <button onClick={logout} aria-label="Log out"><Ic d={I.close} /></button></span></header>
    <main key={tab + (prof?.user.handle || '')} className="page">
      {tab === 'home' && <div className="home"><section className="col">
        {feed.length === 0 && !loading && <div className="empty"><p><b>Your feed is empty.</b></p><p>Follow people on Explore, or share your first photo.</p><p><button className="primary sm" onClick={() => setTab('explore')}>Find people</button></p></div>}
        {feed.map(card)}</section>
        <aside className="rail"><div className="meu"><Avatar handle={me.handle} name={me.name} size={46} /><div><b>{me.handle}</b><small>{me.name}</small></div></div></aside></div>}
      {tab === 'explore' && <div className="wide"><div className="search"><Ic d={I.search} size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people" /></div>
        {q ? <>{results.filter(u => u.id !== me.id).map(u => <div key={u.id} className="sug big"><button onClick={() => loadProfile(u.handle)}><Avatar handle={u.handle} name={u.name} size={44} /></button><div><b>{u.handle}</b><small>{u.name} · {u.followers} followers</small></div><button className={u.followedByMe ? 'ghost' : 'primary sm'} onClick={() => follow(u)}>{u.followedByMe ? 'Following' : 'Follow'}</button></div>)}
          {!results.length && <p className="empty">No people found.</p>}</> : <Grid posts={explore} onOpen={setOpen} />}</div>}
      {tab === 'create' && <Create done={() => { say('Posted'); loadProfile(me.handle); }} />}
      {tab === 'saved' && <div className="wide"><h2>Saved</h2><Grid posts={saved} onOpen={setOpen} /></div>}
      {tab === 'profile' && prof && <div className="wide"><div className="prof"><Avatar handle={prof.user.handle} name={prof.user.name} size={96} story /><div><h2>{prof.user.handle}
        {prof.user.id !== me.id && <button className={prof.user.followedByMe ? 'ghost' : 'primary sm'} onClick={() => follow(prof.user)}>{prof.user.followedByMe ? 'Following' : 'Follow'}</button>}</h2>
        <div className="stats"><span><b>{prof.user.posts}</b> posts</span><span><b>{prof.user.followers}</b> followers</span><span><b>{prof.user.following}</b> following</span></div><p><b>{prof.user.name}</b><br />{prof.user.bio}</p></div></div><Grid posts={prof.posts} onOpen={setOpen} /></div>}
    </main>
    <nav className="bottom">{nav.map(([t, d]) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => go(t)} aria-label={t}><Ic d={d} fill={tab === t && t !== 'create'} /></button>)}</nav>
    {open && <Modal post={open} me={me} onChange={upd} onClose={() => setOpen(null)} onUser={loadProfile} onDelete={del} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
