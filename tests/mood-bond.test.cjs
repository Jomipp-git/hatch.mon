const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,flush}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.age=DAY;state.sustained["felicidad:70"]=6*HOUR;state.care.felicidad=80;state.relationship.points=10;var r=current().rules[0]');
 assert.equal(run('LABELS.felicidad'),'Ánimo');
 for(const [m,b,expected]of [[null,null,true],[81,null,false],[80,null,true],[null,11,false],[80,10,true],[80,11,false]]){run(`r.minMood=${m};r.minBond=${b}`);assert.equal(run('conditionsMet(r)'),expected)}
 run('r.minMood=90;r.minBond=60;var others=JSON.stringify({h:state.care.hambre,e:state.care.energia,y:state.care.higiene,v:state.vital});showPanel("oak")');
 const text=n=>n.textContent+n.children.map(text).join(' ');assert.ok(text(els['panel-content']).includes('Ánimo mínimo: 90'));assert.ok(text(els['panel-content']).includes('Vínculo ≥ 60 ♥'));
 run('showPanel("settings")');const skip=els['panel-content'].querySelectorAll('button').filter(b=>b.dataset.key?.startsWith('skip-'));assert.deepEqual(skip.map(b=>b.textContent),['+1 h','+3 h','+6 h']);assert.ok(skip.every(b=>b.children.length===0));
 run('closePanel();forceEvolution("pikachu")');assert.equal(run('state.care.felicidad'),90);assert.ok(run('state.relationship.points')>=60);assert.equal(run('JSON.stringify({h:state.care.hambre,e:state.care.energia,y:state.care.higiene,v:state.vital})===others'),true);
 run('var next=current().rules[0];next.minMood=50;next.minBond=20;var moodBefore=state.care.felicidad,bondBefore=state.relationship.points;forceEvolution("raichu")');assert.equal(run('state.care.felicidad'),run('moodBefore'));assert.ok(run('state.relationship.points')>=run('bondBefore'));
 for(const field of ['MinMood','MinBond']){assert.throws(()=>run(`canonicalRule({...PokemonData.rules('pichu')[0],${field}:101})`));assert.equal(run(`canonicalRule({...PokemonData.rules('pichu')[0],${field}:''}).${field==='MinMood'?'minMood':'minBond'}`),null)}
 assert.equal(run('PMD_STATE_FALLBACKS.happy.includes("Hop")'),false);assert.equal(run('PMD_STATE_FALLBACKS.happy.join(",")'),'Pose,Nod,Rotate,Idle');
 run('state.care.felicidad=80;state.relationship.attention=0;interactWithPokemon()');await flush();assert.equal(run('state.care.felicidad'),80.5);assert.ok(!els.sprite.dataset.asset.includes('Hop-Anim'));
 run('clearPetReaction();state.pokemonId="togetic";render()');await flush();const idleSize=[els.sprite.children[0].width,els.sprite.children[0].height];run('petReaction("happy")');await flush();assert.deepEqual([els.sprite.children[0].width,els.sprite.children[0].height],idleSize);assert.ok(els.sprite.dataset.asset.endsWith('Pose-Anim.png'));
 console.log('PASS mood/bond: independent requirements, nulls/validation, Oak labels, Force minimums/preservation, positive mood, no generic Hop and plain time buttons.');
})().catch(e=>{console.error(e);process.exitCode=1});
