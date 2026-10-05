import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, hasToken, setToken, setOnAuthLost, img, Post, User, Comment, Notif, Convo, Msg, Mini, StoryGroup } from './api';
import { Landing } from './Landing';
import './style.css';

type Tab = 'home' | 'explore' | 'create' | 'messages' | 'activity' | 'saved' | 'profile';
const Ic = ({ d, fill, size = 24 }: { d: string; fill?: boolean; size?: number }) =>
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const I = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5', plus: 'M12 5v14M5 12h14',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  comment: 'M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.5A8.4 8.4 0 1 1 21 11.5z', bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', close: 'M18 6L6 18M6 6l12 12', moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
};
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const ring = (h: number) => `conic-gradient(from 200deg, hsl(${h} 90% 60%), hsl(${h + 60} 90% 58%), hsl(${h + 120} 90% 60%), hsl(${h} 90% 60%))`;
const ago = (t: number) => { const s = Math.max(1, (Date.now() - t) / 1000); return s < 60 ? 'now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; };

function Avatar({ handle, name, size = 40, story, src }: { handle: string; name?: string; size?: number; story?: boolean; src?: string | null }) {
  const h = hue(handle);
  return <span className="av-wrap" style={{ width: size + (story ? 8 : 0), height: size + (story ? 8 : 0), background: story ? ring(h) : 'transparent' }}>
    <span className="av" style={{ width: size, height: size, fontSize: size * 0.4, background: src ? `center/cover url(${img(src)})` : `linear-gradient(135deg, hsl(${h} 70% 62%), hsl(${h + 50} 70% 48%))` }}>{src ? '' : (name || handle)[0].toUpperCase()}</span></span>;
}

async function toDataUrl(file: File, maxSide = 1440): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB'); const bmp = await createImageBitmap(file); const max = maxSide; const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height); bmp.close(); return c.toDataURL('image/jpeg', 0.85);
}

function Auth({ onAuth, initial = 'login', onBack }: { onAuth: (u: User) => void; initial?: 'login' | 'signup'; onBack?: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initial); const [code, setCode] = useState(''); const [shown, setShown] = useState<{ code: string; user: User } | null>(null); const [handle, setHandle] = useState(''); const [name, setName] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setErr(''); setBusy(true);
    try { const r: any = mode === 'login' ? await api.login(handle, pw) : mode === 'reset' ? await api.reset(handle, code, pw) : await api.signup(handle, name || handle, pw); setToken(r.token); if (r.recoveryCode) setShown({ code: r.recoveryCode, user: r.user }); else onAuth(r.user); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); } };
  if (shown) return <div className="authwrap"><div className="authcard"><h1 className="logo" style={{ fontSize: 28 }}>Save your recovery code</h1><p className="tag">If you forget your password, this code is the only way back in. We never email you, so write it down.</p>
    <div className="rcode" data-testid="recovery-code">{shown.code}</div>
    <button type="button" className="ghost" onClick={async e => {const button=e.currentTarget;try { await navigator.clipboard.writeText(shown.code); button.textContent='Copied'; } catch { setErr('Copy is unavailable. Select and save the code manually.'); } }}>Copy code</button>
    <p className="mut tiny">Keep this private, just like your password.</p>{err && <p className="err" role="alert">{err}</p>}<button className="primary" onClick={() => onAuth(shown.user)}>I saved it, continue</button></div></div>;
  return <div className="authwrap"><form className="authcard" onSubmit={submit}>
    {onBack && <button type="button" className="back" onClick={onBack}>← Back</button>}<h1 className="logo">Threadline <span className="v2">2.0</span></h1><p className="tag">Your people. Your perspective.</p>
    <input aria-label="Username" placeholder="Username" value={handle} onChange={e => setHandle(e.target.value)} autoCapitalize="none" autoComplete="username" required />
    {mode === 'signup' && <input aria-label="Full name" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />}
    {mode === 'reset' && <input aria-label="Recovery code" placeholder="Recovery code (XXXX-XXXX-XXXX)" value={code} onChange={e => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" required />}
    <input aria-label={mode === 'reset' ? 'New password' : 'Password'} placeholder={mode === 'reset' ? 'New password' : 'Password'} type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 8} />
    {err && <p className="err" role="alert">{err}</p>}
    <button className="primary" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Log in' : mode === 'reset' ? 'Reset password' : 'Sign up'}</button>
    {mode === 'login' && <p className="swap"><button type="button" onClick={() => { setMode('reset');setPw('');setCode('');setErr(''); }}>Forgot password?</button></p>}
    <p className="swap">{mode === 'login' ? 'New here?' : mode === 'reset' ? 'Remembered it?' : 'Have an account?'} <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : mode === 'reset' ? 'login' : 'signup');setPw('');setCode('');setErr(''); }}>{mode === 'login' ? 'Sign up' : 'Log in'}</button></p>
  </form></div>;
}

