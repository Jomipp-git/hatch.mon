const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,flush}=await setup();for(let rarity=1;rarity<=5;rarity++)assert.equal(run(`Shiny.probability(${rarity})`),1/(10*rarity));
assert.equal(run('Shiny.enabled'),true);assert.equal(run('obtainableRoster.total'),run('Object.keys(evolutionConfig).length'));assert.equal(run('obtainableRoster.egg.length'),run('STARTERS.length'));assert.equal(run('obtainableRoster.excluded.length'),0);
run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.social.active.isShiny=true;state.pokedex=Pokedex.fresh();Pokedex.record(state.pokedex,state.pokemonId,"owned",state.social.active.id,true);save()');
assert.equal(run('Pokedex.valid(state.pokedex)'),true);
const dex=JSON.parse(run('JSON.stringify(state.pokedex)')),key=Object.keys(dex)[0];
const legacy=structuredClone(dex);delete legacy[key].shiny;
assert.equal(run(`Pokedex.valid(${JSON.stringify(legacy)})`),true);
for(const shiny of [null,[],true,{}, {...dex[key].shiny,seen:1},{...dex[key].shiny,ownedIds:'bad'},{...dex[key].shiny,ownedIds:[1]},{...dex[key].shiny,ownedIds:['a','a']},...['evolved','bred','received'].map(k=>({...dex[key].shiny,[k]:null}))]){
 const malformed=structuredClone(dex);malformed[key].shiny=shiny;
 assert.equal(run(`Pokedex.valid(${JSON.stringify(malformed)})`),false,JSON.stringify(shiny));
}
const saved=JSON.parse(run('JSON.stringify(state)'));const restored=await setup({initialSave:saved});assert.equal(restored.run('state.social.active.isShiny'),true);
// Meeting the shiny means you have met the species, so the plain entry fills in with it.
run('Shiny.roll=()=>{throw Error("No reroll")};forceEvolution("pikachu")');assert.equal(run('state.social.active.isShiny'),true);
assert.equal(run('state.pokedex[PokemonData.canonicalId("pikachu")].seen'),true);assert.equal(run('state.pokedex[PokemonData.canonicalId("pikachu")].shiny.seen'),true);
assert.deepEqual(run('state.pokedex[PokemonData.canonicalId("pikachu")].ownedIds'),run('state.pokedex[PokemonData.canonicalId("pikachu")].shiny.ownedIds'));
// Never the other way round: a plain encounter leaves the shiny Pokédex untouched.
run('var plain=Pokedex.fresh();Pokedex.record(plain,"eevee","owned","only-plain",false)');
assert.equal(run('Object.hasOwn(plain[PokemonData.canonicalId("eevee")],"shiny")'),false);
// A save written before that rule gets its plain entries folded back in on load.
const stale=JSON.parse(run('JSON.stringify(state)'));const staleKey=run('PokemonData.canonicalId("pikachu")');
stale.pokedex[staleKey]={...stale.pokedex[staleKey],seen:false,ownedIds:[],evolved:false};
const folded=await setup({initialSave:stale});
assert.equal(folded.run(`state.pokedex['${staleKey}'].seen`),true);
assert.deepEqual(folded.run(`state.pokedex['${staleKey}'].ownedIds`),folded.run(`state.pokedex['${staleKey}'].shiny.ownedIds`));
assert.equal(run('Object.hasOwn(activeEntity(),"isShiny")'),false);
run('die("natural")');assert.equal(run('state.social.memorials[0].isShiny'),true);
run('collectionTab="memories";renderPokedex()');await flush();
// Memorias pinta el retrato, no el sprite, asi que ya no hay renderer que registrar. Lo que importa
// aqui es que un recuerdo shiny coja la variante shiny del retrato y no la normal.
assert.equal(run('memorialRenderers.length'),0);
assert.ok(run("memorialPortrait(state.social.memorials[0].canonicalSpeciesId,true).className.includes('memory-portrait')"));
assert.notEqual(run("PMD_ASSETS[state.social.memorials[0].canonicalSpeciesId].shiny.portraits.Normal"),
 run("PMD_ASSETS[state.social.memorials[0].canonicalSpeciesId].portraits.Normal"));
console.log('PASS runtime roster, shiny probability 1–5, prepared identity save/evolution/memories, separate dex and unchanged QR field shape.');
})().catch(e=>{console.error(e);process.exitCode=1});
