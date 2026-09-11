const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');const {setup}=require('./uiHarness.cjs');
const ctx=vm.createContext({});for(const f of ['evolutionTable.js','hatchmonData_v2.js','pokemonDataAdapter.js','assets/pmd/manifest.js','assets/pmd/listMetrics.js','pmdRenderer.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
let sprites=0,portraits=0;
for(const [id,entry]of Object.entries(run('PMD_ASSETS'))){assert.equal(run(`PokemonData.canonicalId('${id}')`),id);for(const def of Object.values(entry.sprites)){assert.ok(def.src.startsWith('assets/pmd/'));const png=fs.readFileSync(def.src);assert.equal(png.readUInt32BE(16)%def.width,0);assert.equal(def.frames,def.durations.length);assert.ok(def.crop.width>0);sprites++;}for(const src of Object.values(entry.portraits)){assert.ok(src.startsWith('assets/pmd/'));assert.ok(fs.existsSync(src));portraits++;}assert.ok(fs.existsSync(`assets/pmd/${id}/metadata.json`));}
assert.ok(run('Object.keys(PMD_ASSETS).every(id=>PokemonData.legacyId(id)!==null)'));assert.ok(sprites>44);assert.ok(portraits>44);
assert.ok(run('PmdVisuals.candidates("raichualola")[0].src.includes("0026L0")'));
(async()=>{
 const t=await setup(),{run,flush,els}=t;run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");render()');await flush();
 // Only Idle available remains playable for any logical state.
 run('var canonical=PokemonData.canonicalId(state.pokemonId);var original=PMD_ASSETS[canonical];PMD_ASSETS[canonical]={sprites:{Idle:original.sprites.Idle},portraits:{}};petReaction("eat")');await flush();assert.ok(els.sprite.dataset.asset.endsWith('Idle-Anim.png'));assert.equal(els.portrait,undefined);
 // Missing file falls through candidates, without tying a game action to asset success.
 run('PMD_ASSETS[canonical].sprites.Eat={...original.sprites.Idle,src:"assets/pmd/no-such.png"};clearPetReaction();render();petReaction("eat")');await flush();assert.ok(els.sprite.dataset.asset.endsWith('Idle-Anim.png'));
 const missing=await setup({missing:true});missing.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");render();petReaction("happy")');await missing.flush();assert.equal(missing.els.sprite.dataset.visual,'placeholder');assert.equal(missing.els.portrait,undefined);
 console.log(`PASS PMD: ${sprites} sprite states, ${portraits} portraits, canonical mappings, local routes, fallback Idle/missing files/retro and optional portraits.`);
})().catch(e=>{console.error(e);process.exitCode=1});