function PostCard({ post, me, onChange, onOpen, onUser, onDelete }: { post: Post; me: User; onChange: (p: Post) => void; onOpen?: () => void; onUser: (h: string) => void; onDelete: (id: number) => void }) {
  const [text, setText] = useState(''); const [burst, setBurst] = useState(false); const [err, setErr] = useState(''); const [pending, setPending] = useState(false); const [deleting,setDeleting]=useState(false);const tapped = useRef({time:0,x:0,y:0}); const burstTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(burstTimer.current), []);
  const act = async (f: () => Promise<Post>) => { if (pending) return; setPending(true); setErr(''); try { onChange(await f()); return true; } catch (e: any) { setErr(e.message); return false; } finally { setPending(false); } };
  const like = () => act(() => api.like(post.id, !post.liked));
  const dbl = () => { setBurst(true); clearTimeout(burstTimer.current); burstTimer.current = setTimeout(() => setBurst(false), 700); if (!post.liked) like(); };
  const send = async (e: React.FormEvent) => { e.preventDefault(); const t = text.trim(); if (!t) return; if (await act(() => api.comment(post.id, t))) setText(''); };
  return <article className="post">
    <header><button aria-label={"Open profile of " + post.user.handle} onClick={() => onUser(post.user.handle)}><Avatar handle={post.user.handle} name={post.user.name} size={32} src={post.user.avatar} /></button><div><b>{post.user.handle}</b></div><span className="ago">{ago(post.created)}</span>
      {post.user.id === me.id && <button className="out" aria-label="Delete post" onClick={() => setDeleting(v=>!v)} aria-expanded={deleting}><Ic d={I.trash} size={18} /></button>}</header>
    {deleting&&<div className="delete-confirm" role="alert"><p>Delete this photo? This cannot be undone.</p><div><button className="ghost" onClick={()=>setDeleting(false)}>Keep photo</button><button className="danger" onClick={()=>{setDeleting(false);onDelete(post.id);}}>Delete photo</button></div></div>}
    <div className="media" onDoubleClick={e => { if (e.nativeEvent instanceof MouseEvent && !(e.nativeEvent as any).sourceCapabilities?.firesTouchEvents) dbl(); }} onPointerUp={e => { if (e.pointerType !== 'touch') return; const now=performance.now(); const last=tapped.current; if (now-last.time<300 && Math.abs(e.clientX-last.x)<30 && Math.abs(e.clientY-last.y)<30) { dbl(); tapped.current={time:0,x:0,y:0}; } else tapped.current={time:now,x:e.clientX,y:e.clientY}; }}><img src={img(post.image)} alt={post.caption || 'Photo'} loading="lazy" />{burst && <span className="burst" aria-hidden><Ic d={I.heart} fill size={90} /></span>}</div>
    <div className="actions">
      <button key={'l' + post.liked} className={post.liked ? 'liked pulse' : ''} disabled={pending} onClick={like} aria-label={post.liked ? "Unlike" : "Like"} aria-pressed={post.liked}><Ic d={I.heart} fill={post.liked} /></button>
      <button onClick={onOpen} aria-label="View comments"><Ic d={I.comment} /></button>
      <button key={'s' + post.saved} className={'push' + (post.saved ? ' pulse' : '')} onClick={() => act(() => api.save(post.id, !post.saved))} disabled={pending} aria-label={post.saved ? "Unsave" : "Save"} aria-pressed={post.saved}><Ic d={I.bookmark} fill={post.saved} /></button>
    </div>
    <div className="meta"><b key={post.likes} className="count">{post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}</b>
      {post.caption && <p><b>{post.user.handle}</b> {post.caption}</p>}
      {post.comments.map(c => <p key={c.id}><b>{c.handle}</b> {c.text}</p>)}
      {post.commentCount > post.comments.length && <button className="link" onClick={onOpen}>View all {post.commentCount} comments</button>}
      {err && <p className="err" role="alert">{err}</p>}</div>
    <form className="comment" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} aria-label="Add a comment" placeholder="Add a comment…" maxLength={500} /><button disabled={!text.trim() || pending}>Post</button></form>
  </article>;
}

