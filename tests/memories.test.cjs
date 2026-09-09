const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,flush,advance}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Pepo");state.pokemonId="togekiss";state.age=105*HOUR;state.relationship.points=80;die("natural");var before=JSON.stringify(state.social.memorials);showPanel("pokedex");collectionTab="memories";renderPokedex()');await flush();
 const text=n=>n.textContent+(n.children||[]).map(text).join(' '),body=text(els['panel-content']);for(const label of ['MEMORIAS','Togekiss','Pepo','4 días y 9 horas','Muerte natural'])assert.ok(body.includes(label),label);
 assert.equal(els['panel-content'].querySelectorAll('button').length,2);assert.equal(run('memorialRenderers.length'),1);advance(2000);assert.equal(run('JSON.stringify(state.social.memorials)===before'),true);run('closePanel()');assert.equal(run('memorialRenderers.length'),0);
 assert.equal(run('Object.entries(PMD_STATE_FALLBACKS).some(([state,names])=>state!=="train"&&names.includes("Hop"))'),false);
 run('startNewBeginning();showPanel("pokedex");collectionTab="memories";renderPokedex()');await flush();assert.ok(text(els['panel-content']).includes('Pepo'));assert.equal(run('state.phase'),'egg');assert.equal(run('validSave(state)'),true);
 console.log('PASS memories: historical card, identity/age/cause/hearts, persistence after new beginning, no activation, sprite cleanup and Hop reserved for training.');
})().catch(e=>{console.error(e);process.exitCode=1});
