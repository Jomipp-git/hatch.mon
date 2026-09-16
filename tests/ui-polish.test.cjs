const assert=require('node:assert/strict'),fs=require('fs');const {setup}=require('./uiHarness.cjs');
(async()=>{
 const {run,els,flush}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");render()');await flush();
 assert.equal(els.sprite.children[0].style.width,`${els.sprite.children[0].width*1.3}px`);
 for(const [value,level] of [[100,'good'],[50,'warning'],[20,'low']]){run(`state.care.hambre=${value};render()`);assert.equal(els.hambre.dataset.level,level)}
 for(const [action,reaction] of [['alimentar','eat'],['jugar','play'],['limpiar','clean']]){run(`state.trainer.energy=6;state.foundItem=null;dispatch(()=>careAction('${action}',()=>1),'${reaction}')`);assert.equal(els.sprite.dataset.reaction,reaction);els.sprite.fire('animationend')}
 run('state.trainer.energy=6;dispatch(()=>train("iq"),"train")');assert.equal(els.sprite.dataset.reaction,'train');els.sprite.fire('animationend');
 run('state.pokerus=true;render()');assert.equal(els.sprite.dataset.reaction,'sick');
 run('showToast("Una comida. 🍎")');assert.equal(els.toast.textContent,'Una comida.');
 const html=fs.readFileSync('index.html','utf8');assert.ok(!/\p{Extended_Pictographic}/u.test(html));
 for(const [,src] of html.matchAll(/url\("(assets\/ui\/[^" ]+)"\)/g))assert.ok(fs.existsSync(src));
 // Menu closes on a backdrop tap; a drag that merely ends outside does not, and a minigame never does.
 const panel=els['panel'],tap=(x,y,from=[x,y])=>{panel.fire('pointerdown',{clientX:from[0],clientY:from[1]});panel.fire('click',{clientX:x,clientY:y});};
 run('collectionTab="companion";showPanel("pokedex")');assert.equal(panel.open,true);
 tap(200,200);assert.equal(panel.open,true,'a tap inside keeps the menu open');
 tap(5,5,[200,200]);assert.equal(panel.open,true,'a drag that ends outside keeps the menu open');
 tap(5,5);assert.equal(panel.open,false,'a backdrop tap closes the menu');
 assert.equal(run('panelName'),null,'closing through the backdrop runs the same teardown');
 assert.deepEqual(Object.keys(els['training-game'].events).filter(k=>k==='pointerdown'),[],'minigames never close on an outside tap');
 // Mochila grouped by item kind, in compact rows, with empty groups omitted.
 run('state.inventory={moon:1,tea:3,thunder:1,berry:2};showPanel("inventory")');
 const bag=els['panel-content'].children;
 assert.deepEqual(bag.filter(n=>n.className==='panel-group').map(n=>n.textContent),['Bayas','Objetos de evolución','Bebidas'],'only owned groups, in catalogue order');
 const kinds=run('ITEM_GROUPS');
 assert.deepEqual([...kinds],['berry','stone','medicine','drink','breeding','home']);
 assert.equal(run('Object.values(itemCatalog).every(i=>ITEM_GROUPS.includes(i.kind))'),true,'every item declares a group');
 const afterFirstGroup=bag.slice(bag.findIndex(n=>n.className==='panel-group')+1,bag.findIndex(n=>n.className==='panel-group')+2);
 assert.ok(afterFirstGroup.every(n=>n.className.includes('compact')),'item rows are compact');
 assert.match(fs.readFileSync('index.html','utf8'),/\.panel-row\.compact\{padding:7px 0/);
 console.log('PASS visual polish: scale, bar levels, action/illness reactions, emoji-free UI, local icon routes, backdrop dismissal and a grouped compact Mochila.');
})().catch(e=>{console.error(e);process.exitCode=1});
