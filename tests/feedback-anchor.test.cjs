const assert=require('node:assert/strict'),fs=require('node:fs');const {setup}=require('./uiHarness.cjs');
(async()=>{
const html=fs.readFileSync('index.html','utf8');
const strip=html.slice(html.indexOf('<div id="message-strip"'),html.indexOf('<div class="care"'));
assert.ok(strip.includes('id="health"'));assert.ok(strip.includes('id="toast"'));
assert.ok(html.indexOf('</section></div>')<html.indexOf('<div id="message-strip"'));
assert.ok(html.includes('grid-template-rows:32px 358px 56px 60px 18px 44px 16px'));
assert.ok(html.includes('height:140px;overflow:hidden'));assert.ok(html.includes('width:calc(104px * var(--frame-ratio-width,1))'));
const {run,els,flush,advance}=await setup();assert.equal(els.health.hidden,true);assert.equal(els['egg-hint'].hidden,false);
run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");render()');await flush();
for(const menu of ['inventory','training','oak']){run(`showPanel('${menu}');showToast('Mensaje breve')`);assert.equal(els.toast.textContent,'Mensaje breve');run('closePanel()');}
advance(2180);assert.equal(els.toast.hidden,true);
console.log('PASS message strip: outside LCD, reserved hardware slots, egg hint and temporary messages. CSS/DOM only.');
})().catch(e=>{console.error(e);process.exitCode=1});
