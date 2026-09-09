const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{
 const {run,flush,advance}=await setup();
 assert.equal(run('PmdVisuals.frameDuration({animationName:"Idle",frames:2,durations:[40]},0)'),40);
 assert.equal(run('PmdVisuals.frameDuration({animationName:"Walk",frames:2,durations:[100]},0)'),103);
 assert.equal(run('PmdVisuals.frameDuration({animationName:"Pose",frames:2,durations:[20]},0)'),140);
 assert.equal(run('PmdVisuals.frameDuration({animationName:"Hurt",frames:5,durations:[100]},0)'),130);
 run('globalThis.timingHost=document.createElement("div");globalThis.timingRenderer=PokemonRenderer.create(timingHost)');
 for(const id of ['electivire','togetic','pichu'])for(const state of ['normal','play','sleep','eat','happy','sick','faint','train']){
  run(`timingRenderer.renderPokemon('${id}',{visualState:'${state}'})`);await flush();
  const def=run(`PmdVisuals.candidates('${id}','${state}')[0]`);if(def.frames<2)continue;
  const delay=run(`PmdVisuals.frameDuration(PmdVisuals.candidates('${id}','${state}')[0],0)`);
  const before=run('timingHost.children[0].context.draws.length');
  advance(delay-.01);assert.equal(run('timingHost.children[0].context.draws.length'),before,`${id}/${state} too early`);
  advance(.01);assert.equal(run('timingHost.children[0].context.draws.length'),before+1,`${id}/${state} cadence`);
 }
 run('timingRenderer.stop()');
 console.log('PASS PMD timing: actual frame scheduling for Electivire, Togetic and Pichu; Idle/Walk exemptions and few-frame minimum.');
})().catch(e=>{console.error(e);process.exitCode=1});
