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
 console.log('PASS visual polish: scale, bar levels, action/illness reactions, emoji-free UI and local icon routes.');
})().catch(e=>{console.error(e);process.exitCode=1});
