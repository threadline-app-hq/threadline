import React from 'react';
const Mark=()=> <svg aria-hidden="true" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2H3v24h5M16 2h5v24h-5M9 8l6 4-6 4 6 4"/></svg>;
export function Landing({onStart}:{onStart:(m:'login'|'signup')=>void}){
 return <div className="land notebook">
  <nav className="notebook-nav" aria-label="Welcome navigation"><span className="wordmark"><Mark/>Threadline</span><div><button className="notebook-login" onClick={()=>onStart('login')}>Log in</button><button className="notebook-join" onClick={()=>onStart('signup')}>Join free</button></div></nav>
  <main className="notebook-main">
   <header className="notebook-intro"><p className="notebook-label">A place for photographs & friends</p><h1>Some things<br/>are worth keeping.</h1><div className="notebook-deck"><p>Share a photograph. Add a few words.<br/>Stay close to the people you follow.</p><button className="notebook-join" onClick={()=>onStart('signup')}>Find your thread <span aria-hidden="true">↗</span></button><small>Free to join. No card needed.</small></div></header>
   <figure className="notebook-photo"><img src="/sample/p1.jpg" alt="A hiker looking over mountain ridges at sunset" fetchPriority="high"/><figcaption><span>01 / The long way home</span><span>Sample photograph</span></figcaption></figure>
   <section className="notebook-tools" aria-labelledby="notebook-tools-title"><div><p className="notebook-label">Inside Threadline</p><h2 id="notebook-tools-title">A small place.<br/>Room for your life.</h2></div><dl><div><dt>Photographs</dt><dd>A feed from the people you follow. Keep the photos you want to return to.</dd></div><div><dt>Stories</dt><dd>A photograph for today, visible for 24 hours.</dd></div><div><dt>Conversations</dt><dd>Send a message directly. Pick up where you left off.</dd></div></dl></section>
   <section className="notebook-last"><h2>Start with one moment.</h2><button className="notebook-join" onClick={()=>onStart('signup')}>Create your account <span aria-hidden="true">↗</span></button></section>
  </main>
  <footer className="notebook-footer"><span className="wordmark"><Mark/>Threadline</span><span>Photos. Stories. Conversations.</span><button onClick={()=>onStart('login')}>Already here? Log in</button></footer>
 </div>;
}
