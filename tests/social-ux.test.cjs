const assert=require('node:assert/strict'),fs=require('fs');const {setup}=require('./uiHarness.cjs');
(async()=>{
 const t=await setup(),{run,els,doc}=t;
 const text=n=>n.textContent+n.children.map(text).join(' ');
 function born(gender){run(`state=freshState();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname('Local');state.pokemonId='pikachu';state.gender='${gender}';state.age=state.vital.lifespan*.65;render()`)}
 born('male');run('var maleCode=exportEntity()');born('female');run('var femaleCode=exportEntity()');
 run('showPanel("social");selectSocialFlow("breed")');doc.getElementById('social-input').value=run('maleCode');run('showBreedingResult()');
 let card=doc.getElementById('breeding-result');assert.equal(card.hidden,false);assert.ok(text(card).includes('Son compatibles'));assert.ok(text(card).includes('Macho'));assert.ok(text(card).includes('Hembra'));const before=text(card);run('advanceGameTime(MINUTE);render();renderPanel()');assert.equal(text(card),before);
 card.querySelectorAll('button')[0].fire('click');assert.equal(run('state.social.eggs.length'),1,text(card));assert.ok(text(card).includes('ha puesto un huevo'));run('var eggId=state.social.eggs[0].id;var eggCode=exportEntity(eggId)');
 run('selectSocialFlow("egg");generateSocialExport()');assert.ok(doc.getElementById('social-export-code').value.startsWith('HM1.'));assert.equal(doc.getElementById('social-manual').open,false);assert.ok(doc.getElementById('social-qr').children.length>0);
 // Clipboard fallback expands only the alternate code, making manual copying possible.
 await run('copySocialCode()');assert.equal(doc.getElementById('social-manual').open,true);
 run('globalThis.navigator={clipboard:{writeText:async value=>{globalThis.copiedCode=value}}}');await run('copySocialCode()');assert.equal(run('copiedCode'),doc.getElementById('social-export-code').value);
 run('die("natural");render()');els.restart.fire('click');assert.equal(run('state.phase'),'dead');assert.equal(els['panel-title'].textContent,'Elige tu próximo comienzo');assert.ok(text(els['panel-content']).includes('Pichu'));assert.ok(text(els['panel-content']).includes('Progenitores'));
 const choice=els['panel-content'].querySelectorAll('button').find(b=>b.textContent==='Incubar');choice.fire('click');assert.equal(run('state.phase'),'egg');assert.equal(run('state.social.active.id===eggId'),true);assert.equal(run('state.social.eggs.length'),0);assert.equal(run('state.social.memorials.length'),1);
 born('male');run('showPanel("social");selectSocialFlow("breed")');doc.getElementById('social-input').value=run('femaleCode');run('showBreedingResult()');card=doc.getElementById('breeding-result');assert.ok(text(card).includes('La hembra debe generar'));assert.equal(card.querySelectorAll('button').length,0);assert.throws(()=>run('breedFromCode(femaleCode)'),/La hembra debe generar/);assert.equal(run('state.social.eggs.length'),0);
 run('selectSocialFlow("companion");generateSocialExport()');assert.ok(doc.getElementById('social-export-code').value.startsWith('HM1.'));assert.equal(doc.getElementById('social-manual').open,false);
 run('selectSocialFlow("receive")');doc.getElementById('social-input').value=run('eggCode');els['panel-content'].querySelectorAll('button').filter(b=>b.textContent==='Recibir huevo').at(-1).fire('click');assert.equal(run('state.social.eggs.length'),1);
 assert.throws(()=>run('importEntity(femaleCode)'),/Solo se importan huevos/);
 // El «huevo misterioso» a ciegas paso a ser una eleccion entre tres, con el tipo de cada uno a la
 // vista. Y ahora se elige SIEMPRE, tambien sin huevos guardados: antes arrancaba sin preguntar.
 run('die("natural");render()');els.restart.fire('click');
 const picks=()=>els['panel-content'].querySelectorAll('button').filter(b=>b.dataset.key?.startsWith('begin-'));
 assert.equal(picks().length,3,'se ofrecen tres huevos nuevos');
 const offered=picks().map(b=>b.dataset.key);
 assert.equal(new Set(offered).size,3,'y son tres especies distintas');
 // Y de tres tipos distintos: el tipo es lo unico que se ve, asi que dos iguales no serian eleccion.
 const offeredTypes=offered.map(k=>run(`PokemonData.get("${k.slice('begin-'.length)}").Type1`));
 assert.equal(new Set(offeredTypes).size,3,`tipos repetidos: ${offeredTypes.join()}`);
 assert.ok(text(els['panel-content']).includes('Huevo de tipo'),'cada uno dice de que tipo saldra');
 // Repintar no rebaraja: si lo hiciera, bastaria recargar hasta sacar el tipo que uno quiere.
 run('renderPanel()');
 assert.deepEqual(picks().map(b=>b.dataset.key),offered,'el sorteo no cambia al repintar');
 const chosen=offered[1].slice('begin-'.length);
 picks()[1].fire('click');
 assert.equal(run('state.phase'),'egg');
 assert.equal(run('state.social.active.offspring'),chosen,'elegir fija la especie por adelantado');
 assert.equal(run('state.social.eggs.length'),1);
 run('state.incubationRemaining=0;hatch(()=>0)');
 assert.equal(run('state.pokemonId'),chosen,'y es la que acaba eclosionando');
 born('male');run('die("natural");render()');els.restart.fire('click');assert.equal(run('state.phase'),'dead');assert.equal(els.panel.open,true,'sin huevos guardados tambien se elige');
 picks()[0].fire('click');assert.equal(run('state.phase'),'egg');
 born('female');run('showPanel("social");selectSocialFlow("breed");state.care.felicidad=10');doc.getElementById('social-input').value=run('maleCode');run('showBreedingResult()');card=doc.getElementById('breeding-result');assert.ok(text(card).includes('No pueden criar'));assert.equal(card.dataset.ok,'false');
 // Ditto is canonical, but outside the current playable repertoire: test routing directly.
 run("var local=activeEntity();var ditto={id:'ditto-test',speciesId:'0132A0',snapshot:{gender:'genderless'}}");assert.equal(run('HatchMonSocial.breedingGenerator(local,ditto)===local.id'),true);assert.equal(run('HatchMonSocial.breedingGenerator(ditto,local)===local.id'),true);
 const html=fs.readFileSync('index.html','utf8');assert.ok(!html.includes('mask:var(--icon)'));for(const key of ['bag','train','dex']){assert.ok(html.includes(`data-icon="${key}"`));assert.ok(html.includes(`.pixel-icon[data-icon="${key}"]{--pixels:`));}assert.ok(html.includes('box-shadow:var(--pixels)'));assert.equal(run('typeof activateEntity'),'undefined');
 console.log('PASS social UX: persistent compatibility, local female/remote female guard, Ditto routing, QR/alternate code, receive/share eggs, a stored egg and a pick of three typed eggs, no live storage, CSS pixel icons.');
})().catch(e=>{console.error(e);process.exitCode=1});
