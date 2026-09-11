const assert=require('node:assert/strict');
const {setup}=require('./uiHarness.cjs');
const HOUR=60*60*1000,MINUTE=60*1000;
const night=new Date(2026,0,1,22).getTime(),day=new Date(2026,0,2,14).getTime(),tomorrow=new Date(2026,0,3,14).getTime();
(async()=>{
  const born=run=>run('state=freshState();state.incubationRemaining=0;hatch(()=>.75);finishBirthScene();setNickname("")');
  const first=await setup();born(first.run);
  const personality=first.run('state.personality');assert.ok(Object.hasOwn(first.run('PERSONALITY_CONFIG'),personality));
  const legacy=JSON.parse(first.run('JSON.stringify(state)'));delete legacy.personality;delete legacy.sleep;
  const migrated=await setup({initialSave:legacy});const assigned=migrated.run('state.personality');assert.ok(Object.hasOwn(migrated.run('PERSONALITY_CONFIG'),assigned));assert.ok(migrated.run('validSave(state)'));
  const reloaded=await setup({initialSave:JSON.parse(migrated.run('JSON.stringify(state)'))});assert.equal(reloaded.run('state.personality'),assigned);
  migrated.run('state.pokemonId="pichu";state.gender="male"');assert.equal(migrated.run('forceEvolution("pikachu")'),true);assert.equal(migrated.run('state.personality'),assigned);

  born(first.run);first.run(`Date.now=()=>${night};state.sleep.fatigue=0`);assert.equal(first.run('careAction("luz")'),true);assert.equal(first.run('state.lightsOff'),true);assert.equal(first.run('state.sleep.napping'),false);
  born(first.run);first.run(`Date.now=()=>${day};state.sleep.fatigue=0`);assert.equal(first.run('careAction("luz")'),false);assert.equal(first.run('state.lightsOff'),false);assert.match(first.run('state.message'),/no tiene sueño/);
  first.run(`state.sleep.fatigue=100;Date.now=()=>${day}`);assert.equal(first.run('careAction("luz")'),false);
  first.run('state.care.energia=30;state.sleep.napMinutes=90');assert.equal(first.run('careAction("luz")'),true);

  born(first.run);first.run(`state.care.hambre=100;state.sleep.fatigue=60;state.lightsOff=true;minuteStep(${night})`);const sleepingHunger=first.run('state.care.hambre'),recovered=first.run('state.sleep.fatigue');
  born(first.run);first.run(`state.care.hambre=100;state.sleep.fatigue=60;state.lightsOff=false;minuteStep(${night})`);const awakeHunger=first.run('state.care.hambre');
  assert.ok(sleepingHunger<100);assert.ok((100-sleepingHunger)/(100-awakeHunger)>.44&&(100-sleepingHunger)/(100-awakeHunger)<.46);assert.equal(recovered,60);
  born(first.run);first.run(`state.lightsOff=true;state.sleep.fatigue=80;advanceGameTime(2*${HOUR},${night})`);assert.equal(first.run('state.age'),2*HOUR);assert.ok(first.run('state.care.hambre')<100);assert.equal(first.run('state.sleep.fatigue'),80);
  console.log('PASS personality/sleep: legacy migration, persistence, evolution, night sleep, Energy rest, ignored Fatigue, hunger and offline recovery.');
})().catch(error=>{console.error(error);process.exitCode=1});
