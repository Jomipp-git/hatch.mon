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
 for(const cloud of [false,true]){const loaded=await setup({initialSave:legacyCompanion,initialDisplayMode:'lcd',initialShells:{unlocked:['pichu'],selected:'pichu'},cloud});assert.equal(loaded.run('state.pokemonId'),'pikachu');assert.equal(loaded.run('state.nickname'),'Brasa');assert.equal(loaded.run('state.training.strength'),37);assert.equal(loaded.run('state.care.hambre'),72);// La baya de atributo se retiro y la migracion la devuelve en monedas: 2 x 75.
assert.equal(loaded.run('state.inventory.berryStrength'),undefined);assert.equal(loaded.run('state.coins'),150);assert.equal(loaded.run('state.pokedex[PokemonData.canonicalId("pichu")].evolved'),true);assert.equal(loaded.run('displayMode'),'lcd');assert.equal(loaded.run('validSave(state)'),true);}
 // La tienda pasa de bolsa comun a huecos por categoria: estanteria fija + el hueco de Evolucion,
 // que ofrece lo que la linea del compañero necesita en vez de sortearlo.
 const STAPLES=JSON.parse(run('JSON.stringify(SHOP_STAPLES)'));
 const SHOP_SLOTS=STAPLES.length+1;
 const today=run('JSON.stringify(dailyShop({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10}))'),tomorrow=run('JSON.stringify(dailyShop({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>11}))');assert.equal(new Set(JSON.parse(today)).size,SHOP_SLOTS);assert.equal(today,run('JSON.stringify(dailyShop({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10}))'));
 // Ya no se exige que la lista cambie a diario: el hueco de Evolucion existe para ser estable y
 // pertinente, no para rotar. La variedad del dia la aporta la especie del huevo de la vitrina.
 void tomorrow;
 const speciesByDay=new Set([...Array(12)].map((_,i)=>run(`namedEggSpecies({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>${10+i}})`)));
 assert.ok(speciesByDay.size>=6,`la especie del huevo del dia varia (vistas ${speciesByDay.size} en 12 dias)`);
 assert.equal(run('namedEggSpecies({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10})'),run('namedEggSpecies({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10})'));
 assert.deepEqual(JSON.parse(today).slice(0,STAPLES.length),STAPLES,'la estanteria va siempre delante');
 // El sorteo diario mezcla la identidad del entrenador: dos jugadores no ven lo mismo el mismo dia.
 run('var DIA={getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10}');
 const oferta=id=>{run(id===null?'globalThis.HatchTrainer=undefined':`globalThis.HatchTrainer={id:${JSON.stringify(id)}}`);
  return run('JSON.stringify([namedEggSpecies(DIA),boutiqueSlot(DIA)[0],evolutionSlot(DIA)])');};
 const ana=oferta('11111111-2222-3333-4444-555555555555');
 const beto=oferta('99999999-8888-7777-6666-555555555555');
 assert.notEqual(ana,beto,'dos entrenadores, dos ofertas el mismo dia');
 assert.equal(ana,oferta('11111111-2222-3333-4444-555555555555'),'y para el mismo, estable');
 // Sin identidad —pruebas y herramientas— el sorteo sigue siendo determinista.
 const sinId=oferta(null);assert.equal(sinId,oferta(null));
 // Modo vender: mitad del precio de tienda, ticket antes de confirmar y nada a medias.
 run("state.inventory={berry:3,thunder:1};state.coins=0;shopMode='sell';sellDraft={}");
 assert.equal(run("sellPrice('berry')"),Math.floor(run("itemCatalog.berry.price")/2));
 assert.equal(run('sellTotal()'),0,'sin seleccion no hay ticket');
 assert.equal(run('sellDrafted()'),false,'y no se puede confirmar');
 run("sellDraft={berry:2,thunder:1}");
 assert.equal(run('sellTotal()'),run("sellPrice('berry')*2+sellPrice('thunder')"));
 assert.equal(run('sellDrafted()'),true);
 assert.equal(run('state.inventory.berry'),1,'solo se van las seleccionadas');
 assert.equal(run('state.inventory.thunder'),undefined,'y el objeto agotado sale del inventario');
 assert.equal(run('state.coins'),run("sellPrice('berry')*2+sellPrice('thunder')"));
 assert.equal(run('JSON.stringify(sellDraft)'),'{}','el ticket se vacia al cobrarlo');
 // Pedir mas de lo que hay no cobra nada ni toca la Mochila.
 run("state.inventory={berry:1};state.coins=0;sellDraft={berry:5}");
 assert.equal(run('sellDrafted()'),false);
 assert.equal(run('state.inventory.berry'),1);assert.equal(run('state.coins'),0);
 run("shopMode='buy';sellDraft={}");
 assert.equal(run('validSave(state)'),true);
 // El hueco de Evolucion deja de ser loteria: Growlithe pide Piedra Fuego y es lo que se ofrece,
 // y Eevee pide cinco, que son justo su decision.
 // Llega aqui con berryStrength en la Mochila, que se retiro del catalogo: se limpia para que las
 // comprobaciones de validSave de este bloque digan algo.
 run('state.inventory={}');
 // La especie se toca solo para mirar el hueco: el genero va con ella y validSave lo comprueba.
 run('const speciesBefore=state.pokemonId,genderBefore=state.gender');
 run("state.pokemonId='growlithe'");assert.deepEqual(run('JSON.stringify(evolutionSlot())'),'["fire"]');
 run("state.pokemonId='eevee'");assert.equal(JSON.parse(run('JSON.stringify(evolutionSlot())')).length,5);
 run('state.pokemonId=speciesBefore;state.gender=genderBefore');assert.equal(run('validSave(state)'),true);
 // Vitrina: el huevo nombrado va a la reserva con su especie; el shiny, sin especie y con la tirada
 // ya ganada. Y el descuento con fecha caduca solo.
 assert.equal(run('shopPrice("eggShiny",new Date(2026,8,20).getTime())'),1250);
 assert.equal(run('shopPrice("eggShiny",new Date(2026,9,1).getTime())'),2500);
 assert.equal(run('shopPrice("eggNamed",new Date(2026,8,20).getTime())'),600);
 run('state.social.eggs=[];state.coins=600');
 assert.equal(run('buyEgg("eggNamed",{getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10})'),true);
 assert.equal(run('state.coins'),0);assert.equal(run('state.social.eggs.length'),1);
 assert.equal(run('state.social.eggs[0].offspring'),run('namedEggSpecies({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10})'));
 assert.equal(run('state.social.eggs[0].guaranteedShiny'),undefined);
 run('state.social.eggs=[];state.coins=1250');
 assert.equal(run('buyEgg("eggShiny",{getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10})'),true);
 assert.equal(run('state.social.eggs[0].offspring'),null);
 assert.equal(run('state.social.eggs[0].guaranteedShiny'),true);
 assert.equal(run('validSave(state)'),true);
 assert.equal(run('buyEgg("eggShiny",{getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10})'),false,'sin monedas no se compra');
 // Boutique: 21 carcasas de pago, un estilo al dia con sus tres variantes. Las de logro se siguen
 // ganando, asi que buyShell tiene que rechazarlas.
 assert.equal(run('boutiqueShells().length'),21);
 assert.equal(run('[...new Set(boutiqueShells().map(shellStyle))].length'),7);
 const slot=JSON.parse(run('JSON.stringify(boutiqueSlot({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10}))'));
 assert.equal(slot.length,3,'tres variantes del estilo del dia');
 assert.equal(new Set(slot.map(id=>id.split('-')[0])).size,1,'todas del mismo estilo');
 assert.ok(JSON.parse(run('JSON.stringify([...Array(9)].map((_,i)=>boutiqueSlot({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>10+i})[0].split("-")[0]))')).filter((v,i,a)=>a.indexOf(v)===i).length>=4,'el estilo rota');
 run('state.coins=450');
 assert.equal(run(`buyShell('${slot[0]}')`),true);
 assert.equal(run('state.coins'),0);
 assert.ok(run(`ShellSkins.list().includes('${slot[0]}')`));
 assert.equal(run(`buyShell('${slot[0]}')`),false,'no se compra dos veces');
 assert.equal(run("buyShell('pichu')"),false,'las de logro no se compran');
 assert.equal(run('validSave(state)'),true);
 run('state.social.eggs=[]');const id=run('dailyShop()[0]'),price=run(`shopPrice('${id}')`);run(`state.coins=${price};const before=state.inventory['${id}']||0;buyShopItem('${id}')`);assert.equal(run('state.coins'),0);assert.equal(run(`state.inventory['${id}']`),1);assert.equal(run(`buyShopItem('${id}')`),false);
 run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.trainer.energy=6;const beforeCoins=state.coins;train("iq",5)');assert.equal(run('state.coins-beforeCoins'),16);
 const before=run('state.incubationRemaining');run('state=freshState();const eggBefore=state.incubationRemaining;heat()');assert.equal(run('eggBefore-state.incubationRemaining'),run('HEAT_REDUCTION_MS'));
 run('state=freshState();collectionTab="companion";showPanel("pokedex")');assert.match(els['panel-content'].children.at(-1).textContent,/tocar el huevo|calor/i);assert.ok(before>=0);
 const html=require('node:fs').readFileSync('index.html','utf8');assert.match(html,/data-panel="shop"[^>]*><span class="pixel-icon" data-icon="shop"/);assert.ok(html.includes('.pixel-icon[data-icon="shop"]{--pixels:'));assert.ok(!html.includes('title="Tienda">SHOP</button>'));
 console.log('PASS content update: canonical roots/rules, legacy coins migration, daily shop, purchase, minigame coins and egg tutorial.');
})().catch(error=>{console.error(error);process.exitCode=1});
