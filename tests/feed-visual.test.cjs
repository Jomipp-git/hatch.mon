const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,flush}=await setup();
run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
for(const id of ['munchlax','togetic','electivire','vaporeon']){
 run(`pokemonRenderer.renderPokemon('${id}',{visualState:'normal'})`);await flush();const c=els.sprite.children[0],size=[c.width,c.height];
 run(`pokemonRenderer.renderPokemon('${id}',{visualState:'eat'})`);await flush();const fed=els.sprite.children[0];assert.deepEqual([fed.width,fed.height],size);
 const approved=run(`PmdVisuals.candidates('${id}','eat')[0].animationName==='Eat'&&PmdVisuals.stableEat('${id}',PmdVisuals.candidates('${id}','eat')[0])`);
 assert.equal(fed.classList.contains('feeding-idle'),!approved);
 if(!approved)assert.ok(els.sprite.dataset.asset.endsWith('Idle-Anim.png'));
}
assert.equal(run('Object.hasOwn(PMD_ASSETS[PokemonData.canonicalId("vaporeon")].sprites,"Eat")'),false);
assert.equal(els.sprite.children[0].classList.contains('feeding-idle'),true);
const css=require('node:fs').readFileSync('index.html','utf8');assert.ok(css.includes('animation:petEat .84s ease-in-out'));assert.ok(css.includes('18%,48%,76%{translate:0 5px;rotate:3deg}'));assert.ok(css.includes('0%,100%{translate:0 0;rotate:0deg}'));
run('globalThis.idleTest=PMD_ASSETS[PokemonData.canonicalId("togetic")].sprites.Idle');
assert.equal(run('PmdVisuals.stableEat("togetic",{...idleTest,frameBounds:[idleTest.frameBounds[0]],crop:{x:idleTest.frameBounds[0][0],y:idleTest.frameBounds[0][1],width:idleTest.frameBounds[0][2]-idleTest.frameBounds[0][0],height:idleTest.frameBounds[0][3]-idleTest.frameBounds[0][1]}})'),true);
assert.equal(run('PmdVisuals.stableEat("togetic",{...idleTest,frameBounds:[[0,0,100,100]]})'),false);
console.log('PASS feed visuals: stable Eat gate, Idle chewing fallback, unchanged viewport for Munchlax/Togetic/Electivire.');
})().catch(e=>{console.error(e);process.exitCode=1});
