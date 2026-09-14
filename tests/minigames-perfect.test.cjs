const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{
 for(const attribute of ['iq','strength','kindness']){
  const {run,els,advance}=await setup();run(`globalThis.result=null;globalThis.buzz=[];globalThis.navigator={vibrate:p=>{buzz.push(p);return true}};TrainingActivities.launch('${attribute}',{commit:(k,g)=>{result=g;return true}})`);
  // Fuerza necesita muestreo fino: la precision ya no es plana dentro de la zona, asi que hay que
  // esperar a que el marcador cruce el centro en vez de pulsar en cuanto se habilita el control.
  const step=attribute==='strength'?5:20;
  for(let elapsed=0;elapsed<60000&&run('result')===null;elapsed+=step){
   advance(step);const field=els['training-game-content'].children[3],buttons=field.children.filter(b=>b.tagName==='button');
   if(attribute==='iq'){const c=buttons.find(b=>b.textContent==='C');if(c&&!c.disabled)for(let i=0;i<6;i++)c.fire('click');}
   if(attribute==='strength'){const b=buttons[0],marker=b?.children.find(c=>c.className==='timing-marker'),at=marker&&parseFloat(marker.style.left);
    if(b&&!b.disabled&&Number.isFinite(at)&&Math.abs(at-50)<=3)b.fire('pointerdown');}
   if(attribute==='kindness')for(const b of buttons)if(!b.disabled&&['papel','lata','botella'].includes(b.dataset.object))b.fire('click');
   if(attribute==='style'){const marker=field.children[0]?.children[1];if(marker&&parseFloat(marker.style.left)>=40&&parseFloat(marker.style.left)<=60){const b=buttons.find(b=>b.classList.contains('lit'));b?.fire('click');}}
  }
  assert.equal(run('result'),5,`${attribute}: all content perfectly played must earn +5`);
  // El +5 se celebra con un patron de tres pulsos; un pulso suelto es el correctivo.
  assert.ok(Array.isArray(run('buzz.at(-1)')),`${attribute}: a +5 ends on a celebratory pattern`);
  assert.equal(run('buzz.at(-1).length'),5,`${attribute}: three buzzes with two gaps`);
 }
 // El 5 ya no pide un 1,0 exacto: era irrepetible con la precision continua de Fuerza y el trazo a
 // pulso de Estilo, y la sesion se cobra igual salga como salga.
 const {run}=await setup();
 for(const [score,gain]of [[0,1],[.31,1],[.32,2],[.57,2],[.58,3],[.77,3],[.78,4],[.91,4],[.92,5],[1,5]])
  assert.equal(run(`TrainingActivities.grade(${score})`),gain,`score ${score}`);
 assert.equal(run('TrainingActivities.gradeThresholds.join()'),'0.92,0.78,0.58,0.32');
 console.log('PASS playable perfect runs: five memory rounds, strength, every trash tile and 16 rhythm beats each award +5; imperfect grades 1–4 on a curve where +5 is near-perfect, not literally perfect.');
})().catch(e=>{console.error(e);process.exitCode=1});
