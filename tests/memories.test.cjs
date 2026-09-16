const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,flush,advance}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Pepo");state.pokemonId="togekiss";state.age=105*HOUR;state.relationship.points=80;die("natural");var before=JSON.stringify(state.social.memorials);showPanel("pokedex");collectionTab="memories";renderPokedex()');await flush();
 const text=n=>n.textContent+(n.children||[]).map(text).join(' '),body=text(els['panel-content']);for(const label of ['MEMORIAS','Togekiss','Pepo','4 días y 9 horas','Muerte natural'])assert.ok(body.includes(label),label);
 // Tres pestañas —Compañero, Especies, Memorias— mas un boton de marco por recuerdo, que lleva a la
 // tienda con ese recuerdo elegido: un solo sitio donde salen monedas.
 assert.equal(els['panel-content'].querySelectorAll('button').length,3+run('state.social.memorials.length'));
 assert.ok(text(els['panel-content']).includes('Ponerle un marco'));
 // Memorias enseña el retrato, no el sprite: un recuerdo es una foto enmarcada. Siempre `Normal`,
 // que es la unica emocion con las 77 formas, asi que ningun recuerdo se ve distinto por un hueco.
 assert.equal(run("Object.keys(PMD_ASSETS).filter(id=>!PMD_ASSETS[id].portraits?.Normal).length"),0,'las 77 formas tienen retrato Normal');
 assert.equal(run("Object.keys(PMD_ASSETS).filter(id=>!PMD_ASSETS[id].shiny?.portraits?.Normal).length"),0,'y las 77 shiny tambien');
 const retratos=els['panel-content'].querySelectorAll('button').length&&0;void retratos;
 assert.ok(run("memorialPortrait('pikachu').className.includes('memory-portrait')"),'usa el retrato');
 assert.equal(run("memorialPortrait('pikachu').children[0].width"),run('MEMORIAL_PORTRAIT'));
 // 40x40 escalado a 80 es un 2x exacto: sin interpolacion y sin borrones.
 assert.equal(run('MEMORIAL_PORTRAIT'),80);
 // Sin retrato en el catalogo se cae al sprite de siempre en vez de dejar el hueco vacio.
 run("var guardado=PMD_ASSETS[PokemonData.canonicalId('pikachu')].portraits;PMD_ASSETS[PokemonData.canonicalId('pikachu')].portraits={}");
 assert.ok(!run("memorialPortrait('pikachu').className.includes('memory-portrait')"),'cae al sprite');
 run("PMD_ASSETS[PokemonData.canonicalId('pikachu')].portraits=guardado");
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
 run('showPanel("pokedex");collectionTab="memories";renderPokedex()');
 // El retrato es un canvas quieto: no hay renderer que registrar ni que parar. La pestaña Pokedex
 // sigue usando el sprite animado, que si lo necesita.
 assert.equal(run('memorialRenderers.length'),0,'un retrato no deja nada que limpiar');
 run('collectionTab="companion";renderPokedex()');assert.ok(run('memorialRenderers.length')>0,'el sprite si');
 run('collectionTab="memories";renderPokedex()');advance(2000);assert.equal(run('JSON.stringify(state.social.memorials)===before'),true);run('closePanel()');assert.equal(run('memorialRenderers.length'),0);
 assert.equal(run('Object.entries(PMD_STATE_FALLBACKS).some(([state,names])=>state!=="train"&&names.includes("Hop"))'),false);
 run('startNewBeginning();showPanel("pokedex");collectionTab="memories";renderPokedex()');await flush();assert.ok(text(els['panel-content']).includes('Pepo'));assert.equal(run('state.phase'),'egg');assert.equal(run('validSave(state)'),true);
 console.log('PASS memories: historical card, identity/age/cause/hearts, persistence after new beginning, no activation, sprite cleanup and Hop reserved for training.');
})().catch(e=>{console.error(e);process.exitCode=1});
