const {test}=require('node:test'),assert=require('node:assert/strict');
const store=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
function backend(){const rows=new Map(),calls=[];let current='A',fail=false;return {rows,calls,setUser:id=>current=id,setFail:b=>fail=b,auth:{getSession:async()=>({data:{session:current?{user:{id:current}}:null}})},from(table){assert.equal(table,'game_saves');return{select(){return{eq(field,id){assert.equal(field,'user_id');return{maybeSingle:async()=>({data:rows.get(id)||null,error:fail?Error('network'):null})}}}},async upsert(row){calls.push(row);if(fail)return{error:Error('network')};assert.equal(row.user_id,current);rows.set(row.user_id,structuredClone(row));return{error:null}}}}}}
test('cloud priority, full envelope, isolated users, batching, retry and session guard',async()=>{
 const {createCloudSaveService,userStorage,snapshotCache}=await import('../cloudSaveService.mjs'),client=backend(),storage=store(),a=userStorage(storage,'A'),b=userStorage(storage,'B');
 const game={version:12,phase:'alive',birthScene:false,pokemonId:'pichu',social:{active:{isShiny:true},eggs:[{id:'egg'}],memorials:[{id:'memory'}]},pokedex:{pichu:{seen:true}},training:{iq:9},inventory:{berry:2}};
 a.setItem('hatch.mon.v3',JSON.stringify({...game,pokemonId:'stale'}));b.setItem('hatch.mon.v3',JSON.stringify({...game,pokemonId:'B'}));
 client.rows.set('A',{schema_version:1,game_state:{game,preferences:{displayMode:'lcd',shells:{selected:'pichu',unlocked:['pichu']}}}});
 const svc=createCloudSaveService({client,session:{user:{id:'A'}},cache:a,delay:100000});await svc.load();
 assert.equal(snapshotCache(a).game.pokemonId,'pichu');assert.equal(snapshotCache(b).game.pokemonId,'B');
 svc.queue();svc.queue();svc.queue();assert.equal(client.calls.length,0);await svc.flush();assert.equal(client.calls.length,1);
 assert.deepEqual(client.calls[0].game_state.game.social,game.social);assert.equal(client.calls[0].game_state.preferences.displayMode,'lcd');
 client.setFail(true);a.setItem('hatch.mon.v3',JSON.stringify({...game,nickname:'Cambio'}));svc.queue();assert.equal(await svc.flush(),false);assert.ok(a.getItem('cloud-dirty'));client.setFail(false);assert.equal(await svc.flush(),true);
 client.setUser('B');a.setItem('hatch.mon.v3',JSON.stringify({...game,nickname:'Otro'}));svc.queue();const n=client.calls.length;assert.equal(await svc.flush(),false);assert.equal(client.calls.length,n);svc.close();
});
test('new user cannot inherit cache; pending copy preserved; unsupported schema protected',async()=>{
 const {createCloudSaveService,userStorage}=await import('../cloudSaveService.mjs'),client=backend(),cache=userStorage(store(),'A');cache.setItem('hatch.mon.v3',JSON.stringify({version:12,phase:'egg'}));cache.setItem('cloud-dirty','1');
 const svc=createCloudSaveService({client,session:{user:{id:'A'}},cache});await svc.load();assert.equal(cache.getItem('hatch.mon.v3'),null);assert.ok(cache.getItem('cloud-backup'));
 client.rows.set('A',{schema_version:99,game_state:{game:{version:12}}});await assert.rejects(svc.load(),/unsupported-save/);assert.equal(client.calls.length,0);svc.close();
});
test('Realtime converges devices, rejects stale pending state and removes its only subscription',async()=>{
 const {createCloudSaveService,userStorage}=await import('../cloudSaveService.mjs');const storage=store(),cacheA=userStorage(storage,'A-device'),cacheB=userStorage(storage,'B-device');let remote=null,writes=0,removed=0,handlerA,handlerB,channelCount=0;
 const channel=handler=>({on(_event,_filter,next){handler(next);return this;},subscribe(){return this;},unsubscribe(){removed++;}});
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'user'}}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:remote,error:null})})}),upsert:async row=>{writes++;remote=structuredClone(row);remote.updated_at=new Date(Date.now()+writes).toISOString();handlerA?.({new:remote});handlerB?.({new:remote});return{data:{updated_at:remote.updated_at},error:null}}}),channel(){return ++channelCount===1?channel(next=>handlerA=next):channel(next=>handlerB=next);},removeChannel(){removed++;}};
 const seenA=[],seenB=[],a=createCloudSaveService({client,session:{user:{id:'user'}},cache:cacheA,onRemote:game=>seenA.push(game.value),delay:100000}),b=createCloudSaveService({client,session:{user:{id:'user'}},cache:cacheB,onRemote:game=>seenB.push(game.value),delay:100000});
 await a.load();await b.load();a.startRealtime();b.startRealtime();
 cacheB.setItem('hatch.mon.v3',JSON.stringify({version:12,value:80}));b.queue();
 cacheA.setItem('hatch.mon.v3',JSON.stringify({version:12,value:100}));a.queue();await a.flush();
 assert.deepEqual(seenB,[100]);assert.equal(JSON.parse(cacheB.getItem('hatch.mon.v3')).value,100);await b.flush();assert.equal(writes,1);
 const newer={schema_version:1,updated_at:new Date(Date.now()+1000).toISOString(),game_state:{game:{version:12,value:120},preferences:{displayMode:'lcd'},sync:{revision:2,sourceId:'other'}}};assert.equal(b.applyRemote(newer),true);assert.equal(b.applyRemote({...newer,updated_at:new Date(Date.now()+500).toISOString()}),false);assert.deepEqual(seenB,[100,120]);
 a.close();b.close();assert.ok(removed>=2);
});
test('production has no testing UI and debug entry points do nothing',async()=>{
 const {setup}=require('./uiHarness.cjs'),h=await setup({development:false});assert.equal(h.win.HatchMon,undefined);h.run('HatchEnvironment.isDevelopmentEnvironment=()=>true');h.run("showPanel('settings')");const labels=h.els['panel-content'].querySelectorAll('button').map(b=>b.dataset.key);assert.ok(!labels.some(k=>/testing|skip-|force-/.test(k||'')));const before=h.run('JSON.stringify(state)');assert.equal(h.run('skipTime(6)'),false);assert.equal(h.run('resetGame()'),false);assert.equal(h.run('forceEvolution()'),false);assert.equal(h.run('JSON.stringify(state)'),before);
 const vm=require('node:vm'),fs=require('node:fs');for(const [hostname,expected] of [['127.0.0.1',true],['localhost',true],['hatch.mon',false],['localhost.evil.test',false],['',false]]){const c=vm.createContext({location:{hostname}});vm.runInContext(fs.readFileSync('appEnvironment.js','utf8'),c);assert.equal(c.HatchEnvironment.isDevelopmentEnvironment(),expected);}
});
test('real game snapshot round-trips with nickname, shiny, progress and preferences; interrupted birth remains valid',async()=>{
 const {setup}=require('./uiHarness.cjs'),{snapshotCache,hydrateCache}=await import('../cloudSaveService.mjs'),h=await setup(),cache=store();
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Pepo");state.social.active.isShiny=true;state.training.iq=13;save()');
 cache.setItem('hatch.mon.v3',h.storage.get('hatch.mon.v3'));cache.setItem('hatch.mon.displayMode','lcd');cache.setItem('hatch.mon.shells',JSON.stringify({unlocked:['pichu'],selected:'pichu'}));
 const envelope=snapshotCache(cache),target=store();hydrateCache(target,envelope);const restored=await setup({initialSave:JSON.parse(target.getItem('hatch.mon.v3')),initialDisplayMode:target.getItem('hatch.mon.displayMode'),initialShells:JSON.parse(target.getItem('hatch.mon.shells'))});
 assert.equal(restored.run('validSave(state)'),true);assert.equal(restored.run('state.nickname'),'Pepo');assert.equal(restored.run('state.training.iq'),13);assert.equal(restored.run('state.social.active.isShiny'),true);assert.equal(restored.run('displayMode'),'lcd');assert.deepEqual(JSON.parse(restored.run('JSON.stringify(state.pokedex)')),envelope.game.pokedex);
 const egg=await setup();egg.run('state.incubationRemaining=0;hatch(()=>0);save()');cache.setItem('hatch.mon.v3',egg.storage.get('hatch.mon.v3'));const birth=snapshotCache(cache);assert.equal(birth.game.birthScene,false);assert.equal(birth.game.nicknamePending,true);assert.equal(egg.run(`validSave(${JSON.stringify(birth.game)})`),true);
});
