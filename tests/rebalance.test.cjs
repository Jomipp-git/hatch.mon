const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({HatchEnvironment:{isDevelopmentEnvironment:()=>true},TextEncoder,TextDecoder,btoa,atob,crypto:require('node:crypto').webcrypto});const run=s=>vm.runInContext(s,ctx);
for(const f of ['evolutionTable.js','hatchmonData_v2.js','pokemonDataAdapter.js','vitalSimulation.js','relationship.js','attentionEngine.js','pokedex.js','shiny.js','assets/skins/themes.js','shellSkins.js','styleTracing.js','trainingActivities.js','socialEngine.js'])run(fs.readFileSync(f,'utf8'));
run(fs.readFileSync('index.html','utf8').match(/<script type="text\/plain" id="game-source">([\s\S]*?)<\/script>/)[1].split('// UI:')[0]);
function born(){run('state=freshState();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Test");state.pokemonId="pikachu";state.age=state.vital.lifespan*.5;state.care.energia=50')}
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const asleep of [false,true]){
 born();run(`state.lightsOff=${asleep};var difficulty=Vital.difficulty(state.pokemonId).decay;Vital.tick(state)`);
 approx(run('state.care.hambre'),100-(asleep?3.6:8)/60*run('difficulty'));
 approx(run('state.care.higiene'),100-(asleep?2:5)/60*run('difficulty'));
 approx(run('state.care.felicidad'),100-(asleep?.8:4)/60);
 approx(run('state.care.energia'),50+(asleep?24:2)/60);
}
for(const [n,mult] of [[0,1],[1,1.25],[2,1.6],[3,2]]){
 born();run(`state.vital.poops=Array.from({length:${n}},(_,i)=>({id:i+1,createdAge:state.age}));state.vital.poopSerial=${n};Vital.tick(state)`);
 approx(run('state.care.higiene'),100-5/60*run('Vital.difficulty(state.pokemonId).decay')*mult);
 assert.equal(run('state.pokerus'),false);
}
for(const [load,chance] of [[0,0],[1,0],[2,0],[2.9,.15],[3,.15],[4,.30],[5,.50],[12,.50]])approx(run(`Vital.abuseRisk(${load})`),chance);
for(const [count,expected] of [[3,.15],[4,.30],[5,.50]]){
 run(`let hits${count}=0;for(let i=0;i<3000;i++){const v=Vital.fresh('risk-'+i);v.recentFeedingLoad=${count-1};v.nextPoopAt=1000000;const s={age:0,care:{hambre:100},vital:v,pokerus:false};Vital.eat(s,CARE_CONFIG.feed);if(s.pokerus)hits${count}++;}`);
 assert.ok(Math.abs(run(`hits${count}/3000`)-expected)<.035);
}
born();run('state.care.hambre=100;const rngBefore=state.vital.rng;Vital.tick(state)');assert.equal(run('state.vital.rng===rngBefore'),true);assert.equal(run('state.pokerus'),false);
born();run('state.vital.recentFeedingLoad=3;advanceGameTime(HOUR)');approx(run('state.vital.recentFeedingLoad'),2.25);
born();run('state.care.hambre=100;state.inventory.berryStrength=2;useItem("berryStrength");useItem("berryStrength")');assert.equal(run('state.vital.recentFeedingLoad'),2);assert.equal(run('state.pokerus'),false);assert.equal(run('state.training.strength'),10);
born();run('const beforeTraining=JSON.parse(JSON.stringify(state));train("iq")');assert.equal(run('state.training.iq'),5);approx(run('state.care.energia'),42);approx(run('state.care.hambre'),96);assert.equal(run('state.vital.dirt'),3);assert.equal(run('state.trainer.energy'),5);
run('state.care.higiene=82;state.care.felicidad=50;careAction("limpiar")');assert.equal(run('state.care.higiene'),100);assert.equal(run('state.care.felicidad'),53);assert.equal(run('state.vital.dirt'),0);
// Lifespan configuration and stable seed output remain at the approved C values.
assert.equal(run('LIFE_CONFIG.baseDays'),4);assert.equal(run('LIFE_CONFIG.variationDays'),.15);assert.equal(run('LIFE_CONFIG.minDays'),3.5);assert.equal(run('LIFE_CONFIG.maxDays'),5);assert.equal(run('LIFE_CONFIG.poorAdjustmentDays'),-.35);assert.equal(run('LIFE_CONFIG.excellentAdjustmentDays'),.75);
// Explicitly reproduce the quality formula using the actually sampled care.
born();run('const base=state.vital.baseLifespan;Vital.tick(state);const q=state.vital.qualitySum/state.vital.qualityMinutes;const expected=base+(q<65?(1-q/65)*-.35:(q-65)/35*.75)*DAY');approx(run('state.vital.lifespan'),run('expected'));
// Same mechanics awake/asleep when batch simulated, stepped or reloaded.
for(const asleep of [false,true]){
 born();run(`state.lightsOff=${asleep};state.vital.digestion=2;const checkpoint${asleep}=JSON.stringify(state);advanceGameTime(8*HOUR);const result${asleep}=JSON.stringify(state);state=JSON.parse(checkpoint${asleep});for(let i=0;i<480;i++){advanceGameTime(MINUTE);if(i===240)state=JSON.parse(JSON.stringify(state));}`);
 assert.equal(run(`JSON.stringify(state)===result${asleep}`),true);
}
console.log('PASS C.1 engine: awake/sleep decay, no frozen hunger/hygiene, poop multipliers, progressive one-roll abuse, physiological training, clean, lifespan and offline equivalence.');
