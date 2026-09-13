const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,storage,els}=await setup();
const missingThemes=run('Object.keys(evolutionTable).map(id=>PokemonData.canonicalId(id)).filter(id=>!Object.hasOwn(SHELL_THEMES,id))');
assert.equal(missingThemes.length,0,`Runtime forms without Shell Theme: ${missingThemes.join(', ')}`);
assert.equal(run('ShellSkins.list().length'),0);
// Hatching already earns the shell: no maturity gate, and the newborn's own form counts.
run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
const hatched=run('PokemonData.canonicalId(state.pokemonId)');
assert.ok(run('ShellSkins.list()').includes(hatched),'hatching unlocks its own shell');
run('state.pokemonId="togetic"');assert.equal(run('ShellSkins.observe(state)'),true,'a new form unlocks at once, still young');
assert.equal(run('ShellSkins.observe(state)'),false,'and only once');
const id=run('PokemonData.canonicalId("togetic")');run(`ShellSkins.select('${id}',document.getElementById('display-root'))`);assert.equal(els['display-root'].dataset.shell,id);
run('forceEvolution("togekiss");die("natural")');assert.ok(run('ShellSkins.list()').includes(id));
const reload=await setup({initialShells:JSON.parse(storage.get('hatch.mon.shells'))});assert.equal(reload.els['display-root'].dataset.shell,id);assert.ok(reload.run('ShellSkins.list()').includes(id));
assert.equal(run('ShellSkins.select("not-unlocked",document.getElementById("display-root"))'),false);
run('showPanel("settings")');assert.ok(els['panel-content'].querySelectorAll('button').some(b=>b.dataset.key==='shell-'+id));
// A species cared for before the rule changed still earns its shell from the Pokédex record.
const legacy=await setup();
legacy.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");Pokedex.record(state.pokedex,"lucario","owned","past-individual")');
assert.equal(legacy.run('ShellSkins.observe(state)'),true);
assert.ok(legacy.run('ShellSkins.list()').includes(legacy.run('PokemonData.canonicalId("lucario")')),'owned species backfill');
assert.ok(!legacy.run('ShellSkins.list()').includes(legacy.run('PokemonData.canonicalId("snorlax")')),'never-owned species stay locked');
console.log('PASS shells: unlock on obtaining and on evolving, Pokédex backfill, selected theme, evolution/death persistence, reload, locked selection and settings access.');
})().catch(e=>{console.error(e);process.exitCode=1});
