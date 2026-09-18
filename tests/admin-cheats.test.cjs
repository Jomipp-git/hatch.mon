const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./uiHarness.cjs');
const ADMIN_UID='49729aeb-0075-47d3-8a91-86312e1acfe4';

function authenticated(h,uid){h.win.HatchAdmin=Object.freeze({isAdmin:()=>uid===ADMIN_UID});}
function clickOak(h,count){for(let index=0;index<count;index++)h.els['oak-portrait'].fire('click');}
function panelKeys(node){return node.children.flatMap(child=>[child.dataset?.key,...panelKeys(child)].filter(Boolean));}

test('development keeps testing available without the secret unlock',async()=>{
 const h=await setup({development:true});
 assert.equal(h.run('canUseTesting()'),true);assert.ok(h.win.HatchMon);
});

test('production admin unlock requires exactly ten Oak portrait clicks',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 h.run('showPanel("settings")');assert.ok(!panelKeys(h.els['panel-content']).includes('testing-reset'));
 clickOak(h,9);assert.equal(h.run('adminCheatsUnlocked'),false);assert.equal(h.run('canUseTesting()'),false);
 h.els['oak-portrait'].fire('click');assert.equal(h.run('adminCheatsUnlocked'),true);assert.equal(h.run('canUseTesting()'),true);
 assert.ok(panelKeys(h.els['panel-content']).includes('testing-reset'));
});

test('Oak click sequence expires after five seconds',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 clickOak(h,9);h.advance(5001);h.els['oak-portrait'].fire('click');
 assert.equal(h.run('adminCheatsUnlocked'),false);assert.equal(h.run('adminOakClicks'),1);
});

test('non-admins cannot unlock or call cheats in production',async()=>{
 const h=await setup({development:false});authenticated(h,'different-user');
 clickOak(h,10);
 assert.equal(h.run('adminCheatsUnlocked'),false);assert.equal(h.run('canUseTesting()'),false);
 assert.equal(h.run('skipTime(1)'),false);
 assert.equal(h.run('forceEvolution("pikachu")'),false);
 assert.equal(h.run('resetGame()'),false);
});

test('unlock is memory-only and locks on runtime stop or reload',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);clickOak(h,10);
 assert.equal(h.run('adminCheatsUnlocked'),true);h.run('window.HatchRuntime.stop()');
 assert.equal(h.run('adminCheatsUnlocked'),false);
 const reloaded=await setup({development:false});authenticated(reloaded,ADMIN_UID);
 assert.equal(reloaded.run('adminCheatsUnlocked'),false);assert.equal(reloaded.run('canUseTesting()'),false);
});

// Con los trucos abiertos el juego entra en arenero: nada de lo que se toca llega al disco ni a la
// nube, y al cerrarlos el estado vuelve a como estaba. Sin esto, probar una evolucion forzada o
// regalarse monedas ensuciaba la partida de verdad y no habia forma de deshacerlo.
test('cheats run in a sandbox: nothing persists and locking restores the save',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Chispa");state.pokemonId="elekid";state.coins=200;save({immediate:true})');
 const onDisk=()=>JSON.parse(h.storage.get('hatch.mon.v3'));
 assert.equal(onDisk().coins,200);
 clickOak(h,10);assert.equal(h.run('canUseTesting()'),true);
 h.run('adjustCoins(500)');
 assert.equal(h.run('state.coins'),700,'en memoria si suben');
 assert.equal(onDisk().coins,200,'pero el disco no se entera');
 h.run('skipTime(3)');
 assert.equal(onDisk().age,0,'ni el tiempo saltado');
 h.run('lockAdminCheats()');
 assert.equal(h.run('state.coins'),200,'cerrar los trucos devuelve el estado anterior');
 assert.equal(h.run('state.age'),0);
 assert.equal(onDisk().coins,200);
 // Restar tampoco deja el saldo en negativo.
 clickOak(h,10);h.run('adjustCoins(-9999)');
 assert.equal(h.run('state.coins'),0,'las monedas no bajan de cero');
 h.run('lockAdminCheats()');
});

