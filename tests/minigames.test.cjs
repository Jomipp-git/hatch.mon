const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{
for(const attribute of ['iq','strength','kindness','style']){
 const {run,els,advance}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.trainer.energy=6');
 const initial=run('JSON.stringify({training:state.training,care:state.care,trainer:state.trainer})');
 run(`TrainingActivities.launch('${attribute}',{commit:train})`);assert.equal(els['training-game'].open,true);assert.equal(run('JSON.stringify({training:state.training,care:state.care,trainer:state.trainer})'),initial);
 run('TrainingActivities.cancel()');advance(16000);assert.equal(run('JSON.stringify({training:state.training,care:state.care,trainer:state.trainer})'),initial);
 run(`TrainingActivities.launch('${attribute}',{commit:train})`);if(attribute==='style'){for(let i=0;i<5;i++)els['training-game-content'].children[3].children[1].fire('click');}else advance(40000);assert.equal(run(`state.training.${attribute}`),1);assert.equal(run('state.trainer.energy'),4);assert.equal(run('state.care.energia'),90);assert.equal(run('state.care.hambre'),96);assert.equal(run('state.vital.dirt'),3);assert.ok(Math.abs(run('state.relationship.points')-.3)<1e-9);
 advance(40000);assert.equal(run(`state.training.${attribute}`),1);
}
const {run}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
for(let gain=1;gain<=5;gain++){
 run(`state.training.iq=0;state.trainer.energy=6;state.care.energia=100;state.care.hambre=100;state.vital.dirt=0;state.relationship.points=0;TrainingActivities.register('iq',({complete})=>{complete(${gain});complete(${gain})});TrainingActivities.launch('iq',{commit:train})`);
 assert.equal(run('state.training.iq'),gain);assert.equal(run('state.trainer.energy'),4);assert.ok(Math.abs(run('state.relationship.points')-gain*.3)<1e-9);
}
assert.equal(run('TrainingActivities.grade(0)'),1);assert.equal(run('TrainingActivities.grade(1)'),5);
console.log('PASS four minigames: open, no early reward, cancel, timeout minimum, gains 1–5, single AP/physiology charge, small bond and no duplicate completion.');
})().catch(e=>{console.error(e);process.exitCode=1});
