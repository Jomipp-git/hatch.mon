const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {setup}=require('./uiHarness.cjs');
test('environment is captured once, exact local hosts only, config cannot be replaced',()=>{
 for(const [hostname,dev] of [['localhost',true],['127.0.0.1',true],['hatch.mon',false],['localhost.example.com',false],['',false]]){
  const ctx=vm.createContext({location:{hostname}});vm.runInContext(fs.readFileSync('appEnvironment.js','utf8'),ctx);assert.equal(ctx.HatchEnvironment.isDevelopmentEnvironment(),dev);
  vm.runInContext("location.hostname='localhost';HatchEnvironment={isDevelopmentEnvironment:()=>true}",ctx);assert.equal(ctx.HatchEnvironment.isDevelopmentEnvironment(),dev);assert.equal(Object.getOwnPropertyDescriptor(ctx,'HatchEnvironment').configurable,false);
 }
});
test('production wrapper exposes no cheats; settings and injected DOM create no testing listeners',async()=>{
 const h=await setup({development:false,encapsulated:true});
 for(const key of ['HatchMon','forceEvolution','skipTime','resetGame','state','train','hatch','spawn','debug']){assert.equal(h.win[key],undefined,key);assert.equal(h.run(`typeof ${key}`),'undefined',key);}
 h.doc.querySelectorAll('[data-panel]').find(b=>b.dataset.panel==='settings').fire('click');
 const text=n=>n.textContent+n.children.map(text).join(' ');assert.ok(!/Testing|Forzar|Reiniciar partida|\+[136] h/.test(text(h.els['panel-content'])));
 const b=h.doc.createElement('button');b.dataset.key='testing-reset';b.dataset.action='skipTime';h.els['panel-content'].append(b);const before=h.storage.get('hatch.mon.v3');b.fire('click');assert.deepEqual(b.events,{});assert.equal(h.storage.get('hatch.mon.v3'),before);
 for(const btn of h.els['panel-content'].querySelectorAll('button'))assert.ok(!/force-|skip-|testing-/.test(btn.dataset.key||'')||btn===b);
});
test('local settings retains reset, time jumps and Force Evolution',async()=>{
 const h=await setup();h.run("state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname('');state.pokemonId='pichu';showPanel('settings')");
 const keys=h.els['panel-content'].querySelectorAll('button').map(b=>b.dataset.key);for(const key of ['testing-reset','skip-1','skip-3','skip-6'])assert.ok(keys.includes(key));assert.ok(keys.some(k=>k?.startsWith('force-')));assert.equal(typeof h.win.HatchMon.reset,'function');
});
test('the active project contains no duplicated legacy runtime',()=>{
 assert.equal(fs.existsSync('hatch.mon-git'),false);
 assert.match(fs.readFileSync('index.html','utf8'),/if\(canUseTesting\(\)\)window\.HatchMon=/);
});
