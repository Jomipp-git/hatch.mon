const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,flush}=await setup();
const bounds=run(`Object.keys(PMD_ASSETS).flatMap(id=>{const g=PokemonRenderer.geometry(id);return ['normal','sleep','eat','happy','sick','train','faint'].flatMap(state=>PmdVisuals.candidates(id,state).flatMap(d=>(d.frameBounds||[]).map(b=>[id,(b[2]-b[0])*g.scale,(b[3]-b[1])*g.scale])));})`);
for(const [id,w,h]of bounds)assert.ok(w<=98+1e-6&&h<=98+1e-6,id);
run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");collectionTab="pokedex";dexVariant=state.social.active.isShiny?"shiny":"normal";renderPokedex()');await flush();
assert.ok(run('memorialRenderers.length')>0);assert.ok(run('document.getElementById("panel-content").querySelectorAll("canvas").length')>0);
run('disposeMemorialSprites()');assert.equal(run('memorialRenderers.length'),0);
const html=require('node:fs').readFileSync('index.html','utf8');
// Double-tap zoom off, pinch zoom on: never user-scalable=no, never maximum-scale.
assert.match(html,/body\{[^}]*touch-action:manipulation/);
assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1">/);
assert.ok(!/user-scalable\s*=\s*no|maximum-scale/.test(html),'pinch zoom must stay available');
assert.match(html,/\.tracing-canvas\{[^}]*touch-action:none/,'the tracing canvas keeps its own gesture handling');
console.log(`PASS safe viewport: ${bounds.length} animation bounds at fixed species scale, compact Pokédex sprites and cleanup.`);
})().catch(e=>{console.error(e);process.exitCode=1});
