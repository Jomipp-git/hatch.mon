'use strict';
globalThis.TrainingActivities=(()=>{
 const t=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
 const modes=Object.freeze({iq:'minigame.attribute.iq',strength:'minigame.attribute.strength',kindness:'minigame.attribute.kindness',style:'minigame.attribute.style'});
 const modeName=attribute=>t(modes[attribute]);
 const config=Object.freeze({tick:40,memoryRounds:5,memoryFlash:550,
  // La ventana crece con la secuencia. Era fija en 4 s para longitudes de 2 a 6, asi que sobraba
  // tiempo en la primera ronda y no llegaba para la ultima.
  memoryBase:1400,memoryStep:700,
  strengthRounds:5,strengthWindow:3000,strengthPerfectMin:.4,strengthPerfectMax:.6,
  // Clavarla es el 4 % central; el resto de la zona pintada baja hasta .7 y fuera de +-20 % no
  // puntua. Antes la zona entera valia 1 y justo fuera se seguia puntuando casi 1, asi que
  // rozarla y centrarla daban lo mismo y la banda dibujada no significaba nada.
  strengthCoreRadius:.04,strengthEdgeScore:.7,strengthMissRadius:.2,
  strengthBasePeriod:420,strengthPeriodStep:60,
  // Pausa para leer el veredicto de la ronda antes de que cambie la pantalla.
  verdictDelay:700,
  // Siete rondas con la ventana estrechandose, en vez de diez todas iguales: era el minijuego mas
  // largo y el unico sin ninguna curva.
  cleanupRounds:7,cleanupBase:1800,cleanupStep:120,cleanupTiles:6,cleanupMinTrash:2,cleanupMaxTrash:4,
  // La tarjeta de ronda tiene que dar tiempo a leerse; con 600 ms no se registraba.
  prepare:1000,resolveDelay:300});
 const launchers={};let active=null,briefingExit=null;
 // Un toque corto confirma, uno largo corrige. Es el unico canal de respuesta inmediata que tiene
 // el juego: no hay sonido, y en movil el dedo tapa justo la casilla que acaba de cambiar. Se
 // respeta prefers-reduced-motion, que es el interruptor que el jugador ya tiene.
 const HAPTICS=Object.freeze({tap:8,good:18,fair:[10,40,10],bad:70});
 const stillPatterns=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const haptic=name=>{if(stillPatterns())return false;const pattern=typeof name==='string'?HAPTICS[name]:name;
  if(pattern===undefined)return false;try{return globalThis.navigator?.vibrate?.(pattern)===true;}catch{return false;}};
 const gradeHaptic=grade=>haptic(grade>=4?[18,60,18,60,18]:grade>=2?[18,60,18]:'bad');
 const memoryWindow=length=>config.memoryBase+config.memoryStep*length;
 const cleanupWindow=round=>config.cleanupBase-config.cleanupStep*round;
 // El 5 pedia un 1,0 exacto. Con la precision continua de Fuerza y el trazo a pulso de Estilo eso
 // no es "excelente", es irrepetible, y la sesion se cobra igual salga como salga: un tramo
 // inalcanzable solo convierte el mejor resultado posible en una perdida neta. Estos umbrales son
 // los unicos del juego; Estilo entrega su media y se puntua aqui, para no llevar dos curvas.
 const GRADE_THRESHOLDS=Object.freeze([.92,.78,.58,.32]);
 const grade=score=>{const value=Math.max(0,Math.min(1,score));const step=GRADE_THRESHOLDS.findIndex(min=>value>=min);return step<0?1:5-step;};
 const strengthPrecision=position=>{
  const centre=(config.strengthPerfectMin+config.strengthPerfectMax)/2,zone=(config.strengthPerfectMax-config.strengthPerfectMin)/2;
  // El margen solo abre el borde del nucleo: sin el, .46 cae fuera por 4e-17 de coma flotante.
  const offset=Math.abs(position-centre);
  if(offset<=config.strengthCoreRadius+1e-9)return 1;
  if(offset<=zone)return 1-(1-config.strengthEdgeScore)*(offset-config.strengthCoreRadius)/(zone-config.strengthCoreRadius);
  const score=config.strengthEdgeScore*(1-(offset-zone)/(config.strengthMissRadius-zone));return score>1e-9?score:0;
 };
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const roundsFor=attribute=>attribute==='iq'?config.memoryRounds:attribute==='kindness'?config.cleanupRounds:config.strengthRounds;
 // Cada actividad se explica en tres pasos antes de empezar. Los testers entraban, jugaban cuatro
 // rondas y seguian sin saber que se les pedia.
 const BRIEFINGS=Object.freeze({iq:3,strength:3,kindness:3,style:3});
 function register(attribute,launcher){if(!Object.hasOwn(modes,attribute)||typeof launcher!=='function')throw Error(t('minigame.error.invalidActivity'));launchers[attribute]=launcher;}
 // El tutorial va ANTES de cobrar: abrir para leer las reglas y echarse atras no debe costar una
 // sesion. Se muestra solo o desde el interrogante de la tarjeta, y usa el mismo dialogo.
 function brief(attribute,{start=()=>{},close=()=>{}}={}){
  if(!Object.hasOwn(modes,attribute)||active)return false;
  const dialog=document.getElementById('training-game'),host=document.getElementById('training-game-content');
  host.replaceChildren();
  const steps=node('div',undefined,'minigame-field briefing');
  for(let i=1;i<=BRIEFINGS[attribute];i++)steps.append(node('p',t(`minigame.${attribute}.step${i}`)));
  steps.append(node('p',t('minigame.common.rounds',{rounds:roundsFor(attribute)}),'briefing-rounds'));
  const go=node('button',t('minigame.common.start')),back=node('button',t('minigame.common.notNow'));
  go.type='button';back.type='button';
  // Limpiar antes de cerrar: el listener de `close` llama a cancel, que si no repetiria la salida.
  const shut=then=>{briefingExit=null;if(dialog.open)dialog.close();then();};
  go.addEventListener('click',()=>shut(()=>start(attribute)));
  back.addEventListener('click',()=>shut(()=>close(attribute)));
  briefingExit=()=>close(attribute);
  host.append(node('h2',modeName(attribute)),node('p',t(`minigame.${attribute}.instructions`)),steps,go,back);
  dialog.showModal();return true;
 }
 // El coste de la sesion se cobra al abrir, no al puntuar. Si llegara con el resultado, cancelar
 // una partida torcida saldria gratis y la forma optima de jugar seria reintentar hasta clavarla.
 // Por eso `cancel` solo devuelve el gasto cuando el corte no es del jugador: pestana en segundo
 // plano, cierre de la pagina o parada del runtime. Rendirse a mano cuesta lo mismo que perder.
 function launch(attribute,{begin=()=>true,abandon=()=>{},repeat=null,canRepeat=()=>false,commit,onActive=()=>{},formatReward=()=>''}){
  if(!Object.hasOwn(modes,attribute)||active||!begin(attribute))return false;
  let done=false,timer=null,frame=null,dialog=null,dispose=null;
  const requestFrame=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
  const cancelFrame=globalThis.cancelAnimationFrame||clearTimeout;
  const stop=()=>{clearTimeout(timer);timer=null;if(frame!==null)cancelFrame(frame);frame=null;dispose?.();dispose=null;};
  const cancel=(refund=false)=>{if(done)return false;done=true;stop();active=null;if(dialog?.open)dialog.close();onActive(false);if(refund)abandon(attribute);return false;};
  const complete=(gain=5)=>{if(done)return false;done=true;stop();active=null;try{return commit(attribute,Math.max(1,Math.min(5,Math.round(gain))));}finally{onActive(false);}};
  active={cancel};onActive(true);
  if(launchers[attribute])return launchers[attribute]({complete,cancel,attribute});
  dialog=document.getElementById('training-game');const host=document.getElementById('training-game-content');host.replaceChildren();
  const setText=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
  const title=node('h2',modeName(attribute)),hint=node('p',''),status=node('p',''),field=node('div',undefined,'minigame-field'),roundCard=node('div',undefined,'round-card'),exit=node('button',t('minigame.common.cancel'));exit.type='button';exit.addEventListener('click',()=>cancel());
  host.append(title,hint,status,field,exit);dialog.showModal();
  let earned=0,total=0,targets=[],sequence=[],answer=0,round=0,hit=false,phase='prepare',phaseStart=performance.now(),roundCorrect=true;
  const controls=[];const held=new Set(),presses=new Map();
  let visibleStrengthPosition=.5;
  // El marcador arranca en un extremo, alternando lado por ronda. Antes empezaba justo en el
  // centro, asi que pulsar en el instante en que se habilitaba el control era siempre perfecto.
  const strengthPosition=t=>(Math.sin(t/(config.strengthBasePeriod-round*config.strengthPeriodStep)+(round%2?Math.PI/2:-Math.PI/2))+1)/2;
  const button=(label,fn,onPress=false)=>{const b=node('button',label);b.type='button';b.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;if(onPress){event.preventDefault();fn();return;}b.setPointerCapture?.(event.pointerId);held.add(b);presses.set(b,{round,valid:phase==='play'});});b.addEventListener('pointerup',()=>held.delete(b));b.addEventListener('pointercancel',()=>{held.delete(b);presses.delete(b);});b.addEventListener('lostpointercapture',()=>held.delete(b));b.addEventListener('click',event=>{if(onPress){if(event.detail===0)fn();return;}const press=presses.get(b);presses.delete(b);if(press&&press.round!==round)return;fn(press);});field.append(b);controls.push(b);return b;};
  const finish=(result=null)=>{const gain=result??(attribute==='iq'?Math.max(1,earned):grade(total?earned/total:0)),ok=complete(gain);field.replaceChildren();setText(hint,ok?t(`minigame.result.grade.${gain}`):t('minigame.result.commitFailed'));setText(status,ok?t('minigame.result.statGain',{stat:modeName(attribute),gain,reward:formatReward(gain)}):t('minigame.result.noReward'));exit.textContent=t('minigame.common.back');exit.addEventListener('click',()=>dialog.close());
   if(ok)gradeHaptic(gain);
   // Volver a practicar no deberia costar tres toques por el panel de Entrenamiento: es lo que se
   // hace despues de casi cada partida. Solo se ofrece si la siguiente sesion se puede pagar.
   if(ok&&repeat&&canRepeat(attribute)){const again=node('button',t('minigame.common.again'),'minigame-again');again.type='button';
    again.addEventListener('click',()=>{dialog.close();repeat(attribute);});field.append(again);}};
  if(attribute==='style'){dispose=StyleTracing.mount({field,hint,status,node,haptic,onFinish:mean=>finish(grade(mean))});return true;}
  if(attribute==='iq'){
   setText(hint,t('minigame.iq.instructions'));
   for(let i=0;i<4;i++)button(['A','B','C','D'][i],()=>{
    if(done||phase!=='answer'||performance.now()-phaseStart>=memoryWindow(sequence.length))return;
    answer++;
    // Fallar cortaba la ronda solo por dentro: seguias tecleando cuatro luces mas sabiendo que ya
    // la habias perdido. Ahora se dice y se pasa, como en cualquier Simon.
    if(i!==sequence[answer-1]){roundCorrect=false;haptic('bad');setText(hint,t('minigame.iq.wrong'));verdict();return;}
    haptic('tap');setText(hint,t('minigame.iq.entered',{done:answer,total:sequence.length}));
    if(answer===sequence.length){earned++;haptic('good');setText(hint,t('minigame.iq.right'));verdict();}
   });total=config.memoryRounds;
  }else if(attribute==='strength'){
   setText(hint,t('minigame.strength.instructions'));
   // La pista entera es el control: con el dedo miras la barra, no un boton pequeno en una
   // esquina, asi que el objetivo tactil tiene que ser la barra.
   const track=button('',()=>{if(done||hit||phase!=='play')return;hit=true;const precision=strengthPrecision(visibleStrengthPosition);earned+=precision;
    haptic(precision===1?'good':precision>0?'fair':'bad');
    setText(hint,precision===1?t('minigame.strength.perfect'):precision>=config.strengthEdgeScore?t('minigame.strength.close'):precision>0?t('minigame.strength.edge'):t('minigame.strength.miss'));
    // Sin esto la ronda seguia corriendo hasta agotar la ventana: acertar pronto premiaba con
    // dos segundos y medio de pantalla quieta.
    phase='resolve';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);},true);
   track.className='timing-track';
   const zone=node('div',undefined,'timing-zone'),core=node('div',undefined,'timing-core'),marker=node('div',undefined,'timing-marker'),caption=node('span',t('minigame.strength.action'),'timing-caption');
   zone.style.left=`${config.strengthPerfectMin*100}%`;zone.style.width=`${(config.strengthPerfectMax-config.strengthPerfectMin)*100}%`;
   core.style.left=`${(.5-config.strengthCoreRadius)*100}%`;core.style.width=`${config.strengthCoreRadius*200}%`;
   track.append(zone,core,marker,caption);
   targets=[marker];total=config.strengthRounds;
  }else if(attribute==='kindness'){
   setText(hint,t('minigame.kindness.instructions'));
   for(let i=0;i<config.cleanupTiles;i++)button('',press=>{if(done||phase!=='play'||(!press?.valid&&performance.now()-phaseStart>=cleanupWindow(round))||controls[i].disabled)return;controls[i].disabled=true;earned+=targets[i]?1:-1;haptic(targets[i]?'good':'bad');setText(hint,targets[i]?t('minigame.kindness.collected'):t('minigame.kindness.keep'));controls[i].dataset.result=targets[i]?'correct':'wrong';});
  }

  function beginRound(){
   phaseStart=performance.now();hit=false;
   if(attribute==='iq'){
    // La secuencia crece anadiendo una luz, no rehaciendose entera: es lo que hace memorizable un
    // Simon y lo que convierte cada ronda en la anterior mas un paso.
    phase='show';answer=0;roundCorrect=true;
    sequence=round?[...sequence,Math.floor(Math.random()*4)]:Array.from({length:2},()=>Math.floor(Math.random()*4));
   }else{
    phase='play';if(attribute==='strength'){visibleStrengthPosition=strengthPosition(0);targets[0].style.left=`${visibleStrengthPosition*100}%`;}controls.forEach(b=>b.disabled=false);
    if(attribute==='kindness'){
     // La basura ocupaba siempre tres casillas consecutivas (solo seis disposiciones posibles, y
     // todas un bloque), asi que se aprendia el patron en dos partidas. Ahora las casillas se
     // eligen al azar y cuantas hay tambien varia.
     const count=config.cleanupMinTrash+Math.floor(Math.random()*(config.cleanupMaxTrash-config.cleanupMinTrash+1));
     const slots=controls.map((_,i)=>i);
     for(let i=slots.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
     const chosen=new Set(slots.slice(0,count));
     targets=controls.map((_,i)=>chosen.has(i));total+=count;
     const trash=[['papel','minigame.kindness.paper'],['lata','minigame.kindness.can'],['botella','minigame.kindness.bottle']],keep=[['flor','minigame.kindness.flower'],['hoja','minigame.kindness.leaf']];
     controls.forEach((b,i)=>{const pool=targets[i]?trash:keep,[id,key]=pool[Math.floor(Math.random()*pool.length)];
      // Sin rotulo: era una prueba de lectura, no de reconocimiento. El nombre sigue estando para
      // quien navega con lector de pantalla.
      b.disabled=false;delete b.dataset.result;b.textContent='';b.setAttribute('aria-label',t(key));b.dataset.object=id;});
    }
   }
  }
  const verdict=()=>{phase='resolve';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);};
  function nextRound(){
   round++;const count=attribute==='iq'?config.memoryRounds:attribute==='kindness'?config.cleanupRounds:total;
   if(round>=count){finish();return;}
   phase='prepare';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);
  }
  function tick(){
   if(done)return;if(field.dataset.phase!==phase)field.dataset.phase=phase;const elapsed=performance.now()-phaseStart;
   if(phase==='prepare'){
    setText(hint,t('minigame.common.prepare'));controls.forEach(b=>b.disabled=true);
    // La tarjeta vive siempre en el campo; quien la muestra y la esconde es `data-phase`.
    if(roundCard.dataset.round!==String(round)){roundCard.dataset.round=String(round);
     roundCard.replaceChildren(node('strong',t('minigame.common.roundCard',{round:round+1,total:roundsFor(attribute)})),node('span',t(`minigame.${attribute}.goal`)));}
    if(elapsed>=config.prepare)beginRound();
   }else if(phase==='resolve'){
    // Fuerza deja su veredicto en el hint, asi que aqui no se pisa: solo se le da tiempo a leerlo.
    if(attribute==='kindness')setText(hint,t('minigame.common.nextRound'));
    if(elapsed>=(attribute==='kindness'?config.resolveDelay:config.verdictDelay)&&!held.size)nextRound();
   }else if(attribute==='iq'){
    if(phase==='show'){
     setText(hint,t('minigame.common.observeRound',{round:round+1,total:config.memoryRounds}));
     const lit=sequence[Math.floor(elapsed/config.memoryFlash)];
     controls.forEach((b,i)=>{b.disabled=true;b.classList.toggle('lit',i===lit&&elapsed%config.memoryFlash<380);});
     if(elapsed>=sequence.length*config.memoryFlash){phase='answer';phaseStart=performance.now();controls.forEach(b=>{b.disabled=false;b.classList.remove('lit');});}
    }else{if(!answer)setText(hint,t('minigame.iq.repeat'));if(elapsed>=memoryWindow(sequence.length)){haptic('bad');setText(hint,t('minigame.iq.tooSlow'));verdict();}}
   }else{
    const duration=attribute==='strength'?config.strengthWindow:cleanupWindow(round);
    if(elapsed>=duration){if(attribute==='kindness'){if(!held.size){phase='resolve';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);}}
     // Dejar pasar la ventana tambien se cuenta y se dice: antes la ronda cambiaba sin explicar
     // que el marcador se habia escapado.
     else{hit=true;haptic('bad');setText(hint,t('minigame.strength.miss'));phase='resolve';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);}}
    else if(attribute==='strength'){if(!hit)setText(hint,t('minigame.strength.now'));if(!hit){visibleStrengthPosition=strengthPosition(elapsed);targets[0].style.left=`${visibleStrengthPosition*100}%`;}controls[0].disabled=hit;}

    else if(hint.textContent!==t('minigame.kindness.collected')&&hint.textContent!==t('minigame.kindness.keep'))setText(hint,t('minigame.kindness.reminder'));
   }
   if(done)return;
   setText(status,attribute==='iq'?phase==='answer'?t('minigame.common.responseRound',{round:Math.min(round+1,config.memoryRounds),total:config.memoryRounds,seconds:Math.max(0,Math.ceil((memoryWindow(sequence.length)-(performance.now()-phaseStart))/1000))}):t('minigame.common.observeStatus',{round:Math.min(round+1,config.memoryRounds),total:config.memoryRounds}):t('minigame.common.round',{round:round+1,total:attribute==='kindness'?config.cleanupRounds:total}));
   if(!done){if(attribute==='strength')frame=requestFrame(tick);else timer=setTimeout(tick,config.tick);}
  }
  // Detras de los controles para no mover sus indices; Estilo no la lleva porque no tiene rondas
  // con pausa. Quien la muestra y la esconde es `data-phase` en el campo.
  field.append(roundCard);
  tick();return true;
 }
 function cancel(refund=false){const leave=briefingExit;briefingExit=null;
  if(!active&&leave){const dialog=document.getElementById('training-game');if(dialog?.open)dialog.close();leave();return false;}
  return active?.cancel(refund)||false;}
 return Object.freeze({modes,config,grade,gradeThresholds:GRADE_THRESHOLDS,strengthPrecision,launch,brief,register,cancel,isActive:()=>active!==null});
})();
