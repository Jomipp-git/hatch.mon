const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {setup}=require('./uiHarness.cjs');
test('every obtainable runtime form has genuine normal/shiny PMD files and renders both without fallback',async()=>{
 const h=await setup(),ids=h.run('[...obtainableRoster.egg,...obtainableRoster.evolutionOnly].map(p=>p.id)');
 assert.deepEqual([...ids].sort(),[...h.run('Object.keys(evolutionConfig)')].sort());
 h.run('var coverageHost=document.createElement("div");var coverageRenderer=PokemonRenderer.create(coverageHost)');
 for(const id of ids){
  const canonical=h.run(`PokemonData.canonicalId('${id}')`);
  const normal=h.run(`PMD_ASSETS['${canonical}']`);assert.ok(normal,canonical);
  for(const shiny of [false,true]){
   const variant=shiny?normal.shiny:normal;assert.ok(variant?.sprites.Idle,`${id} shiny=${shiny} Idle`);
   const meta=JSON.parse(fs.readFileSync(`assets/pmd/${canonical}/${shiny?'shiny/':''}metadata.json`));
   assert.equal(meta.pokemonId,canonical);if(shiny)assert.ok(meta.route.includes('/0001'));
   for(const src of new Set([...Object.values(variant.sprites).map(d=>d.src),...Object.values(variant.portraits)])){
    assert.ok(fs.existsSync(src),src);assert.ok(fs.existsSync('dist/'+src),'dist/'+src);
    assert.deepEqual(fs.readFileSync('dist/'+src),fs.readFileSync(src),src);
    if(shiny)assert.ok(src.includes('/shiny/'),src);
   }
   if(shiny)assert.notDeepEqual(fs.readFileSync(variant.sprites.Idle.src),fs.readFileSync(normal.sprites.Idle.src),`${id}: shiny must not reuse normal`);
   for(const state of h.run('Object.keys(PMD_STATE_FALLBACKS)')){
    h.run(`coverageRenderer.renderPokemon('${id}',{visualState:'${state}',isShiny:${shiny},animate:false})`);await h.flush();
    assert.equal(h.run('coverageHost.dataset.visual'),'asset',`${id} ${state} shiny=${shiny}`);
    const src=h.run('coverageHost.dataset.asset');assert.equal(src.includes('/shiny/'),shiny,src);
    assert.ok(Object.values(variant.sprites).some(d=>d.src===src),src);
   }
  }
 }
 h.run('coverageRenderer.stop()');
});
test('missing shiny never silently renders the normal variant',async()=>{
 const h=await setup();
 h.run('var host=document.createElement("div"),renderer=PokemonRenderer.create(host);delete PMD_ASSETS[PokemonData.canonicalId("pichu")].shiny;renderer.renderPokemon("pichu",{isShiny:true})');await h.flush();
 assert.equal(h.run('PmdVisuals.candidates("pichu","normal",true).length'),0);
 assert.equal(h.run('host.dataset.visual'),'placeholder');
});
