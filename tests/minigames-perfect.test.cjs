const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{
 for(const attribute of ['iq','strength','kindness']){
  const {run,els,advance}=await setup();run(`globalThis.result=null;globalThis.buzz=[];globalThis.navigator={vibrate:p=>{buzz.push(p);return true}};TrainingActivities.launch('${attribute}',{commit:(k,g)=>{result=g;return true}})`);
  // Fuerza necesita muestreo fino: la precision ya no es plana dentro de la zona, asi que hay que
  // esperar a que el marcador cruce el nucleo en vez de pulsar en cuanto se habilita el control.
  const step=attribute==='strength'?5:16;
  // Amabilidad se juega arrastrando: hace falta una pista medible y captura de puntero de pega.
  let lane=null;
  if(attribute==='kindness'){lane=els['training-game-content'].children[3].children.find(e=>e.className==='catch-lane');
   lane.rect={left:0,top:0,width:1000,height:1000};lane.setPointerCapture=()=>{};lane.hasPointerCapture=()=>false;lane.releasePointerCapture=()=>{};
   lane.fire('pointerdown',{pointerId:1,button:0,clientX:500});}
  for(let elapsed=0;elapsed<60000&&run('result')===null;elapsed+=step){
   advance(step);const field=els['training-game-content'].children[3],buttons=field.children.filter(b=>b.tagName==='button');
   if(attribute==='iq'){const c=buttons.find(b=>b.textContent==='C');if(c&&!c.disabled)for(let i=0;i<6;i++)c.fire('click');}
   // La zona ya no esta siempre en el centro ni mide siempre lo mismo: se lee del propio nucleo
   // pintado, que es exactamente lo que el jugador ve y lo que puntua 1.
   if(attribute==='strength'){const b=buttons[0],marker=b?.children.find(c=>c.className==='timing-marker'),core=b?.children.find(c=>c.className==='timing-core');
    const at=marker&&parseFloat(marker.style.left),half=core&&parseFloat(core.style.width)/2,centre=core&&parseFloat(core.style.left)+half;
    if(b&&!b.disabled&&Number.isFinite(at)&&Number.isFinite(centre)&&Math.abs(at-centre)<=half)b.fire('pointerdown');}
   // Se juega leyendo la pista, como un jugador: se busca el objeto mas bajo que aun no ha entrado
   // en la banda y se apunta a su columna si es lata, o se huye de ella si es planta. Con el arnes
   // TODO cae por el centro (Math.random fijado en .5), asi que esquivar es obligatorio.
   if(attribute==='kindness'){
    const centreOf=e=>parseFloat(e.style.left)+parseFloat(e.style.width)/2,topOf=e=>parseFloat(e.style.top);
    const live=lane.children.filter(e=>e.className==='catch-item'&&!e.dataset.result&&Number.isFinite(topOf(e))&&topOf(e)<=94);
    // Se atiende SIEMPRE al objeto mas bajo, sea lata o planta: como ningun par comparte la banda
    // del cesto, el mas bajo es el que se resuelve primero y no hay que elegir entre dos. Y se
    // esquiva hasta que la planta SALE de la banda, no hasta que entra: dentro sigue recogiendose.
    const head=live.sort((a,b)=>topOf(b)-topOf(a))[0];
    if(head)lane.fire('pointermove',{pointerId:1,clientX:(head.dataset.kind==='can'?centreOf(head):centreOf(head)<50?95:5)*10});
   }
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
 console.log('PASS playable perfect runs: five memory rounds, strength, every can caught with every plant dodged, and 16 rhythm beats each award +5; imperfect grades 1–4 on a curve where +5 is near-perfect, not literally perfect.');
})().catch(e=>{console.error(e);process.exitCode=1});
