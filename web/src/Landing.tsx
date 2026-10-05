import React, { useEffect, useRef, useState } from 'react';
const features=[
 ['01','Less noise. More you.','A feed of the people you choose to follow. Photos, captions, and the little things in between.'],
 ['02','Keep the conversation close.','Stories for today. Messages for the people who matter. A place to catch up without the crowd.'],
 ['03','Make it your own.','Save a moment, change your profile, switch to dark mode. The details should feel familiar.'],
];
function Reveal({children,delay=0}:{children:React.ReactNode;delay?:number}){const ref=useRef<HTMLDivElement>(null);const [on,setOn]=useState(false);useEffect(()=>{const el=ref.current;if(!el)return;const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){setOn(true);o.disconnect();}},{threshold:.12});o.observe(el);return()=>o.disconnect();},[]);return <div ref={ref} className={'reveal'+(on?' in':'')} style={{transitionDelay:delay+'ms'}}>{children}</div>;}
export function Landing({onStart}:{onStart:(m:'login'|'signup')=>void}){
 const [solid,setSolid]=useState(false);useEffect(()=>{const f=()=>setSolid(window.scrollY>20);f();window.addEventListener('scroll',f,{passive:true});return()=>window.removeEventListener('scroll',f);},[]);
 return <div className="land editorial">
  <nav className={'lnav'+(solid?' solid':'')} aria-label="Welcome navigation"><span className="llogo">Threadline<span className="brand-dot" /></span><span className="lnav-r"><button className="ghost" onClick={()=>onStart('login')}>Log in</button><button className="cta sm" onClick={()=>onStart('signup')}>Join free <span aria-hidden>↗</span></button></span></nav>
  <header className="hero">
   <div className="hero-copy"><span className="pill"><i /> A little closer to your people</span><h1>Life happens.<br /><em>Keep the good parts.</em></h1><p>The view on the way home. A table full of friends. The moments you want to share, with the people you want to share them with.</p><div className="hero-cta"><button className="cta" onClick={()=>onStart('signup')}>Find your thread <span aria-hidden>↗</span></button><button className="text-cta" onClick={()=>onStart('login')}>Already here? Log in</button></div><small className="fine">Free to join. No card needed.</small></div>
   <div className="moment-collage" aria-label="Sample photos from Threadline"><div className="moment-photo main-photo"><img src="/sample/p1.jpg" alt="A hiker looking over mountain ridges at sunset" fetchPriority="high"/><div className="photo-note"><span>Out there.</span><small>Somewhere worth the climb.</small></div></div><div className="moment-photo coffee-photo"><img src="/sample/p2.jpg" alt="Coffee in warm morning light"/><span className="note-tag">Small rituals.</span></div><div className="moment-photo city-photo"><img src="/sample/p3.jpg" alt="A tram on a city street"/><span className="note-tag">Take the long way.</span></div><div className="collage-caption"><span className="caption-line"/>Everyday, but never ordinary.</div></div>
  </header>
  <section className="intro-band"><Reveal><p className="eyebrow">Your life, in good company</p><h2>Connection, without<br />the performance.</h2><p>You do not need a perfect photo.<br />Just a moment that feels like you.</p></Reveal></section>
  <section className="lgrid"><div className="cards">{features.map(([n,t,d],i)=><Reveal key={n} delay={i*55}><div className="fcard"><span className="feature-no">{n}</span><h3>{t}</h3><p>{d}</p></div></Reveal>)}</div></section>
  <section className="lcta"><Reveal><p className="eyebrow">Make room for the moments</p><h2>Your people.<br /><em>Your perspective.</em></h2><button className="cta" onClick={()=>onStart('signup')}>Create your account <span aria-hidden>↗</span></button><small className="fine">Photos. Stories. Conversations.</small></Reveal></section>
  <footer className="lfoot"><span className="llogo">Threadline<span className="brand-dot"/></span><span>Made for the moments in between.</span><span>2.0</span></footer>
 </div>;
}
