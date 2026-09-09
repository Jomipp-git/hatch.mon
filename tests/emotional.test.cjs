const assert=require('node:assert/strict'),fs=require('fs');const {setup}=require('./uiHarness.cjs');
(async()=>{
 const t=await setup(),{run,els,flush,advance}=t;
 function born(){run('state=freshState();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Luz");render()')}
 assert.equal(run('state.relationship'),null);born();assert.equal(run('validSave(state)'),true);assert.equal(run('LABELS.felicidad'),'Ánimo');assert.equal(els['creature-button'].disabled,false);
 const original=run('state.relationship.points');els['creature-button'].fire('click');await flush();assert.ok(run('state.relationship.points')>original);assert.equal(els.sprite.dataset.visualState,'happy');assert.equal(els.portrait.hidden,false);advance(1701);await flush();assert.equal(els.portrait.hidden,true);
 run('var priorComfort=state.care.felicidad;for(let i=0;i<100;i++)Relationship.interact(state)');assert.ok(run('state.relationship.points')<=.75);assert.equal(run('priorComfort-state.care.felicidad'),1);assert.equal(run('state.relationship.attention'),12);
 run('for(let i=0;i<60;i++)Relationship.tick(state)');assert.ok(run('state.relationship.attention')<1e-7);
 run('state.lightsOff=true;render()');await flush();assert.equal(els.sprite.dataset.visualState,'sleep');els['creature-button'].fire('click');await flush();assert.equal(run('state.lightsOff'),false);assert.equal(els.sprite.dataset.visualState,'wake');
 run('state.pokerus=true;state.vital.illnessCause="food";render()');await flush();assert.equal(els.sprite.dataset.visualState,'sick');
 born();run('state.relationship.points=60;interactWithPokemon()');await flush();assert.equal(run('Relationship.hearts(state)'),3);assert.equal(els.bond.children.length,5);
 const p=run('state.relationship.points');run('state.trainer.energy=6;train("iq")');assert.equal(run('state.relationship.points'),p+1.5);assert.equal(run('state.training.iq'),5);
 run('var calls=0;TrainingActivities.register("iq",({complete})=>{complete();return complete()});TrainingActivities.launch("iq",{commit:()=>{calls++;return true}})');assert.equal(run('calls'),1);
 run('var beforeLife=JSON.stringify(state.vital);var beforeCare=JSON.stringify(state.care);forceEvolution("pikachu")');assert.equal(run('JSON.stringify(state.vital)===beforeLife'),true);assert.equal(run('JSON.stringify(state.care)===beforeCare'),true);assert.ok(run('state.pokedex[PokemonData.canonicalId("pikachu")].evolved'));
 run('var individual=state.social.active.id;var finalBond=state.relationship.points;die("natural");render()');await flush();assert.equal(els.sprite.dataset.visualState,'faint');advance(1101);await flush();assert.equal(els.sprite.dataset.visual,'memorial');assert.equal(run('state.social.memorials[0].bond'),run('finalBond'));
 run('startNewBeginning()');assert.equal(run('state.relationship'),null);assert.equal(run('state.pokedex[PokemonData.canonicalId("pichu")].ownedIds[0]'),run('individual'));assert.equal(run('state.social.memorials.length'),1);assert.equal(run('validSave(state)'),true);
 // No historical species list fixture: use the real root pool, adjusting only progress.
 run('var pool=STARTERS;var dex={};var first=pool[0];Pokedex.record(dex,first,"owned","a");var weights=Pokedex.weights(pool,dex);var fresh=Pokedex.weights(pool,{})');assert.equal(run('weights[0]/fresh[0]'),1/8);
 run('Pokedex.record(dex,first,"owned","b")');assert.equal(run('Pokedex.weights(pool,dex)[0]/fresh[0]'),.2/8);
 run('for(const id of pool)Pokedex.record(dex,id,"seen")');assert.equal(run('Pokedex.weights(pool,dex)[0]/fresh[0]'),1/8);
 run('var choices=new Set();for(let i=0;i<10000;i++)choices.add(Pokedex.choose(pool,dex,()=>i/10000))');assert.equal(run('choices.size'),run('pool.length'));
 // The egg of known breeding/import origin is never rerolled by anti-repetition.
 run('state=freshState();state.social.active.offspring="magby";state.incubationRemaining=0;hatchIncubatingEgg(()=>0)');assert.equal(run('state.pokemonId'),'magby');assert.equal(run('Object.keys(state.pokedex).length'),1);
 const reloaded=await setup({initialSave:JSON.parse(run('JSON.stringify(state)'))});assert.equal(reloaded.run('validSave(state)'),true);
 assert.ok(!fs.readFileSync('index.html','utf8').includes('>Felicidad <'));
 console.log('PASS D: Confort, bond/rewards, spam limit and recovery, wake/sick/portraits, hearts, death memories, dex continuity, weighted nonzero repeats, fixed eggs, one-shot training and persistence.');
})().catch(e=>{console.error(e);process.exitCode=1});
