const assert=require('node:assert/strict'),fs=require('fs');const {setup}=require('./uiHarness.cjs');
(async()=>{
 const {run,els}=await setup();
 run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.trainer.energy=4;render()');
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/assets\/ui\/professor_oak\.png/);assert.ok(!html.includes('class="breeder"'));
 assert.equal(els['trainer-energy'].children[0].textContent,'Acciones: 4/6');
 assert.equal(els['trainer-energy'].children[1].children.length,6);
 assert.equal(els['trainer-energy'].children[1].children.filter(p=>p.className.includes('filled')).length,4);
 assert.match(els['trainer-energy']['aria-label'],/Cada cuidado consume acciones/);
 els['trainer-energy'].fire('click');assert.match(els.toast.textContent,/Recuperas 1 cada 10 min/);
 // Running out is a state the strip announces, not something you infer from greyed-out buttons.
 assert.equal(els['trainer-energy'].dataset.depleted,'false');
 run('hideToast();state.trainer.energy=0;render()');
 assert.equal(els['trainer-energy'].dataset.depleted,'true');
 assert.equal(els['trainer-energy'].children[0].textContent,'Sin acciones');
 assert.equal(els['trainer-energy'].children[2].textContent,'+1 en 10 min');
 assert.equal(els.toast.hidden,false);
 assert.match(els.toast.textContent,/sin acciones.*10 min/i);
 // Once per depletion: a repaint must not keep re-announcing it.
 run('hideToast();render()');assert.equal(els.toast.hidden,true);
 // Partial recovery still reads as empty, and the countdown shrinks with it.
 run('state.trainer.energy=.5;render()');
 assert.equal(els['trainer-energy'].dataset.depleted,'true');
 assert.equal(els['trainer-energy'].children[2].textContent,'+1 en 5 min');
 run('hideToast();state.trainer.energy=2;render()');
 assert.equal(els['trainer-energy'].dataset.depleted,'false');
 assert.equal(els.toast.hidden,true);
 assert.match(fs.readFileSync('index.html','utf8'),/\.trainer-energy\[data-depleted="true"\]\{color:/);
 assert.match(html,/\.oak-plate/);assert.match(html,/\.message-strip\{height:56px[^}]*grid-template-columns:44px/);
 console.log('PASS Oak status plate, optimized runtime route, Actions label/pips and contextual help.');
})().catch(e=>{console.error(e);process.exitCode=1});
