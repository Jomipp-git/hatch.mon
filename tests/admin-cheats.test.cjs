const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./uiHarness.cjs');
const ADMIN_UID='a81c13f7-a9d6-46d5-aa5c-66512b25ed68';

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
