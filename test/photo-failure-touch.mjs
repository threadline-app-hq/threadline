import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const B='http://localhost:18180';
for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  try{
    const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const a=await(await fetch(B+'/api/auth/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({handle:'ft_'+engine.name().slice(0,2)+'_'+Date.now(),password:'qa-only-password'})})).json();
    await p.goto(B);
    await p.getByRole('button',{name:'Log in',exact:true}).click();
    await p.getByRole('textbox',{name:'Username',exact:true}).fill(a.user.handle);
    await p.getByRole('textbox',{name:'Password',exact:true}).fill('qa-only-password');
    await p.getByRole('button',{name:'Log in',exact:true}).click();
    await p.getByRole('button',{name:'create',exact:true}).click();
    await p.locator('input[type=file]').setInputFiles('seed/p2.jpg');
    await p.getByRole('button',{name:'Share',exact:true}).click();
    await p.getByRole('button',{name:'Edit profile',exact:true}).waitFor();
    await p.getByRole('button',{name:'home',exact:true}).click();
    await p.waitForFunction(()=>document.querySelector('.media img')?.naturalWidth>0);
    // WebKit does not let Playwright intercept <img> subresource loads, so the failure is injected as a missing upload URL; the app's onError path is the same one a real network failure uses.
    await p.locator('.media img').evaluate(i=>{i.src='/uploads/qa-missing-photo.jpg';});
    await p.getByRole('button',{name:'Reload photo'}).waitFor();
    let likes=0;
    p.on('request',r=>{if(r.url().includes('/like')&&r.method()==='POST')likes++;});
    for(const dark of [false,true]){
      if(dark)await p.getByRole('button',{name:'Toggle dark mode'}).click();
      const box=await p.locator('.media').boundingBox();
      await p.touchscreen.tap(box.x+box.width/2,box.y+30);
      await p.waitForTimeout(80);
      await p.touchscreen.tap(box.x+box.width/2,box.y+30);
      await p.waitForTimeout(250);
      assert.equal(likes,0,'A failed photo is not a double-tap like target');
      await p.screenshot({path:'/downloads/threadline-qa/failure-touch-'+engine.name()+(dark?'-dark':'-light')+'.png'});
    }
    await p.getByRole('button',{name:'Reload photo'}).tap();
    await p.waitForFunction(()=>document.querySelector('.media img')?.naturalWidth>0&&!document.querySelector('.media.failed'));
    assert.equal(likes,0,'Reloading a failed photo must not like it');
    const box=await p.locator('.media').boundingBox();
    await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    await p.waitForTimeout(80);
    await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    await p.getByRole('button',{name:'Unlike',exact:true}).waitFor();
    assert.equal(likes,1,'Loaded photo still supports double-tap like');
    console.log(engine.name()+': failed-photo touch isolation both themes, reload recovers, loaded double tap passed');
  }finally{await browser.close();}
}
