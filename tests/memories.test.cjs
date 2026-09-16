const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,flush,advance}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Pepo");state.pokemonId="togekiss";state.age=105*HOUR;state.relationship.points=80;die("natural");var before=JSON.stringify(state.social.memorials);showPanel("pokedex");collectionTab="memories";renderPokedex()');await flush();
 const text=n=>n.textContent+(n.children||[]).map(text).join(' '),body=text(els['panel-content']);for(const label of ['MEMORIAS','Togekiss','Pepo','4 días y 9 horas','Muerte natural'])assert.ok(body.includes(label),label);
 // Tres pestañas —Compañero, Especies, Memorias— mas un boton de marco por recuerdo, que lleva a la
 // tienda con ese recuerdo elegido: un solo sitio donde salen monedas.
 assert.equal(els['panel-content'].querySelectorAll('button').length,3+run('state.social.memorials.length'));
 assert.ok(text(els['panel-content']).includes('Ponerle un marco'));
 // El marco es cosmetico pero entra al save, asi que se valida: uno inventado invalida la partida.
 run('state.social.memorials[0].frame="classic"');assert.equal(run('validSave(state)'),true);
 run('state.social.memorials[0].frame="no-existe"');assert.equal(run('validSave(state)'),false);
 run('delete state.social.memorials[0].frame');assert.equal(run('validSave(state)'),true);
 // Comprar cobra una vez y deja el marco puesto; sin monedas no se compra.
 run('state.coins=MemorialFrames.price');
 assert.equal(run('buyFrame(state.social.memorials[0].id,"leaf")'),true);
 assert.equal(run('state.coins'),0);assert.equal(run('state.social.memorials[0].frame'),'leaf');
 assert.equal(run('buyFrame(state.social.memorials[0].id,"star")'),false,'sin monedas no hay marco');
 assert.equal(run('buyFrame("no-existe","leaf")'),false);
 assert.equal(run('validSave(state)'),true);
 // Cada marco produce un border-image servible, y solo los del catalogo.
 assert.equal(run('MemorialFrames.list().every(id=>MemorialFrames.image(id).startsWith("url(\\"data:image/svg+xml,"))'),true);
 assert.equal(run('MemorialFrames.image("no-existe")'),'none');
 // Se deja el recuerdo como estaba: la comprobacion de mas abajo exige que no cambie con el tiempo,
 // y un marco puesto aqui la rompe por un motivo que no tiene que ver con lo que mide.
 run('delete state.social.memorials[0].frame;state.coins=0');
 run('showPanel("pokedex");collectionTab="memories";renderPokedex()');assert.equal(run('memorialRenderers.length'),1);advance(2000);assert.equal(run('JSON.stringify(state.social.memorials)===before'),true);run('closePanel()');assert.equal(run('memorialRenderers.length'),0);
 assert.equal(run('Object.entries(PMD_STATE_FALLBACKS).some(([state,names])=>state!=="train"&&names.includes("Hop"))'),false);
 run('startNewBeginning();showPanel("pokedex");collectionTab="memories";renderPokedex()');await flush();assert.ok(text(els['panel-content']).includes('Pepo'));assert.equal(run('state.phase'),'egg');assert.equal(run('validSave(state)'),true);
 console.log('PASS memories: historical card, identity/age/cause/hearts, persistence after new beginning, no activation, sprite cleanup and Hop reserved for training.');
})().catch(e=>{console.error(e);process.exitCode=1});
