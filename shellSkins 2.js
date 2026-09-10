'use strict';
globalThis.ShellSkins=(()=>{
 const key='hatch.mon.shells',defaults={shellBase:'#bbb3cf',shellDark:'#5c546b',shellLight:'#e8e4ee',accent:'#bbb3cf',bezel:'#4e4a56',button:'#f3f0f7'};
 let saved={unlocked:[],selected:'default'};
 try{const raw=JSON.parse((globalThis.HatchStorage||globalThis.localStorage)?.getItem(key)||'null');if(raw&&Array.isArray(raw.unlocked)){saved.unlocked=[...new Set(raw.unlocked.filter(id=>Object.hasOwn(SHELL_THEMES,id)))];if(raw.selected==='default'||saved.unlocked.includes(raw.selected))saved.selected=raw.selected;}}catch{}
 const persist=()=>{try{(globalThis.HatchStorage||globalThis.localStorage)?.setItem(key,JSON.stringify(saved));globalThis.HatchCloud?.queue({immediate:true});}catch{}};
 function observe(state){if(!['alive','critical'].includes(state.phase)||Vital.getLifeStage(state)!=='MADURO')return false;const id=PokemonData.canonicalId(state.pokemonId);if(!SHELL_THEMES[id]||saved.unlocked.includes(id))return false;saved.unlocked.push(id);persist();return true;}
 function apply(host){const theme=SHELL_THEMES[saved.selected]||defaults;for(const [k,v]of Object.entries(theme))if(k!=='name')host.style.setProperty('--'+k,String(v));const colors=theme.motifColors||[];const svg=theme.patternType==='triangles'?`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80"><path fill="${colors[0]}" d="M15 20L25 38H5Z M110 42L120 60H100Z"/><path fill="${colors[1]}" d="M55 35L65 17H45Z M140 17L150 35H130Z"/></svg>`:null;host.style.setProperty('--motifImage',svg?`url("data:image/svg+xml,${encodeURIComponent(svg)}")`:'none');host.dataset.shell=saved.selected;}
 function select(id,host){if(id!=='default'&&!saved.unlocked.includes(id))return false;saved.selected=id;persist();apply(host);return true;}
 return Object.freeze({observe,apply,select,list:()=>saved.unlocked.slice(),selected:()=>saved.selected,theme:id=>SHELL_THEMES[id]||defaults});
})();
