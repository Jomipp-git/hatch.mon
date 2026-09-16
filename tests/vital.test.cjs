const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {gameSource}=require('./uiHarness.cjs');
const ctx=vm.createContext({HatchEnvironment:{isDevelopmentEnvironment:()=>true},TextEncoder,TextDecoder,btoa,atob,crypto:require('node:crypto').webcrypto});const run=s=>vm.runInContext(s,ctx);
for(const f of ['evolutionTable.js','hatchmonData_v2.js','pokemonDataAdapter.js','vitalSimulation.js','relationship.js','attentionEngine.js','pokedex.js','shiny.js','assets/skins/themes.js','shellSkins.js','styleTracing.js','trainingActivities.js','socialEngine.js','vendor/qrcode.js'])run(fs.readFileSync(f,'utf8'));
run(gameSource().split('// UI:')[0]);
function born(){run('state=freshState();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")')}
assert.equal(run('state.vital'),null);assert.equal(run('validSave(state)'),true);born();assert.equal(run('validSave(state)'),true);
assert.equal(run('JSON.stringify(Vital.fresh("fixed"))===JSON.stringify(Vital.fresh("fixed"))'),true);
// Los limites de etapa se comprueban con una especie que no sea Baby.
run("state.pokemonId='eevee'");
for(const [fraction,stage] of [[0,'CRÍA'],[.2,'ADULTO'],[.45,'ADULTO'],[.8,'SENIOR']]){run(`state.age=state.vital.lifespan*${fraction}`);assert.equal(run('Vital.getLifeStage(state)'),stage)}
// Excepcion Baby: no salen de CRIA por edad, solo evolucionando. Las 19 formas oficiales.
run("state.pokemonId='pichu'");
for(const fraction of [0,.2,.45,.8,.99]){run(`state.age=state.vital.lifespan*${fraction}`);assert.equal(run('Vital.getLifeStage(state)'),'CRÍA','un Baby no pasa de CRÍA')}
assert.equal(run("Object.keys(evolutionConfig).filter(id=>PokemonData.get(id)&&PokemonData.get(id).EvolutionStage==='Baby').length"),19);
assert.equal(run("Vital.breedingReason({...state,pokemonId:'pichu'})!==null"),true,'un Baby no puede criar');
run("state.pokemonId='eevee'");
born();run('careAction("alimentar");careAction("alimentar")');assert.equal(run('state.care.hambre'),100);assert.equal(run('state.pokerus'),false);assert.equal(run('state.vital.poops.length'),0);assert.equal(run('state.vital.recentFeedingLoad'),2);assert.equal(run('state.vital.dirt'),12);
run('const due=state.vital.nextPoopAt;advanceGameTime(44*MINUTE)');assert.equal(run('state.vital.poops.length'),0);run('advanceGameTime(77*MINUTE)');assert.ok(run('state.vital.poops.length')>=1);
run('state.vital.digestion=DIGESTION_CONFIG.max;advanceGameTime(8*HOUR)');assert.equal(run('state.vital.poops.length'),3);assert.equal(run('validSave(state)'),true);
run('state.care.higiene=10;state.care.felicidad=50;state.trainer.energy=6;careAction("limpiar")');assert.equal(run('state.vital.poops.length'),0);assert.equal(run('state.vital.dirt'),0);assert.equal(run('state.care.higiene'),65);assert.equal(run('state.care.felicidad'),53);
// Las bayas de atributo se retiraron: la de comida alimenta y no toca el atributo.
born();run('state.inventory.berry=1;useItem("berry")');assert.equal(run('state.training.strength'),0);assert.equal(run('state.vital.digestion'),.35);assert.equal(run('state.pokerus'),false);run('train("strength")');assert.equal(run('state.training.strength'),5);
born();run('state.care.energia=20;careAction("luz");advanceGameTime(HOUR)');assert.ok(Math.abs(run('state.care.energia')-44)<1e-8);assert.equal(run('allowed("alimentar")'),false);assert.equal(run('allowed("limpiar")'),false);
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
// Breeding gate for both parents. There is no longer a once-per-life cap: the Ditto price is
// the only brake, so a second egg from a fresh code has to go through.
born();run('state.pokemonId="pikachu";state.gender="male";state.age=state.vital.lifespan*.5;const male=activeEntity();const code=exportEntity()');
born();run('state.pokemonId="pikachu";state.gender="female"');assert.equal(run('breedingCheck(code).ok'),false);run('state.age=state.vital.lifespan*.5;state.care.felicidad=69');assert.equal(run('breedingCheck(code).ok'),false);run('state.care.felicidad=100;breedFromCode(code)');assert.equal(run('state.social.eggs.length'),1);assert.equal(run('state.vital.hasProducedEgg'),true);assert.equal(run('state.social.bredIds.length'),2);assert.equal(run('validSave(state)'),true);
assert.equal(run('breedingCheck(HatchMonSocial.pack(PokemonData.convertEntity(male,true))).ok'),true);run('state=JSON.parse(JSON.stringify(state))');assert.equal(run('breedingCheck(HatchMonSocial.pack(PokemonData.convertEntity(male,true))).ok'),true);
// Ditto: no second person, no gender pairing, and the offspring is the base form of the player's
// own line. It costs one Ditto from the Bag and the vital gate still applies.
run('state.social.eggs=[];state.inventory.ditto=0');
assert.equal(run('dittoBreedingCheck().ok'),true);
assert.equal(run('dittoBreedingCheck().offspring'),'pichu');
assert.throws(()=>run('breedWithDitto()'),/dittoMissing|Ditto/);
run('state.inventory.ditto=2;breedWithDitto()');
assert.equal(run('state.social.eggs.length'),1);assert.equal(run('state.inventory.ditto'),1);
assert.equal(run('state.social.eggs[0].parents[1].name'),'Ditto');
assert.equal(run('state.social.eggs[0].offspring'),'pichu');
assert.equal(run('validSave(state)'),true);
// The vital gate is shared: outside ADULTO the button has a reason, and it is the same one.
run('state.age=state.vital.lifespan*.95');
assert.equal(run('dittoBreedingCheck().ok'),false);
assert.equal(run('dittoBreedingCheck().reason'),run('Vital.breedingReason(state)'));
run('state.age=state.vital.lifespan*.5');assert.equal(run('breedingBlocker()'),null);
// Aspirador. Cumple la regla de los automatizadores por las tres vias: se gasta, es parcial y se
// nota. Toca deposiciones, nunca higiene.
born();run('state.pokemonId="pikachu";state.age=3*DAY;state.inventory={vacuum:2}');
run('state.vital.poops=[{id:1,createdAge:state.age-2*HOUR},{id:2,createdAge:state.age}]');
const hygieneBefore=run('state.care.higiene');
assert.equal(run('Vital.autoClean(state,state.inventory.vacuum)'),1,'solo la que lleva una hora');
assert.equal(run('state.vital.poops.length'),1,'la recien hecha sigue siendo tuya');
assert.equal(run('state.care.higiene'),hygieneBefore,'nunca toca la higiene');
// Sin cargas no hace nada, y el paso por minuto las descuenta y retira el objeto al agotarse.
run('state.inventory={};state.vital.poops=[{id:3,createdAge:state.age-2*HOUR}]');
assert.equal(run('Vital.autoClean(state,state.inventory.vacuum||0)'),0);
run('state.inventory={vacuum:1};minuteStep()');
assert.equal(run('state.vital.poops.length'),0);
assert.equal(run('state.inventory.vacuum'),undefined,'gastado, fuera del inventario');
assert.equal(run('validSave(state)'),true);
// Comedero. Solo trabaja mientras duerme, que es la ventana en la que el juego ya prohibe alimentar;
// de dia la comida sigue siendo entera del jugador. Sirve una baya de la reserva.
born();run('state.pokemonId="pikachu";state.inventory={feeder:1,berry:2};state.care.hambre=40;state.lightsOff=false');
assert.equal(run('Vital.autoFeed(state,true,true)'),false,'de dia no sirve');
run('state.lightsOff=true');
assert.equal(run('Vital.autoFeed(state,true,true)'),true);
assert.equal(run('state.care.hambre'),70,'una baya, no un llenado');
assert.equal(run('Vital.autoFeed(state,true,true)'),false,'el umbral hace de limitador');
run('state.care.hambre=40');
assert.equal(run('Vital.autoFeed(state,false,true)'),false,'sin comedero no sirve');
assert.equal(run('Vital.autoFeed(state,true,false)'),false,'sin bayas tampoco');
// Y el paso por minuto descuenta la baya de la reserva.
// minuteStep corre sleepTick antes que el comedero, y de dia eso despierta al compañero y enciende
// la luz: hay que darle un reloj nocturno o la prueba mide otra cosa.
run('state.inventory={feeder:1,berry:1};state.care.hambre=40;state.lightsOff=true');
run(`minuteStep(${new Date(2026,0,1,2,0,0).getTime()})`);
assert.equal(run('state.inventory.berry'),undefined,'la baya sale de tu reserva');
assert.equal(run('state.inventory.feeder'),1,'el comedero no se gasta: lo recurrente son las bayas');
assert.equal(run('validSave(state)'),true);
// Herencia. El Vinculo del progenitor fija el techo y el azar decide entre la mitad y el techo, asi
// que con rng fijo en .5 un Vinculo lleno da potential .75 -> ritmo +18,75 % y shiny x1,75.
run('state.social.eggs=[];state.relationship.points=100;state.inventory.ditto=1');
run('storeBredEgg("pichu",[{id:state.social.active.id,speciesId:state.pokemonId,name:"Madre"},{id:"ditto-fixture-01",speciesId:"0132A0",name:"Ditto"}],()=>.5)');
assert.equal(run('state.social.eggs[0].inheritance.potential'),.75);
assert.equal(run('state.social.eggs[0].inheritance.parent'),'Madre');
assert.equal(run('Relationship.learningRate(.75)'),1.1875);
assert.equal(run('Relationship.shinyMultiplier(.75)'),1.75);
assert.equal(run('validSave(state)'),true);
// Sin Vinculo no hay herencia, y un huevo sin el campo vale 1: el huevo misterioso no hereda nada.
run('state.social.eggs=[];state.relationship.points=0;storeBredEgg("pichu",[{id:state.social.active.id,speciesId:state.pokemonId,name:"Madre"}],()=>.5)');
assert.equal(run('state.social.eggs[0].inheritance.potential'),0);
assert.equal(run('Relationship.learningRate(undefined)'),1);
// El huevo lleva la herencia hasta el compañero: social.active es una lista blanca y la perderia.
run('state.social.eggs=[];state.relationship.points=100;storeBredEgg("pichu",[{id:state.social.active.id,speciesId:state.pokemonId,name:"Madre"}],()=>.5)');
run('state.phase="dead";state.vital.deathCause="natural";incubateStoredEgg(state.social.eggs[0].id)');
assert.equal(run('state.social.active.inheritance.potential'),.75);
assert.equal(run('validSave(state)'),true);
// El ritmo multiplica el ATRIBUTO y no las monedas: la economia ya va con excedente.
run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
run('state.coins=0;state.care.energia=100;state.trainer.energy=6');
run('beginTraining("strength");finishTraining("strength",4)');
assert.equal(run('state.training.strength'),4*1.1875);
assert.equal(run('state.coins'),run('coinReward(4)'));
assert.equal(run('validSave(state)'),true);
// Memoria de una sola generacion: el techo del siguiente huevo lee el Vinculo de AHORA, no lo heredado.
run('state.relationship.points=0;state.social.eggs=[];storeBredEgg("pichu",[{id:state.social.active.id,speciesId:state.pokemonId,name:"Hija"}],()=>.5)');
assert.equal(run('state.social.eggs[0].inheritance.potential'),0);
// La herencia viaja por QR, asi que llega de otro dispositivo y se valida como todo lo demas.
assert.equal(run('HatchMonSocial.validStore(state.social,validSnapshot)'),true);
run('state.social.eggs[0].inheritance.potential=9');
assert.equal(run('HatchMonSocial.validStore(state.social,validSnapshot)'),false);
run('state.social.eggs[0].inheritance.potential=.4');
run('const exported=exportEntity();const qr=qrcode(0,"M");qr.addData(exported,"Byte");qr.make()');console.log('QR bytes',run('exported.length'));
// Modern profiles retain physiology for breeding validation, but cannot be banked.
run('const modern=readSocialCode(exported)');assert.equal(run('modern.entity.snapshot.vital.hasProducedEgg'),true);
console.log('PASS C: stages, modifiers, difficulty, digestion, poops, cleaning, berries/training, sleep, fullness, abuse, offline equivalence, lifespan/death, breeding by QR and by Ditto, and inheritance.');
