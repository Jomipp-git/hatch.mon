// Optional real-browser check. All HTTP requests are intercepted; no real account or cloud is used.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),{setup}=require('./uiHarness.cjs');
const origin='http://127.0.0.1:8081';
// Del catalogo y no escrito a mano: este script no entra en `node --test`, asi que una reescritura
// de copy lo rompia en silencio.
const companionLoadFailed=(()=>{const vm=require('node:vm'),ctx={globalThis:{}};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','i18n.js'),'utf8'),ctx);
 ctx.globalThis.HatchI18n.setLanguage?.('en');return ctx.globalThis.HatchI18n.t('auth.companionLoadFailed');})();
const authSource=`const session={user:{id:'recovery-fixture',email:'test@example.test'}};
export const auth={logout:async()=>({error:null})},humanError=()=>'';
export const needsConfirmation=()=>false;
export const client={auth:{getSession:async()=>({data:{session}}),onAuthStateChange(){}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:await(await fetch('/__fixture')).json(),error:null})})}),upsert:async(row)=>{await fetch('/__fixture',{method:'PUT',body:JSON.stringify(row)});return {error:null}}})};`;
(async()=>{
 const h=await setup();h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Pepo");state.coins=120;state.relationship.points=45;state.inventory={tea:2,berry:3};state.sleep={napMinutes:15}');
 const original=JSON.parse(h.run('JSON.stringify(state)'));original.lastSync=Date.now();delete original.attentionMeta;delete original.attentionSettings;
 let remote={schema_version:1,game_state:{game:original,preferences:{language:'en'}},updated_at:new Date().toISOString()},writes=0;
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  async function pageFor(baseline=false){
   const context=await browser.newContext({viewport:{width:390,height:850}});
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
    if(url.pathname==='/__fixture'){if(route.request().method()==='PUT'){remote=JSON.parse(route.request().postData());writes++;}return route.fulfill({contentType:'application/json',body:JSON.stringify(remote)});}
    if(url.pathname==='/authService.mjs')return route.fulfill({contentType:'text/javascript',body:authSource});
    const name=url.pathname.slice(1)||'index.html';if(name.includes('..'))return route.abort();
    let body;
    if(baseline&&['index.html','vitalSimulation.js','appBootstrap.mjs','cloudSaveService.mjs'].includes(name))body=execFileSync('git',['show',`8ba2d2e:${name}`]);
    else{const file=path.join('dist',name);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});body=fs.readFileSync(file);}
    const contentType={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'}[path.extname(name)]||'application/octet-stream';
    return route.fulfill({contentType,body});
   });
   const page=await context.newPage();await page.goto(origin+'/index.html');return {page,context};
  }
  const before=await pageFor(true);await before.page.locator('#auth-retry').waitFor({state:'visible'});
  assert.equal(await before.page.locator('#auth-message').textContent(),companionLoadFailed);assert.equal(writes,0);await before.context.close();console.log('BEFORE: reproduced companion-load error in Chrome from committed runtime.');
  for(let attempt=0;attempt<2;attempt++){
   const {page,context}=await pageFor();await page.locator('#game-root').waitFor({state:'visible'});
   await page.waitForFunction(()=>!!window.HatchRuntime);
   await page.locator('#sprite canvas').waitFor({state:'visible'});
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hatch.mon.user.recovery-fixture.hatch.mon.v3')).sleep.fatigue===0);
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hatch.mon.user.recovery-fixture.hatch.mon.v3')));
   for(const key of ['nickname','coins','inventory','care','relationship','pokedex','social','personality','gender','milestones'])assert.deepEqual(saved[key],original[key],key);
   if(!attempt){
    await page.locator('.console').screenshot({path:'/tmp/hatch-companion-loaded.png'});
    await page.evaluate(()=>window.HatchRuntime.stop());
    for(const mode of ['color','lcd'])for(const dark of [false,true]){
     await page.evaluate(({mode,dark})=>{document.querySelector('#display-root').dataset.displayMode=mode;document.querySelector('#screen').classList.toggle('lights-off',dark)},{mode,dark});
     await page.locator('#screen').evaluate(async element=>{await Promise.all(element.getAnimations().map(animation=>animation.finished));});
     await page.locator('.console').screenshot({path:`/tmp/hatch-${mode}-${dark?'dark':'light'}.png`});
    }
    for(const width of [375,1280]){await page.setViewportSize({width,height:900});const measurements=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect(),oak=rect('#message-strip'),care=rect('.care'),trainer=rect('#trainer');return {oakGap:care.top-oak.bottom,actionsGap:trainer.top-care.bottom,overflow:document.documentElement.scrollWidth>innerWidth}});assert.equal(measurements.overflow,false);assert.equal(measurements.oakGap,10);assert.equal(measurements.actionsGap,10);console.log(width,measurements);}
   }
   await context.close();
  }
  console.log('AFTER: dist bootstrap, migration, entry and cold reopen preserve all fixture progress. Four Bond modes captured; spacing verified in Chrome.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
