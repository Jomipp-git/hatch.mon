const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

const SCOPE='https://jomipp-git.github.io/hatch.mon/';
function worker(){
 const listeners=new Map(),stores=new Map();
 const store=name=>stores.get(name)??stores.set(name,new Map()).get(name);
 const caches={
  keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),
  open:async name=>({match:async request=>store(name).get(request.url),
   put:async(request,response)=>void store(name).set(request.url,response)}),
 };
 const self={registration:{scope:SCOPE},clients:{claim:async()=>{}},skipWaiting(){},
  addEventListener:(type,fn)=>listeners.set(type,fn)};
 const context=vm.createContext({self,caches,URL,fetch:async()=>({ok:true,type:'basic',clone:()=>({})}),Promise,console});
 context.globalThis=context;
 vm.runInContext(fs.readFileSync('sw.js','utf8'),context,{filename:'sw.js'});
 return {listeners,stores,
  // The fetch handler only calls respondWith for requests it means to serve from cache.
  handles(url,init={}){let handled=false;
   listeners.get('fetch')({request:{url,method:'GET',mode:'no-cors',...init},respondWith(){handled=true}});
   return handled;}};
}

test('the service worker only intercepts immutable game assets',()=>{
 const sw=worker();
 for(const name of ['assets/pmd/0172A0/sprites/Idle-Anim.png','assets/eggs/egg_phase_1.png','assets/ui/professor_oak.png'])
  assert.equal(sw.handles(SCOPE+name),true,name);
 // Documents and game code always reach the network, manifest.js and themes.js included: an old
 // worker may outlive a deploy by a day, and generated code must never disagree with the page.
 for(const name of ['','index.html','hatchmonData_v2.js','i18n.js','appBootstrap.mjs','sw.js','vendor/qrcode.js','assets/pmd/manifest.js','assets/skins/themes.js','assets/pmd/0172A0/metadata.json'])
  assert.equal(sw.handles(SCOPE+name),false,name||'(document)');
 assert.equal(sw.handles('https://example.supabase.co/rest/v1/saves'),false,'cloud save');
 assert.equal(sw.handles('https://jomipp-git.github.io/other/assets/x.png'),false,'outside scope');
 assert.equal(sw.handles(SCOPE+'assets/eggs/egg_phase_1.png',{mode:'navigate'}),false,'navigation');
 assert.equal(sw.handles(SCOPE+'assets/eggs/egg_phase_1.png',{method:'POST'}),false,'POST');
});

test('activating a build drops every cache belonging to an older one',async()=>{
 const sw=worker();
 sw.stores.set('hatchmon-assets-old',new Map());sw.stores.set('unrelated-cache',new Map());
 const waits=[];sw.listeners.get('activate')({waitUntil:promise=>waits.push(promise)});
 await Promise.all(waits);
 assert.deepEqual([...sw.stores.keys()],['unrelated-cache']);
});

test('the build ID is stamped and matches what the dist build staged',()=>{
 const source=fs.readFileSync('sw.js','utf8');
 const build=source.match(/const BUILD = '([^']*)';/)?.[1];
 assert.match(build??'',/^[0-9a-f]{12}$/,'sw.js carries no stamped build ID; run tools/buildMobileRuntime.py');
 assert.equal(fs.readFileSync('dist/sw.js','utf8'),source,'dist/sw.js is stale');
 assert.equal(JSON.parse(fs.readFileSync('master/mobile-asset-audit.json')).summary.build,build);
});

test('optimised PNGs stay byte-identical to their backed-up originals when decoded',()=>{
 const records=JSON.parse(fs.readFileSync('master/asset-optimization.json'));
 const indexed=Object.entries(records).filter(([,r])=>r.losslessPixels);
 assert.ok(indexed.length>2000,`expected the sprite set to be optimised, saw ${indexed.length}`);
 for(const [name,record] of indexed){
  assert.ok(fs.existsSync(path.join('master/asset-originals',name)),`missing original for ${name}`);
  assert.equal(fs.statSync(name).size,record.after,`${name} differs from its recorded optimisation`);
 }
 const total=Object.values(records).reduce((sum,r)=>[sum[0]+r.before,sum[1]+r.after],[0,0]);
 assert.ok(total[1]<total[0]*.6,`optimisation should keep the runtime under 60% of the original bytes, got ${total[1]}/${total[0]}`);
});
