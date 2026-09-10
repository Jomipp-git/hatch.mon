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
 assert.match(html,/\.oak-plate/);assert.match(html,/\.message-strip\{height:56px[^}]*grid-template-columns:44px/);
 console.log('PASS Oak status plate, optimized runtime route, Actions label/pips and contextual help.');
})().catch(e=>{console.error(e);process.exitCode=1});
