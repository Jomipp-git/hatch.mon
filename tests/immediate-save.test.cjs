const {test}=require('node:test'),assert=require('node:assert/strict');
const store=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
const settle=async()=>{for(let i=0;i<15;i++)await Promise.resolve()};
test('important save starts without debounce, ordered writes keep latest dirty until acknowledged; reopen recovers interrupted write',async()=>{
 const {createCloudSaveService}=await import('../cloudSaveService.mjs');let remote=null,release,active=0,maxActive=0;const writes=[];
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'A'}}}})},from(){return{select(){return{eq(){return{maybeSingle:async()=>({data:remote,error:null})}}}},async upsert(row){active++;maxActive=Math.max(active,maxActive);writes.push(row.game_state.game.value);await new Promise(r=>release=r);remote=structuredClone(row);active--;return{error:null}}}}};
 const cache=store(),svc=createCloudSaveService({client,session:{user:{id:'A'}},cache,delay:100000});await svc.load();const write=value=>cache.setItem('hatch.mon.v3',JSON.stringify({version:12,value}));
 write(1);svc.queue({immediate:true});await settle();assert.deepEqual(writes,[1]);write(2);svc.queue({immediate:true});await settle();assert.deepEqual(writes,[1]);assert.equal(cache.getItem('cloud-dirty'),'1');release();await settle();assert.deepEqual(writes,[1,2]);assert.equal(cache.getItem('cloud-dirty'),'1');release();await settle();assert.equal(cache.getItem('cloud-dirty'),null);assert.equal(maxActive,1);
 remote.game_state=Object.fromEntries(Object.entries(remote.game_state).reverse());write(3);svc.queue();svc.close();const reopened=createCloudSaveService({client,session:{user:{id:'A'}},cache});await reopened.load();assert.equal(JSON.parse(cache.getItem('hatch.mon.v3')).value,3);const flush=reopened.flush();await settle();release();await flush;assert.equal(remote.game_state.game.value,3);reopened.close();
});
test('frequent physiology stays batched and identical snapshots create no new request',async()=>{
 const {createCloudSaveService}=await import('../cloudSaveService.mjs');let count=0;const client={auth:{getSession:async()=>({data:{session:{user:{id:'A'}}}})},from:()=>({upsert:async()=>{count++;return{error:null}}})},cache=store();const svc=createCloudSaveService({client,session:{user:{id:'A'}},cache,delay:100000});
 for(let i=0;i<50;i++){cache.setItem('hatch.mon.v3',JSON.stringify({version:12,value:i}));svc.queue();}await settle();assert.equal(count,0);await svc.flush();assert.equal(count,1);svc.queue({immediate:true});await settle();assert.equal(count,1);svc.close();
});
test('feeding, training, evolution, birth, shell and configuration request immediate saves; ordinary time does not',async()=>{
 const {setup}=require('./uiHarness.cjs'),h=await setup(),calls=[];h.win.HatchCloud={queue:options=>calls.push(options)};h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");save()');assert.equal(calls.at(-1).immediate,true);
 h.run('dispatch(()=>careAction("alimentar"))');assert.equal(calls.at(-1).immediate,true);
 h.run('state.trainer.energy=6;dispatch(()=>train("iq",4))');assert.equal(calls.at(-1).immediate,true);
 h.run('state.pokemonId="pichu";dispatch(()=>forceEvolution("pikachu"))');assert.equal(calls.at(-1).immediate,true);
 h.run('state.remainder+=1000;save()');assert.equal(calls.at(-1).immediate,false);
 h.run('window.setDisplayMode("lcd")');assert.equal(calls.at(-1).immediate,true);
 // Shell module uses the browser global; the VM keeps window separate.
 h.run('globalThis.HatchCloud=window.HatchCloud;ShellSkins.select("default",document.getElementById("display-root"))');assert.equal(calls.at(-1).immediate,true);
});
test('close immediately after each important action: reopen retains feeding, training, shell and evolution',async()=>{
 const {setup}=require('./uiHarness.cjs'),{createCloudSaveService}=await import('../cloudSaveService.mjs');
 for(const [name,action] of [
  ['alimentar','dispatch(()=>careAction("alimentar"))'],
  ['entrenar','dispatch(()=>train("iq",4))'],
  ['carcasa','ShellSkins.select("0172A0",document.getElementById("display-root"))'],
  ['evolucionar','dispatch(()=>forceEvolution("pikachu"))']]){
  const h=await setup({initialShells:{unlocked:['0172A0'],selected:'default'}});let remote=null;
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'A'}}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:remote,error:null})})}),upsert:async row=>{remote=structuredClone(row);return{error:null}}})};
  const cache={getItem:k=>h.storage.get(k)||null,setItem:(k,v)=>h.storage.set(k,v),removeItem:k=>h.storage.delete(k)},svc=createCloudSaveService({client,session:{user:{id:'A'}},cache});
  await svc.load();h.win.HatchCloud={queue:o=>svc.queue(o)};h.run('globalThis.HatchCloud=window.HatchCloud;state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.pokemonId="pichu";state.care.hambre=60;save()');await svc.flush();await settle();
  h.run(action);const expected=JSON.parse(cache.getItem('hatch.mon.v3')),shell=cache.getItem('hatch.mon.shells');expected.message='';assert.equal(cache.getItem('cloud-dirty'),'1',name);svc.close();await settle();
  const reopened=createCloudSaveService({client,session:{user:{id:'A'}},cache});await reopened.load();assert.deepEqual(JSON.parse(cache.getItem('hatch.mon.v3')),expected,name);assert.equal(cache.getItem('hatch.mon.shells'),shell||JSON.stringify({unlocked:[],selected:'default'}),name);await reopened.flush();assert.equal(remote.game_state.game.pokemonId,expected.pokemonId);reopened.close();
 }
});
