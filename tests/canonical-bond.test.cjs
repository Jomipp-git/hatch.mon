const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run}=await setup();
run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.pokemonId="pichu";var source=PokemonData.rules("pichu")[0];var minimum=source.MinBond');
assert.ok(run('minimum>0'));assert.equal(run('source===HATCHMON_DATA.evolutionRules.find(r=>r.RuleId===source.RuleId)'),true);
run('var bondOnly={...source,MinAgeDays:0,MinIQ:null,MinStyle:null,MinStrength:null,MinKindness:null,RequiredItem:null,RequiredAction:null,SustainedStat:null}');
for(const blank of ['null','""']){run(`state.relationship.points=0;var r=canonicalRule({...bondOnly,MinBond:${blank}})`);assert.equal(run('conditionsMet(r)'),true);}
run('var r=canonicalRule(bondOnly);state.relationship.points=minimum-1');assert.equal(run('conditionsMet(r)'),false);
run('state.relationship.points=minimum');assert.equal(run('conditionsMet(r)'),true);
run('state.relationship.points=0;forceEvolution("pikachu")');assert.equal(run('state.relationship.points'),run('minimum+RELATIONSHIP_CONFIG.rewards.evolve'));
run('state.pokemonId="pichu";state.relationship.points=50;forceEvolution("pikachu")');assert.ok(run('state.relationship.points')>=50);
console.log('PASS canonical MinBond: direct adapter exposure, blank/null, insufficient/sufficient, Force minimum plus existing evolution reward and preservation.');
})().catch(e=>{console.error(e);process.exitCode=1});
