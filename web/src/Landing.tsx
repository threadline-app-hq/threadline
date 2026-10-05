import React, { useEffect, useRef, useState } from 'react';

const feats = [
  ['Moments that move', 'Every tap has weight: springy likes, fluid transitions, and a feed that glides.'],
  ['Real accounts, real data', 'Sign up, follow people, post photos, comment and save. Backed by Postgres.'],
  ['Private by design', 'Passwords are hashed with scrypt. Sessions are signed. Rate limits on every route.'],
  ['Dark mode, done right', 'A true-black theme that fades in smoothly instead of flashing.'],
  ['Fast on any screen', 'Phone, tablet, desktop. One layout system, tuned for each.'],
  ['Free to start', 'No ads, no card, no catch while we build 2.0 in the open.'],
];

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null); const [on, setOn] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); o.disconnect(); } }, { threshold: 0.15 }); o.observe(el); return () => o.disconnect(); }, []);
  return <div ref={ref} className={'reveal' + (on ? ' in' : '')} style={{ transitionDelay: delay + 'ms' }}>{children}</div>;
}

export function Landing({ onStart }: { onStart: (m: 'login' | 'signup') => void }) {
  const [y, setY] = useState(0);
  useEffect(() => { const f = () => setY(window.scrollY); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  return <div className="land">
    <div className="orb o1" style={{ transform: `translateY(${y * 0.15}px)` }} /><div className="orb o2" style={{ transform: `translateY(${y * -0.1}px)` }} />
    <nav className={'lnav' + (y > 20 ? ' solid' : '')}>
      <span className="llogo">Threadline <b>2.0</b></span>
      <span className="lnav-r"><button className="ghost" onClick={() => onStart('login')}>Log in</button><button className="cta sm" onClick={() => onStart('signup')}>Join free</button></span>
    </nav>
    <header className="hero">
      <div className="hero-copy">
        <span className="pill">Threadline 2.0 is here</span>
        <h1>Share the moments<br /><em>that thread your life.</em></h1>
        <p>A beautifully fast photo network. Follow people, post what you see, and feel every interaction.</p>
        <div className="hero-cta"><button className="cta" onClick={() => onStart('signup')}>Get started</button><button className="ghost big" onClick={() => onStart('login')}>I have an account</button></div>
        <small className="fine">Free. No card. Takes 20 seconds.</small>
      </div>
      <div className="hero-art" aria-hidden>
        <div className="phone" style={{ transform: `translateY(${Math.min(y, 400) * -0.08}px) rotate(-4deg)` }}>
          <div className="ph-top"><i /><i /><i /><i /></div>
          <div className="ph-card c1"><span /><b /></div>
          <div className="ph-card c2"><span /><b /></div>
          <div className="ph-heart">♥</div>
        </div>
        <div className="float f1">♥ 2,481</div><div className="float f2">New follower</div><div className="float f3">Saved</div>
      </div>
    </header>
    <section className="lgrid">
      <Reveal><h2>Everything you expect. Nothing you do not.</h2></Reveal>
      <div className="cards">{feats.map(([t, d], i) => <Reveal key={t} delay={i * 70}><div className="fcard"><h3>{t}</h3><p>{d}</p></div></Reveal>)}</div>
    </section>
    <section className="lcta"><Reveal><h2>Your thread starts here.</h2><button className="cta" onClick={() => onStart('signup')}>Create your account</button></Reveal></section>
    <footer className="lfoot">Threadline 2.0 · built in the open</footer>
  </div>;
}
