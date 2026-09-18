const assert=require('node:assert/strict'),fs=require('node:fs');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,advance,flush}=await setup();
assert.equal(run('PMD_STATE_FALLBACKS.startled.join(",")'),'Hurt,Cringe,Pain,Idle');
// Amabilidad: el cesto persigue al dedo y solo recoge dentro de la banda pintada. Se comprueba con
// el propio cesto, que es lo que el jugador ve, y no con una geometria escrita a mano.
run('TrainingActivities.launch("kindness",{commit:()=>true})');
const catchLane=els['training-game-content'].children[3].children.find(e=>e.className==='catch-lane');
catchLane.rect={left:0,top:0,width:100,height:100};catchLane.setPointerCapture=()=>{};catchLane.hasPointerCapture=()=>false;catchLane.releasePointerCapture=()=>{};
const catchBasket=catchLane.children.find(e=>e.className==='catch-basket');
assert.equal(parseFloat(catchBasket.style.width),run('CleanupCatch.config.basketWidth')*100,'el cesto mide lo que dice la config');
// Soltar el dedo deja el cesto donde estaba: no vuelve al centro a mitad de partida.
catchLane.fire('pointerdown',{pointerId:1,button:0,clientX:20});advance(600);
const parked=parseFloat(catchBasket.style.left);
catchLane.fire('pointerup',{pointerId:1});advance(600);
assert.equal(parseFloat(catchBasket.style.left),parked,'soltar no recoloca el cesto');
// El teclado tambien mueve, que si no el minijuego solo existe para quien puede arrastrar.
catchLane.fire('keydown',{key:'ArrowRight'});advance(600);
assert.ok(parseFloat(catchBasket.style.left)>parked,'las flechas mueven el cesto');
run('TrainingActivities.cancel()');
run('collectionTab="pokedex";renderPokedex()');const grid=els['panel-content'].children.find(e=>e.className==='dex-grid');assert.equal(grid.children.length,run('obtainableRoster.total'));
// National-dex order: Growlithe and Arcanine are adjacent, and no tile goes backwards.
const dexNumbers=run('obtainableRoster.dexOrder.map(e=>PokemonData.get(e.id).DexNo)');
assert.deepEqual([...dexNumbers],[...dexNumbers].sort((a,b)=>a-b));
const names=run('obtainableRoster.dexOrder.map(e=>e.name)');
assert.equal(names[names.indexOf('Growlithe')+1],'Arcanine');
assert.equal(names[names.indexOf('Raichu')+1],'Raichu (Alolan Form)','a regional form follows its base');
// Seen through someone else's code is not cared for: the tile stays a silhouette until you own it.
run('state.pokedex=Pokedex.fresh();Pokedex.record(state.pokedex,"pichu","seen");Pokedex.record(state.pokedex,"eevee","owned","one-of-mine");collectionTab="pokedex";dexVariant="normal";renderPokedex()');await flush();
const tiles=els['panel-content'].children.find(e=>e.className==='dex-grid').children;
const spriteLabel=name=>{const tile=tiles.find(c=>c.children.some(n=>n.children?.some(x=>x.textContent===name)));
 return tile.children[0].children.find(n=>n.className==='memory-sprite')['aria-label'];};
