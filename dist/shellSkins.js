'use strict';
globalThis.ShellSkins=(()=>{
 const key='hatch.mon.shells',defaults={shellBase:'#bbb3cf',shellDark:'#5c546b',shellLight:'#e8e4ee',accent:'#bbb3cf',bezel:'#4e4a56',button:'#f3f0f7'};
 // Biblioteca de motivos. Cada uno devuelve el contenido de una baldosa cuadrada que se repite por
 // el plastico; el generador decide cual segun el tipo del Pokemon y con cuantos colores se dibuja.
 // Son geometricos y de trazo ancho a proposito: a esta opacidad, un dibujo fino se vuelve sucio.
 const MOTIF_TILE=48,MOTIF_OPACITY=.17;
 const MOTIFS=Object.freeze({
  dots:(a,b)=>`<circle cx="12" cy="12" r="3.5" fill="${a}"/><circle cx="36" cy="36" r="3.5" fill="${b}"/>`,
  diamonds:(a,b)=>`<path d="M12 5l7 7-7 7-7-7z" fill="${a}"/><path d="M36 29l7 7-7 7-7-7z" fill="${b}"/>`,
  waves:(a,b)=>`<path d="M0 14q12-9 24 0t24 0" fill="none" stroke="${a}" stroke-width="3"/><path d="M0 38q12-9 24 0t24 0" fill="none" stroke="${b}" stroke-width="3"/>`,
  bolts:(a,b)=>`<path d="M16 4l-7 14h6l-4 12 11-16h-6z" fill="${a}"/><path d="M40 26l-7 14h6l-4 12 11-16h-6z" fill="${b}"/>`,
  sparks:(a,b)=>`<path d="M12 6l6 12H6z" fill="${a}"/><path d="M36 30l6 12H30z" fill="${b}"/>`,
  sprouts:(a,b)=>`<path d="M5 19q8-13 15 0" fill="none" stroke="${a}" stroke-width="3"/><path d="M28 43q8-13 15 0" fill="none" stroke="${b}" stroke-width="3"/>`,
  orbits:(a,b)=>`<circle cx="14" cy="14" r="7" fill="none" stroke="${a}" stroke-width="2.5"/><circle cx="36" cy="36" r="3.5" fill="${b}"/>`,
  bands:(a,b)=>`<path d="M-6 12L12 -6M18 54L54 18" stroke="${a}" stroke-width="4" fill="none"/><path d="M-4 38L38 -4" stroke="${b}" stroke-width="2" fill="none"/>`,
  crystals:(a,b)=>`<path d="M14 4l8 5v10l-8 5-8-5V9z" fill="none" stroke="${a}" stroke-width="2.5"/><path d="M36 28l6 4v8l-6 4-6-4v-8z" fill="none" stroke="${b}" stroke-width="2"/>`,
  scales:(a,b)=>`<path d="M0 20a12 12 0 0 1 24 0" fill="none" stroke="${a}" stroke-width="3"/><path d="M24 44a12 12 0 0 1 24 0" fill="none" stroke="${b}" stroke-width="3"/>`,
  blocks:(a,b)=>`<rect x="6" y="7" width="13" height="10" fill="${a}"/><rect x="28" y="31" width="14" height="10" fill="${b}"/>`,
  eclipse:(a,b)=>`<path d="M14 4a10 10 0 1 0 0 20z" fill="${a}"/><path d="M36 28a10 10 0 1 1 0 20z" fill="${b}"/>`
 });
 // Un tema que pida un motivo inexistente se queda liso, no rompe la carcasa.
 function motifImage(theme){
  const draw=MOTIFS[theme.motif],colors=theme.motifColors||[];
  if(!draw||!colors.length)return 'none';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${MOTIF_TILE}" height="${MOTIF_TILE}"><g opacity="${MOTIF_OPACITY}">${draw(colors[0],colors[1]||colors[0])}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
 }
 let saved={unlocked:[],selected:'default'};
 try{const raw=JSON.parse((globalThis.HatchStorage||globalThis.localStorage)?.getItem(key)||'null');if(raw&&Array.isArray(raw.unlocked)){saved.unlocked=[...new Set(raw.unlocked.filter(id=>Object.hasOwn(SHELL_THEMES,id)))];if(raw.selected==='default'||saved.unlocked.includes(raw.selected))saved.selected=raw.selected;}}catch{}
 const persist=()=>{try{(globalThis.HatchStorage||globalThis.localStorage)?.setItem(key,JSON.stringify(saved));globalThis.HatchCloud?.queue({immediate:true});}catch{}};
 function hydrate(value,host){if(!value||!Array.isArray(value.unlocked))return false;saved.unlocked=[...new Set(value.unlocked.filter(id=>Object.hasOwn(SHELL_THEMES,id)))];saved.selected=value.selected==='default'||saved.unlocked.includes(value.selected)?value.selected:'default';if(host)apply(host);return true;}
 // A shell belongs to a species you have had, not to one you kept alive long enough: it unlocks on
 // hatching and again on every evolution. The Pokédex pass backfills anything owned before that
 // rule changed, since 'owned' is only ever recorded when the companion becomes that form.
 function observe(state){
  let changed=false;
  const unlock=value=>{const id=PokemonData.canonicalId(value);
   if(!id||!SHELL_THEMES[id]||saved.unlocked.includes(id))return;saved.unlocked.push(id);changed=true;};
  if(['alive','critical'].includes(state.phase))unlock(state.pokemonId);
  for(const [id,entry] of Object.entries(state.pokedex||{}))
   if(entry?.ownedIds?.length||entry?.shiny?.ownedIds?.length)unlock(id);
  if(changed)persist();
  return changed;
 }
 const SHADES=['shellBase','shellDark','shellLight','accent','bezel','button'];
 function apply(host){const theme=SHELL_THEMES[saved.selected]||defaults;
  for(const shade of SHADES)host.style.setProperty('--'+shade,String(theme[shade]??defaults[shade]));
  host.style.setProperty('--motifImage',motifImage(theme));
  host.style.setProperty('--motifSize',`${MOTIF_TILE}px ${MOTIF_TILE}px`);
  host.dataset.shell=saved.selected;host.dataset.motif=theme.motif||'plain';}
 function select(id,host){if(id!=='default'&&!saved.unlocked.includes(id))return false;saved.selected=id;persist();apply(host);return true;}
 return Object.freeze({observe,apply,select,hydrate,motifs:Object.keys(MOTIFS),motifImage,list:()=>saved.unlocked.slice(),selected:()=>saved.selected,theme:id=>SHELL_THEMES[id]||defaults});
})();
