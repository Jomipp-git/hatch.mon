const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
async function boot(session=null,{fail=false,search=''}={}){
 const nodes=new Map(),calls=[],events={},history=[],storage=new Map();let listener;
 const el=id=>{if(!nodes.has(id))nodes.set(id,{hidden:id==='game-root',textContent:'',value:'',dataset:{},events:{},addEventListener(k,f){this.events[k]=f}});return nodes.get(id)};
 el('game-source').textContent='window.HatchRuntime={stop(){},save(){}}';
 const window={addEventListener(k,f){events[k]=f}},location={search,pathname:'/index.html',replace:p=>history.push(p),reload:()=>history.push('reload')};
 const document={addEventListener(k,f){events[k]=f},getElementById:el,querySelectorAll:()=>[{dataset:{gameSrc:'dummy.js'}}],createElement:()=>({}),head:{append(s){if(s.src){calls.push('script');s.onload()}else{calls.push('game');Function('window',s.textContent)(window)}}}};
 const auth={};for(const key of ['login','signup','recover','update','google','logout'])auth[key]=async()=>{calls.push(key);return{data:{session:key==='signup'?null:session},error:null}};
 const client={auth:{onAuthStateChange:f=>listener=f,getSession:async()=>({data:{session},error:null})}};
 const service={load:async()=>{calls.push('load');assert.equal(el('game-root').hidden,true);assert.equal(window.HatchRuntime,undefined);if(fail)throw Error('network')},queue:()=>calls.push('queue'),flush:async()=>calls.push('flush'),close:()=>calls.push('close'),block(){},isBlocked:()=>false};
 const source=fs.readFileSync('appBootstrap.mjs','utf8').replace(/^import .*;\n/gm,'');
 await new (Object.getPrototypeOf(async function(){}).constructor)('client','auth','humanError','createCloudSaveService','userStorage','snapshotCache','document','window','location','localStorage','history',source)(client,auth,()=> 'Error humano',()=>service,()=>({getItem:()=>null}),()=>null,document,window,location,storage,{replaceState(){}});
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
