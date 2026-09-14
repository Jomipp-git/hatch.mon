const assert=require('node:assert/strict'),fs=require('node:fs');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,advance,flush}=await setup();
assert.equal(run('PMD_STATE_FALLBACKS.startled.join(",")'),'Hurt,Cringe,Pain,Idle');
const TrainingActivitiesPrepare=run('TrainingActivities.config.prepare')+40;run('TrainingActivities.launch("kindness",{commit:()=>true})');advance(TrainingActivitiesPrepare);
// Las casillas ya no llevan rotulo: se identifican por el objeto, que es lo que dibuja el icono.
const field=els['training-game-content'].children[3],buttons=field.children.filter(b=>b.tagName==='button'),b=buttons.find(b=>['papel','lata','botella'].includes(b.dataset.object)),labels=buttons.map(b=>b.dataset.object);
b.fire('pointerdown');advance(1800);assert.deepEqual(buttons.map(b=>b.dataset.object),labels);b.fire('pointerup');b.fire('click');assert.equal(b.dataset.result,'correct');advance(100);assert.deepEqual(buttons.map(b=>b.dataset.object),labels);advance(TrainingActivitiesPrepare+400);assert.equal(b.disabled,false,'la tarjeta de ronda precede a la tanda siguiente');run('TrainingActivities.cancel()');
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
// Las carcasas: la forma base va monocroma y cada evolucion de la linea suma un color del sprite.
assert.equal(run('ShellSkins.theme(PokemonData.canonicalId("togepi")).motif'),'plain');
assert.equal(run('ShellSkins.theme(PokemonData.canonicalId("togepi")).motifColors.length'),0);
for(const form of ['togetic','togekiss']){
 const theme=`ShellSkins.theme(PokemonData.canonicalId("${form}"))`;
 assert.equal(run(`${theme}.motif`),'diamonds',`${form} conserva su motivo a mano`);
 assert.ok(run(`${theme}.motifColors.length`)>0,`${form} lleva color de motivo`);
}
assert.ok(run('ShellSkins.theme(PokemonData.canonicalId("togekiss")).motifColors.length')>run('ShellSkins.theme(PokemonData.canonicalId("togetic")).motifColors.length'),'y la ultima forma, uno mas');
// Todo tema apunta a un motivo que existe, y el liso no pinta nada.
const unknown=run('Object.values(SHELL_THEMES).filter(theme=>theme.motif!=="plain"&&!ShellSkins.motifs.includes(theme.motif)).map(theme=>theme.name)');
assert.deepEqual([...unknown],[],`motivos sin implementar: ${unknown.join(', ')}`);
assert.equal(run('ShellSkins.motifImage({motif:"plain",motifColors:[]})'),'none');
assert.ok(run('ShellSkins.motifImage({motif:"waves",motifColors:["#123456"]})').startsWith('url("data:image/svg+xml,'));
assert.equal(run('ShellSkins.motifImage({motif:"inventado",motifColors:["#123456"]})'),'none','un motivo desconocido deja la carcasa lisa');
console.log('PASS refinement: no-space mapping, held pointer never changes targets, transition gap, collection slots, comparable trio mass and shell palettes that grow with the evolution line.');
})().catch(e=>{console.error(e);process.exitCode=1});
