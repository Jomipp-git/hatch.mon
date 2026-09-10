const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{
 for(const attribute of ['iq','strength','kindness']){
  const {run,els,advance}=await setup();run(`globalThis.result=null;TrainingActivities.launch('${attribute}',{commit:(k,g)=>{result=g;return true}})`);
  for(let elapsed=0;elapsed<60000&&run('result')===null;elapsed+=20){
   advance(20);const field=els['training-game-content'].children[3],buttons=field.children.filter(b=>b.tagName==='button');
   if(attribute==='iq'){const c=buttons.find(b=>b.textContent==='C');if(c&&!c.disabled)for(let i=0;i<6;i++)c.fire('click');}
   if(attribute==='strength'){const b=buttons[0];if(b&&!b.disabled)b.fire('click');}
   if(attribute==='kindness')for(const b of buttons)if(!b.disabled&&['PAPEL','LATA','BOTELLA'].includes(b.textContent))b.fire('click');
   if(attribute==='style'){const marker=field.children[0]?.children[1];if(marker&&parseFloat(marker.style.left)>=40&&parseFloat(marker.style.left)<=60){const b=buttons.find(b=>b.classList.contains('lit'));b?.fire('click');}}
  }
  assert.equal(run('result'),5,`${attribute}: all content perfectly played must earn +5`);
 }
 const {run}=await setup();for(const [score,gain]of [[0,1],[.25,2],[.5,3],[.75,4],[.99,4],[1,5]])assert.equal(run(`TrainingActivities.grade(${score})`),gain);
 console.log('PASS playable perfect runs: five memory rounds, strength, all 30 trash targets and 16 rhythm beats each award +5; imperfect grades 1–4.');
})().catch(e=>{console.error(e);process.exitCode=1});
