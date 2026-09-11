const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./uiHarness.cjs');
const HOUR=60*60*1000,MINUTE=60*1000;
const day=new Date(2026,0,2,14).getTime(),night=new Date(2026,0,2,22).getTime();
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} !== ${expected}`);
function born(h){h.run('state=freshState();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.age=state.vital.lifespan*.5;state.care={hambre:100,felicidad:100,energia:100,higiene:100};');}

test('awake Energy decay, play and training use the rebalanced values without changing AP',async()=>{
 const h=await setup();born(h);
 h.run(`advanceGameTime(12*${HOUR},${day}+12*${HOUR})`);near(h.run('state.care.energia'),76);
 born(h);h.run('state.care.energia=76;careAction("jugar",()=>1);careAction("jugar",()=>1);train("iq");train("strength")');assert.equal(h.run('state.care.energia'),50);
 born(h);h.run('state.trainer.energy=6;careAction("jugar",()=>1)');assert.equal(h.run('state.care.energia'),95);assert.equal(h.run('state.trainer.energy'),5);
 born(h);h.run('state.trainer.energy=6;train("iq")');assert.equal(h.run('state.care.energia'),92);assert.equal(h.run('state.trainer.energy'),5);
 assert.equal(h.run('CARE_CONFIG.sleepRecovery'),24);
 assert.deepEqual(JSON.parse(h.run('JSON.stringify(CARE_CONFIG.costs)')),{alimentar:1,jugar:1,luz:0,limpiar:1,curar:1,auxiliar:1});
 assert.equal(h.run('CARE_CONFIG.training.ap'),1);assert.equal(h.run('CARE_CONFIG.trainerMax'),6);assert.equal(h.run('CARE_CONFIG.trainerRecoveryPerMinute'),.1);
 assert.equal(h.run('validSave(state)'),true);
});

test('petting costs no Energy and naps start at fatigue 40 while preserving sleep limits',async()=>{
 const h=await setup();born(h);
 h.run('state.care.energia=63;Relationship.interact(state)');assert.equal(h.run('state.care.energia'),63);
 born(h);h.run(`Date.now=()=>${day};state.sleep.fatigue=39`);assert.equal(h.run('careAction("luz")'),false);
 h.run('state.sleep.fatigue=40');assert.equal(h.run('careAction("luz")'),true);assert.equal(h.run('state.sleep.napping'),true);
 h.run('state.lightsOff=false;state.sleep.napMinutes=90');assert.equal(h.run('Vital.sleepPermission(state,Date.now()).ok'),false);
 assert.equal(h.run('SLEEP_CONFIG.napLimitMinutes'),90);assert.equal(h.run('SLEEP_CONFIG.autoSleepThreshold'),75);
 assert.equal(h.run('SLEEP_CONFIG.fatiguePerMinute'),5/60);
 born(h);h.run(`state.personality="sleepy";state.sleep.fatigue=0;Vital.sleepTick(state,${day})`);near(h.run('state.sleep.fatigue'),5/60*1.15);
 born(h);h.run(`state.lightsOff=true;state.care.energia=50;Vital.tick(state);Vital.sleepTick(state,${night})`);near(h.run('state.care.energia'),50+24/60);
});
