/* Species progress, not a journal of individuals or activities. */
'use strict';
const ENCOUNTER_CONFIG={unowned:8,ownedOnce:1,ownedMany:.2,rarityPower:1,allOwned:1};
globalThis.Pokedex=(()=>{
 const fresh=()=>({});
 function record(dex,id,event='seen',individualId=null,isShiny=false){
  const key=PokemonData.canonicalId(id);if(!key)return;
  const base=dex[key]??={seen:false,ownedIds:[],evolved:false,bred:false,received:false};
  const entry=isShiny?(base.shiny??={seen:false,ownedIds:[],evolved:false,bred:false,received:false}):base;entry.seen=true;
  if(event==='owned'&&individualId&&!entry.ownedIds.includes(individualId))entry.ownedIds.push(individualId);
  if(['evolved','bred','received'].includes(event))entry[event]=true;
 }
 function weights(pool,dex){
  const allKnown=pool.every(id=>dex[PokemonData.canonicalId(id)]?.seen===true);
  return pool.map(id=>{const count=dex[PokemonData.canonicalId(id)]?.ownedIds.length||0,rarity=PokemonData.get(id)?.Rarity;
   const base=Number.isFinite(rarity)&&rarity>0?1/Math.pow(rarity,ENCOUNTER_CONFIG.rarityPower):1;
   return base*(allKnown?ENCOUNTER_CONFIG.allOwned:count===0?ENCOUNTER_CONFIG.unowned:count===1?ENCOUNTER_CONFIG.ownedOnce:ENCOUNTER_CONFIG.ownedMany);
  });
 }
 function choose(pool,dex,rng=Math.random){const w=weights(pool,dex),sum=w.reduce((a,b)=>a+b,0);let roll=Math.max(0,Math.min(.999999999,rng()))*sum;for(let i=0;i<pool.length;i++){roll-=w[i];if(roll<0)return pool[i];}return pool.at(-1);}
 function valid(dex){return dex&&typeof dex==='object'&&!Array.isArray(dex)&&Object.entries(dex).every(([id,e])=>PokemonData.canonicalId(id)===id&&e&&typeof e.seen==='boolean'&&Array.isArray(e.ownedIds)&&e.ownedIds.every(id=>typeof id==='string')&&new Set(e.ownedIds).size===e.ownedIds.length&&['evolved','bred','received'].every(k=>typeof e[k]==='boolean'));}
 function roster(config,roots){
  const reachable=new Set(roots),edges=[];let changed=true;
  while(changed){changed=false;for(const from of [...reachable])for(const r of config[from]?.rules||[])if(r.enabled!==false&&config[r.to]){if(!reachable.has(r.to)){reachable.add(r.to);changed=true;}}}
  for(const [from,p]of Object.entries(config))for(const r of p.rules)edges.push({from,to:r.to,enabled:r.enabled!==false});
  return {total:reachable.size,egg:roots.map(id=>({id,name:config[id].name})),evolutionOnly:[...reachable].filter(id=>!roots.includes(id)).map(id=>({id,name:config[id].name})),excluded:Object.keys(config).filter(id=>!reachable.has(id)).map(id=>({id,name:config[id].name})),edges};
 }
 return Object.freeze({fresh,record,weights,choose,valid,roster});
})();
