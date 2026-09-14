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
  // The Sleep button says no before it is pressed: greyed out by day with a rested companion.
  const awake=await setup({startTime:day});
  awake.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.care.energia=80;render()');
  const sleepButton=awake.doc.querySelectorAll('[data-action]').find(b=>b.dataset.action==='luz');
  assert.equal(awake.run('Vital.isNight(Date.now())'),false);
  assert.equal(awake.run("allowed('luz')"),false);
  // Inert, not disabled: it reads as unavailable but still accepts the press that explains why,
  // because a title tooltip never shows on a touch screen.
  assert.equal(sleepButton['aria-disabled'],'true','the Sleep button reads as unavailable');
  assert.equal(sleepButton.disabled,false,'but it stays pressable so it can say why');
  assert.equal(sleepButton.title,awake.run("t('sleep.notSleepy',{name:current().name})"),'and says why');
  awake.run('state.message=""');
  sleepButton.fire('click');
  assert.equal(awake.run('state.message'),awake.run("t('sleep.notSleepy',{name:current().name})"),'pressing it explains the refusal');
  assert.equal(awake.run('state.lightsOff'),false,'and changes nothing');
  assert.equal(awake.run('state.trainer.energy'),awake.run('CARE_CONFIG.trainerMax'),'and costs no action point');
  assert.equal(awake.run("careAction('luz')"),false);
  // Tired enough to rest: the button comes back, and waking up is never blocked.
  awake.run('state.care.energia=10;Vital.energyResting(state);render()');
  assert.equal(sleepButton.disabled,false);assert.equal(sleepButton['aria-disabled'],'false');
  awake.run("careAction('luz');render()");
  assert.equal(awake.run('state.lightsOff'),true);
  assert.equal(awake.run("allowed('luz')"),true,'waking up is always available');
  assert.equal(sleepButton.disabled,false);assert.equal(sleepButton['aria-disabled'],'false');
  awake.run("careAction('luz')");assert.equal(awake.run('state.lightsOff'),false);
  // At night it is available regardless of how rested the companion is.
  const dark=await setup({startTime:night});
  dark.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.care.energia=100;render()');
  assert.equal(dark.run("allowed('luz')"),true);
  console.log('PASS personality/sleep: legacy migration, persistence, evolution, night sleep, Energy rest, ignored Fatigue, hunger, offline recovery and a Sleep button that reads as unavailable and explains itself.');
})().catch(error=>{console.error(error);process.exitCode=1});