function useDialog(onClose: () => void) {
  const ref=useRef<HTMLDivElement>(null);
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{const old=document.activeElement as HTMLElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';const el=ref.current;el?.focus();
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current();}if(e.key==='Tab'&&el){const a=Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]):not([type=hidden]),textarea,a[href]')).filter(x=>x.offsetParent!==null);if(!a.length){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===a[0]||document.activeElement===el)){e.preventDefault();a[a.length-1]?.focus();}else if(!e.shiftKey&&(document.activeElement===a[a.length-1]||document.activeElement===el)){e.preventDefault();a[0].focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);old?.focus();};},[]);return ref;
}
function Modal({ post, me, onChange, onClose, onUser, onDelete }: { post: Post; me: User; onChange: (p: Post) => void; onClose: () => void; onUser: (h: string) => void; onDelete: (id: number) => void }) {
  const dialog=useDialog(onClose); const [all, setAll] = useState<Comment[]>([]);
  useEffect(() => { api.comments(post.id).then(r => setAll(r.comments)).catch(() => {}); }, [post.id, post.commentCount]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="scrim" onClick={onClose}><div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Post and comments" className="modal" onClick={e => e.stopPropagation()}>
    <button className="x" onClick={onClose} aria-label="Close"><Ic d={I.close} /></button>
    <PostCard post={{ ...post, comments: all.length ? all : post.comments }} me={me} onChange={onChange} onUser={h => { onClose(); onUser(h); }} onDelete={id => { onClose(); onDelete(id); }} /></div></div>;
}

const Grid = ({ posts, onOpen }: { posts: Post[]; onOpen: (p: Post) => void }) => !posts.length ? <p className="empty">Nothing here yet.</p> :
  <div className="grid">{posts.map(p => <button aria-label={"Open photo by " + p.user.handle + (p.caption ? ": " + p.caption : "")} key={p.id} onClick={() => onOpen(p)}><img src={img(p.image)} alt="" loading="lazy" />
    <span className="hover"><Ic d={I.heart} fill size={18} /> {p.likes} <Ic d={I.comment} fill size={18} /> {p.commentCount}</span></button>)}</div>;

function Create({ done }: { done: () => void }) {
  const [src, setSrc] = useState<string>();const [fileName,setFileName]=useState('');const [reading,setReading]=useState(false);const [dragging,setDragging]=useState(false); const [cap, setCap] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const ref = useRef<HTMLInputElement>(null);const pickId=useRef(0);
  const pick=async(f?:File)=>{if(!f)return;const id=++pickId.current;setReading(true);setErr('');try{const data=await toDataUrl(f);if(id===pickId.current){setSrc(data);setFileName(f.name);}}catch(x:any){if(id===pickId.current)setErr(x.message||'That file could not be read as an image.');}finally{if(id===pickId.current)setReading(false);}};
  return <div className="create"><div className="section-heading"><p className="eyebrow">Make a moment</p><h2>New post</h2><p>Something small. Something worth sharing.</p></div>
    <button type="button" aria-label="Choose a photo" className={'drop' + (src ? ' has' : '')+(dragging?' dragging':'')} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);pick(e.dataTransfer.files[0]);}} onClick={() => ref.current?.click()}>{reading?<span className="spinner" aria-label="Reading photo"/>:src ? <img src={src} alt="Preview" /> : <><Ic d={I.plus} size={36} /><p>Choose a photo</p><small>JPG, PNG or WebP</small></>}</button>
    <input ref={ref} type="file" accept="image/*" hidden onChange={e=>{pick(e.target.files?.[0]);e.target.value='';}} />
    {fileName&&<div className="file-note"><span>{fileName}</span><button type="button" className="link" onClick={()=>{pickId.current++;setReading(false);setSrc(undefined);setFileName('');}}>Remove</button></div>}<textarea aria-label="Caption" placeholder="Write a caption…" value={cap} onChange={e => setCap(e.target.value)} rows={3} maxLength={2200} />
    {err && <p className="err" role="alert">{err}</p>}
    <button className="primary" disabled={!src || busy || reading} onClick={async () => { setBusy(true); try { await api.createPost(src!, cap); done(); } catch (e: any) { setErr(e.message); setBusy(false); } }}>{busy ? 'Sharing…' : 'Share'}</button></div>;
}

