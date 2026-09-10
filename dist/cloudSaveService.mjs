export const CLOUD_SCHEMA=1;
export const CACHE_KEYS=['hatch.mon.v3','hatch.mon.shells','hatch.mon.displayMode'];
const REVISION_KEY='cloud-revision',UPDATED_AT_KEY='cloud-updated-at';
export function userStorage(storage,userId){
 const prefix=`hatch.mon.user.${userId}.`;
 return {getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,value),removeItem:key=>storage.removeItem(prefix+key)};
}
export function snapshotCache(cache){
 const raw=cache.getItem(CACHE_KEYS[0]);if(!raw)return null;
 const game=JSON.parse(raw);
 if(game.birthScene){game.birthScene=false;game.nicknamePending=true;}
 game.message='';
 return {game,preferences:{shells:JSON.parse(cache.getItem(CACHE_KEYS[1])||'null'),displayMode:cache.getItem(CACHE_KEYS[2])||'color'}};
}
export function hydrateCache(cache,envelope){
 if(!envelope?.game||envelope.game.version!==12)throw new Error('unsupported-save');
 cache.setItem(CACHE_KEYS[0],JSON.stringify(envelope.game));
 cache.setItem(CACHE_KEYS[1],JSON.stringify(envelope.preferences?.shells||{unlocked:[],selected:'default'}));
 cache.setItem(CACHE_KEYS[2],envelope.preferences?.displayMode==='lcd'?'lcd':'color');
}
function canonicalSnapshot(value){
 const normalize=v=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
 return JSON.stringify(normalize(value));
}
function savePayload(envelope){const {sync,...payload}=envelope||{};return payload;}
function randomId(){return globalThis.crypto?.randomUUID?.()||`device-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function revisionOf(envelope){return Number.isSafeInteger(envelope?.sync?.revision)&&envelope.sync.revision>=0?envelope.sync.revision:0;}
function timestampOf(row){const value=Date.parse(row?.updated_at||'');return Number.isFinite(value)?value:0;}
function compareVersion(left,right){const revision=revisionOf(left.envelope)-revisionOf(right.envelope);return revision||timestampOf(left.row)-timestampOf(right.row);}
export function createCloudSaveService({client,session,cache,notify=()=>{},delay=15000,onRemote=()=>{}}){
 const userId=session.user.id,deviceId=randomId();let pending=null,inFlight=null,timer=null,pollTimer=null,closed=false,blocked=false,urgent=false,subscription=null;
 const base=()=>{const raw=cache.getItem('cloud-base');return raw?canonicalSnapshot(JSON.parse(raw)):null;};
 const known=()=>({envelope:{sync:{revision:Number(cache.getItem(REVISION_KEY)||0)}},row:{updated_at:cache.getItem(UPDATED_AT_KEY)||''}});
 const remember=(envelope,row)=>{cache.setItem('cloud-base',canonicalSnapshot(savePayload(envelope)));cache.setItem(REVISION_KEY,String(revisionOf(envelope)));cache.setItem(UPDATED_AT_KEY,row?.updated_at||'');};
 const remoteRow=async()=>{const {data,error}=await client.from('game_saves').select('game_state,schema_version,updated_at').eq('user_id',userId).maybeSingle();if(error)throw error;return data;};
 function applyRemote(row,{allowOwn=false}={}){
  if(!row?.game_state||row.schema_version!==CLOUD_SCHEMA)return false;
  const candidate={envelope:row.game_state,row};if(!allowOwn&&candidate.envelope?.sync?.sourceId===deviceId)return false;
  if(compareVersion(candidate,known())<=0)return false;
  hydrateCache(cache,candidate.envelope);remember(candidate.envelope,row);pending=null;urgent=false;clearTimeout(timer);timer=null;cache.removeItem('cloud-dirty');onRemote(candidate.envelope.game,candidate.envelope.preferences||{});return true;
 }
 async function reconcile(){try{const row=await remoteRow();return applyRemote(row);}catch{return false;}}
 async function load(){
  const data=await remoteRow(),dirty=cache.getItem('cloud-dirty')?snapshotCache(cache):null,remote=canonicalSnapshot(savePayload(data?.game_state));
  if(dirty&&base()===remote){if(data&&data.schema_version!==CLOUD_SCHEMA)throw Error('unsupported-save');hydrateCache(cache,dirty);pending=dirty;if(data)remember(data.game_state,data);return data;}
  if(dirty)cache.setItem('cloud-backup',JSON.stringify(dirty));
  if(data){if(data.schema_version!==CLOUD_SCHEMA)throw new Error('unsupported-save');hydrateCache(cache,data.game_state);remember(data.game_state,data);}else for(const key of [...CACHE_KEYS,REVISION_KEY,UPDATED_AT_KEY])cache.removeItem(key);
  cache.setItem('cloud-base',remote);cache.removeItem('cloud-dirty');if(cache.getItem('cloud-backup'))notify('Copia local pendiente conservada. Disponible en Cuenta.');return data;
 }
 async function flush({drain=true}={}){
  clearTimeout(timer);timer=null;if(closed||blocked)return false;if(inFlight){if(drain)urgent=true;return inFlight;}
  inFlight=(async()=>{while(pending&&!closed&&!blocked){const payload=pending;pending=null;urgent=false;try{
   const {data:{session:current}}=await client.auth.getSession();if(current?.user.id!==userId){blocked=true;throw Error('session-changed');}
   const latest=await remoteRow();if(latest&&applyRemote(latest))continue;
   const envelope={...payload,sync:{revision:Number(cache.getItem(REVISION_KEY)||0)+1,sourceId:deviceId}};
   const {data,error}=await client.from('game_saves').upsert({user_id:userId,game_state:envelope,schema_version:CLOUD_SCHEMA,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;
   remember(envelope,{game_state:envelope,updated_at:data?.updated_at||new Date().toISOString()});if(!pending)cache.removeItem('cloud-dirty');if(pending&&!urgent&&!drain)break;
  }catch{pending=pending||payload;cache.setItem('cloud-dirty','1');notify('Sin sincronizar. Progreso guardado en este dispositivo.');return false;}}
  if(!pending)notify(cache.getItem('cloud-backup')?'Copia local pendiente disponible en Cuenta.':'');return true;})();
  let ok=false;try{ok=await inFlight;return ok;}finally{inFlight=null;if(pending&&!closed&&!blocked)timer=setTimeout(()=>void flush({drain:false}),ok?delay:30000);}
 }
 function queue({immediate=false}={}){if(closed)return;try{const next=snapshotCache(cache);if(!next)return;if(!pending&&!inFlight&&canonicalSnapshot(next)===base())return;cache.setItem('cloud-dirty','1');if(blocked)return;pending=next;}catch{notify('No se pudo preparar el guardado.');return;}if(immediate){urgent=true;clearTimeout(timer);timer=null;queueMicrotask(()=>void flush({drain:false}));}else if(!timer&&!inFlight)timer=setTimeout(()=>void flush({drain:false}),delay);}
 function startPolling(){if(!pollTimer)pollTimer=setInterval(()=>void reconcile(),30000);}
 function startRealtime(){if(closed||subscription||typeof client.channel!=='function'){startPolling();return false;}subscription=client.channel(`hatchmon-save-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'game_saves',filter:`user_id=eq.${userId}`},event=>applyRemote(event.new)).subscribe(status=>{if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))startPolling();});return true;}
 function close(){closed=true;clearTimeout(timer);clearInterval(pollTimer);pollTimer=null;pending=null;if(subscription){if(client.removeChannel)client.removeChannel(subscription);else subscription.unsubscribe?.();subscription=null;}}
 return {load,queue,flush,reconcile,startRealtime,block(){blocked=true;clearTimeout(timer);},close,isBlocked:()=>blocked,applyRemote,deviceId};
}
