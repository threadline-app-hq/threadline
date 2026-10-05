import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const B=process.env.TEST_URL||'http://localhost:18180';
const b=await chromium.launch();
const context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
await fs.mkdir('/downloads/threadline-qa',{recursive:true});
const snap=async n=>{await p.waitForTimeout(700);await p.evaluate(()=>document.activeElement?.blur());await p.screenshot({path:`/downloads/threadline-qa/${n}.png`,fullPage:true});};
await p.goto(B);await p.getByRole('button',{name:'Join free',exact:true}).click();
await snap('phone-signup');
await p.getByRole('textbox',{name:'Username',exact:true}).fill('qa_polish_'+Date.now());
await p.getByRole('textbox',{name:'Full name',exact:true}).fill('QA Studio');
await p.getByRole('textbox',{name:'Password',exact:true}).fill('local-test-only-42');
await p.getByRole('button',{name:'Sign up',exact:true}).click();
await p.getByRole('button',{name:'I saved it, continue'}).click();await p.getByRole('button',{name:'home',exact:true}).waitFor();
await snap('phone-home-empty');
await p.getByRole('button',{name:'create',exact:true}).click();await snap('phone-create');
await p.locator('input[type=file]').setInputFiles('/home/sandbox/threadline/seed/p1.jpg');
await p.getByRole('textbox',{name:'Caption',exact:true}).fill('A little further, a little quieter.');await snap('phone-create-preview');
await p.getByRole('button',{name:'Share',exact:true}).click();await p.getByRole('button',{name:'Edit profile',exact:true}).waitFor();
await snap('phone-profile');await p.getByRole('button',{name:'Edit profile',exact:true}).click();await snap('phone-edit-profile');
await p.getByRole('button',{name:'Cancel',exact:true}).click();
for(const t of ['home','explore','saved','messages','activity']){await p.getByRole('button',{name:t,exact:true}).click();await p.waitForTimeout(300);await snap('phone-'+t);}
await p.getByRole('button',{name:'home',exact:true}).click();await p.locator('.post').waitFor();await p.getByRole('button',{name:'View comments',exact:true}).click();await snap('phone-comments');await p.getByRole('button',{name:'Close',exact:true}).click();
await p.getByRole('button',{name:'Toggle dark mode'}).click();await snap('phone-dark-home');
await p.setViewportSize({width:1440,height:1000});for(const t of ['Home','Explore','Saved','Messages','Activity','Profile']){await p.getByRole('button',{name:t,exact:true}).click();await p.waitForTimeout(250);await snap('desktop-'+t.toLowerCase());}
console.log(JSON.stringify({errors}));await b.close();
