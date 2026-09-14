const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{
for(const attribute of ['iq','strength','kindness','style']){
 const {run,els,advance}=await setup();run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.trainer.energy=6');
 const initial=run('JSON.stringify({training:state.training,care:state.care,trainer:state.trainer})');
 run(`TrainingActivities.launch('${attribute}',{commit:train})`);assert.equal(els['training-game'].open,true);assert.equal(run('JSON.stringify({training:state.training,care:state.care,trainer:state.trainer})'),initial);
 run('TrainingActivities.cancel()');advance(16000);assert.equal(run('JSON.stringify({training:state.training,care:state.care,trainer:state.trainer})'),initial);
 run(`TrainingActivities.launch('${attribute}',{commit:train})`);if(attribute==='style'){
  // Terminar recorrido ya no cierra la ronda con un cero: hay que empezar el trazo. Se traza lo
  // minimo y se entrega, que es la version de Estilo del minimo por agotar el tiempo.
  const canvas=els['training-game-content'].children[3].children[0],finish=els['training-game-content'].children[3].children[1];
  canvas.setPointerCapture=()=>{};canvas.hasPointerCapture=()=>false;canvas.releasePointerCapture=()=>{};
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:320,height:220});
  const fire=(type,point)=>{for(const fn of canvas.events[type]||[])fn({pointerId:1,button:0,clientX:point[0],clientY:point[1],preventDefault(){}});};
  for(let r=0;r<5;r++){const path=run(`StyleTracing.path(${r},${canvas.dataset.seed})`);
   fire('pointerdown',path[0]);fire('pointermove',path[1]);fire('pointerup',path[1]);finish.fire('click');}
 }else advance(60000);assert.equal(run(`state.training.${attribute}`),1);assert.equal(run('state.trainer.energy'),5);assert.equal(run('state.care.energia'),92);assert.equal(run('state.care.hambre'),96);assert.equal(run('state.vital.dirt'),3);assert.ok(Math.abs(run('state.relationship.points')-.3)<1e-9);
 advance(60000);assert.equal(run(`state.training.${attribute}`),1);
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
 run('gameStorage.setItem(TUTORIAL_KEY,JSON.stringify(TRAIN))');
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
 open();advance(60000);
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
 run('gameStorage.setItem(TUTORIAL_KEY,JSON.stringify(TRAIN))');
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
 advance(60000);
 assert.equal(run('buzz.length'),0,'sin vibrar con movimiento reducido');
 // Sin AP para otra sesion, el boton no se ofrece.
 run('state.trainer.energy=1;closePanel();showPanel("training")');practice().fire('click');advance(60000);
 assert.equal(again(),undefined,'y no se ofrece si la siguiente sesion no se puede pagar');
}
// Intelecto: la ventana crece con la secuencia, la secuencia se alarga en vez de rehacerse, y
// fallar corta la ronda en vez de dejarte teclear el resto a ciegas.
{
 const {run,els,advance}=await setup();
 const content=els['training-game-content'];
 const hint=()=>content.children[1].textContent,status=()=>content.children[2].textContent;
 const keys=()=>content.children[3].children.filter(b=>b.tagName==='button');
 const settle=probe=>{for(let i=0;i<400&&!probe();i++)advance(40);};
 const seconds=()=>Number(status().match(/(\d+) s/)?.[1]);
 run(`globalThis.lit=[];TrainingActivities.launch('iq',{commit:()=>true})`);
 settle(()=>status().includes('s para responder'));
 assert.equal(seconds(),3,'dos luces dan una ventana de 3 s, no los 4 s planos de antes');
 // Math.random esta fijado en .5 en el arnes, asi que toda la secuencia es la tercera luz.
 keys()[2].fire('click');
 assert.equal(hint(),run("t('minigame.iq.entered',{done:1,total:2})"),'y se ve cuanto llevas tecleado');
 keys()[2].fire('click');
 assert.equal(hint(),run("t('minigame.iq.right')"));
 settle(()=>status().includes('Ronda 2'));
 settle(()=>status().includes('s para responder'));
 assert.equal(seconds(),4,'tres luces, cuatro segundos');
 // Fallar cierra la ronda ahi mismo.
 keys()[0].fire('click');
 assert.equal(hint(),run("t('minigame.iq.wrong')"));
 assert.ok(keys().every(b=>b.disabled),'y deja de aceptar pulsaciones');
 settle(()=>status().includes('Ronda 3'));
 settle(()=>status().includes('s para responder'));
 assert.equal(seconds(),5,'cuatro luces, cinco segundos');
 // La secuencia se alarga anadiendo una luz: el prefijo de la ronda anterior sigue estando.
 for(let i=0;i<4;i++)keys()[2].fire('click');
 assert.equal(hint(),run("t('minigame.iq.right')"),'repetir el prefijo mas una luz sigue valiendo');
}
// El tutorial va antes de cobrar: los testers entraban, jugaban cuatro rondas y seguian sin saber
// que se les pedia, y leer las reglas no deberia costar una sesion.
{
 const {run,els,advance}=await setup();
 const walk=e=>[e,...e.children.flatMap(walk)];
 const card=key=>walk(els['panel-content']).find(e=>e.dataset?.key===key);
 const buttons=()=>els['training-game-content'].children.filter(e=>e.tagName==='button');
 run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");state.trainer.energy=6');
 assert.equal(run('tutorialsSeen().join()'),'','de fabrica no se ha visto ninguno');
 run('closePanel();showPanel("training")');card('iq').fire('click');
 assert.equal(els['training-game'].open,true,'la primera practica abre las reglas');
 assert.equal(run('TrainingActivities.isActive()'),false,'que no son todavia una partida');
 assert.equal(run('state.trainer.energy'),6,'y no cuestan nada');
 // Echarse atras tampoco cobra, y no marca el tutorial como visto.
 buttons().find(b=>b.textContent===run("t('minigame.common.notNow')")).fire('click');
 assert.equal(els['training-game'].open,false);
 assert.equal(run('state.trainer.energy'),6);
 assert.equal(run('tutorialsSeen().join()'),'');
 // Empezar cobra y arranca la partida; a partir de ahi la practica va directa.
 run('closePanel();showPanel("training")');card('iq').fire('click');
 buttons().find(b=>b.textContent===run("t('minigame.common.start')")).fire('click');
 assert.equal(run('TrainingActivities.isActive()'),true);
 assert.equal(run('state.trainer.energy'),5);
 assert.equal(run('tutorialsSeen().join()'),'iq');
 // La tarjeta de ronda dice en que ronda estas y que se te pide, antes de cada tanda.
 const field=els['training-game-content'].children[3],card1=field.children.at(-1);
 assert.equal(field.dataset.phase,'prepare');
 assert.equal(card1.children[0].textContent,run("t('minigame.common.roundCard',{round:1,total:TrainingActivities.config.memoryRounds})"));
 assert.equal(card1.children[1].textContent,run("t('minigame.iq.goal')"));
 advance(60000);
 run('closePanel();showPanel("training");state.trainer.energy=6');card('iq').fire('click');
 assert.equal(run('TrainingActivities.isActive()'),true,'la segunda vez se entra directo');
 assert.equal(run('state.trainer.energy'),5);
 run('TrainingActivities.cancel()');
 // El interrogante deja releerlas cuando quieras, y sigue sin cobrar.
 run('closePanel();showPanel("training")');card('how-iq').fire('click');
 assert.equal(run('TrainingActivities.isActive()'),false);
 assert.equal(run('state.trainer.energy'),5);
 run('TrainingActivities.cancel()');
 assert.equal(els['training-game'].open,false);
}
console.log('PASS four minigames: open, no early reward, cancel, timeout minimum, gains 1–5, single AP/physiology charge paid up front, refund only on involuntary cancel, small bond, haptics that respect reduced motion, a replay that charges again a briefing that precedes the charge, a round card and no duplicate completion.');
})().catch(e=>{console.error(e);process.exitCode=1});
