export const CLOUD_SCHEMA=1;
export const CACHE_KEYS=['hatch.mon.v3','hatch.mon.shells','hatch.mon.displayMode'];
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
// JSONB can reorder object keys; compare data rather than serialization order.
function canonicalSnapshot(value){
 const normalize=v=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
 return JSON.stringify(normalize(value));
}
export function createCloudSaveService({client,session,cache,notify=()=>{},delay=15000}){
 const userId=session.user.id;let pending=null,inFlight=null,timer=null,closed=false,blocked=false,urgent=false;
 const base=()=>{const raw=cache.getItem('cloud-base');return raw?canonicalSnapshot(JSON.parse(raw)):null;};
 async function load(){
  const {data,error}=await client.from('game_saves').select('game_state,schema_version,updated_at').eq('user_id',userId).maybeSingle();
  if(error)throw error;
  const dirty=cache.getItem('cloud-dirty')?snapshotCache(cache):null;
  const remote=canonicalSnapshot(data?.game_state||null);
  if(dirty&&base()===remote){
   if(data&&data.schema_version!==CLOUD_SCHEMA)throw Error('unsupported-save');
   hydrateCache(cache,dirty);pending=dirty;return data;
  }
  if(dirty)cache.setItem('cloud-backup',JSON.stringify(dirty));
  if(data){if(data.schema_version!==CLOUD_SCHEMA)throw new Error('unsupported-save');hydrateCache(cache,data.game_state);}
  else for(const key of CACHE_KEYS)cache.removeItem(key);
  cache.setItem('cloud-base',remote);
  cache.removeItem('cloud-dirty');
  if(cache.getItem('cloud-backup'))notify('Copia local pendiente conservada. Disponible en Cuenta.');
  return data;
 }
 async function flush({drain=true}={}){
  clearTimeout(timer);timer=null;
  if(closed||blocked)return false;
  if(inFlight){if(drain)urgent=true;return inFlight;}
  inFlight=(async()=>{
   while(pending&&!closed&&!blocked){
    const payload=pending;pending=null;urgent=false;
    try{
     const {data:{session:current}}=await client.auth.getSession();
     if(current?.user.id!==userId){blocked=true;throw Error('session-changed');}
     const {error}=await client.from('game_saves').upsert({user_id:userId,game_state:payload,schema_version:CLOUD_SCHEMA,updated_at:new Date().toISOString()},{onConflict:'user_id'});
     if(error)throw error;
     cache.setItem('cloud-base',canonicalSnapshot(payload));
     if(!pending)cache.removeItem('cloud-dirty');
     if(pending&&!urgent&&!drain)break;
    }catch{pending=pending||payload;notify('Sin sincronizar. Progreso guardado en este dispositivo.');return false;}
   }
   if(!pending)notify(cache.getItem('cloud-backup')?'Copia local pendiente disponible en Cuenta.':'');return true;
  })();
  let ok=false;try{ok=await inFlight;return ok;}finally{inFlight=null;if(pending&&!closed&&!blocked)timer=setTimeout(()=>void flush({drain:false}),ok?delay:30000);}
 }
 function queue({immediate=false}={}){
  if(closed)return;
  try{const next=snapshotCache(cache);if(!next)return;
   if(!pending&&!inFlight&&canonicalSnapshot(next)===base())return;
   cache.setItem('cloud-dirty','1');if(blocked)return;pending=next;
  }catch{notify('No se pudo preparar el guardado.');return;}
  if(immediate){urgent=true;clearTimeout(timer);timer=null;queueMicrotask(()=>void flush({drain:false}));}
  else if(!timer&&!inFlight)timer=setTimeout(()=>void flush({drain:false}),delay);
 }
 return {load,queue,flush,block(){blocked=true;clearTimeout(timer);},close(){closed=true;clearTimeout(timer);pending=null;},isBlocked:()=>blocked};
}
