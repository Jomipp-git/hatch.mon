'use strict';
globalThis.ShellSkins=(()=>{
 const key='hatch.mon.shells',defaults={shellBase:'#bbb3cf',shellDark:'#5c546b',shellLight:'#e8e4ee',accent:'#bbb3cf',bezel:'#4e4a56',button:'#f3f0f7'};
 // Biblioteca de motivos. Cada uno se dibuja UNA vez, en una caja de 24 y otra de 12, y el
 // teselador lo coloca cuatro veces con medio paso de desfase (half-drop). Ese desfase es lo que
 // separa un estampado textil de una rejilla de puntos: los motivos anteriores se alineaban en
 // filas y columnas y por eso se leian pobres por mucho que se afinara el dibujo.
 //
 // `glyph` va en el color primario del motivo y `accent` en el secundario. Las especies con
 // silueta propia no dibujan al Pokemon entero: dibujan su elemento reconocible, que es como
 // funciona un estampado de verdad y lo unico legible a 24 px.
 const MOTIF_TILE=64,GLYPH_BOX=24,ACCENT_BOX=12;
 const PAGE_OPACITY=.42,SHELL_OPACITY=.16,PAGE_SCALE=104,SHELL_SCALE=58;
 const MOTIFS=Object.freeze({
  // --- familias por tipo ---
  waves:{glyph:'<path d="M0 15q6-9 12 0t12 0" fill="none" stroke="%C" stroke-width="3" stroke-linecap="round"/>',
         accent:'<path d="M0 8q3-5 6 0t6 0" fill="none" stroke="%C" stroke-width="2" stroke-linecap="round"/>'},
  bolts:{glyph:'<path d="M15 0 4 14h6l-3 10L20 9h-7z" fill="%C"/>',
         accent:'<path d="M8 0 2 7h3l-2 5 7-8H7z" fill="%C"/>'},
  sparks:{glyph:'<path d="M12 0c3 6 8 8 8 13a8 8 0 0 1-16 0c0-3 2-5 3-7 1 3 2 3 3 1 0-3-1-4 2-7z" fill="%C"/>',
          accent:'<path d="M6 0l5 11H1z" fill="%C"/>'},
  sprouts:{glyph:'<path d="M12 24C5 20 1 12 4 3c9-1 16 5 16 13 0 4-4 8-8 8z" fill="%C"/>',
           accent:'<path d="M6 12C3 10 1 6 2 1c5 0 9 3 9 7 0 2-2 4-5 4z" fill="%C"/>'},
  orbits:{glyph:'<circle cx="12" cy="12" r="10" fill="none" stroke="%C" stroke-width="3"/>',
          accent:'<circle cx="6" cy="6" r="4" fill="%C"/>'},
  diamonds:{glyph:'<path d="M12 0l9 12-9 12-9-12z" fill="%C"/>',
            accent:'<path d="M6 0l5 6-5 6-5-6z" fill="%C"/>'},
  dots:{glyph:'<circle cx="12" cy="12" r="9" fill="%C"/>',accent:'<circle cx="6" cy="6" r="4" fill="%C"/>'},
  bands:{glyph:'<path d="M0 18L18 0M6 24L24 6" stroke="%C" stroke-width="4" fill="none" stroke-linecap="round"/>',
         accent:'<path d="M0 9L9 0" stroke="%C" stroke-width="3" fill="none" stroke-linecap="round"/>'},
  crystals:{glyph:'<path d="M12 0l10 6v12l-10 6-10-6V6z" fill="none" stroke="%C" stroke-width="3"/>',
            accent:'<path d="M6 0l5 3v6l-5 3-5-3V3z" fill="%C"/>'},
  scales:{glyph:'<path d="M0 22a12 12 0 0 1 24 0" fill="none" stroke="%C" stroke-width="3"/>',
          accent:'<path d="M0 11a6 6 0 0 1 12 0" fill="none" stroke="%C" stroke-width="2"/>'},
  blocks:{glyph:'<path d="M0 2h14v10H0zM10 14h14v9H10z" fill="%C"/>',accent:'<path d="M0 2h9v7H0z" fill="%C"/>'},
  eclipse:{glyph:'<path d="M12 0a12 12 0 1 0 0 24A9 9 0 0 1 12 0z" fill="%C"/>',
           accent:'<path d="M6 0a6 6 0 1 0 0 12A4 4 0 0 1 6 0z" fill="%C"/>'},
  // --- siluetas por especie: el elemento reconocible, no el cuerpo entero ---
  charizard:{glyph:'<path d="M12 0c3 6 9 9 9 14a9 9 0 0 1-18 0c0-4 3-6 4-9 1 4 3 4 3 1 0-3-1-4 2-6z" fill="%C"/>',
             accent:'<path d="M0 3c5-1 10 1 12 6-3-2-6-2-8 0 1-3 0-5-4-6z" fill="%C"/>'},
  jynx:{glyph:'<path d="M12 0c5 0 8 4 8 9 0 7-3 11-8 15-5-4-8-8-8-15 0-5 3-9 8-9z" fill="%C"/>',
        accent:'<path d="M0 6c2-4 4-4 6 0 2-4 4-4 6 0-2 5-10 5-12 0z" fill="%C"/>'},
  electabuzz:{glyph:'<path d="M16 0 3 13h7l-3 11L21 10h-7z" fill="%C"/>',
              accent:'<path d="M0 3l3 3 3-3 3 3 3-3" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>'},
  snorlax:{glyph:'<path d="M4 2h16L6 21h15" fill="none" stroke="%C" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
           accent:'<path d="M8 0a6 6 0 1 0 4 11A7 7 0 0 1 8 0z" fill="%C"/>'},
  togekiss:{glyph:'<path d="M1 16C1 7 8 1 16 1c-1 5 2 6 7 5-2 7-9 11-15 11-3 0-6-1-7-1z" fill="%C"/>',
            accent:'<path d="M6 0l5 10H1z" fill="%C"/>'},
  toxtricity:{glyph:'<path d="M3 4c6-4 12-4 18 0 0 8-6 16-9 20-3-4-9-12-9-20z" fill="%C"/>',
              accent:'<path d="M0 6h2M5 1v10M9 3v6" stroke="%C" stroke-width="2" fill="none" stroke-linecap="round"/>'}
 });
 // El orden es el de la barra de acciones en index.html.
 const ACTIONS=Object.freeze(['alimentar','jugar','luz','limpiar']);
 const paint=(shape,color)=>shape.split('%C').join(color);
 // Un tema que pida un motivo inexistente se queda liso, no rompe la carcasa.
 function motifTile(theme,opacity){
  const draw=MOTIFS[theme.motif],colors=theme.motifColors||[];
  if(!draw||!colors.length)return 'none';
  const main=colors[0],second=colors[1]||colors[0];
  const half=MOTIF_TILE/2,glyphAt=(half-GLYPH_BOX)/2,accentAt=(half-ACCENT_BOX)/2;
  const at=(x,y,shape)=>`<g transform="translate(${x} ${y})">${shape}</g>`;
  const glyph=paint(draw.glyph,main),accent=paint(draw.accent,second);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${MOTIF_TILE}" height="${MOTIF_TILE}" viewBox="0 0 ${MOTIF_TILE} ${MOTIF_TILE}"><g opacity="${opacity}">`
   +at(glyphAt,glyphAt,glyph)+at(half+glyphAt,half+glyphAt,glyph)
   +at(half+accentAt,accentAt,accent)+at(accentAt,half+accentAt,accent)
   +'</g></svg>';
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
 const SHADES=['shellBase','shellDark','shellLight','accent','bezel','button','pageBase'];
 // El mismo dibujo sirve a las dos superficies y cambia de papel segun donde cae: grande y con
 // cuerpo en el fondo de pagina, que es donde hay tela para que se lea; pequeno y tenue en la
 // carcasa, que son 16 px de marco alrededor de la pantalla y no admite mas.
 function apply(host){const theme=SHELL_THEMES[saved.selected]||defaults;
  for(const shade of SHADES)host.style.setProperty('--'+shade,String(theme[shade]??defaults[shade]));
  host.style.setProperty('--motifImage',motifTile(theme,SHELL_OPACITY));
  host.style.setProperty('--motifSize',`${SHELL_SCALE}px ${SHELL_SCALE}px`);
  host.style.setProperty('--motifImagePage',motifTile(theme,PAGE_OPACITY));
  host.style.setProperty('--motifSizePage',`${PAGE_SCALE}px ${PAGE_SCALE}px`);
  // Cada accion lleva su color en el canto, no en el fondo: el fondo sigue siendo comun para no
  // tocar ni el contraste del texto ni como se lee un boton deshabilitado.
  const edges=theme.buttonEdges||[];
  ACTIONS.forEach((action,index)=>host.style.setProperty(`--edge-${action}`,String(edges[index%edges.length]||theme.shellDark||defaults.shellDark)));
  host.dataset.shell=saved.selected;host.dataset.motif=theme.motif||'plain';}
 function select(id,host){if(id!=='default'&&!saved.unlocked.includes(id))return false;saved.selected=id;persist();apply(host);return true;}
 return Object.freeze({observe,apply,select,hydrate,motifs:Object.keys(MOTIFS),actions:ACTIONS,motifImage:theme=>motifTile(theme,SHELL_OPACITY),list:()=>saved.unlocked.slice(),selected:()=>saved.selected,theme:id=>SHELL_THEMES[id]||defaults});
})();