assert.equal(spriteLabel('Pichu'),'Pichu, solo visto');
assert.equal(spriteLabel('Eevee'),'Eevee');
assert.equal(run('POKEMON_RENDER_CONFIG.silhouette.length'),3);
assert.match(fs.readFileSync('pokemonRenderer.js','utf8'),/if\(silhouette\)flatten\(\);/);
const mass=run(`['togepi','togetic','togekiss'].map(id=>{const g=PokemonRenderer.geometry(id,true),m=PMD_LIST_METRICS[PokemonData.canonicalId(id)];return m.opaqueArea*g.scale*g.scale})`);assert.ok(Math.max(...mass)/Math.min(...mass)<1.5);
// Las carcasas: la forma base va monocroma y cada evolucion de la linea suma un color.
const colorsOf=form=>run(`ShellSkins.theme(PokemonData.canonicalId("${form}")).motifColors.length`);
assert.equal(colorsOf('charmander'),1,'la forma base va a un solo color');
assert.equal(colorsOf('charmeleon'),2);
assert.equal(colorsOf('charizard'),3,'y la ultima forma llega a tres');
// Nunca se inventa un color para llegar al cupo: Togekiss solo tiene tres tonos en su paleta,
// asi que su estampado se queda en los dos que no son el plastico.
assert.equal(colorsOf('togekiss'),2,'una paleta corta da menos colores, no colores inventados');
assert.ok(colorsOf('togepi')<colorsOf('togetic'),'y la progresion por linea se mantiene');
// Cada especie del repertorio tiene su silueta dibujada a mano; la familia por tipo es el respaldo.
for(const form of ['togepi','togetic','togekiss','charizard','snorlax','eevee','lucario'])
 assert.equal(run(`ShellSkins.theme(PokemonData.canonicalId("${form}")).motif`),form.replace('.','').toLowerCase(),`${form} lleva su propia silueta`);
const generic=run('Object.values(SHELL_THEMES).filter(t=>t.motif==="plain").length');
assert.equal(generic,0,'ninguna forma se queda sin motivo');
// Las ediciones shiny son temas aparte: se ganan al tener esa forma en shiny, no con la normal.
const shinyId=run('PokemonData.canonicalId("charizard")+":shiny"');
assert.ok(run(`Object.hasOwn(SHELL_THEMES,'${shinyId}')`),'cada forma tiene edicion shiny');
assert.notEqual(run(`SHELL_THEMES['${shinyId}'].shellBase`),run('ShellSkins.theme(PokemonData.canonicalId("charizard")).shellBase'),'con su propia paleta');
// Cada accion lleva su canto, y son colores legibles sobre un boton claro.
const edges=run('ShellSkins.theme(PokemonData.canonicalId("charizard")).buttonEdges');
assert.equal(edges.length,4,'un canto por accion');
assert.equal(run('ShellSkins.actions.join()'),'alimentar,jugar,luz,limpiar');
// El estampado se pinta dos veces: grande en el fondo de pagina y pequeno en la carcasa.
run('state.phase="alive";state.pokemonId="charizard";ShellSkins.observe(state);ShellSkins.select(PokemonData.canonicalId("charizard"),document.getElementById("display-root"))');
const root=els['display-root'];
assert.ok(String(root.style['--motifImagePage']).startsWith('url("data:image/svg+xml,'),'fondo de pagina estampado');
assert.ok(String(root.style['--motifImage']).startsWith('url("data:image/svg+xml,'),'carcasa estampada');
assert.notEqual(root.style['--motifImagePage'],root.style['--motifImage'],'con distinta intensidad');
assert.ok(root.style['--pageBase']);assert.ok(root.style['--edge-alimentar']);
// Todo tema apunta a un motivo que existe, y el liso no pinta nada.
const unknown=run('Object.values(SHELL_THEMES).filter(theme=>theme.motif!=="plain"&&!ShellSkins.motifs.includes(theme.motif)).map(theme=>theme.name)');
assert.deepEqual([...unknown],[],`motivos sin implementar: ${unknown.join(', ')}`);
assert.equal(run('ShellSkins.motifImage({motif:"plain",motifColors:[]})'),'none');
assert.ok(run('ShellSkins.motifImage({motif:"waves",motifColors:["#123456"]})').startsWith('url("data:image/svg+xml,'));
assert.equal(run('ShellSkins.motifImage({motif:"inventado",motifColors:["#123456"]})'),'none','un motivo desconocido deja la carcasa lisa');
console.log('PASS refinement: no-space mapping, a catch basket that chases the finger and answers the arrow keys, collection slots, comparable trio mass and shell palettes that grow with the evolution line, hand-drawn species motifs and per-action button edges.');
})().catch(e=>{console.error(e);process.exitCode=1});
