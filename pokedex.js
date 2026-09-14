/* Species progress, not a journal of individuals or activities. */
'use strict';
const ENCOUNTER_CONFIG={unowned:8,ownedOnce:1,ownedMany:.2,rarityPower:1,allOwned:1};
globalThis.Pokedex=(()=>{
 const fresh=()=>({});
 const freshEntry=()=>({seen:false,ownedIds:[],evolved:false,bred:false,received:false});
 function record(dex,id,event='seen',individualId=null,isShiny=false){
  const key=PokemonData.canonicalId(id);if(!key)return;
  const base=dex[key]??=freshEntry();
  // A shiny counts for the plain form too: meeting the rare variant means you have met the species.
  // Never the other way round, which is what keeps the shiny Pokédex the harder one to fill.
  const targets=isShiny?[base.shiny??=freshEntry(),base]:[base];
  for(const entry of targets){
   entry.seen=true;
   if(event==='owned'&&individualId&&!entry.ownedIds.includes(individualId))entry.ownedIds.push(individualId);
   if(['evolved','bred','received'].includes(event))entry[event]=true;
  }
 }
 function weights(pool,dex){
  const allKnown=pool.every(id=>{const entry=dex[PokemonData.canonicalId(id)];return entry?.seen===true||entry?.shiny?.seen===true;});
  return pool.map(id=>{const entry=dex[PokemonData.canonicalId(id)],count=new Set([...(entry?.ownedIds||[]),...(entry?.shiny?.ownedIds||[])]).size,rarity=PokemonData.get(id)?.Rarity;
   const base=Number.isFinite(rarity)&&rarity>0?1/Math.pow(rarity,ENCOUNTER_CONFIG.rarityPower):1;
   return base*(allKnown?ENCOUNTER_CONFIG.allOwned:count===0?ENCOUNTER_CONFIG.unowned:count===1?ENCOUNTER_CONFIG.ownedOnce:ENCOUNTER_CONFIG.ownedMany);
  });
 }
 function choose(pool,dex,rng=Math.random){const w=weights(pool,dex),sum=w.reduce((a,b)=>a+b,0);let roll=Math.max(0,Math.min(.999999999,rng()))*sum;for(let i=0;i<pool.length;i++){roll-=w[i];if(roll<0)return pool[i];}return pool.at(-1);}
 function validEntry(e){return !!e&&typeof e==='object'&&!Array.isArray(e)&&typeof e.seen==='boolean'&&Array.isArray(e.ownedIds)&&e.ownedIds.every(id=>typeof id==='string')&&new Set(e.ownedIds).size===e.ownedIds.length&&['evolved','bred','received'].every(k=>typeof e[k]==='boolean');}
 function valid(dex){return dex&&typeof dex==='object'&&!Array.isArray(dex)&&Object.entries(dex).every(([id,e])=>PokemonData.canonicalId(id)===id&&validEntry(e)&&(!Object.hasOwn(e,'shiny')||validEntry(e.shiny)));}
 function roster(config,roots){
  const reachable=new Set(roots),edges=[];let changed=true;
  while(changed){changed=false;for(const from of [...reachable])for(const r of config[from]?.rules||[])if(r.enabled!==false&&config[r.to]){if(!reachable.has(r.to)){reachable.add(r.to);changed=true;}}}
  for(const [from,p]of Object.entries(config))for(const r of p.rules)edges.push({from,to:r.to,enabled:r.enabled!==false});
  const entry=id=>({id,name:config[id].name});
  // egg order is the hatch pool and must not move; dexOrder is the presentation order, by
  // national number with the canonical ID breaking ties so regional forms follow their base.
  const dexOrder=[...reachable].map(id=>[id,PokemonData.canonicalId(id)])
   .sort((a,b)=>(PokemonData.get(a[1]).DexNo-PokemonData.get(b[1]).DexNo)||a[1].localeCompare(b[1]))
   .map(([id])=>entry(id));
  return {total:reachable.size,egg:roots.map(entry),evolutionOnly:[...reachable].filter(id=>!roots.includes(id)).map(entry),dexOrder,excluded:Object.keys(config).filter(id=>!reachable.has(id)).map(entry),edges};
 }
 return Object.freeze({fresh,record,weights,choose,valid,roster});
})();
