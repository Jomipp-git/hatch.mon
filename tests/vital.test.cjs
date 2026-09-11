const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({HatchEnvironment:{isDevelopmentEnvironment:()=>true},TextEncoder,TextDecoder,btoa,atob,crypto:require('node:crypto').webcrypto});const run=s=>vm.runInContext(s,ctx);
for(const f of ['evolutionTable.js','hatchmonData_v2.js','pokemonDataAdapter.js','vitalSimulation.js','relationship.js','pokedex.js','shiny.js','assets/skins/themes.js','shellSkins.js','styleTracing.js','trainingActivities.js','socialEngine.js','vendor/qrcode.js'])run(fs.readFileSync(f,'utf8'));
run(fs.readFileSync('index.html','utf8').match(/<script type="text\/plain" id="game-source">([\s\S]*?)<\/script>/)[1].split('// UI:')[0]);
function born(){run('state=freshState();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")')}
assert.equal(run('state.vital'),null);assert.equal(run('validSave(state)'),true);born();assert.equal(run('validSave(state)'),true);
assert.equal(run('JSON.stringify(Vital.fresh("fixed"))===JSON.stringify(Vital.fresh("fixed"))'),true);
for(const [fraction,stage] of [[0,'CRÍA'],[.2,'JOVEN'],[.45,'MADURO'],[.8,'SENIOR']]){run(`state.age=state.vital.lifespan*${fraction}`);assert.equal(run('Vital.getLifeStage(state)'),stage)}
born();run('careAction("alimentar");careAction("alimentar")');assert.equal(run('state.care.hambre'),100);assert.equal(run('state.pokerus'),false);assert.equal(run('state.vital.poops.length'),0);assert.equal(run('state.vital.recentFeedingLoad'),2);assert.equal(run('state.vital.dirt'),12);
run('const due=state.vital.nextPoopAt;advanceGameTime(44*MINUTE)');assert.equal(run('state.vital.poops.length'),0);run('advanceGameTime(77*MINUTE)');assert.ok(run('state.vital.poops.length')>=1);
run('state.vital.digestion=DIGESTION_CONFIG.max;advanceGameTime(8*HOUR)');assert.equal(run('state.vital.poops.length'),3);assert.equal(run('validSave(state)'),true);
run('state.care.higiene=10;state.care.felicidad=50;state.trainer.energy=6;careAction("limpiar")');assert.equal(run('state.vital.poops.length'),0);assert.equal(run('state.vital.dirt'),0);assert.equal(run('state.care.higiene'),65);assert.equal(run('state.care.felicidad'),53);
born();run('state.inventory.berryStrength=1;useItem("berryStrength")');assert.equal(run('state.training.strength'),5);assert.equal(run('state.vital.digestion'),.35);assert.equal(run('state.pokerus'),false);run('train("strength")');assert.equal(run('state.training.strength'),10);
born();run('state.care.energia=20;careAction("luz");advanceGameTime(HOUR)');assert.ok(run('state.care.energia')>44);assert.equal(run('allowed("alimentar")'),false);assert.equal(run('allowed("limpiar")'),false);
// Identical seed and state: batch, minute steps and restored state must match.
born();run('careAction("alimentar");const checkpoint=JSON.stringify(state);advanceGameTime(8*HOUR);const batch=JSON.stringify(state);state=JSON.parse(checkpoint);for(let i=0;i<480;i++)advanceGameTime(MINUTE)');assert.equal(run('JSON.stringify(state)===batch'),true);
run('state=JSON.parse(checkpoint);advanceGameTime(4*HOUR);state=JSON.parse(JSON.stringify(state));advanceGameTime(4*HOUR)');assert.equal(run('JSON.stringify(state)===batch'),true);
// Normal neglect over one night does not kill a well cared-for creature.
born();run('advanceGameTime(8*HOUR)');assert.equal(run('state.phase'),'alive');assert.equal(run('state.pokerus'),false);
// Source difficulty only; rarity changes cannot affect difficulty.
run('const original=PokemonData.get(state.pokemonId).Rarity;const d=JSON.stringify(Vital.difficulty(state.pokemonId));PokemonData.get(state.pokemonId).Rarity=5');assert.equal(run('JSON.stringify(Vital.difficulty(state.pokemonId))===d'),true);run('PokemonData.get(state.pokemonId).Rarity=original');
// Low hygiene is not instant disease, nor one poop.
born();run('state.care.higiene=19;checkHealth()');assert.equal(run('state.pokerus'),false);run('advanceGameTime(119*MINUTE)');assert.equal(run('state.pokerus'),false);
// C.1: four extra meals imply 15% then 30% risk, about 40.5% cumulative.
run('let illnesses=0;for(let i=0;i<1000;i++){const s={phase:"alive",pokemonId:"pichu",age:0,care:{hambre:100},pokerus:false,vital:Vital.fresh("meal-"+i)};for(let n=0;n<4;n++)Vital.eat(s,CARE_CONFIG.feed);if(s.pokerus)illnesses++}');assert.ok(run('illnesses')>=350&&run('illnesses')<=450,run('illnesses'));
// Lifespan bounds with controlled care, no rerolls, and distinct death cause.
for(const quality of [0,65,100]){
 born();run(`state.vital=Vital.fresh('life');for(let i=0;i<120;i++){for(const k of CARE)state.care[k]=${quality};state.age+=MINUTE;Vital.tick(state)}`);
 console.log('quality',quality,'days',run('state.vital.lifespan/DAY').toFixed(3));assert.ok(run('state.vital.lifespan/DAY')>=3.5&&run('state.vital.lifespan/DAY')<=5);
}
born();run('state.age=5*DAY;checkHealth()');assert.equal(run('state.phase'),'dead');assert.equal(run('state.vital.deathCause'),'natural');assert.equal(run('validSave(state)'),true);
born();run('state.care.hambre=0;state.care.felicidad=0;checkHealth()');assert.equal(run('state.vital.deathCause'),'neglect');
// Breeding gate for both parents and lifetime restriction, even with a new code.
born();run('state.pokemonId="pikachu";state.gender="male";state.age=state.vital.lifespan*.5;const male=activeEntity();const code=exportEntity()');
born();run('state.pokemonId="pikachu";state.gender="female"');assert.equal(run('breedingCheck(code).ok'),false);run('state.age=state.vital.lifespan*.5;state.care.felicidad=69');assert.equal(run('breedingCheck(code).ok'),false);run('state.care.felicidad=100;breedFromCode(code)');assert.equal(run('state.social.eggs.length'),1);assert.equal(run('state.vital.hasProducedEgg'),true);assert.equal(run('state.social.bredIds.length'),2);assert.equal(run('validSave(state)'),true);
assert.equal(run('breedingCheck(HatchMonSocial.pack(PokemonData.convertEntity(male,true))).ok'),false);run('state=JSON.parse(JSON.stringify(state))');assert.equal(run('breedingCheck(HatchMonSocial.pack(PokemonData.convertEntity(male,true))).ok'),false);
run('const exported=exportEntity();const qr=qrcode(0,"M");qr.addData(exported,"Byte");qr.make()');console.log('QR bytes',run('exported.length'));
// Modern profiles retain physiology for breeding validation, but cannot be banked.
run('const modern=readSocialCode(exported)');assert.equal(run('modern.entity.snapshot.vital.hasProducedEgg'),true);
console.log('PASS C: stages, modifiers, difficulty, digestion, poops, cleaning, berries/training, sleep, fullness, abuse, offline equivalence, lifespan/death, mature once-per-life breeding and QR.');