// Rebobinar SI se guarda: es una decision, no un ensayo. Vuelve a la forma anterior con la edad y el
// entrenamiento que dejo anotados el hito de esa evolucion, y no toca nada del entrenador.
test('rewinding the companion is committed and keeps trainer state',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Chispa");state.pokemonId="elekid";state.coins=200;save({immediate:true})');
 // La evolucion es parte de la partida real: ocurre ANTES de abrir los trucos, que es el caso de
 // verdad —ya tienes la forma evolucionada y quieres volver atras.
 h.run('window.HatchEnvironmentOverride=null');
 clickOak(h,10);
 h.run('state.age=3*24*3600000;state.stageAge=state.age;state.training={iq:40,strength:40,kindness:40,style:40};forceEvolution("electabuzz")');
 h.run('cheatSandbox=null;save({immediate:true,commit:true})');
 assert.equal(h.run('state.pokemonId'),'electabuzz');
 clickOak(h,10);
 assert.equal(h.run("rewindPoints().map(p=>p.from).join()"),'elekid','el hito ofrece la forma anterior');
 h.run('adjustCoins(500)');
 h.run('rewindTo(rewindPoints()[0].index)');
 assert.equal(h.run('state.pokemonId'),'elekid');
 assert.equal(h.run('state.milestones.length'),0,'y el hito deshecho desaparece');
 assert.equal(JSON.parse(h.storage.get('hatch.mon.v3')).pokemonId,'elekid','rebobinar si llega al disco');
 h.run('lockAdminCheats()');
 assert.equal(h.run('state.pokemonId'),'elekid','y sobrevive a cerrar los trucos');
 assert.equal(h.run('state.coins'),200,'pero las monedas regaladas no');
});

// La seccion de rebobinar no puede desaparecer sin mas cuando no hay nada a lo que volver: sin
// texto, el administrador no sabe si le falta el dato o si la herramienta esta rota.
test('the rewind section explains itself when there is nothing to go back to',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Chispa")');
 clickOak(h,10);h.run('showPanel("settings")');
 const shown=()=>{const read=n=>(n.textContent||'')+(n.children||[]).map(read).join(' ');return read(h.els['panel-content']);};
 assert.equal(h.run('rewindPoints().length'),0,'un companero sin evoluciones no ofrece puntos');
 assert.ok(shown().includes(h.run("t('testing.rewind')")),'pero la seccion sigue ahi');
 assert.ok(shown().includes(h.run("t('testing.rewindNoneYet')")),'y dice por que esta vacia');
 // Y con una evolucion en la partida real vuelve a ofrecer el salto. Se toma la ruta que el propio
 // companero tenga, en vez de escribir una especie a mano que quiza no sea la suya.
 h.run('state.age=3*24*3600000;state.stageAge=state.age;state.training={iq:40,strength:40,kindness:40,style:40}');
 const route=h.run('PokemonData.rules(state.pokemonId).map(r=>PokemonData.legacyId(r.ToId)).find(id=>evolutionConfig[id])');
 assert.ok(route,'el companero tiene alguna evolucion');
 assert.equal(h.run(`forceEvolution(${JSON.stringify(route)})`),true);
 h.run('cheatSandbox=null;save({immediate:true,commit:true})');
 clickOak(h,10);h.run('renderPanel()');
 assert.equal(h.run('rewindPoints().length'),1);
 assert.ok(shown().includes(h.run("t('testing.rewindGo')")),'con su boton');
});

