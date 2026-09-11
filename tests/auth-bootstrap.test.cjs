const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
async function boot(session=null,{fail=false,search='',runtimeHarness=null}={}){
 const nodes=new Map(),calls=[],events={},history=[],storage=new Map();let listener;
 const el=id=>{if(!nodes.has(id))nodes.set(id,{hidden:id==='game-root',textContent:'',value:'',dataset:{},events:{},addEventListener(k,f){this.events[k]=f}});return nodes.get(id)};
 el('game-source').textContent=runtimeHarness?fs.readFileSync('index.html','utf8').match(/<script type="text\/plain" id="game-source">([\s\S]*?)<\/script>/)[1]:'window.HatchRuntime={stop(){},save(){}}';
 const window=runtimeHarness?.win||{addEventListener(k,f){events[k]=f}},location={search,pathname:'/index.html',replace:p=>history.push(p),reload:()=>history.push('reload')};
 const document={addEventListener(k,f){events[k]=f},getElementById:el,querySelectorAll:()=>[{dataset:{gameSrc:'dummy.js'}}],createElement:()=>({}),head:{append(s){if(s.src){calls.push('script');s.onload()}else{calls.push('game');if(runtimeHarness){try{runtimeHarness.run(s.textContent)}catch{}}else Function('window',s.textContent)(window)}}}};
 const auth={};for(const key of ['login','signup','recover','update','google','logout'])auth[key]=async()=>{calls.push(key);return{data:{session:key==='signup'?null:session},error:null}};
 const client={auth:{onAuthStateChange:f=>listener=f,getSession:async()=>({data:{session},error:null})}};
 const service={load:async()=>{calls.push('load');assert.equal(el('game-root').hidden,true);assert.equal(window.HatchRuntime,undefined);if(fail)throw Error('network')},queue:()=>calls.push('queue'),flush:async()=>calls.push('flush'),close:()=>calls.push('close'),block(){},isBlocked:()=>false};
 const source="const globalThis={HatchI18n:{t:key=>({\n  'auth.title.login':'Tu compañero te espera','auth.signIn':'Entrar','auth.title.signup':'Crear cuenta','auth.signUp':'Crear cuenta','auth.title.recover':'Recuperar acceso','auth.sendRecovery':'Enviar enlace','auth.title.update':'Nueva contraseña','auth.savePassword':'Guardar contraseña','auth.loadingCompanion':'Cargando compañero…','auth.confirmEmail':'Revisa tu correo para confirmar la cuenta.','auth.recoverySent':'Revisa tu correo para recuperar el acceso.','auth.choosePassword':'Elige tu nueva contraseña.','auth.unsupportedSave':'Esta partida necesita otra versión de Hatch.mon. No se ha modificado.','auth.companionLoadFailed':'No se pudo cargar tu compañero. Reintenta con conexión.','auth.accountFallback':'Tu cuenta','auth.sessionExpired':'Tu sesión ha expirado. Inicia sesión de nuevo.','auth.sessionCheckFailed':'No se pudo comprobar la sesión. Revisa la conexión.','system.offlineLocal':'Modo local. Recarga con conexión antes de sincronizar.','system.connectionRecovered':'Conexión recuperada. Recarga para resolver la partida cloud.'}[key]||key)}};\n"+fs.readFileSync('appBootstrap.mjs','utf8').replace(/^import .*;\n/gm,'');
 await new (Object.getPrototypeOf(async function(){}).constructor)('client','auth','humanError','createCloudSaveService','userStorage','snapshotCache','document','window','location','localStorage','history',source)(client,auth,()=> 'Error humano',()=>service,()=>runtimeHarness?{getItem:k=>runtimeHarness.storage.get(k)||null,setItem:(k,v)=>runtimeHarness.storage.set(k,v),removeItem:k=>runtimeHarness.storage.delete(k)}:{getItem:()=>null},()=>null,document,window,location,storage,{replaceState(){}});
 return {el,calls,window,listener,history};
}
test('unauthenticated gate never loads game; email, signup, recovery, Google bindings',async()=>{
 const h=await boot();assert.deepEqual(h.calls,[]);assert.equal(h.el('game-root').hidden,true);
 const submit=()=>h.el('auth-form').events.submit({preventDefault(){}});
 await submit();assert.ok(h.calls.includes('login'));
 h.el('auth-signup').events.click();await submit();assert.match(h.el('auth-message').textContent,/correo/);
 h.el('auth-recover').events.click();await submit();assert.ok(h.calls.includes('recover'));
 await h.el('auth-google').events.click();assert.ok(h.calls.includes('google'));
});
test('cloud loaded before script and game, logout flushes and reloads, account switch locks',async()=>{
 const h=await boot({user:{id:'A',email:'a@example.test'}});assert.deepEqual(h.calls.slice(0,3),['load','script','game']);assert.equal(h.el('game-root').hidden,false);
 await h.window.HatchAccount.logout();assert.equal(h.el('game-root').hidden,true);assert.ok(h.calls.indexOf('flush')<h.calls.indexOf('logout'));assert.deepEqual(h.history,['/index.html']);
 const b=await boot({user:{id:'A'}});b.listener('SIGNED_IN',{user:{id:'B'}});assert.equal(b.el('game-root').hidden,true);assert.ok(b.calls.includes('close'));
});
test('failed cloud cannot start game, recovery callback does not start game',async()=>{
 const h=await boot({user:{id:'A'}},{fail:true});assert.ok(!h.calls.includes('game'));assert.equal(h.el('game-root').hidden,true);assert.equal(h.el('auth-retry').hidden,false);
 const r=await boot({user:{id:'A'}},{search:'?recovery=1'});assert.deepEqual(r.calls,[]);await r.el('auth-form').events.submit({preventDefault(){}});assert.ok(r.calls.includes('update'));
});
test('actual companion runtime loads a partial legacy save through authenticated bootstrap and reopens intact',async()=>{
 const {setup}=require('./uiHarness.cjs'),first=await setup();first.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Pepo");state.coins=120;state.inventory.tea=2;state.sleep={fatigue:35}');
 const original=JSON.parse(first.run('JSON.stringify(state)'));delete original.attentionMeta;delete original.attentionSettings;
 let save=original;
 for(let i=0;i<2;i++){
  const runtime=await setup({runtimeSource:'',initialSave:save});const h=await boot({user:{id:'A'}},{runtimeHarness:runtime});
  assert.equal(h.el('game-root').hidden,false);assert.equal(h.el('auth-gate').hidden,true);assert.ok(h.window.HatchRuntime);
  save=JSON.parse(runtime.storage.get('hatch.mon.v3'));
  for(const key of ['nickname','coins','inventory','care','social','pokedex','relationship','personality','gender','milestones'])assert.deepEqual(save[key],original[key],key);
 }
});
test('actual bootstrap identifies invalid save separately from connection failure and preserves bytes',async()=>{
 const {setup}=require('./uiHarness.cjs'),bad={version:12,care:'invalid'},runtime=await setup({runtimeSource:'',initialSave:bad});
 const h=await boot({user:{id:'A'}},{runtimeHarness:runtime});assert.equal(h.el('game-root').hidden,true);assert.equal(h.el('auth-message').textContent,'system.incompatibleSave');
 assert.equal(runtime.storage.get('hatch.mon.v3'),JSON.stringify(bad));assert.ok(!h.calls.includes('queue'));
});
