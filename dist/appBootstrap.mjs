import {client,auth,humanError} from './authService.mjs';
import {createCloudSaveService,userStorage,snapshotCache} from './cloudSaveService.mjs';
const $=id=>document.getElementById(id),gate=$('auth-gate'),game=$('game-root'),message=$('auth-message');
let started=false,starting=false,userId=null,service=null,recovery=new URLSearchParams(location.search).has('recovery'),mode=recovery?'update':'login',busy=false,leaving=false;
const notify=text=>{const n=$('cloud-status');if(n){n.textContent=text;n.hidden=!text;}};
function formMode(next){mode=next;$('auth-title').textContent=({login:'Tu compañero te espera',signup:'Crear cuenta',recover:'Recuperar acceso',update:'Nueva contraseña'})[mode];$('auth-password-row').hidden=mode==='recover';$('auth-email-row').hidden=mode==='update';$('auth-password').required=mode!=='recover';$('auth-password').autocomplete=mode==='login'?'current-password':'new-password';$('auth-email').required=mode!=='update';$('auth-submit').textContent=({login:'Entrar',signup:'Crear cuenta',recover:'Enviar enlace',update:'Guardar contraseña'})[mode];$('auth-google').hidden=mode==='update';}
function lock(){game.hidden=true;gate.hidden=false;window.HatchRuntime?.stop();}
async function scripts(){for(const tag of document.querySelectorAll('script[data-game-src]'))await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=tag.dataset.gameSrc;script.onload=resolve;script.onerror=reject;document.head.append(script);});}
async function start(session){
 if(started||starting||leaving||recovery)return;starting=true;message.textContent='Cargando compañero…';$('auth-form').hidden=true;
 try{
  userId=session.user.id;const cache=userStorage(localStorage,userId);window.HatchStorage=cache;
  service=createCloudSaveService({client,session,cache,notify,onRemote:(game,preferences)=>window.HatchRuntime?.applyCloudSave(game,preferences)});
  try{await service.load();}catch(error){
   if(error.message==='unsupported-save')throw error;
   const cached=snapshotCache(cache);if(!cached?.game)throw error;
   // Offline boot is read-only for cloud until a cloud-first reload resolves versions.
   service.block();notify('Modo local. Recarga con conexión antes de sincronizar.');
  }
  const {data:{session:latest}}=await client.auth.getSession();if(latest?.user.id!==userId)throw Error('session-changed');
  window.HatchCloud={queue:options=>service.queue(options),notify};
  window.HatchAccount={email:session.user.email||'Tu cuenta',hasBackup:()=>!!cache.getItem('cloud-backup'),downloadBackup:()=>{const raw=cache.getItem('cloud-backup');if(!raw)return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='hatchmon-copia-pendiente.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},logout:async()=>{
   if(leaving)return;leaving=true;lock();window.HatchRuntime?.save();await service.flush();
   const {error}=await auth.logout();if(error){message.textContent=humanError(error);$('auth-retry').hidden=false;return;}
   service.close();location.replace(location.pathname);
  }};
  await scripts();
  const {data:{session:verified}}=await client.auth.getSession();if(verified?.user.id!==userId)throw Error('session-changed');
  const source=$('game-source').textContent;
  const script=document.createElement('script');script.textContent='(()=>{\n'+source+'\n})();';document.head.append(script);
  if(!window.HatchRuntime)throw Error('game-start-failed');
  started=true;gate.hidden=true;game.hidden=false;service.startRealtime?.();service.queue();
 }catch(error){service?.close();lock();message.textContent=error.message==='unsupported-save'?'Esta partida necesita otra versión de Hatch.mon. No se ha modificado.':'No se pudo cargar tu compañero. Reintenta con conexión.';$('auth-form').hidden=true;$('auth-google').hidden=true;$('auth-retry').hidden=false;}
 finally{starting=false;}
}
client.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY'){recovery=true;lock();formMode('update');$('auth-form').hidden=false;}
 if(started&&(event==='SIGNED_OUT'||session?.user.id!==userId)){lock();service?.close();if(!leaving)location.replace(location.pathname);}
 if(session&&!recovery&&!started)setTimeout(()=>void start(session),0);
});
$('auth-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||starting||leaving)return;busy=true;$('auth-submit').disabled=true;message.textContent='';
 const email=$('auth-email').value.trim(),password=$('auth-password').value;
 try{
  const result=await ({login:()=>auth.login(email,password),signup:()=>auth.signup(email,password),recover:()=>auth.recover(email),update:()=>auth.update(password)})[mode]();
  if(result.error)throw result.error;
  if(mode==='signup'&&!result.data.session)message.textContent='Revisa tu correo para confirmar la cuenta.';
  else if(mode==='recover')message.textContent='Revisa tu correo para recuperar el acceso.';
  else if(mode==='update'){recovery=false;history.replaceState(null,'',location.pathname);location.reload();}
  else if(result.data?.session)await start(result.data.session);
 }catch(error){message.textContent=humanError(error);}finally{$('auth-password').value='';busy=false;$('auth-submit').disabled=false;}
});
$('auth-google').addEventListener('click',async()=>{if(starting||busy)return;try{const {error}=await auth.google();if(error)throw error;}catch(error){message.textContent=humanError(error);}});
for(const next of ['login','signup','recover'])$('auth-'+next).addEventListener('click',()=>{if(starting||busy||leaving)return;message.textContent='';formMode(next);});
window.addEventListener('online',()=>{if(service?.isBlocked())notify('Conexión recuperada. Recarga para resolver la partida cloud.');else{void service?.reconcile();void service?.flush();}});
function flushOnLeave(){window.HatchRuntime?.save();queueMicrotask(()=>{service?.queue();void service?.flush();});}
window.addEventListener('pagehide',flushOnLeave);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushOnLeave();});
formMode(mode);
try{const {data:{session},error}=await client.auth.getSession();if(error)throw error;if(session&&!recovery)await start(session);else message.textContent=recovery?'Elige tu nueva contraseña.':'';}catch{message.textContent='No se pudo comprobar la sesión. Revisa la conexión.';}
