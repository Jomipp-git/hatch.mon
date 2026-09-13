const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./uiHarness.cjs');
const copy=value=>JSON.parse(JSON.stringify(value));
async function fixture(){
 const h=await setup();h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Pepo");state.coins=123;state.inventory={berry:2,tea:1};state.training.iq=37;state.relationship.points=45;state.care.hambre=72;state.social.active.isShiny=true');
 return JSON.parse(h.run('JSON.stringify(state)'));
}
test('legacy, partial and current saves load/reopen without losing progress; migration is idempotent',async()=>{
 const base=await fixture();
 const variants=[s=>{delete s.personality;delete s.sleep;delete s.attentionEvent;delete s.attentionMeta;delete s.attentionSettings},s=>{delete s.sleep},s=>{s.sleep={napDay:s.sleep.napDay}},s=>{s.sleep={fatigue:43,custom:'keep'}},s=>{delete s.attentionMeta;delete s.attentionSettings},s=>{s.attentionMeta={types:{hunger:{custom:'keep'}}};s.attentionSettings={}},()=>{}];
 for(const change of variants)for(const cloud of [false,true]){
  const original=copy(base);change(original);original.extension={keep:true};
  const h=await setup({initialSave:original,cloud});assert.equal(h.run('validSave(state)'),true);
  const migrated=JSON.parse(h.run('JSON.stringify(state)'));
  for(const key of ['pokemonId','coins','inventory','training','relationship','care','pokedex','milestones','social','nickname','gender','extension'])assert.deepEqual(migrated[key],original[key],key);
  assert.equal(h.run('JSON.stringify(migrateSave(migrateSave(state)))'),h.run('JSON.stringify(state)'));
  const reopened=await setup({initialSave:JSON.parse(h.storage.get('hatch.mon.v3')),cloud});
  assert.equal(reopened.run('state.personality'),migrated.personality);assert.equal(reopened.run('validSave(state)'),true);
  assert.deepEqual(JSON.parse(reopened.run('JSON.stringify(state.care)')),original.care);
 }
});
test('invalid save is neither deleted nor overwritten and no runtime is published',async()=>{
 const bad=await fixture();bad.care.hambre='broken';const storage=new Map(),raw=JSON.stringify(bad);
 await assert.rejects(setup({initialSave:bad,storageMap:storage,cloud:true}),/invalid-save/);
 assert.equal(storage.get('hatch.mon.v3'),raw);
});
test('partial sleep normalization clamps only invalid values and retains extensions',async()=>{
 const h=await setup();h.run('state.sleep={fatigue:150,napMinutes:-2,napping:"yes",custom:42};Vital.ensureSleep(state)');
 assert.equal(h.run('state.sleep.fatigue'),100);assert.equal(h.run('state.sleep.napMinutes'),0);assert.equal(h.run('state.sleep.napping'),false);assert.equal(h.run('state.sleep.custom'),42);
});
test('legacy eggs, stored eggs, critical companions and memorial snapshots migrate safely',async()=>{
 const egg=await setup(),stored=JSON.parse(egg.run('JSON.stringify(activeEntity())'));
 delete stored.snapshot.personality;delete stored.snapshot.sleep;
 for(const phase of ['egg','critical','dead']){
  const h=await setup({initialSave:phase==='egg'?null:await fixture()});
  if(phase==='critical')h.run('state.care.hambre=0;checkHealth()');
  if(phase==='dead')h.run('die("natural")');
  const original=JSON.parse(h.run('JSON.stringify(state)'));original.sleep={};delete original.personality;original.social.eggs.push(copy(stored));
  for(const memory of original.social.memorials){delete memory.snapshot.personality;memory.snapshot.sleep={};}
  const restored=await setup({initialSave:original,cloud:true});assert.equal(restored.run('validSave(state)'),true);assert.equal(restored.run('state.phase'),phase);
  assert.equal(restored.run('state.social.eggs.length'),1);assert.equal(restored.run('state.social.memorials.length'),original.social.memorials.length);
  assert.equal(restored.run('JSON.stringify(migrateSave(state))'),restored.run('JSON.stringify(migrateSave(state))'));
 }
});
test('death during offline catch-up stores a valid memorial and legacy oversized remainder self-repairs',async()=>{
 const h=await setup({initialSave:await fixture()});

 h.run('state.remainder=0;minuteStep=()=>die("natural");advanceGameTime(180000,Date.now())');

 assert.equal(h.run('state.phase'),'dead');
 assert.equal(h.run('state.remainder'),0);
 assert.equal(h.run('state.social.memorials.at(-1).snapshot.remainder'),0);
 assert.equal(h.run('validSave(state)'),true);

 const legacy=JSON.parse(h.run('JSON.stringify(state)'));
 legacy.social.memorials.at(-1).snapshot.remainder=1632620;

 const restored=await setup({initialSave:legacy,cloud:true});
 assert.equal(restored.run('state.social.memorials.at(-1).snapshot.remainder'),0);
 assert.equal(restored.run('validSave(state)'),true);
});

test('ordinary minute timestamps do not turn physiological autosaves into immediate cloud writes',async()=>{
 const h=await setup({initialSave:await fixture()}),calls=[];h.win.HatchCloud={queue:options=>calls.push(options)};
 h.run('save();minuteStep();save()');assert.equal(calls.at(-1).immediate,false);
});
test('browser permission rejection is handled without an unhandled promise',async()=>{
 const h=await setup();h.win.Notification={permission:'default',requestPermission:()=>Promise.reject(Error('unavailable'))};
 assert.equal(await h.run('requestAttentionNotifications()'),false);assert.equal(h.run('state.attentionSettings.notificationsEnabled'),false);
});
test('daytime waking ignores legacy Fatigue and nap accounting',async()=>{
 const h=await setup({initialSave:await fixture()}),morning=new Date(2026,0,2,9).getTime();
 h.run(`state.lightsOff=true;state.sleep.fatigue=80;state.sleep.napping=false;for(let i=0;i<90;i++)Vital.sleepTick(state,${morning}+i*60000)`);
 assert.equal(h.run('state.sleep.napMinutes'),0);assert.equal(h.run('state.lightsOff'),false);
 h.run(`state.lightsOff=true;state.sleep.napping=false;state.sleep.fatigue=0;Vital.sleepTick(state,${morning})`);assert.equal(h.run('state.lightsOff'),false);
});
test('rejected remote save preserves local cache and cannot be uploaded over cloud',async()=>{
 const {createCloudSaveService}=await import('../cloudSaveService.mjs'),h=await setup({initialSave:await fixture()}),m=new Map(h.storage);
 const cache={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 const svc=createCloudSaveService({client:{},session:{user:{id:'test'}},cache,onRemote:(game,prefs)=>h.win.HatchRuntime.applyCloudSave(game,prefs)});
 const raw=cache.getItem('hatch.mon.v3');assert.equal(svc.applyRemote({schema_version:1,game_state:{game:{version:12},sync:{revision:99}},updated_at:new Date().toISOString()}),false);
 assert.equal(cache.getItem('hatch.mon.v3'),raw);assert.equal(svc.isBlocked(),true);svc.close();
});
test('applying an older remote snapshot simulates elapsed time exactly once',async()=>{
 const game=await fixture(),h=await setup();game.lastSync=400000;
 assert.equal(h.win.HatchRuntime.applyCloudSave(game),true);
 assert.equal(h.run('state.age'),600000);const care=h.run('JSON.stringify(state.care)');
 h.run('sync()');assert.equal(h.run('state.age'),600000);assert.equal(h.run('JSON.stringify(state.care)'),care);
});
