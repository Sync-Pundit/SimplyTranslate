// Run separately from node --test; all provider and native-UI calls are doubles.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const origin=process.env.BASE_URL||'http://127.0.0.1:8794';
const report={engine:'Chromium emulation',groups:[],limits:['Physical Firefox/WebKit, native keyboard animation, clipboard prompts and native share/audio need phone checks.']};
async function run(name,fn){if(process.env.TRANSLATE_TEST_FILTER&&!name.toLowerCase().includes(process.env.TRANSLATE_TEST_FILTER.toLowerCase()))return;await fn();report.groups.push({name,status:'passed'});console.log('PASS '+name);}
async function context(browser,options={}){
 const c=await browser.newContext({viewport:{width:393,height:851},isMobile:true,hasTouch:true,...options});
 await c.addInitScript(()=>{
  window.__device={reads:0,copies:[],shares:[]};
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>{__device.reads++;return 'Pasted words';},writeText:async v=>{__device.copies.push(v);}}});
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{__device.shares.push(data);}});
  const vv=visualViewport;let override=null;
  for(const key of ['height','offsetTop','scale']){const read=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(vv),key).get.bind(vv);Object.defineProperty(vv,key,{configurable:true,get:()=>override?.[key]??read()});}
  window.__viewport=next=>{override=next;vv.dispatchEvent(new Event('resize'));vv.dispatchEvent(new Event('scroll'));};
 });return c;
}
async function open(c,url='/'){
 const p=await c.newPage();p.setDefaultTimeout(12000);p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));
 await p.goto(origin+url);await p.waitForFunction(()=>document.querySelector('#from_language').options.length>40);return p;
}
const mock=(c,body={'translated-text':'Hola mundo',source:'en',target:'es',engine:'google'},status=200)=>c.route('**/api/translate/',r=>r.fulfill({status,json:body}));
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 await run('Phone layouts retain the writing area and touch controls in both themes',async()=>{
  let count=0;
  for(const [width,height] of [[320,640],[360,640],[393,851],[430,932],[768,1024],[851,393],[900,700]]){
   const c=await context(browser,{viewport:{width,height}}),p=await open(c);
   for(const theme of ['dark','light']){
    await p.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    const r=await p.evaluate(()=>{
     const b=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,input:b('#input'),cta:b('.translate-button'),swap:b('#switchbutton'),pick:b('.language-picker-button')};
    });assert(r.scroll<=width+1);assert(r.input.height>=60,`${width}: writing area collapsed`);assert(r.cta.bottom<=height+1);assert(r.swap.height>=44&&r.pick.height>=44);count++;
   }
   assert.equal(await p.evaluate(()=>__device.reads+__device.shares.length),0);assert.deepEqual(p.errors,[]);await c.close();
  }report.layout_combinations=count;
 });
 await run('Language sheets search real choices, preserve focus and remember only language codes',async()=>{
  const c=await context(browser),p=await open(c);
  await p.locator('.language-picker-button').first().tap();await p.locator('.language-sheet[open]').waitFor();
  assert(await p.locator('.language-sheet-close').evaluate(n=>n===document.activeElement));
  await p.locator('.language-search').fill('Zulu');assert.equal(await p.locator('.language-option').count(),1);await p.locator('.language-option').tap();
  assert.equal(await p.locator('#from_language').inputValue(),'zu');assert.match(await p.locator('.language-picker-button').first().getAttribute('aria-label'),/Zulu/);
  await p.waitForFunction(()=>document.activeElement.classList.contains('language-picker-button'));
  await p.locator('.language-picker-button').nth(1).tap();await p.locator('.language-search').fill('Arabic');await p.locator('.language-option').tap();assert.equal(await p.locator('#to_language').inputValue(),'ar');
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('sp.translate.recent-languages')));assert.deepEqual(saved,['ar','zu']);
  await p.locator('.language-picker-button').first().tap();await p.locator('.language-search').fill('not-a-language');assert(await p.locator('.language-empty').isVisible());await p.keyboard.press('Escape');await p.locator('.language-sheet').waitFor({state:'hidden'});
  assert.deepEqual(p.errors,[]);await c.close();
 });
 await run('Translation, copying, native sharing and detected-language swap use the existing API',async()=>{
  const c=await context(browser);let calls=[];
  await c.route('**/api/translate/',r=>{calls.push(Object.fromEntries(new URLSearchParams(r.request().postData())));return r.fulfill({json:{'translated-text':'Hola mundo',source:'en',target:'es',engine:'google'}});});
  const p=await open(c);await p.locator('#input').fill('Hello world');await p.locator('.translate-button').tap();await p.waitForFunction(()=>document.documentElement.dataset.mobileView==='result');
  assert.equal(await p.locator('#output').inputValue(),'Hola mundo');assert.equal(await p.locator('#input').isVisible(),false);assert.equal(await p.locator('#translation-form').getAttribute('aria-busy'),'false');
  assert.deepEqual(calls,[{engine:'google',text:'Hello world',from:'auto',to:'es'}]);
  await p.locator('#copy-result').tap();assert.deepEqual(await p.evaluate(()=>__device.copies),['Hola mundo']);
  await p.getByRole('button',{name:'Share',exact:true}).tap();assert.deepEqual(await p.evaluate(()=>__device.shares),[{title:'Translation / Sync_Pundit',text:'Hola mundo'}]);
  await p.locator('#switchbutton').tap();assert.equal(await p.locator('#from_language').inputValue(),'es');assert.equal(await p.locator('#to_language').inputValue(),'en');assert.equal(await p.locator('#input').inputValue(),'Hola mundo');
  assert.equal(await p.locator('#output').inputValue(),'');assert.equal(await p.locator('#copy-result').isEnabled(),false);assert.equal(await p.locator('html').getAttribute('data-mobile-view'),'write');
  assert.deepEqual(p.errors,[]);await c.close();
 });
 await run('Keyboard space changes after a real viewport resize and retains drafts on dismissal',async()=>{
  const c=await context(browser),p=await open(c);await p.locator('#input').fill('An unsent draft');await p.locator('#input').blur();
  let premature=0;await c.route('**/api/translate/',r=>{premature++;return r.fulfill({json:{'translated-text':'Uncommitted'}});});
  await p.locator('#input').dispatchEvent('compositionstart');await p.locator('#translation-form').dispatchEvent('submit');assert.equal(premature,0);await p.locator('#input').dispatchEvent('compositionend');
  const before=await p.locator('#input').boundingBox(),cdp=await c.newCDPSession(p),touch={x:before.x+30,y:before.y+30};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});const during=await p.locator('#input').boundingBox();assert(Math.abs(during.y-before.y)<1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(await p.locator('#input').evaluate(n=>n===document.activeElement));assert.equal(await p.locator('html').evaluate(n=>n.classList.contains('is-typing')),false);
  await p.evaluate(()=>__viewport({height:320,offsetTop:24,scale:1}));await p.waitForFunction(()=>document.documentElement.classList.contains('is-typing'));
  const r=await p.evaluate(()=>{const b=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {input:b('#input'),cta:b('.translate-button')};});
  assert(r.input.height>=40);assert(r.cta.bottom<=344+1&&r.input.top>=24-1);
  await p.locator('.mobile-keyboard-done').tap();assert.equal(await p.locator('html').evaluate(n=>n.classList.contains('is-typing')),true);
  await p.evaluate(()=>__viewport(null));await p.waitForFunction(()=>!document.documentElement.classList.contains('is-typing'));
  assert.equal(await p.locator('#input').inputValue(),'An unsent draft');assert.deepEqual(p.errors,[]);await c.close();
 });
 await run('Late responses and upstream failures never replace an edited draft with stale results',async()=>{
  const c=await context(browser);let release;await c.route('**/api/translate/',async r=>{await new Promise(resolve=>release=resolve);await r.fulfill({json:{'translated-text':'Stale',source:'en',target:'es'}}).catch(()=>{});});
  const p=await open(c);await p.locator('#input').fill('First words');await p.locator('.translate-button').tap();await p.waitForFunction(()=>document.querySelector('#translation-form').getAttribute('aria-busy')==='true');
  await p.locator('#input').fill('Edited words');release();await p.waitForFunction(()=>!document.querySelector('.translate-button').disabled);assert.equal(await p.locator('#output').inputValue(),'');assert.equal(await p.locator('#input').inputValue(),'Edited words');
  await c.unroute('**/api/translate/');await mock(c,{message:'Translation is unavailable.'},503);await p.locator('.translate-button').tap();await p.getByText('Translation is unavailable.',{exact:true}).waitFor();
  assert.equal(await p.locator('#input').inputValue(),'Edited words');assert.equal(await p.locator('html').getAttribute('data-mobile-view'),'write');assert.deepEqual(p.errors,[]);await c.close();
 });
 await run('Paste, share and clipboard-denial fallbacks remain actionable',async()=>{
  const c=await context(browser);await c.addInitScript(()=>{
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>{throw Error('Denied');},writeText:async()=>{throw Error('Denied');}}});Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
  });await mock(c);const p=await open(c);await p.getByRole('button',{name:'Paste',exact:true}).tap();await p.getByText('Touch and hold in the writing area to paste.',{exact:true}).waitFor();
  await p.locator('#input').fill('Private source');await p.locator('.translate-button').tap();await p.waitForFunction(()=>document.documentElement.dataset.mobileView==='result');
  await p.locator('#copy-result').tap();assert(await p.locator('#output').evaluate(n=>n.selectionEnd>n.selectionStart));
  await p.getByRole('button',{name:'Share',exact:true}).tap();assert.equal(await p.locator('#mobile-share-text').inputValue(),'Hola mundo');await p.getByRole('button',{name:'Select text',exact:true}).tap();assert(await p.locator('#mobile-share-text').evaluate(n=>n.selectionEnd>n.selectionStart));await p.locator('.language-sheet-close').tap();
  await p.locator('.mobile-link-options summary').tap();await p.locator('#copy-share').tap();await p.locator('#mobile-share-text').waitFor();assert.match(await p.locator('#mobile-share-text').inputValue(),/text=Private\+source/);
  assert.deepEqual(p.errors,[]);await c.close();
 });
 await run('A shared link initializes the mobile result and resizing restores the full desktop workspace',async()=>{
  const c=await context(browser);await mock(c);const p=await open(c,'/?sl=en&tl=es&text=Hello');await p.waitForFunction(()=>document.documentElement.dataset.mobileView==='result');
  assert.equal(await p.locator('#input').inputValue(),'Hello');assert.equal(await p.locator('#output').inputValue(),'Hola mundo');
  await p.setViewportSize({width:1440,height:1000});await p.waitForFunction(()=>!document.documentElement.classList.contains('mobile-ready'));
  assert(await p.locator('#input').isVisible());assert(await p.locator('#output').isVisible());assert.equal(await p.locator('.mobile-editor-tabs').isVisible(),false);
  assert(await p.locator('.workspace-bottom .share-action').isVisible());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(p.errors,[]);await c.close();
 });
 }finally{await browser.close();}
 fs.writeFileSync(path.resolve(__dirname,'../output',process.env.TRANSLATE_TEST_FILTER?'translate-focused.json':'translate-mobile-results.json'),JSON.stringify(report,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
