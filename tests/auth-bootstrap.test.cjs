const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
async function boot(session=null,{fail=false,search='',runtimeHarness=null,loginError=null}={}){
 const nodes=new Map(),calls=[],events={},history=[],storage=new Map();let listener;
 const el=id=>{if(!nodes.has(id))nodes.set(id,{hidden:id==='game-root',textContent:'',value:'',dataset:{},events:{},addEventListener(k,f){this.events[k]=f}});return nodes.get(id)};
 el('game-source').textContent=runtimeHarness?fs.readFileSync('index.html','utf8').match(/<script type="text\/plain" id="game-source">([\s\S]*?)<\/script>/)[1]:'window.HatchRuntime={stop(){},save(){}}';
 const window=runtimeHarness?.win||{addEventListener(k,f){events[k]=f}},location={search,pathname:'/index.html',replace:p=>history.push(p),reload:()=>history.push('reload')};
 const document={addEventListener(k,f){events[k]=f},getElementById:el,querySelectorAll:()=>[{dataset:{gameSrc:'dummy.js'}}],createElement:()=>({}),head:{append(s){if(s.src){calls.push('script');s.onload()}else{calls.push('game');if(runtimeHarness){try{runtimeHarness.run(s.textContent)}catch{}}else Function('window',s.textContent)(window)}}}};
 const auth={};for(const key of ['login','signup','recover','update','google','logout','resendConfirmation'])auth[key]=async()=>{calls.push(key);return{data:{session:key==='signup'?null:session},error:key==='login'?loginError:null}};
 const client={auth:{onAuthStateChange:f=>listener=f,getSession:async()=>({data:{session},error:null})}};
 const service={load:async()=>{calls.push('load');assert.equal(el('game-root').hidden,true);assert.equal(window.HatchRuntime,undefined);if(fail)throw Error('network')},queue:()=>calls.push('queue'),flush:async()=>calls.push('flush'),close:()=>calls.push('close'),block(){},isBlocked:()=>false};
 const source="const globalThis={HatchI18n:{t:key=>({\n  'auth.title.login':'Tu compañero te espera','auth.signIn':'Entrar','auth.title.signup':'Crear cuenta','auth.signUp':'Crear cuenta','auth.title.recover':'Recuperar acceso','auth.sendRecovery':'Enviar enlace','auth.title.update':'Nueva contraseña','auth.savePassword':'Guardar contraseña','auth.loadingCompanion':'Cargando compañero…','auth.confirmEmail':'Revisa tu correo para confirmar la cuenta.','auth.recoverySent':'Revisa tu correo para recuperar el acceso.','auth.choosePassword':'Elige tu nueva contraseña.','auth.unsupportedSave':'Esta partida necesita otra versión de Hatch.mon. No se ha modificado.','auth.companionLoadFailed':'No se pudo cargar tu compañero. Reintenta con conexión.','auth.accountFallback':'Tu cuenta','auth.sessionExpired':'Tu sesión ha expirado. Inicia sesión de nuevo.','auth.sessionCheckFailed':'No se pudo comprobar la sesión. Revisa la conexión.','system.offlineLocal':'Modo local. Recarga con conexión antes de sincronizar.','system.connectionRecovered':'Conexión recuperada. Recarga para resolver la partida cloud.'}[key]||key)}};\n"+fs.readFileSync('appBootstrap.mjs','utf8').replace(/^import .*;\n/gm,'');
 await new (Object.getPrototypeOf(async function(){}).constructor)('client','auth','humanError','needsConfirmation','createCloudSaveService','userStorage','snapshotCache','document','window','location','localStorage','history',source)(client,auth,error=>`humano:${error?.code||''}`,error=>error?.code==='email_not_confirmed',()=>service,()=>runtimeHarness?{getItem:k=>runtimeHarness.storage.get(k)||null,setItem:(k,v)=>runtimeHarness.storage.set(k,v),removeItem:k=>runtimeHarness.storage.delete(k)}:{getItem:()=>null},()=>null,document,window,location,storage,{replaceState(){}});
 return {el,calls,window,listener,history};
}
test('the gate shows one thing at a time and never repeats the button you already pressed',async()=>{
 const signedOut=await boot();
 // No session: the form is what you see, and the loading block is out of the flow.
 assert.equal(signedOut.el('auth-gate').dataset.state,'form');
 // Submit and the login link carry the same label, which is why one of them has to go.
 const markup=fs.readFileSync('index.html','utf8');
 assert.match(markup,/id="auth-submit"[^>]*data-i18n="auth\.signIn"/);
 assert.match(markup,/id="auth-login"[^>]*data-i18n="auth\.signIn"/);
 assert.equal(signedOut.el('auth-login').hidden,true,'the duplicate is hidden, not shown twice');
 assert.equal(signedOut.el('auth-signup').hidden,false);
 assert.equal(signedOut.el('auth-recover').hidden,false);
 signedOut.el('auth-signup').events.click();
 assert.equal(signedOut.el('auth-signup').hidden,true,'now sign-up is the duplicate');
 assert.equal(signedOut.el('auth-login').hidden,false);
 // A session means work is happening: the form must not be reachable while it does.
 const signedIn=await boot({user:{id:'A',email:'a@example.test'}});
 assert.equal(signedIn.el('auth-gate').dataset.state,'loading');
 assert.equal(signedIn.el('auth-loading-text').dataset.i18n,'auth.verifyingAccount');
 // A failure hands the form back rather than leaving a spinner forever.
 const broken=await boot({user:{id:'A',email:'a@example.test'}},{fail:true});
 assert.equal(broken.el('auth-gate').dataset.state,'form');
 assert.equal(broken.el('auth-retry').hidden,false);
});
test('a failed sign-in says so loudly and points at creating an account',async()=>{
 const failing=await boot(null,{loginError:{code:'invalid_credentials',message:'Invalid login credentials'}});
 failing.el('auth-email').value='nobody@example.test';
 await failing.el('auth-form').events.submit({preventDefault(){}});
 assert.equal(failing.el('auth-message').dataset.kind,'error','an error is marked as one, not left as plain text');
 assert.match(fs.readFileSync('index.html','utf8'),/\.auth-message\[data-kind="error"\]\{/,'and is styled apart');
 // Supabase answers the same way for a wrong password and a missing account, so the copy covers both.
 const catalog=fs.readFileSync('i18n.js','utf8').split('\n').filter(line=>line.includes('"auth.invalidCredentials"'));
 assert.equal(catalog.length,2,'both languages');
 for(const line of catalog)assert.match(line,/Crear cuenta|Create account/,'the message names the way out');
 // A message that is not a failure stays quiet.
 failing.el('auth-signup').events.click();
 assert.equal(failing.el('auth-message').dataset.kind,'','switching mode clears the error');
});
test('an unconfirmed account is offered the confirmation email again',async()=>{
 const h=await boot();
 h.el('auth-email').value='someone@example.test';
 h.el('auth-signup').events.click();
 await h.el('auth-form').events.submit({preventDefault(){}});
 assert.equal(h.el('auth-resend').hidden,false,'sign-up that needs confirmation offers a resend');
 assert.equal(h.el('auth-resend').dataset.email,'someone@example.test');
 await h.el('auth-resend').events.click();
 assert.ok(h.calls.includes('resendConfirmation'));
 // Switching mode clears the offer: it belongs to the attempt that produced it.
 h.el('auth-recover').events.click();
 assert.equal(h.el('auth-resend').hidden,true);
});
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
test('authenticated UID is the sole source of admin access',async()=>{
 const admin=await boot({user:{id:'a81c13f7-a9d6-46d5-aa5c-66512b25ed68'}});
 const user=await boot({user:{id:'another-user'}});
 assert.equal(admin.window.HatchAdmin.isAdmin(),true);
 assert.equal(user.window.HatchAdmin.isAdmin(),false);
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

test('logout saves current runtime before flush and stop, while hiding game and preventing duplicate logout',async()=>{
 const {setup}=require('./uiHarness.cjs'),runtime=await setup({runtimeSource:''});
 const h=await boot({user:{id:'A'}},{runtimeHarness:runtime});
 const current=JSON.parse(runtime.storage.get('hatch.mon.v3'));current.coins=137;current.trainer.energy=2;
 assert.equal(h.window.HatchRuntime.applyCloudSave(current),true);
 const api=h.window.HatchRuntime,save=api.save,stop=api.stop;
 api.save=()=>{h.calls.push('save');assert.equal(h.el('game-root').hidden,true);save();};
 api.stop=()=>{h.calls.push('stop');stop();};
 h.calls.length=0;
 await Promise.all([h.window.HatchAccount.logout(),h.window.HatchAccount.logout()]);
 const order=h.calls.filter(c=>['save','flush','stop','logout'].includes(c));
 assert.deepEqual(order,['save','flush','stop','logout']);
 const saved=JSON.parse(runtime.storage.get('hatch.mon.v3'));assert.equal(saved.coins,137);assert.equal(saved.trainer.energy,2);
});

test('the offline stub stays a local-server substitution and never ships',()=>{
 const stub='tools/devStubs/authService.mjs';
 assert.ok(fs.existsSync(stub));
 // Comments name Supabase to explain the boundary; only executable code is checked here.
 const code=fs.readFileSync(stub,'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,'');
 assert.ok(!/^\s*import\b|createClient|esm\.sh|supabase\.co/mi.test(code),
  'the stub must not import Supabase or name its endpoint');
 assert.ok(!/\bchannel\b/.test(code),'without channel(), cloudSaveService falls back to polling');
 // It reaches the page only through tools/serveLocal.py --offline, never through the build.
 assert.match(fs.readFileSync('tools/serveLocal.py','utf8'),/tools\/devStubs\/authService\.mjs/);
 assert.ok(!fs.existsSync('dist/tools'),'tools/ must never be staged');
 assert.match(fs.readFileSync('dist/authService.mjs','utf8'),/supabase\.co/,'dist must carry the real auth module');
 assert.deepEqual(fs.readFileSync('dist/authService.mjs'),fs.readFileSync('authService.mjs'));
 // The stub must answer every call cloudSaveService makes; a gap would fail silently in game.
 const cloud=fs.readFileSync('cloudSaveService.mjs','utf8');
 for(const call of ['maybeSingle','upsert','getSession','onAuthStateChange'])
  assert.ok(code.includes(call),`stub is missing ${call}`);
 // Every auth entry point appBootstrap imports or calls must exist here too.
 const boot=fs.readFileSync('appBootstrap.mjs','utf8');
 for(const call of [...boot.matchAll(/(?<![.\w])auth\.([a-zA-Z]+)\(/g)].map(m=>m[1]))
  assert.ok(new RegExp(`\\b${call}:`).test(code),`stub is missing auth.${call}`);
 for(const call of ['maybeSingle','upsert','getSession'])assert.ok(cloud.includes(call),call);
 // Every stand-in must export what appBootstrap imports, or the module never loads at all.
 const imported=boot.match(/^import \{([^}]*)\} from '\.\/authService\.mjs'/m)[1].split(',').map(n=>n.trim());
 const standIns={'authService.mjs':fs.readFileSync('authService.mjs','utf8'),[stub]:code,
  'tests/browser-recovery.cjs':fs.readFileSync('tests/browser-recovery.cjs','utf8')};
 for(const [file,source] of Object.entries(standIns))
  // A stand-in may group bindings in one statement, so the name only has to sit inside an export.
  for(const name of imported)assert.match(source,new RegExp(`export (const|function)[^;\\n]*\\b${name}\\b`),`${file} is missing ${name}`);
});
