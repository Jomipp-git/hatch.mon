const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els}=await setup();
run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");var bondRules=HATCHMON_DATA.evolutionRules.filter(r=>r.MinBond!=null)');
assert.equal(run('bondRules.length'),17);assert.equal(run('bondRules.filter(r=>r.MinBond===2).length'),15);assert.equal(run('bondRules.filter(r=>r.MinBond===3).length'),1);assert.equal(run('bondRules.filter(r=>r.MinBond===5).length'),1);
const text=n=>n.textContent+n.children.map(text).join(' ');
for(let i=0;i<run('bondRules.length');i++){
 // The runtime only carries rules the MinAgeDays admission accepts, so every bond rule is playable.
 run(`var source=bondRules[${i}];var from=PokemonData.legacyId(source.FromId);var to=PokemonData.legacyId(source.ToId);var r=evolutionConfig[from].rules.find(x=>x.canonicalRuleId===source.RuleId);`);
 assert.ok(run('!!from&&!!to&&!!r'),run('source.RuleId'));
 // Gender-locked families (Smoochum→Jynx) reject a companion the destination cannot be.
 run("state.gender=['female','male','genderless'].find(g=>PokemonData.validGender(from,g)&&PokemonData.validGender(to,g));");
 run('state.pokemonId=from;state.age=r.ageMs;state.training={iq:0,strength:0,kindness:0,style:0,...r.training};state.care.felicidad=100;state.sustained={};for(const c of r.sustained){state.care[c.estadistica]=100;state.sustained[sustainedKey(c)]=c.duracionMs;}state.relationship.points=0;var minimum=source.MinBond*RELATIONSHIP_CONFIG.perHeart;');
 assert.equal(run('PokemonData.rules(source.FromId).includes(source)'),true);
 for(const delta of [-.01,0,1]){
  run(`state.relationship.points=minimum+${delta};panelName='oak';renderPanel()`);
  const expected=delta>=0;assert.equal(run('Relationship.evaluateMinBond(state,source.MinBond).met'),expected);assert.equal(run('conditionsMet(r)'),expected,run('source.RuleId'));
  // La ficha de Oak ya no plega cada paso en <details>: cada uno es un div.evolution-step.
  const section=els['panel-content'].children.find(n=>String(n.className||'').includes('evolution-step')&&text(n).includes(run('evolutionConfig[to].name')));
  assert.ok(text(section).includes(`${expected?'✓':'○'} Vínculo ≥ ${run('source.MinBond')} ♥`),run('source.RuleId'));
 }
 run('state.relationship.points=minimum;state.age=r.ageMs-1');assert.equal(run('conditionsMet(r)'),false);run('state.age=r.ageMs');
 for(const key of run('Object.keys(r.training)')){run(`state.training.${key}=r.training.${key}-1`);assert.equal(run('conditionsMet(r)'),false);run(`state.training.${key}=r.training.${key}`);}
 for(let j=0;j<run('r.sustained.length');j++){run(`var c=r.sustained[${j}];state.sustained[sustainedKey(c)]=c.duracionMs-1`);assert.equal(run('conditionsMet(r)'),false);run('state.sustained[sustainedKey(c)]=c.duracionMs');}
 {
  run('state.relationship.points=minimum-.01');assert.equal(run('evolve(r)'),false);
  run('state.relationship.points=minimum');assert.equal(run('evolve(r)'),true);
  run('state.pokemonId=from;state.relationship.points=0');assert.equal(run('forceEvolution(to)'),true);assert.equal(run('state.relationship.points'),run('Math.min(RELATIONSHIP_CONFIG.max,minimum+RELATIONSHIP_CONFIG.rewards.evolve)'));
  run('state.pokemonId=from;state.relationship.points=90');assert.equal(run('forceEvolution(to)'),true);assert.equal(run('state.relationship.points'),run('Math.min(RELATIONSHIP_CONFIG.max,Math.max(90,minimum)+RELATIONSHIP_CONFIG.rewards.evolve)'));
 }
}
for(const blank of ['null','undefined','""']){
 run(`var absent=canonicalRule({...bondRules[0],MinBond:${blank},MinAgeDays:0});state.relationship.points=0`);assert.equal(run('absent.minBond'),null);assert.equal(run('conditionsMet(absent)'),true);
}
for(const value of ['-1','6','NaN','"2"'])assert.throws(()=>run(`canonicalRule({...bondRules[0],MinBond:${value}})`));
console.log('PASS 17 canonical Bond rules, all playable: 40/60 points, below/exact/above, high Mood insufficient, Oak=engine, all age/training gates, evolution/Force paths; nulls and invalid units.');
})().catch(e=>{console.error(e);process.exitCode=1});
