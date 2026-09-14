import {client,auth,humanError,needsConfirmation} from './authService.mjs';
import {createCloudSaveService,userStorage,snapshotCache} from './cloudSaveService.mjs';
// Asset cache only; see sw.js. A registration failure must never block the game from starting.
if('serviceWorker' in navigator&&isSecureContext)
 addEventListener('load',()=>void navigator.serviceWorker.register('sw.js').catch(()=>{}));
const $=id=>document.getElementById(id),t=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key,gate=$('auth-gate'),game=$('game-root'),message=$('auth-message');
// The gate is either working or asking. Never both: a form under a spinner invites a misclick.
function gateState(state,textKey){
 gate.dataset.state=state;
 if(state!=='loading')return;
 const node=$('auth-loading-text');node.dataset.i18n=textKey;node.textContent=t(textKey);
 // The heading is part of the disguise: "Your companion is waiting" reads like an invitation to act.
 $('auth-title').dataset.i18n='auth.loadingTitle';$('auth-title').textContent=t('auth.loadingTitle');
}
const showForm=()=>{gateState('form');$('auth-form').hidden=false;formMode(mode);};
// Plain text in the same colour as the rest reads as nothing happening, which is exactly how a
// failed sign-in was being reported. An error announces itself; a confirmation stays quiet.
function say(text,kind='info'){message.textContent=text;message.dataset.kind=text?kind:'';}
const sayError=error=>say(humanError(error),'error');
const ADMIN_UID='a81c13f7-a9d6-46d5-aa5c-66512b25ed68';
let started=false,starting=false,userId=null,service=null,recovery=new URLSearchParams(location.search).has('recovery'),mode=recovery?'update':'login',busy=false,leaving=false;
const notify=text=>{const node=$('cloud-status');if(node){node.textContent=text;node.hidden=!text;}};
function installAdminAccess(session){
 const allowed=session?.user?.id===ADMIN_UID;
 Object.defineProperty(window,'HatchAdmin',{value:Object.freeze({isAdmin:()=>allowed}),configurable:false,writable:false});
}
delete message.dataset.i18n;
const formKeys={login:['auth.title.login','auth.signIn'],signup:['auth.title.signup','auth.signUp'],recover:['auth.title.recover','auth.sendRecovery'],update:['auth.title.update','auth.savePassword']};
function formMode(next){
 mode=next;const [title,submit]=formKeys[mode];$('auth-title').dataset.i18n=title;$('auth-submit').dataset.i18n=submit;$('auth-title').textContent=t(title);$('auth-password-row').hidden=mode==='recover';$('auth-email-row').hidden=mode==='update';$('auth-password').required=mode!=='recover';$('auth-password').autocomplete=mode==='login'?'current-password':'new-password';$('auth-email').required=mode!=='update';$('auth-submit').textContent=t(submit);$('auth-google').hidden=mode==='update';
 // The submit button already says "Sign in"; the link that only switches to the mode you are
 // already in would read the same and do nothing, so it is hidden instead of duplicated.
 for(const other of ['login','signup','recover'])$('auth-'+other).hidden=mode==='update'||other===mode;
 $('auth-password-hint').hidden=mode!=='signup'&&mode!=='update';
}
function lock(){game.hidden=true;gate.hidden=false;window.HatchRuntime?.stop();}
function offerResend(email){$('auth-resend').hidden=!email;$('auth-resend').dataset.email=email||'';}
async function scripts(){for(const tag of document.querySelectorAll('script[data-game-src]'))await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=tag.dataset.gameSrc;script.onload=resolve;script.onerror=reject;document.head.append(script);});}
async function start(session){
 if(started||starting||leaving||recovery)return;starting=true;offerResend('');gateState('loading','auth.verifyingAccount');
 try{
  userId=session.user.id;installAdminAccess(session);const cache=userStorage(localStorage,userId);window.HatchStorage=cache;
  service=createCloudSaveService({client,session,cache,notify,onRemote:(game,preferences)=>window.HatchRuntime?.applyCloudSave(game,preferences)});
  try{await service.load();}catch(error){
   if(['unsupported-save','invalid-save'].includes(error.message))throw error;let cached;try{cached=snapshotCache(cache);}catch{throw Error('invalid-save');}if(!cached?.game)throw error;
   service.block();notify(t('system.offlineLocal'));
  }
  globalThis.HatchI18n?.setLanguage?.(cache.getItem('hatch.mon.language'));
  const {data:{session:latest}}=await client.auth.getSession();if(latest?.user.id!==userId)throw Error('session-changed');
  window.HatchCloud={queue:options=>service.queue(options),notify};
  window.HatchAccount={email:session.user.email||t('auth.accountFallback'),hasBackup:()=>!!cache.getItem('cloud-backup'),downloadBackup:()=>{const raw=cache.getItem('cloud-backup');if(!raw)return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='hatchmon-copia-pendiente.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},logout:async()=>{
   if(leaving)return;leaving=true;game.hidden=true;gate.hidden=false;window.HatchRuntime?.save();await service.flush();lock();
   const {error}=await auth.logout();if(error){sayError(error);$('auth-retry').hidden=false;return;}
   service.close();location.replace(location.pathname);
  }};
  await scripts();
  const {data:{session:verified}}=await client.auth.getSession();if(verified?.user.id!==userId)throw Error('session-changed');
  const source=$('game-source').textContent,script=document.createElement('script');script.textContent='(()=>{\n'+source+'\n})();';document.head.append(script);
  if(window.HatchLoadError)throw Error(window.HatchLoadError);
  if(!window.HatchRuntime)throw Error('game-start-failed');
  started=true;gate.hidden=true;game.hidden=false;service.startRealtime?.();service.queue();
 }catch(error){service?.close();lock();showForm();say(t(error.message==='save-read-failed'?'system.storageUnavailable':error.message==='game-start-failed'?'auth.runtimeStartFailed':error.message==='invalid-save'?'system.incompatibleSave':error.message==='unsupported-save'?'auth.unsupportedSave':error.message==='session-changed'?'auth.sessionExpired':'auth.companionLoadFailed'),'error');$('auth-form').hidden=true;$('auth-google').hidden=true;$('auth-retry').hidden=false;}
 finally{starting=false;}
}
client.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY'){recovery=true;lock();formMode('update');showForm();}
 if(started&&(event==='SIGNED_OUT'||session?.user.id!==userId)){lock();service?.close();if(!leaving){say(t('auth.sessionExpired'),'error');location.replace(location.pathname);}}
 if(session&&!recovery&&!started)setTimeout(()=>void start(session),0);
});
$('auth-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||starting||leaving)return;busy=true;$('auth-submit').disabled=true;say('');
 const email=$('auth-email').value.trim(),password=$('auth-password').value;
 offerResend('');say('');
 try{
  const result=await ({login:()=>auth.login(email,password),signup:()=>auth.signup(email,password),recover:()=>auth.recover(email),update:()=>auth.update(password)})[mode]();
  if(result.error)throw result.error;
  if(mode==='signup'&&!result.data.session){say(t('auth.confirmEmail'));offerResend(email);}
  else if(mode==='recover')say(t('auth.recoverySent'));
  else if(mode==='update'){recovery=false;history.replaceState(null,'',location.pathname);location.reload();}
  else if(result.data?.session)await start(result.data.session);
 }catch(error){sayError(error);if(needsConfirmation(error))offerResend(email);}
 finally{$('auth-password').value='';busy=false;$('auth-submit').disabled=false;}
});
$('auth-google').addEventListener('click',async()=>{if(starting||busy)return;try{const {error}=await auth.google();if(error)throw error;}catch(error){sayError(error);}});
$('auth-resend').addEventListener('click',async()=>{
 const email=$('auth-resend').dataset.email;if(!email||busy||starting)return;
 busy=true;$('auth-resend').disabled=true;
 try{const {error}=await auth.resendConfirmation(email);if(error)throw error;say(t('auth.confirmationResent'));}
 catch(error){sayError(error);}
 finally{busy=false;$('auth-resend').disabled=false;}
});
for(const next of ['login','signup','recover'])$('auth-'+next).addEventListener('click',()=>{if(starting||busy||leaving)return;say('');offerResend('');formMode(next);});
window.addEventListener('online',()=>{if(service?.isBlocked())notify(t('system.connectionRecovered'));else{void service?.reconcile();void service?.flush();}});
function flushOnLeave(){window.HatchRuntime?.save();queueMicrotask(()=>{service?.queue();void service?.flush();});}
window.addEventListener('pagehide',flushOnLeave);document.addEventListener('visibilitychange',()=>{if(document.hidden)flushOnLeave();});
formMode(mode);
gateState('loading','auth.loadingSession');
try{
 const {data:{session},error}=await client.auth.getSession();if(error)throw error;
 if(session&&!recovery)await start(session);
 else{showForm();say(recovery?t('auth.choosePassword'):'');}
}catch{showForm();say(t('auth.sessionCheckFailed'),'error');}
