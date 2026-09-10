const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{
 const {run,els}=await setup();
 const roots=['bulbasaur','charmander','squirtle','dratini','abra','growlithe'];
 for(const id of roots)assert.ok(run(`STARTERS.includes('${id}')`),id);
 const routes=[['bulbasaur','ivysaur'],['ivysaur','venusaur'],['charmander','charmeleon'],['charmeleon','charizard'],['squirtle','wartortle'],['wartortle','blastoise'],['dratini','dragonair'],['dragonair','dragonite'],['abra','kadabra'],['kadabra','alakazam'],['growlithe','arcanine']];
 for(const [from,to] of routes)assert.equal(run(`evolutionConfig['${from}'].rules[0].to`),to,`${from}>${to}`);
 const legacy=JSON.parse(run('JSON.stringify(state)'));delete legacy.coins;const restored=await setup({initialSave:legacy});assert.equal(restored.run('state.coins'),0);assert.equal(restored.run('state.phase'),'egg');assert.equal(restored.run('state.social.active.id'),legacy.social.active.id);
 const cloudLegacy=await setup({initialSave:legacy,cloud:true});assert.equal(cloudLegacy.run('state.coins'),0);assert.equal(cloudLegacy.run('state.phase'),'egg');assert.equal(cloudLegacy.run('validSave(state)'),true);
 run('state=freshState();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Brasa");state.inventory.berryStrength=2;state.training.strength=37;state.care.hambre=72;state.pokedex[PokemonData.canonicalId(state.pokemonId)].evolved=true;forceEvolution("pikachu");save()');
 const legacyCompanion=JSON.parse(run('JSON.stringify(state)'));delete legacyCompanion.coins;
 for(const cloud of [false,true]){const loaded=await setup({initialSave:legacyCompanion,initialDisplayMode:'lcd',initialShells:{unlocked:['pichu'],selected:'pichu'},cloud});assert.equal(loaded.run('state.coins'),0);assert.equal(loaded.run('state.pokemonId'),'pikachu');assert.equal(loaded.run('state.nickname'),'Brasa');assert.equal(loaded.run('state.training.strength'),37);assert.equal(loaded.run('state.care.hambre'),72);assert.equal(loaded.run('state.inventory.berryStrength'),2);assert.equal(loaded.run('state.pokedex[PokemonData.canonicalId("pichu")].evolved'),true);assert.equal(loaded.run('displayMode'),'lcd');assert.equal(loaded.run('validSave(state)'),true);}
 const today=run('JSON.stringify(dailyShop({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10}))'),tomorrow=run('JSON.stringify(dailyShop({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>11}))');assert.equal(new Set(JSON.parse(today)).size,3);assert.equal(today,run('JSON.stringify(dailyShop({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10}))'));assert.notEqual(today,tomorrow);
 const id=run('dailyShop()[0]'),price=run(`itemCatalog['${id}'].price`);run(`state.coins=${price};const before=state.inventory['${id}']||0;buyShopItem('${id}')`);assert.equal(run('state.coins'),0);assert.equal(run(`state.inventory['${id}']`),1);assert.equal(run(`buyShopItem('${id}')`),false);
 run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.trainer.energy=6;const beforeCoins=state.coins;train("iq",5)');assert.equal(run('state.coins-beforeCoins'),16);
 const before=run('state.incubationRemaining');run('state=freshState();const eggBefore=state.incubationRemaining;heat()');assert.equal(run('eggBefore-state.incubationRemaining'),run('HEAT_REDUCTION_MS'));
 run('state=freshState();showPanel("oak")');assert.match(els['panel-content'].children.at(-1).textContent,/tocar el huevo|calor/i);assert.ok(before>=0);
 const html=require('node:fs').readFileSync('index.html','utf8');assert.match(html,/data-panel="shop"[^>]*><span class="pixel-icon" data-icon="shop"/);assert.ok(html.includes('.pixel-icon[data-icon="shop"]{--pixels:'));assert.ok(!html.includes('title="Tienda">SHOP</button>'));
 console.log('PASS content update: canonical roots/rules, legacy coins migration, daily shop, purchase, minigame coins and egg tutorial.');
})().catch(error=>{console.error(error);process.exitCode=1});
