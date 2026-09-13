const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {setup}=require('./uiHarness.cjs');
const babies={chingling:'0433A0',budew:'0406A0',wynaut:'0360A0',bonsly:'0438A0',mimejr:'0439A0',happiny:'0440A0'};
const routes=['0406A0>0315A0','0315A0>0407A0','0433A0>0358A0','0360A0>0202A0','0438A0>0185A0','0439A0>0122A0','0440A0>0113A0','0113A0>0242A0'];
test('six baby mappings reach the actual hatch pool with canonical evolution rules',async()=>{
 const h=await setup(),json=JSON.parse(fs.readFileSync('master/hatchmonData_v2.json'));
 for(const [id,canonical] of Object.entries(babies)){
  assert.deepEqual(JSON.parse(h.run(`JSON.stringify(PokemonData.get('${id}'))`)),json.pokemon.find(p=>p.PokemonId===canonical));
  assert.equal(h.run(`PokemonData.legacyId('${canonical}')`),id);
  assert.equal(h.run(`PokemonData.canonicalId('${id}')`),canonical);
  assert.equal(h.run(`PokemonData.get('${id}').PreEvolutionId`),null);
  for(const expression of [`PokemonData.roots().includes('${id}')`,`STARTERS.includes('${id}')`,`obtainableRoster.egg.some(p=>p.id==='${id}')`,`!obtainableRoster.excluded.some(p=>p.id==='${id}')`])assert.equal(h.run(expression),true,expression);
  const rng=h.run(`(()=>{const weights=Pokedex.weights(STARTERS,{}),i=STARTERS.indexOf('${id}');return (weights.slice(0,i).reduce((a,b)=>a+b,0)+weights[i]/2)/weights.reduce((a,b)=>a+b,0)})()`);
  assert.equal(h.run(`Pokedex.choose(STARTERS,{},()=>${rng})`),id);
  h.run(`state=freshState();state.incubationRemaining=0;hatch(()=>${rng});finishBirthScene();setNickname('')`);
  assert.equal(h.run('state.pokemonId'),id);assert.equal(h.run('validSave(state)'),true);
 }
 for(const ruleId of routes){
  const rule=json.evolutionRules.find(r=>r.RuleId===ruleId);assert.ok(rule,ruleId);
  assert.deepEqual(JSON.parse(h.run(`JSON.stringify(PokemonData.rules('${rule.FromId}').find(r=>r.RuleId==='${ruleId}'))`)),rule);
  assert.equal(h.run(`evolutionConfig[PokemonData.legacyId('${rule.FromId}')].rules.some(r=>r.canonicalRuleId==='${ruleId}'&&r.enabled&&r.to===PokemonData.legacyId('${rule.ToId}'))`),true);
 }
});
test('every runtime canonical root remains eligible without admitting the entire canonical catalogue',async()=>{
 const h=await setup();
 assert.equal(h.run(`Object.keys(evolutionTable).filter(id=>PokemonData.get(id).PreEvolutionId===null).every(id=>STARTERS.includes(id)&&obtainableRoster.egg.some(p=>p.id===id))`),true);
 assert.equal(h.run('STARTERS.every(id=>Object.hasOwn(evolutionTable,id))'),true);
 const archive=JSON.parse(require('node:fs').readFileSync('master/hatchmonData_v2.json'));
 assert.ok(h.run('STARTERS.length')<archive.pokemon.filter(p=>p.PreEvolutionId===null).length);
 assert.ok(h.run('HATCHMON_DATA.pokemon.length')<archive.pokemon.length,'runtime data must stay pruned');
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Pepo");state.inventory.tea=2;save()');
 const saved=JSON.parse(h.storage.get('hatch.mon.v3')),restored=await setup({initialSave:saved});
 assert.equal(restored.run('validSave(state)'),true);
 for(const key of ['version','pokemonId','care','inventory','social','personality','sleep','training','milestones'])assert.deepEqual(JSON.parse(restored.run('JSON.stringify(state)'))[key],saved[key],key);
});
