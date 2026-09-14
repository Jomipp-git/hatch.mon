const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./uiHarness.cjs');
const HOUR=60*60*1000,MINUTE=60*1000;
const day=new Date(2026,0,2,14).getTime(),night=new Date(2026,0,2,22).getTime();
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} !== ${expected}`);
function born(h){h.run('state=freshState();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.age=state.vital.lifespan*.5;state.care={hambre:100,felicidad:100,energia:100,higiene:100};');}

test('Energy recovers at exact awake/rest/night rates, independent of legacy Fatigue',async()=>{
 const h=await setup();
 for(const fatigue of [0,40,100])for(const [energy,lights,expected] of [[60,false,62],[10,false,18],[10,true,34]]){
  born(h);h.run(`state.care.energia=${energy};state.lightsOff=${lights};state.sleep.fatigue=${fatigue};state.sleep.napMinutes=90;for(let i=0;i<60;i++)Vital.tick(state)`);
  near(h.run('state.care.energia'),expected);assert.equal(h.run('state.sleep.fatigue'),fatigue);
 }
 for(const age of [.1,.9])for(const sick of [false,true]){
  born(h);h.run(`state.age=state.vital.lifespan*${age};state.pokerus=${sick};state.care.energia=10;state.lightsOff=true;Vital.tick(state)`);near(h.run('state.care.energia'),10+24/60);
 }
});
test('rest hysteresis survives render, ticks, save reload and day rollover',async()=>{
 const h=await setup();born(h);
 h.run('state.care.energia=31;render()');assert.equal(h.run('Vital.energyResting(state)'),false);
 h.run('state.care.energia=30;render()');assert.equal(h.run('state.sleep.energyResting'),true);
 for(const energy of [31,40,49]){h.run(`state.care.energia=${energy};render();Vital.tick(state)`);assert.equal(h.run('state.sleep.energyResting'),true);}
 const reloaded=await setup({initialSave:JSON.parse(h.run('JSON.stringify(state)'))});assert.equal(reloaded.run('state.sleep.energyResting'),true);
 reloaded.run(`Vital.ensureSleep(state,${day}+24*${HOUR})`);assert.equal(reloaded.run('state.sleep.energyResting'),true);
 h.run('state.care.energia=50;render()');assert.equal(h.run('state.sleep.energyResting'),false);
 h.run('delete state.sleep.energyResting;Vital.ensureSleep(state)');assert.equal(h.run('state.sleep.energyResting'),false);
});
test('rest blocks Play/Training without spending and permits non-energy care',async()=>{
 const h=await setup();born(h);h.run('state.care.energia=30;state.trainer.energy=6;render()');
 assert.equal(h.run('allowed("jugar")'),false);
 h.run('showPanel("training")');
 const walk=e=>[e,...(e.children||[]).flatMap(walk)];
 const buttons=walk(h.els['panel-content']).filter(e=>e.textContent===h.run("t('minigame.common.start')"));
 assert.equal(buttons.length,4);assert.ok(buttons.every(b=>b.disabled));
 h.run('closePanel()');
 for(const action of ['careAction("jugar")','train("iq")']){assert.equal(h.run(action),false);assert.equal(h.run('state.trainer.energy'),6);assert.equal(h.run('state.care.energia'),30);assert.match(h.run('state.message'),/Está descansando/);}
 for(const action of ['alimentar','limpiar'])assert.equal(h.run(`careAction("${action}")`),true);
 h.run('state.care.energia=0');assert.equal(h.run('Relationship.interact(state).kind'),'happy');assert.equal(h.run('state.care.energia'),0);
 h.run('state.pokerus=true');assert.equal(h.run('careAction("curar")'),true);
 born(h);h.run('careAction("jugar",()=>1)');assert.equal(h.run('state.care.energia'),95);
 born(h);h.run('train("iq")');assert.equal(h.run('state.care.energia'),92);
 born(h);h.run('state.care.energia=35;careAction("jugar",()=>1)');assert.equal(h.run('state.sleep.energyResting'),true);
});
test('zero Energy and legacy Fatigue/exposure cannot cause sickness, critical or earlier death',async()=>{
 const h=await setup();let lifespan;
 for(const energy of [100,0]){
  born(h);h.run(`state.care.energia=${energy};state.sleep.fatigue=100;state.vital.baseLifespan=4*24*60*60*1000;state.vital.exposure.energy=10000;for(let i=0;i<180;i++){state.care={hambre:100,felicidad:100,energia:${energy},higiene:100};minuteStep(${day}+i*${MINUTE})}`);
  assert.equal(h.run('state.phase'),'alive');assert.equal(h.run('state.pokerus'),false);
  if(lifespan===undefined)lifespan=h.run('state.vital.lifespan');else near(h.run('state.vital.lifespan'),lifespan);
 }
});
