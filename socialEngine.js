/* Hatch.mon · protocolo offline v1 y compatibilidad sin catálogo de especies.
 * Los datos se consultan al evaluar, no se copian a los guardados.
 */
'use strict';
globalThis.HatchMonSocial = (() => {
  const socialText=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
  const MAX_CODE = 60000, MAX_EGGS = 60, MAX_HISTORY = 5000;
  const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const idOK = x => typeof x === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(x);
  const uid = () => globalThis.crypto?.randomUUID?.() ||
    `hm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  const copy = x => JSON.parse(JSON.stringify(x));
  const own = (o,k) => object(o) && Object.hasOwn(o,k);
  const text = (x,max) => typeof x === 'string' && x.length <= max;
  const time = x => Number.isSafeInteger(x) && x >= 0;
  function fresh() {
    return {version:1, active:{id:uid(),createdAt:Date.now(),parents:[],offspring:null}, eggs:[], importedIds:[]};
  }
  function originOK(x) {
    return object(x) && idOK(x.id) && text(x.speciesId,80) && text(x.name,40);
  }
  function metadataOK(x) {
    return object(x) && idOK(x.id) && time(x.createdAt) && Array.isArray(x.parents) &&
      x.parents.length <= 2 && x.parents.every(originOK) && (x.offspring === null || text(x.offspring,80));
  }
  function entityOK(e,validateSnapshot) {
    return metadataOK(e) && ['egg','creature'].includes(e.kind) &&
      (e.speciesId === null || text(e.speciesId,80)) && object(e.snapshot) &&
      validateSnapshot(e.snapshot,e) && (e.kind === 'egg' ? e.snapshot.phase === 'egg' : e.snapshot.phase !== 'egg');
  }
  function validStore(s,validateSnapshot) {
    return object(s) && s.version === 1 && !own(s,'collection') && metadataOK(s.active) &&
      Array.isArray(s.eggs) && s.eggs.length <= MAX_EGGS &&
      s.eggs.every(e=>e.kind==='egg'&&entityOK(e,validateSnapshot)&&e.snapshot.heat===0&&e.snapshot.vital===null) &&
      new Set(s.eggs.map(e=>e.id)).size === s.eggs.length && !s.eggs.some(e=>e.id === s.active.id) &&
      Array.isArray(s.importedIds) && s.importedIds.length <= MAX_HISTORY && s.importedIds.every(idOK) &&
      new Set(s.importedIds).size === s.importedIds.length;
  }
  // Detecta corrupción accidental; NO es una firma ni prueba de autenticidad.
  function checksum(s) {
    let hash = 0x811c9dc5;
    for(let i=0;i<s.length;i++)hash = Math.imul(hash ^ s.charCodeAt(i),0x01000193);
    return (hash >>> 0).toString(16).padStart(8,'0');
  }
  function pack(entity) {
    const payload = {protocol:'hatchmon',version:1,id:uid(),exportedAt:Date.now(),entity:copy(entity)};
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let binary = '';for(const byte of bytes)binary += String.fromCharCode(byte);
    const encoded = btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const code = `HM1.${encoded}.${checksum(encoded)}`;
    if(code.length > MAX_CODE)throw Error(socialText('qr.exportTooLarge'));
    return code;
  }
  function unpack(input,validateSnapshot,normalizeEntity=x=>x) {
    if(typeof input !== 'string' || input.length > MAX_CODE + 100)throw Error(socialText('qr.codeTooLong'));
    const code = input.trim(),parts = /^HM1\.([A-Za-z0-9_-]+)\.([a-f0-9]{8})$/.exec(code);
    if(!parts || checksum(parts[1]) !== parts[2])throw Error(socialText('qr.codeCorrupt'));
    let p;
    try {
      const encoded = parts[1].replace(/-/g,'+').replace(/_/g,'/');
      const binary = atob(encoded + '='.repeat((4-encoded.length%4)%4));
      p = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
    } catch {throw Error(socialText('qr.codeInvalid'));}
    if(object(p)&&object(p.entity)){try{p.entity=normalizeEntity(p.entity);}catch{throw Error(socialText('qr.entityInvalid'));}}
    if(!object(p) || p.protocol !== 'hatchmon' || p.version !== 1 || !idOK(p.id) || !time(p.exportedAt) ||
      !entityOK(p.entity,validateSnapshot) || !['egg','alive'].includes(p.entity.snapshot.phase) ||
      p.entity.snapshot.birthScene || p.entity.snapshot.nicknamePending || p.entity.snapshot.foundItem !== null)
      throw Error(socialText('qr.codeUnsupported'));
    return p;
  }
  function assertNew(store,payload) {
    if(store.importedIds.includes(payload.id))throw Error(socialText('qr.codeUsed'));
    if(store.importedIds.length >= MAX_HISTORY)throw Error(socialText('qr.historyFull'));
    if(store.memorials?.some(e=>e.id===payload.entity.id))throw Error(socialText('qr.memorialBlocked'));
    if(store.active.id === payload.entity.id || store.eggs.some(e=>e.id === payload.entity.id))
      throw Error(socialText('qr.duplicateEntity'));
  }
  function compatibility(a,b) {
    for(const e of [a,b]){const reason=Vital.breedingReason(e.snapshot);if(reason)return {ok:false,reason};}
    return PokemonData.compatibility(a,b);
  }
  // Operación de creación, independiente de los requisitos de compatibilidad.
  function breedingGenerator(a,b){
    const aa=PokemonData.get(a.speciesId),bb=PokemonData.get(b.speciesId);
    if(!aa||!bb)return null;
    if(aa.EggGroup==='Ditto')return bb.EggGroup==='Ditto'?null:b.id;
    if(bb.EggGroup==='Ditto')return a.id;
    return a.snapshot.gender==='female'?a.id:b.snapshot.gender==='female'?b.id:null;
  }
  return Object.freeze({uid,copy,fresh,metadataOK,entityOK,validStore,pack,unpack,assertNew,compatibility,breedingGenerator,MAX_EGGS,MAX_CODE});
})();
