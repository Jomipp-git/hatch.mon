const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,flush}=await setup();
run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
for(const id of ['munchlax','electivire','togetic']){
 const metrics=run(`PokemonRenderer.geometry('${id}')`);
 for(const visualState of ['normal','eat','normal','sleep','normal','happy','normal','train','normal','faint']){
 run(`pokemonRenderer.renderPokemon('${id}',{visualState:'${visualState}'})`);await flush();
 const c=els.sprite.children[0],d=c.context.draws.at(-1);assert.ok(d,`${id} ${visualState}`);
 assert.equal(c.width,metrics.width);assert.equal(c.height,metrics.height);
 assert.ok(Math.abs(d[7]/d[3]-metrics.scale)<1e-9);assert.ok(Math.abs(d[8]/d[4]-metrics.scale)<1e-9);
 assert.ok(d[5]>=0&&d[6]>=0&&d[5]+d[7]<=c.width&&d[6]+d[8]<=c.height);
 }
 run(`pokemonRenderer.renderPokemon('${id}',{dead:true})`);await flush();assert.equal(els.sprite.children[0].width,metrics.width);
}
run('state.pokemonId="togetic";state.lightsOff=false;clearPetReaction();render()');
const light=run('document.querySelector("[data-action=\\"luz\\"]")');light.fire('click');await flush();assert.equal(els.sprite.dataset.visualState,'sleep');
light.fire('click');await flush();assert.equal(els.sprite.dataset.visualState,'normal');
light.fire('click');run('interactWithPokemon()');await flush();assert.equal(els.sprite.dataset.visualState,'wake');
assert.equal(run('PMD_STATE_FALLBACKS.train.join(",")'),'Hop,Idle');
assert.equal(run('PMD_STATE_FALLBACKS.eat.join(",")'),'Eat,Idle');
console.log('PASS fixed scale/viewport: Electivire and Togetic, all requested transitions, tombstone, light button vs touch wake.');
})().catch(e=>{console.error(e);process.exitCode=1});
