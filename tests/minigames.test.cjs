const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{
for(const attribute of ['iq','strength','kindness','style']){
 const {run,els,advance}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.trainer.energy=6');
 const initial=run('JSON.stringify({training:state.training,care:state.care,trainer:state.trainer})');
 run(`TrainingActivities.launch('${attribute}',{commit:train})`);assert.equal(els['training-game'].open,true);assert.equal(run('JSON.stringify({training:state.training,care:state.care,trainer:state.trainer})'),initial);
 run('TrainingActivities.cancel()');advance(16000);assert.equal(run('JSON.stringify({training:state.training,care:state.care,trainer:state.trainer})'),initial);
 run(`TrainingActivities.launch('${attribute}',{commit:train})`);if(attribute==='style'){for(let i=0;i<5;i++)els['training-game-content'].children[3].children[1].fire('click');}else advance(40000);assert.equal(run(`state.training.${attribute}`),1);assert.equal(run('state.trainer.energy'),5);assert.equal(run('state.care.energia'),92);assert.equal(run('state.care.hambre'),96);assert.equal(run('state.vital.dirt'),3);assert.ok(Math.abs(run('state.relationship.points')-.3)<1e-9);
 advance(40000);assert.equal(run(`state.training.${attribute}`),1);
}
const {run}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
for(let gain=1;gain<=5;gain++){
 run(`state.training.iq=0;state.trainer.energy=6;state.care.energia=100;state.care.hambre=100;state.vital.dirt=0;state.relationship.points=0;TrainingActivities.register('iq',({complete})=>{complete(${gain});complete(${gain})});TrainingActivities.launch('iq',{commit:train})`);
 assert.equal(run('state.training.iq'),gain);assert.equal(run('state.trainer.energy'),5);assert.ok(Math.abs(run('state.relationship.points')-gain*.3)<1e-9);
}
assert.equal(run('TrainingActivities.grade(0)'),1);assert.equal(run('TrainingActivities.grade(1)'),5);

// La sesion se paga al abrirla. Rendirse cuesta lo mismo que perder, asi que no hay forma de
// reintentar gratis hasta clavar la partida; solo un corte ajeno al jugador devuelve el gasto.
{
 const {run,els,doc,advance}=await setup();
 const walk=e=>[e,...e.children.flatMap(walk)];
 const practice=()=>walk(els['panel-content']).find(e=>e.dataset?.key==='iq');
 const paid=()=>run('JSON.stringify([state.trainer.energy,state.care.energia,state.care.hambre,state.vital.dirt])');
 const open=()=>{run('closePanel();showPanel("training")');practice().fire('click');};
 run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.trainer.energy=6;state.care.energia=100;state.care.hambre=100;state.vital.dirt=0');
 const untouched=paid();
 open();
 assert.equal(els['training-game'].open,true);
 assert.equal(paid(),JSON.stringify([5,92,96,3]),'abrir el minijuego cobra la sesion entera');
 assert.equal(run('state.training.iq'),0,'y todavia no premia');
 run('TrainingActivities.cancel()');
 assert.equal(paid(),JSON.stringify([5,92,96,3]),'rendirse no devuelve nada');
 assert.equal(run('state.training.iq'),0);
 // Un corte que no decide el jugador si devuelve el gasto: la pestana pasa a segundo plano.
 open();
 assert.equal(paid(),JSON.stringify([4,84,92,6]));
 doc.hidden=true;doc.events.visibilitychange();doc.hidden=false;
 assert.equal(paid(),JSON.stringify([5,92,96,3]),'la pestana en segundo plano devuelve la sesion');
 assert.equal(els['training-game'].open,false);
 // Y terminar de verdad sigue premiando una sola vez.
 open();advance(40000);
 assert.equal(run('state.training.iq'),1);
 assert.equal(paid(),JSON.stringify([4,84,92,6]),'sin cobro doble al puntuar');
 run('state.trainer.energy=0;closePanel();showPanel("training")');
 assert.equal(practice().disabled,true,'sin AP la practica no se ofrece');
 assert.notEqual(untouched,paid());
}
// El dedo es el unico canal de respuesta inmediata: no hay sonido y en movil tapa la casilla que
// acaba de cambiar. Y repetir no deberia costar tres toques por el panel de Entrenamiento.
{
 const {run,els,advance}=await setup();
 const walk=e=>[e,...e.children.flatMap(walk)];
 const practice=()=>walk(els['panel-content']).find(e=>e.dataset?.key==='strength');
 const field=()=>els['training-game-content'].children[3];
 run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.trainer.energy=6;state.care.energia=100');
 run('globalThis.buzz=[];globalThis.navigator={vibrate:p=>{buzz.push(String(p));return true}}');
 run('closePanel();showPanel("training")');practice().fire('click');
 advance(40000);
 // Cinco rondas dejadas pasar: un pulso correctivo por ronda y otro por el resultado.
 assert.equal(run('buzz.length'),6,'la partida vibra al puntuar cada ronda y al cerrar');
 assert.equal(run('new Set(buzz).size'),1,'y todas las notas fallidas suenan igual');
 // prefers-reduced-motion es el interruptor que el jugador ya tiene: tambien apaga la haptica.
 run('buzz.length=0;globalThis.matchMedia=q=>({matches:q.includes("reduced-motion")})');
 const again=()=>field().children.find(b=>b.tagName==='button'&&b.textContent===run("t('minigame.common.again')"));
 assert.ok(again(),'el resultado ofrece repetir sin volver al panel');
 const before=run('state.trainer.energy');
 again().fire('click');
 assert.equal(els['training-game'].open,true,'y repetir abre otra partida');
 assert.equal(run('state.trainer.energy'),before-1,'cobrando la sesion otra vez');
 advance(40000);
 assert.equal(run('buzz.length'),0,'sin vibrar con movimiento reducido');
 // Sin AP para otra sesion, el boton no se ofrece.
 run('state.trainer.energy=1;closePanel();showPanel("training")');practice().fire('click');advance(40000);
 assert.equal(again(),undefined,'y no se ofrece si la siguiente sesion no se puede pagar');
}
console.log('PASS four minigames: open, no early reward, cancel, timeout minimum, gains 1–5, single AP/physiology charge paid up front, refund only on involuntary cancel, small bond, haptics that respect reduced motion, a replay that charges again and no duplicate completion.');
})().catch(e=>{console.error(e);process.exitCode=1});
