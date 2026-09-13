const assert=require('node:assert/strict'),fs=require('node:fs');
const {setup}=require('./uiHarness.cjs');
(async()=>{
 const {run,els,flush,doc}=await setup();
 const born=()=>run('state=freshState();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Test")');
 const ids=run('[...obtainableRoster.egg,...obtainableRoster.evolutionOnly].map(e=>e.id)');
 assert.equal(ids.length,run('Object.keys(evolutionConfig).length'));
 assert.deepEqual(JSON.parse(fs.readFileSync('tests/obtainable-roster.json')),JSON.parse(run('JSON.stringify(obtainableRoster)')));
 born();
 for(const id of ids){
  const hasIdle=!!run(`PMD_ASSETS[PokemonData.canonicalId('${id}')]?.sprites.Idle`);
  run(`state.pokemonId='${id}';render()`);await flush();assert.equal(els.sprite.dataset.visual,hasIdle?'asset':'placeholder',id);
  if(hasIdle)assert.ok(els.sprite.children[0].context.draws.length,id);
 }
 born();run('state.care={hambre:99,felicidad:100,energia:94,higiene:100};state.averages={sum:{hambre:84,felicidad:96,energia:86,higiene:92},count:1};showPanel("oak")');
 const walk=e=>[e,...e.children.flatMap(walk)];
 for(const k of ['hambre','felicidad','energia','higiene']){
  const label=run(`LABELS.${k}`),bar=walk(els['panel-content']).find(e=>e.tagName==='progress'&&e['aria-label']===label);
  assert.ok(bar,label);assert.equal(bar.value,els[k].value);assert.equal(bar.value,run(`state.care.${k}`));
 }
 assert.equal(run('mean("hambre")'),84);
 for(const action of ['alimentar','jugar','limpiar','curar','auxiliar','luz']){
  born();run(`state.pokerus=true;state.phase='${action==='auxiliar'?'critical':'alive'}';state.trainer.energy=0;render()`);
  assert.equal(run(`allowed('${action}')`),action==='luz');
  run('state.trainer.energy=6;render()');const cost=action==='luz'?0:1;
  assert.equal(doc.querySelectorAll('[data-action]').find(b=>b.dataset.action===action).title,run(`t(COST.${action}===1?'ui.actionCost.one':'ui.actionCost.other',{cost:${cost}})`));
  assert.equal(run(`careAction('${action}',()=>1)`),true);assert.equal(run('state.trainer.energy'),6-cost);
 }
 born();run('showPanel("inventory")');assert.ok(walk(els['panel-content']).some(e=>e.textContent===run("t('ui.inventory.itemCost',{care:CARE_CONFIG.itemAP,evolution:CARE_CONFIG.evolutionItemAP})")));
 run('closePanel();showPanel("training")');assert.ok(walk(els['panel-content']).some(e=>e.textContent===run("t('minigame.training.cost',{ap:CARE_CONFIG.training.ap,energy:CARE_CONFIG.training.energy})")));
 for(const item of ['berry','medicine']){born();run(`state.inventory.${item}=1;state.pokerus=true;state.trainer.energy=0`);assert.equal(run(`itemUsable('${item}')`),false);run('state.trainer.energy=1');assert.equal(run(`useItem('${item}')`),true);assert.equal(run('state.trainer.energy'),0);}
 for(const k of ['iq','strength','kindness','style']){
  born();assert.equal(run(`train('${k}',4)`),true);assert.equal(run('state.trainer.energy'),5);assert.equal(run(`state.training.${k}`),4);
  for(const initial of [70,98]){born();run(`state.training.${k}=${initial};state.inventory.berry${k[0].toUpperCase()+k.slice(1)}=1` .replace('berryIq','berryIQ'));const item=k==='iq'?'berryIQ':'berry'+k[0].toUpperCase()+k.slice(1);assert.equal(run(`useItem('${item}')`),true);assert.equal(run(`state.training.${k}`),Math.min(100,initial+5));assert.equal(run('state.trainer.energy'),5);}
 }
 born();run('state.pokemonId="growlithe";forceEvolution("arcanine");state.pokemonId="growlithe";state.inventory.fire=1;state.trainer.energy=0');
 assert.equal(run('itemAPCost("fire")'),0);assert.equal(run('itemUsable("fire")'),true);assert.equal(run('useItem("fire")'),true);assert.equal(run('state.trainer.energy'),0);
 born();run('state.inventory.berry=2;state.care.hambre=72;state.training.iq=37;state.consumed=[{item:"alola",age:0}];die("natural")');
 const legacy=JSON.parse(run('JSON.stringify(state)'));Object.assign(legacy.inventory,{alola:2,galar:3,dawn:1,oval:1});legacy.foundItem='alola';
 for(const cloud of [false,true]){const loaded=await setup({initialSave:legacy,cloud});assert.equal(loaded.run('validSave(state)'),true);assert.equal(loaded.run('state.care.hambre'),72);assert.equal(loaded.run('state.training.iq'),37);assert.equal(loaded.run('state.inventory.berry'),2);assert.equal(loaded.run('state.social.memorials.length'),1);assert.equal(loaded.run('state.foundItem'),null);assert.equal(loaded.run('JSON.stringify(migrateSave(migrateSave(state)))'),loaded.run('JSON.stringify(state)'));}
 for(const id of ['alola','galar','dawn','oval'])assert.equal(run(`Object.hasOwn(itemCatalog,'${id}')`),false);
 console.log('PASS mini adjustments: runtime PMD forms render, current Oak stats, AP, berries caps, retired items and local/cloud legacy memories.');
})().catch(e=>{console.error(e);process.exitCode=1});