function Messages({ me, to, setTo, onUser, onRead }: { me: User; to: string | null; setTo: (h: string | null) => void; onUser: (h: string) => void; onRead: () => void }) {
  const [convos, setConvos] = useState<Convo[]>([]); const [thread, setThread] = useState<{ user: Mini; messages: Msg[] } | null>(null); const [text, setText] = useState(''); const [err, setErr] = useState(''); const [sending,setSending]=useState(false);const end = useRef<HTMLDivElement>(null);const [listLoading,setListLoading]=useState(true);const activeTo=useRef(to);activeTo.current=to;const onReadRef=useRef(onRead);onReadRef.current=onRead;
  useEffect(() => { if (to) return;let active=true;setErr('');setListLoading(true);const load=()=>{if(document.hidden)return;api.conversations().then(r=>{if(active){setConvos(r.conversations);setErr('');}}).catch(e=>{if(active)setErr(e.message);}).finally(()=>{if(active)setListLoading(false);});};load();const t=setInterval(load,15000);document.addEventListener('visibilitychange',load);return()=>{active=false;clearInterval(t);document.removeEventListener('visibilitychange',load);}; }, [to]);
  useEffect(() => { setThread(null);setText('');setErr('');if (!to) return; let on = true; const pull = () => api.thread(to).then(r => { if (on) { setThread(r);setErr(''); onReadRef.current(); } }).catch(e => on && setErr(e.message)); pull(); const t = setInterval(()=>{if(!document.hidden)pull();}, 8000); return () => { on = false; clearInterval(t); }; }, [to]);
  useEffect(() => { { const p = end.current?.parentElement; if(p&&(p.scrollHeight-p.scrollTop-p.clientHeight<180||thread?.messages[thread.messages.length-1]?.mine))p.scrollTo({top:p.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); } }, [thread?.messages.length]);
  const send = async (e: React.FormEvent) => { e.preventDefault(); const v = text.trim(); if (!v || !to || sending) return; const recipient=to;setSending(true);setText(''); setErr('');
    try { const m = await api.send(recipient, v); if(activeTo.current===recipient)setThread(t => t && { ...t, messages: t.messages.some(x=>x.id===m.id)?t.messages:[...t.messages, m] }); } catch (x: any) { if(activeTo.current===recipient){setErr(x.message);setText(v);} } finally{setSending(false);} };
  if (to) return <div className="wide dm"><div className="dm-h"><button className="ghost" onClick={() => setTo(null)}>← Back</button>{thread && <button className="dm-u" onClick={() => onUser(thread.user.handle)}><Avatar handle={thread.user.handle} name={thread.user.name} size={36} src={thread.user.avatar} /><b>{thread.user.handle}</b></button>}</div>
    <div className="dm-body">{!thread&&!err&&<div className="empty"><span className="spinner" aria-label="Loading conversation"/></div>}{thread && thread.messages.length === 0 && <p className="empty">Say hi to {thread.user.name}.</p>}
      {thread?.messages.map(m => <div key={m.id} className={'bub ' + (m.mine ? 'me' : 'them')}>{m.text}<small>{ago(m.created)}</small></div>)}<div ref={end} /></div>
    {err && <p className="err" role="alert">{err}</p>}
    <form className="dm-in" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} aria-label="Message" placeholder="Message…" maxLength={1000} /><button className="primary" disabled={!text.trim()||sending}>{sending?'Sending…':'Send'}</button></form></div>;
  return <div className="wide"><div className="section-heading"><p className="eyebrow">Stay close</p><h2>Messages</h2><p>A little conversation goes a long way.</p></div>
    {listLoading&&<p className="empty" role="status">Loading conversations…</p>}{err&&<p className="err" role="alert">{err}</p>}{!listLoading&&!err&&convos.length === 0 && <p className="empty">No conversations yet. Open someone's profile and tap Message.</p>}
    {convos.map(c => <button key={c.user.id} className={'convo' + (c.unread ? ' new' : '')} onClick={() => setTo(c.user.handle)}><Avatar handle={c.user.handle} name={c.user.name} size={48} src={c.user.avatar} /><div><b>{c.user.handle}</b><span>{c.mine ? 'You: ' : ''}{c.text}</span></div>{c.unread > 0 && <i className="badge static">{c.unread}</i>}<small>{ago(c.created)}</small></button>)}</div>;
}
function StoryViewer({ groups, start, onClose }: { groups: StoryGroup[]; start: number; onClose: () => void }) {
  const dialog=useDialog(onClose); const [gi,setGi]=useState(start);const [ii,setIi]=useState(0);const [paused,setPaused]=useState(false);const [ready,setReady]=useState(false);const [elapsed,setElapsed]=useState(0);const [failed,setFailed]=useState(false);const g=groups[gi];const it=g.items[ii];const duration=5000;
  const press=useRef({time:0,x:0,y:0});const elapsedRef=useRef(0);const advancing=useRef(false);
  const next=useCallback(()=>{if(advancing.current)return;advancing.current=true;if(ii<g.items.length-1)setIi(ii+1);else if(gi<groups.length-1){setGi(gi+1);setIi(0);}else onClose();},[ii,gi,g,groups.length,onClose]);
  const prev=()=>{if(ii>0)setIi(ii-1);else if(gi>0){setGi(gi-1);setIi(groups[gi-1].items.length-1);}else{setElapsed(0);elapsedRef.current=0;}};
  useEffect(()=>{setReady(false);setFailed(false);setPaused(false);setElapsed(0);elapsedRef.current=0;advancing.current=false;},[it.id]);
  useEffect(()=>{if(!ready||paused||failed)return;const started=performance.now();const previous=elapsedRef.current;let raf:number;const tick=()=>{const total=Math.min(duration,previous+performance.now()-started);elapsedRef.current=total;setElapsed(total);if(total>=duration)next();else raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[ready,paused,failed,next]);
  useEffect(()=>{const visibility=()=>{if(document.hidden)setPaused(true);};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);},[]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='ArrowRight'){e.preventDefault();next();}if(e.key==='ArrowLeft'){e.preventDefault();prev();}if(e.key===' '){e.preventDefault();setPaused(p=>!p);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
  return <div className="sv" onClick={onClose}><div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={"Story by "+g.user.handle} className="sv-card" onClick={e=>e.stopPropagation()}>
    <div className="sv-bars" aria-hidden="true">{g.items.map((_,i)=><span key={g.user.id+'-'+i}><b style={{width:i<ii?'100%':i===ii?elapsed/duration*100+'%':'0%'}}/></span>)}</div>
    <div className="sv-h"><Avatar handle={g.user.handle} name={g.user.name} size={32} src={g.user.avatar}/><b>{g.user.handle}</b><small>{ago(it.created)}</small><button onClick={()=>setPaused(p=>!p)} aria-label={paused?'Play story':'Pause story'}>{paused?'▶':'Ⅱ'}</button><button onClick={onClose} aria-label="Close story"><Ic d={I.close}/></button></div>
    {!ready&&!failed&&<div className="sv-loading"><span className="spinner"/></div>}{failed?<div className="sv-loading"><p>This story could not load.</p><button className="ghost" onClick={next}>Next story</button></div>:<img key={it.id} src={img(it.image)} alt={"Story by "+g.user.handle} onLoad={()=>setReady(true)} onError={()=>setFailed(true)}/>}
    <div className="sv-gesture" onPointerDown={e=>{press.current={time:performance.now(),x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);setPaused(true);}} onPointerCancel={()=>setPaused(false)} onPointerUp={e=>{const dx=e.clientX-press.current.x,dy=e.clientY-press.current.y;const held=performance.now()-press.current.time;setPaused(false);if(dy>90&&Math.abs(dx)<80){onClose();return;}if(Math.abs(dx)>60&&Math.abs(dy)<70){dx<0?next():prev();return;}if(held<250&&Math.abs(dx)<20&&Math.abs(dy)<20){const box=e.currentTarget.getBoundingClientRect();e.clientX-box.left<box.width*.35?prev():next();}}}/>
    <button className="sv-access previous" onClick={prev} aria-label="Previous story"/><button className="sv-access next" onClick={next} aria-label="Next story"/>
  </div></div>;
}
function More({ on, busy, onVisible }: { on: boolean; busy: boolean; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null); const cb = useRef(onVisible); cb.current = onVisible;
  useEffect(() => { const el = ref.current; if (!el || !on) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) cb.current(); }, { rootMargin: '600px' }); o.observe(el); return () => o.disconnect(); }, [on, busy]);
  return on ? <div ref={ref} className="more">{busy && <span className="spinner" />}</div> : null;
}
function EditProfile({ me, onClose, onSaved }: { me: User; onClose: () => void; onSaved: (u: User) => void }) {
  const dialog=useDialog(onClose); const [name, setName] = useState(me.name); const [bio, setBio] = useState(me.bio || ''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [av, setAv] = useState<string | undefined>(); const [recovering,setRecovering]=useState(false);const [password,setPassword]=useState('');const [recovery,setRecovery]=useState('');const [recoverBusy,setRecoverBusy]=useState(false);
  const pick = async (f?: File) => { if (!f) return; try { setAv(await toDataUrl(f, 400)); } catch { setErr('Could not read that image'); } };
  const save = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); try { onSaved(await api.updateMe(name.trim() || me.handle, bio, av)); } catch (x: any) { setErr(x.message); setBusy(false); } };
  return <div className="scrim" onClick={onClose}><form ref={dialog as any} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Edit profile" className="modal editm" onClick={e => e.stopPropagation()} onSubmit={save}>
    <h3>Edit profile</h3><label className="avpick" tabIndex={0} role="button" aria-label="Change profile photo" onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.currentTarget.querySelector<HTMLInputElement>('input')?.click();}}}><Avatar handle={me.handle} name={me.name} size={72} src={av || me.avatar} /><span>Change photo</span><input type="file" accept="image/*" hidden onChange={e => pick(e.target.files?.[0])} /></label><label>Name<input value={name} maxLength={60} onChange={e => setName(e.target.value)} /></label>
    <label>Bio<textarea value={bio} maxLength={200} rows={3} onChange={e => setBio(e.target.value)} /></label><small className="mut">{bio.length}/200</small>
    <button type="button" className="ghost" onClick={()=>{setRecovering(r=>!r);setErr('');}}>Manage recovery code</button>
    {recovering&&<div className="recovery-panel">{recovery?<><p className="tag">Save this code somewhere private. Your previous code no longer works.</p><div className="rcode">{recovery}</div><button type="button" className="ghost" onClick={async()=>{try{await navigator.clipboard.writeText(recovery);}catch{setErr('Select and save the code manually.');}}}>Copy code</button></>:<><p className="tag">Enter your password to replace your recovery code. The old code will stop working.</p><label>Password<input type="password" autoComplete="current-password" onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}} value={password} onChange={e=>setPassword(e.target.value)}/></label><button type="button" className="ghost" disabled={!password||recoverBusy} onClick={async()=>{setRecoverBusy(true);setErr('');try{const r=await api.newRecovery(password);setRecovery(r.recoveryCode);setPassword('');}catch(x:any){setErr(x.message);}finally{setRecoverBusy(false);}}}>{recoverBusy?'Creating…':'Create new code'}</button></>}</div>}

    {err && <p className="err" role="alert">{err}</p>}<div className="row"><button type="button" className="ghost" onClick={onClose}>Cancel</button><button className="primary" disabled={busy||recoverBusy}>{busy ? 'Saving…' : 'Save'}</button></div></form></div>;
}
export function App() {
  const [me, setMe] = useState<User | null>(null); const [ready, setReady] = useState(!hasToken());
  const [tab, setTab] = useState<Tab>('home'); const [feed, setFeed] = useState<Post[]>([]); const [explore, setExplore] = useState<Post[]>([]); const [saved, setSaved] = useState<Post[]>([]);
  const [prof, setProf] = useState<{ user: User; posts: Post[] } | null>(null); const [open, setOpen] = useState<Post | null>(null); const [dark, setDark] = useState(() => localStorage.getItem('tl_dark') === '1');
  const [entry, setEntry] = useState<'landing' | 'login' | 'signup'>('landing'); const [feedNext, setFeedNext] = useState<number | null>(null); const [exploreNext, setExploreNext] = useState<number | null>(null); const [more, setMore] = useState(false); const [groups, setGroups] = useState<StoryGroup[]>([]); const [viewer, setViewer] = useState<number | null>(null); const [dmTo, setDmTo] = useState<string | null>(null); const [dmUnread, setDmUnread] = useState(0); const [editing, setEditing] = useState(false); const [notifs, setNotifs] = useState<Notif[]>([]); const [unread, setUnread] = useState(0); const [q, setQ] = useState(''); const [results, setResults] = useState<User[]>([]); const [postHits, setPostHits] = useState<Post[]>([]); const [toast, setToast] = useState(''); const [loading, setLoading] = useState(false); const [searching,setSearching]=useState(false);const [searchErr,setSearchErr]=useState('');
  const toastTimer=useRef<ReturnType<typeof setTimeout>>();const say=(m:string)=>{clearTimeout(toastTimer.current);setToast(m);toastTimer.current=setTimeout(()=>setToast(''),2600);};useEffect(()=>()=>clearTimeout(toastTimer.current),[]);
  useEffect(() => { setOnAuthLost(() => { setMe(null); }); if (hasToken()) api.me().then(setMe).catch(() => setToken('')).finally(() => setReady(true)); }, []);
  useEffect(() => { localStorage.setItem('tl_dark', dark ? '1' : '0'); }, [dark]);
  const loadProfile = useCallback(async (h: string) => { try { setProf(await api.profile(h)); setTab('profile'); } catch (e: any) { say(e.message); } }, []);
  const refresh = useCallback(async () => {
    if (!me) return; setLoading(true);
    try { const [f, e, s] = await Promise.all([api.feed(), api.explore(), api.saved()]); setFeed(f.posts); setFeedNext(f.next); setExplore(e.posts); setExploreNext(e.next); setSaved(s.posts); if (tab === 'profile' && prof) setProf(await api.profile(prof.user.handle)); } catch (e: any) { say(e.message); } finally { setLoading(false); }
  }, [me, tab, prof?.user.handle]);
  const loadStories = useCallback(() => { api.stories().then(r => setGroups(r.groups)).catch(() => {}); }, []);
  useEffect(() => { if (me) { refresh(); if (tab === 'home') loadStories(); } }, [me, tab]);
  useEffect(() => { if (!me) return; const pull=()=>{if(document.hidden)return;api.notifications().then(r=>{setNotifs(r.items);setUnread(r.unread);}).catch(()=>{});api.conversations().then(r=>setDmUnread(r.unread)).catch(()=>{});};pull();const t=setInterval(pull,30000); document.addEventListener('visibilitychange',pull);return () => {clearInterval(t);document.removeEventListener('visibilitychange',pull);}; }, [me,tab]);
  useEffect(() => { if (tab === 'activity' && unread) { const t = setTimeout(() => api.readNotifications().then(() => {setUnread(0);setNotifs(n=>n.map(x=>({...x,seen:true})));}).catch(() => {}), 1200); return () => clearTimeout(t); } }, [tab, unread]);
  useEffect(() => { let active=true;setResults([]);setPostHits([]);setSearchErr('');setSearching(!!q.trim());if(!q.trim())return;const t=setTimeout(()=>api.search(q).then(r=>{if(active){setResults(r.users);setPostHits(r.posts||[]);}}).catch(e=>{if(active)setSearchErr(e.message);}).finally(()=>{if(active)setSearching(false);}),250);return()=>{active=false;clearTimeout(t);}; }, [q]);
  const loadMore = useCallback(async (kind: 'feed' | 'explore') => {
    if (more) return; const next = kind === 'feed' ? feedNext : exploreNext; if (!next) return; setMore(true);
    try { const r = await (kind === 'feed' ? api.feed(next) : api.explore(next)); const add = (l: Post[]) => [...l, ...r.posts.filter(p => !l.some(x => x.id === p.id))];
      if (kind === 'feed') { setFeed(add); setFeedNext(r.next); } else { setExplore(add); setExploreNext(r.next); } } catch(e:any){say(e.message);} finally { setMore(false); }
  }, [more, feedNext, exploreNext]);
  const upd = (p: Post) => { const m = (l: Post[]) => l.map(x => x.id === p.id ? p : x); setFeed(m); setExplore(m); setSaved(s => p.saved ? (s.some(x => x.id === p.id) ? m(s) : [p, ...s]) : s.filter(x => x.id !== p.id)); setProf(pr => pr && { ...pr, posts: m(pr.posts) }); setOpen(o => o && o.id === p.id ? p : o); };
  const del = async (id: number) => { try { await api.deletePost(id); const f = (l: Post[]) => l.filter(x => x.id !== id); setFeed(f); setExplore(f); setSaved(f); setProf(pr => pr && { ...pr, posts: f(pr.posts) }); say('Post deleted'); } catch (e: any) { say(e.message); } };
  const follow = async (u: User) => { try { const nu = await api.follow(u.handle, !u.followedByMe); setResults(r => r.map(x => x.id === nu.id ? nu : x)); setProf(p => p && p.user.id === nu.id ? { ...p, user: nu } : p); api.feed().then(r => setFeed(r.posts)); } catch (e: any) { say(e.message); } };
  const logout=()=>{setToken('');setMe(null);setGroups([]);setFeed([]);setExplore([]);setSaved([]);setProf(null);setOpen(null);setViewer(null);setEditing(false);setDmTo(null);setQ('');setResults([]);setPostHits([]);setNotifs([]);setUnread(0);setDmUnread(0);setTab('home');setEntry('login');};
  const cls = 'ig' + (dark ? ' dark' : '');
  if (!ready) return <div className={cls}><div className="loading"><span className="spinner" /></div></div>;
  if (!me) return <div className={cls}>{entry === 'landing' ? <Landing onStart={setEntry} /> : <Auth key={entry} initial={entry} onBack={() => setEntry('landing')} onAuth={u => { setMe(u); setTab('home'); }} />}</div>;
  const nav: [Tab, string][] = [['home', I.home], ['explore', I.search], ['create', I.plus], ['messages', I.send], ['activity', I.bell], ['saved', I.bookmark], ['profile', I.user]];
  const badge = (t: Tab) => { const n = t === 'activity' ? unread : t === 'messages' ? dmUnread : 0; return n > 0 ? <i className="badge">{n > 9 ? '9+' : n}</i> : null; };
  const go = (t: Tab) => { setOpen(null); setEditing(false); if (t === 'profile') loadProfile(me.handle); else setTab(t); window.scrollTo({top:0,behavior:'instant' as ScrollBehavior}); };
  const card = (p: Post) => <PostCard key={p.id} post={p} me={me} onChange={upd} onOpen={() => setOpen(p)} onUser={loadProfile} onDelete={del} />;
  return <div className={cls}>
    <a className="skip-link" href="#main-content">Skip to content</a><aside className="side"><h1 className="logo">Threadline <span className="v2">2.0</span></h1>
      {nav.map(([t, d]) => <button key={t} aria-label={t[0].toUpperCase()+t.slice(1)} aria-current={tab===t?'page':undefined} className={tab === t ? 'on' : ''} onClick={() => go(t)}><Ic d={d} fill={tab === t && t !== 'create'} />{badge(t)}<span>{t[0].toUpperCase() + t.slice(1)}</span></button>)}
      <button className="push" onClick={() => setDark(!dark)}><Ic d={I.moon} /><span>{dark ? 'Light' : 'Dark'} mode</span></button>
      <button onClick={logout}><Ic d={I.close} /><span>Log out</span></button></aside>
    <header className="top"><h1 className="logo">Threadline <span className="v2">2.0</span></h1><span><button onClick={() => setDark(!dark)} aria-label="Toggle dark mode"><Ic d={I.moon} /></button> <button onClick={logout} aria-label="Log out"><Ic d={I.close} /></button></span></header>
    <main key={tab} className="page" id="main-content">
      {tab === 'home' && <div className="home"><section className="col">
        <div className="stories"><label className="story add"><span className="av-wrap" style={{ width: 62, height: 62 }}><Avatar handle={me.handle} name={me.name} size={58} src={me.avatar} /><i className="plus">+</i></span><small>Your story</small>
          <input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { await api.addStory(await toDataUrl(f)); say('Story shared'); loadStories(); } catch (x: any) { say(x.message); } }} /></label>
          {groups.map((g, i) => <button aria-label={"View story by "+g.user.handle} key={g.user.id} className="story" onClick={() => setViewer(i)}><Avatar handle={g.user.handle} name={g.user.name} size={58} story src={g.user.avatar} /><small>{g.user.id === me.id ? 'You' : g.user.handle}</small></button>)}</div>
        {feed.length === 0 && loading && [0, 1].map(i => <div key={i} className="post sk"><div className="sk-h"><i /><b /></div><div className="sk-m" /><div className="sk-l" /></div>)}
        {feed.length === 0 && !loading && <div className="empty card"><div className="empty-ic"><Ic d={I.heart} size={30} /></div><p><b>Your feed is empty.</b></p><p>Follow people on Explore, or share your first photo.</p><p><button className="primary sm" onClick={() => setTab('explore')}>Find people</button></p></div>}
        {feed.map(card)}<More on={!!feedNext} busy={more} onVisible={() => loadMore('feed')} /></section>
        <aside className="rail"><div className="meu"><Avatar handle={me.handle} name={me.name} size={46} src={me.avatar} /><div><b>{me.handle}</b><small>{me.name}</small></div></div></aside></div>}
      {tab === 'explore' && <div className="wide"><div className="section-heading"><p className="eyebrow">A fresh perspective</p><h2>Explore</h2><p>People and moments worth finding.</p></div><div className="search"><Ic d={I.search} size={18} /><input value={q} onChange={e => setQ(e.target.value)} aria-label="Search people and posts" placeholder="Search people and posts" /></div>
        {q ? <>{results.filter(u => u.id !== me.id).map(u => <div key={u.id} className="sug big"><button aria-label={"Open profile of "+u.handle} onClick={() => loadProfile(u.handle)}><Avatar handle={u.handle} name={u.name} size={44} src={u.avatar} /></button><div><b>{u.handle}</b><small>{u.name} · {u.followers} followers</small></div><button className={u.followedByMe ? 'ghost' : 'primary sm'} onClick={() => follow(u)}>{u.followedByMe ? 'Following' : 'Follow'}</button></div>)}
          {postHits.length > 0 && <><h3 className="hits">Posts</h3><Grid posts={postHits} onOpen={setOpen} /></>}
          {searching&&<p className="empty" role="status">Searching…</p>}{searchErr&&<p className="err" role="alert">{searchErr}</p>}{!searching&&!searchErr&&!results.length&&!postHits.length&&<p className="empty">Nothing found for "{q}".</p>}</> : <><Grid posts={explore} onOpen={setOpen} /><More on={!!exploreNext} busy={more} onVisible={() => loadMore('explore')} /></>}</div>}
      {tab === 'create' && <Create done={() => { say('Posted'); loadProfile(me.handle); }} />}
      {tab === 'messages' && <Messages me={me} to={dmTo} setTo={setDmTo} onUser={loadProfile} onRead={() => api.conversations().then(r => setDmUnread(r.unread)).catch(() => {})} />}
      {tab === 'activity' && <div className="wide"><div className="section-heading"><p className="eyebrow">In the loop</p><h2>Activity</h2><p>The people and moments connecting with you.</p></div>{notifs.length === 0 && <p className="empty">Likes, comments and new followers will show up here.</p>}
        {notifs.map((n, i) => <div key={n.id} className={'notif' + (n.seen ? '' : ' new')} style={{ animationDelay: Math.min(i, 10) * 40 + 'ms' }}>
          <button aria-label={"Open profile of "+n.user.handle} onClick={() => loadProfile(n.user.handle)}><Avatar handle={n.user.handle} name={n.user.name} size={44} src={n.user.avatar} /></button>
          <div><b>{n.user.handle}</b> {n.type === 'like' ? 'liked your photo.' : n.type === 'comment' ? <>commented: <span className="mut">{n.text}</span></> : 'started following you.'} <small>{ago(n.created)}</small></div>
          {n.image && <img src={img(n.image)} alt="" />}</div>)}</div>}
      {tab === 'saved' && <div className="wide"><div className="section-heading"><p className="eyebrow">Your collection</p><h2>Saved moments</h2><p>Keep the things that stay with you.</p></div><Grid posts={saved} onOpen={setOpen} /></div>}
      {tab === 'profile' && prof && <div className="wide"><div className="prof"><Avatar handle={prof.user.handle} name={prof.user.name} size={96} story src={prof.user.avatar} /><div><h2>{prof.user.handle}
        {prof.user.id === me.id && <button className="ghost" onClick={() => setEditing(true)}>Edit profile</button>}
        {prof.user.id !== me.id && <button className="ghost" onClick={() => { setDmTo(prof.user.handle); setTab('messages'); }}>Message</button>}
        {prof.user.id !== me.id && <button className={prof.user.followedByMe ? 'ghost' : 'primary sm'} onClick={() => follow(prof.user)}>{prof.user.followedByMe ? 'Following' : 'Follow'}</button>}</h2>
        <div className="stats"><span><b>{prof.user.posts}</b> posts</span><span><b>{prof.user.followers}</b> followers</span><span><b>{prof.user.following}</b> following</span></div><p><b>{prof.user.name}</b><br />{prof.user.bio}</p></div></div><Grid posts={prof.posts} onOpen={setOpen} /></div>}
    </main>
    <nav className="bottom" aria-label="Main navigation">{nav.map(([t, d]) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => go(t)} aria-label={t} aria-current={tab === t ? "page" : undefined}><Ic d={d} fill={tab === t && t !== 'create'} />{badge(t)}</button>)}</nav>
    {open && <Modal post={open} me={me} onChange={upd} onClose={() => setOpen(null)} onUser={loadProfile} onDelete={del} />}
    {viewer !== null && groups[viewer] && <StoryViewer groups={groups} start={viewer} onClose={() => setViewer(null)} />}
    {editing && <EditProfile me={me} onClose={() => setEditing(false)} onSaved={u => { setMe(u); setEditing(false); loadProfile(u.handle); say('Profile updated'); }} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