// Borrar una especie toca tres sitios distintos: la ficha vive en la partida, las carcasas en
// `hatch.mon.shells` (fuera de ella) y las Memorias en `social.memorials`.
test('erasing a species clears dex, shells and memories, and commits without cheat noise',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Rulo");state.coins=300');
 const species=h.run('PokemonData.canonicalId(state.pokemonId)');
 // Una Memoria de verdad: muerte natural y comienzo nuevo con la misma especie.
 h.run('state.age=30*24*3600000;die("natural");rememberDeath();startNewBeginning(null,state.pokemonId)');
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Rulo2")');
 h.run(`Pokedex.record(state.pokedex,'${species}','owned','uno');ShellSkins.unlock('${species}');save({immediate:true,commit:true})`);
 assert.equal(h.run('state.social.memorials.length'),1);
 const onDisk=()=>JSON.parse(h.storage.get('hatch.mon.v3'));
 clickOak(h,10);
 h.run('adjustCoins(500)');
 assert.equal(h.run(`forgetSpecies('${species}')`),true);
 assert.equal(h.run(`!!state.pokedex['${species}']`),false,'la ficha se va');
 assert.equal(h.run(`ShellSkins.list().includes('${species}')`),false,'y su carcasa');
 assert.equal(h.run('state.social.memorials.length'),0,'y su Memoria');
 assert.equal(onDisk().social.memorials.length,0,'y queda guardado');
 assert.equal(h.run('state.coins'),300,'pero las monedas del arenero no se cuelan');
 assert.equal(onDisk().coins,300);
});

// El huevo de regalo es la vuelta atras de un huevo gastado, asi que tiene que quedarse.
test('a granted egg is saved and survives locking the cheats',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Rulo");state.coins=300;save({immediate:true,commit:true})');
 clickOak(h,10);
 h.run('adjustCoins(500)');
 assert.equal(h.run('grantEgg(true)'),true);
 assert.equal(h.run('state.social.eggs.length'),1);
 assert.equal(h.run('state.social.eggs[0].guaranteedShiny'),true,'sale shiny garantizado');
 assert.equal(h.run('state.social.eggs[0].offspring'),null,'y sin especie, como el de la tienda');
 assert.equal(JSON.parse(h.storage.get('hatch.mon.v3')).social.eggs.length,1,'guardado');
 h.run('lockAdminCheats()');
 assert.equal(h.run('state.social.eggs.length'),1,'y sobrevive a cerrar los trucos');
 assert.equal(h.run('state.coins'),300,'sin arrastrar las monedas regaladas');
});

// Si la foto de la partida no se puede devolver, lo seguro es no escribir nada: el disco todavia
// tiene la partida buena, porque el arenero no ha guardado.
test('an unreadable sandbox snapshot never overwrites the good save',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Rulo");state.coins=300;save({immediate:true,commit:true})');
 clickOak(h,10);
 h.run('adjustCoins(500);cheatSandbox={snapshot:"{ esto no es JSON"}');
 h.run('lockAdminCheats()');
 assert.equal(JSON.parse(h.storage.get('hatch.mon.v3')).coins,300,'el disco conserva la partida buena');
 assert.ok(h.run('storageWarning'),'y avisa de que no ha podido devolverla');
});

// El arenero tiene que VERSE. Sin marca se abre, se sigue jugando normal creyendo que cuenta, y al
// cerrar la pestaña se tira todo lo hecho desde entonces: eso llego a pasar en una partida real.
test('the sandbox is visible while it is open and says so when it closes',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Rulo");save({immediate:true,commit:true})');
 const badge=()=>h.els['game-root'].children.find(n=>n.id==='sandbox-badge')||null;
 assert.equal(badge(),null,'sin trucos no hay marca');
 clickOak(h,10);
 assert.ok(badge(),'con los trucos abiertos si');
 assert.equal(badge().textContent,h.run("t('testing.sandboxBadge')"));
 h.run('lockAdminCheats()');
 assert.equal(badge(),null,'y se va al cerrarlos');
 assert.equal(h.els.toast.textContent,h.run("t('testing.sandboxDropped')"),'diciendo que se ha descartado');
});
