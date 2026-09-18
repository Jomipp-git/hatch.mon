'use strict';
globalThis.TrainingActivities=(()=>{
 const t=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
 const modes=Object.freeze({iq:'minigame.attribute.iq',strength:'minigame.attribute.strength',kindness:'minigame.attribute.kindness',style:'minigame.attribute.style'});
 const modeName=attribute=>t(modes[attribute]);
 // Una luz mas por ronda, hasta seis. Con cadenas nuevas cada ronda esto ya no es "la anterior mas
 // un paso" sino memorizar seis luces de cero, y ese es justamente el reto que se busca.
 const MEMORY_LENGTHS=Object.freeze([2,3,4,5,6]);
 // Total de luces de una partida de Intelecto. Es el denominador de su marcador, y sale de las
 // longitudes para que no haya un 20 a pelo.
 const MEMORY_LIGHTS=MEMORY_LENGTHS.reduce((a,b)=>a+b,0);
 const config=Object.freeze({tick:40,memoryRounds:MEMORY_LENGTHS.length,memoryLengths:MEMORY_LENGTHS,memoryFlash:550,
  // La ventana crece con la secuencia. Era fija en 4 s para cualquier longitud, asi que sobraba
  // tiempo en la primera ronda y no llegaba para la ultima. Con cadenas nuevas se recuerda todo de
  // cero cada vez, asi que el tramo por luz pesa mas que la base.
  memoryBase:1200,memoryStep:900,
  strengthRounds:5,
  // Barrido lineal a velocidad constante. Con la sinusoide de antes el marcador corria por el
  // centro y se frenaba en los extremos, asi que mover la zona habria movido tambien la
  // dificultad: la misma anchura vale casi el doble de tiempo pegada a una pared.
  strengthSweep:1200,
  // La ventana crece con la ronda, y no es mas espera: con el barrido constante son ~2,5 pasadas
  // por la zona en la primera y ~3,5 en la ultima, que es donde el objetivo ya es minusculo.
  strengthWindowBase:3000,strengthWindowStep:300,
  // Clavarla es el nucleo; el resto de la zona pintada baja hasta .7 y fuera del radio de fallo
  // no puntua. Antes la zona entera valia 1 y justo fuera se seguia puntuando casi 1, asi que
  // rozarla y centrarla daban lo mismo y la banda dibujada no significaba nada.
  strengthCoreRadius:.028,strengthZoneRadius:.1,strengthMissRadius:.2,strengthEdgeScore:.7,
  // Los tres radios se estrechan juntos por ronda, asi que la curva de nota conserva su forma y
  // solo se afila: 67 ms de "en el centro" en la primera ronda, 35 ms en la quinta. Es la curva
  // que antes daba la aceleracion, que con la zona movil habria dejado de ser medible.
  strengthZoneShrink:.85,
  // Y la zona cambia de sitio cada ronda. Fuera de esta banda el radio de fallo se saldria de la
  // pista y truncaria el acercamiento por un lado; el salto minimo evita que la nueva posicion
  // pase por la de la ronda anterior.
  strengthZoneMin:.22,strengthZoneMax:.78,strengthZoneShift:.18,
  // El ultimo segundo de la barra de tiempo avisa con color.
  strengthTimeWarning:1000,
  // Pausa para leer el veredicto de la ronda antes de que cambie la pantalla.
  verdictDelay:700,
  // La tarjeta de ronda tiene que dar tiempo a leerse; con 600 ms no se registraba.
  prepare:1000});
 const launchers={};let active=null,briefingExit=null;
 // Un `<dialog>` modal no impide que la pagina de detras siga desplazandose con el dedo, y en iOS
 // tampoco lo impide `overflow:hidden` en el body: hay que fijarlo. Medido a 375x667: el dialogo no
 // se desplaza (0 px), pero detras quedan 144 px de pagina que si, asi que un arrastre que se salga
 // del canvas de Estilo mueve la pantalla a media partida. Se guarda el desplazamiento y se
 // devuelve al cerrar, que si no la pagina vuelve arriba de golpe.
 let lockedScroll=null;
 const lockPage=()=>{
  if(lockedScroll!==null)return;
  lockedScroll=globalThis.scrollY||0;
  const body=document.body;if(!body?.style)return;
  body.dataset.minigameLock='true';
  body.style.position='fixed';body.style.top=`${-lockedScroll}px`;body.style.left='0';body.style.right='0';body.style.width='100%';
 };
 const unlockPage=()=>{
  if(lockedScroll===null)return;
  const y=lockedScroll;lockedScroll=null;
  const body=document.body;if(body?.style){delete body.dataset.minigameLock;
   body.style.position='';body.style.top='';body.style.left='';body.style.right='';body.style.width='';}
  globalThis.scrollTo?.(0,y);
 };
 // Un solo listener para todas las salidas: Cancelar, Escape, el cierre programatico y la parada
 // del runtime pasan por `close`. Se engancha al abrir y no al cargar el modulo: los scripts de
 // `tools/design/` evaluan este fichero sin DOM, y tocar `document` ahi reventaba la carga.
 let releaseHooked=false;
 const openDialog=dialog=>{
  if(!releaseHooked){releaseHooked=true;dialog.addEventListener?.('close',unlockPage);}
  if(!dialog.open)dialog.showModal();lockPage();
 };
 // Un toque corto confirma, uno largo corrige. Es el unico canal de respuesta inmediata que tiene
 // el juego: no hay sonido, y en movil el dedo tapa justo la casilla que acaba de cambiar. Se
 // respeta prefers-reduced-motion, que es el interruptor que el jugador ya tiene.
 const HAPTICS=Object.freeze({tap:8,good:18,fair:[10,40,10],bad:70});
 const stillPatterns=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const haptic=name=>{if(stillPatterns())return false;const pattern=typeof name==='string'?HAPTICS[name]:name;
  if(pattern===undefined)return false;try{return globalThis.navigator?.vibrate?.(pattern)===true;}catch{return false;}};
 const gradeHaptic=grade=>haptic(grade>=4?[18,60,18,60,18]:grade>=2?[18,60,18]:'bad');
 const memoryWindow=length=>config.memoryBase+config.memoryStep*length;
 const newChain=length=>Array.from({length},()=>Math.floor(Math.random()*4));
 const strengthWindow=round=>config.strengthWindowBase+config.strengthWindowStep*round;
 // El 5 pedia un 1,0 exacto. Con la precision continua de Fuerza y el trazo a pulso de Estilo eso
 // no es "excelente", es irrepetible, y la sesion se cobra igual salga como salga: un tramo
 // inalcanzable solo convierte el mejor resultado posible en una perdida neta. Estos umbrales son
 // los unicos del juego; Estilo entrega su media y se puntua aqui, para no llevar dos curvas.
 const GRADE_THRESHOLDS=Object.freeze([.92,.78,.58,.32]);
 const grade=score=>{const value=Math.max(0,Math.min(1,score));const step=GRADE_THRESHOLDS.findIndex(min=>value>=min);return step<0?1:5-step;};
 // La zona ya no vive fija en el centro: se le pasan su centro y la escala de la ronda. Los
 // valores por defecto son la geometria de la primera ronda.
 const strengthPrecision=(position,centre=.5,scale=1)=>{
  const core=config.strengthCoreRadius*scale,zone=config.strengthZoneRadius*scale,miss=config.strengthMissRadius*scale;
  // El margen solo abre el borde del nucleo: sin el, el limite cae fuera por coma flotante.
  const offset=Math.abs(position-centre);
  if(offset<=core+1e-9)return 1;
  if(offset<=zone)return 1-(1-config.strengthEdgeScore)*(offset-core)/(zone-core);
  const score=config.strengthEdgeScore*(1-(offset-zone)/(miss-zone));return score>1e-9?score:0;
 };
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 // Amabilidad y Estilo no entran: Amabilidad es una caida continua sin rondas y Estilo lleva las
 // suyas dentro de su modulo.
 const roundsFor=attribute=>attribute==='iq'?config.memoryRounds:config.strengthRounds;
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
  // Amabilidad no tiene rondas que contar, asi que dice lo que si define su partida: cuantas latas
  // caen y cuanto dura.
  steps.append(node('p',attribute==='kindness'
   ?t('minigame.kindness.briefSummary',{cans:CleanupCatch.config.cans,seconds:Math.round(CleanupCatch.duration()/1000)})
   :t('minigame.common.rounds',{rounds:roundsFor(attribute)}),'briefing-rounds'));
  const go=node('button',t('minigame.common.start')),back=node('button',t('minigame.common.notNow'));
  go.type='button';back.type='button';
  // Reglas y partida comparten dialogo. Cerrarlo para volver a abrirlo no vale: el evento `close`
  // llega encolado, DESPUES de que la partida haya arrancado, y el listener que lo escucha la
  // cancela con el coste ya cobrado. Empezar solo reemplaza el contenido; cerrar es salir.
  const shut=then=>{briefingExit=null;if(dialog.open)dialog.close();then();};
  go.addEventListener('click',()=>{briefingExit=null;if(!start(attribute)&&dialog.open)dialog.close();});
  back.addEventListener('click',()=>shut(()=>close(attribute)));
  briefingExit=()=>close(attribute);
  host.append(node('h2',modeName(attribute)),node('p',t(`minigame.${attribute}.instructions`)),steps,go,back);
  openDialog(dialog);return true;
 }
 // El coste de la sesion se cobra al abrir, no al puntuar. Si llegara con el resultado, cancelar
 // una partida torcida saldria gratis y la forma optima de jugar seria reintentar hasta clavarla.
 // Por eso `cancel` solo devuelve el gasto cuando el corte no es del jugador: pestana en segundo
 // plano, cierre de la pagina o parada del runtime. Rendirse a mano cuesta lo mismo que perder.
 function launch(attribute,{begin=()=>true,abandon=()=>{},repeat=null,canRepeat=()=>false,commit,onActive=()=>{},formatReward=()=>'',bestScore=()=>0}){
  if(!Object.hasOwn(modes,attribute)||active||!begin(attribute))return false;
  let done=false,timer=null,frame=null,dialog=null,dispose=null;
  const requestFrame=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
  const cancelFrame=globalThis.cancelAnimationFrame||clearTimeout;
  const stop=()=>{clearTimeout(timer);timer=null;if(frame!==null)cancelFrame(frame);frame=null;dispose?.();dispose=null;};
  const cancel=(refund=false)=>{if(done)return false;done=true;stop();active=null;if(dialog?.open)dialog.close();onActive(false);if(refund)abandon(attribute);return false;};
  const complete=(gain=5,score=0)=>{if(done)return false;done=true;stop();active=null;try{return commit(attribute,Math.max(1,Math.min(5,Math.round(gain))),Math.max(0,Math.min(1000,Math.round(score))));}finally{onActive(false);}};
  active={cancel};onActive(true);
  if(launchers[attribute])return launchers[attribute]({complete,cancel,attribute});
  dialog=document.getElementById('training-game');const host=document.getElementById('training-game-content');host.replaceChildren();
  const setText=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
  const title=node('h2',modeName(attribute)),hint=node('p',''),status=node('p',''),field=node('div',undefined,'minigame-field'),roundCard=node('div',undefined,'round-card'),exit=node('button',t('minigame.common.cancel'));exit.type='button';exit.addEventListener('click',()=>cancel());
  host.append(title,hint,status,field,exit);openDialog(dialog);
  let earned=0,total=0,targets=[],sequence=[],answer=0,round=0,hit=false,phase='prepare',phaseStart=performance.now(),roundCorrect=true;
  const controls=[];const held=new Set(),presses=new Map();
  let lights=0,visibleStrengthPosition=.5,zoneCentre=.5,zoneScale=1,zoneStart=1,strengthView=null;
  // Ida y vuelta lineal. El marcador arranca en el extremo mas lejano a la zona de la ronda: asi
  // no se entra nunca ya encima del objetivo, y queda un recorrido entero para leer donde ha
  // caido la banda antes de la primera pasada.
  const strengthPosition=elapsed=>{const leg=(elapsed%(config.strengthSweep*2))/config.strengthSweep,x=leg<=1?leg:2-leg;return zoneStart?1-x:x;};
  // La zona salta a un sitio nuevo cada ronda, dentro de la banda util y lejos de la anterior. Se
  // sortea sobre el hueco permitido en vez de reintentar hasta acertar: reintentar no termina si
  // el generador esta fijado, como en las pruebas.
  const pickZone=previous=>{const lo=config.strengthZoneMin,hi=config.strengthZoneMax;
   if(previous===null)return lo+Math.random()*(hi-lo);
   const left=Math.max(0,previous-config.strengthZoneShift-lo),right=Math.max(0,hi-previous-config.strengthZoneShift),span=left+right;
   if(span<=0)return previous>(lo+hi)/2?lo:hi;
   const pick=Math.random()*span;return pick<left?lo+pick:previous+config.strengthZoneShift+(pick-left);};
  const paintZone=()=>{const zone=config.strengthZoneRadius*zoneScale,core=config.strengthCoreRadius*zoneScale;
   strengthView.zone.style.left=`${(zoneCentre-zone)*100}%`;strengthView.zone.style.width=`${zone*200}%`;
   strengthView.core.style.left=`${(zoneCentre-core)*100}%`;strengthView.core.style.width=`${core*200}%`;};
  const paintTime=remaining=>{const left=Math.max(0,remaining);
   strengthView.time.style.width=`${left/strengthWindow(round)*100}%`;
   const warn=left<=config.strengthTimeWarning?'1':'0';if(strengthView.time.dataset.warn!==warn)strengthView.time.dataset.warn=warn;};
  const button=(label,fn,onPress=false)=>{const b=node('button',label);b.type='button';b.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;if(onPress){event.preventDefault();fn();return;}b.setPointerCapture?.(event.pointerId);held.add(b);presses.set(b,{round,valid:phase==='play'});});b.addEventListener('pointerup',()=>held.delete(b));b.addEventListener('pointercancel',()=>{held.delete(b);presses.delete(b);});b.addEventListener('lostpointercapture',()=>held.delete(b));b.addEventListener('click',event=>{if(onPress){if(event.detail===0)fn();return;}const press=presses.get(b);presses.delete(b);if(press&&press.round!==round)return;fn(press);});field.append(b);controls.push(b);return b;};
  // El rendimiento continuo ya se calculaba y se tiraba al colapsarlo en una nota del 1 al 5.
  // Aqui se expone como marcador de 0 a 1000, que no tiene tope de mejora: cuando el atributo llega
  // a 100 y el entrenamiento se cierra, la marca sigue siendo superable. Intelecto no normaliza un
  // rendimiento sino que cuenta rondas, asi que su marcador son las luces acertadas sobre el total.
  // Estilo y Amabilidad entregan su rendimiento ya normalizado y `finish` lo recibe: los dos viven
 // en modulos aparte y nunca tocan `earned`/`total`, asi que sin eso su marcador salia 0 siempre.
 const performanceRatio=()=>attribute==='iq'?lights/MEMORY_LIGHTS:total?Math.max(0,Math.min(1,earned/total)):0;
  const finish=(result=null,ratio=null)=>{const gain=result??(attribute==='iq'?Math.max(1,earned):grade(total?earned/total:0)),score=Math.round((ratio??performanceRatio())*1000),ok=complete(gain,score);field.replaceChildren();setText(hint,ok?t(`minigame.result.grade.${gain}`):t('minigame.result.commitFailed'));setText(status,ok?t('minigame.result.statGain',{stat:modeName(attribute),gain,reward:formatReward(gain)}):t('minigame.result.noReward'));
   if(ok){const best=bestScore(attribute);
    field.append(node('p',score>=best?t('minigame.result.scoreBest',{score}):t('minigame.result.score',{score,best}),'minigame-score'));}exit.textContent=t('minigame.common.back');exit.addEventListener('click',()=>dialog.close());
   if(ok)gradeHaptic(gain);
   // Volver a practicar no deberia costar tres toques por el panel de Entrenamiento: es lo que se
   // hace despues de casi cada partida. Solo se ofrece si la siguiente sesion se puede pagar.
   if(ok&&repeat&&canRepeat(attribute)){const again=node('button',t('minigame.common.again'),'minigame-again');again.type='button';
    again.addEventListener('click',()=>{if(!repeat(attribute)&&dialog.open)dialog.close();});field.append(again);}};
  if(attribute==='style'){dispose=StyleTracing.mount({field,hint,status,node,haptic,onFinish:mean=>finish(grade(mean),mean)});return true;}
  // Amabilidad tampoco pasa por la maquinaria de rondas: es una caida continua y la lleva su modulo.
  if(attribute==='kindness'){dispose=CleanupCatch.mount({field,hint,status,node,haptic,onFinish:ratio=>finish(grade(ratio),ratio)});return true;}
  if(attribute==='iq'){
   setText(hint,t('minigame.iq.instructions'));
   for(let i=0;i<4;i++)button(['A','B','C','D'][i],()=>{
    if(done||phase!=='answer'||performance.now()-phaseStart>=memoryWindow(sequence.length))return;
    answer++;
    // Fallar cortaba la ronda solo por dentro: seguias tecleando cuatro luces mas sabiendo que ya
    // la habias perdido. Ahora se dice y se pasa, como en cualquier Simon.
    if(i!==sequence[answer-1]){roundCorrect=false;haptic('bad');setText(hint,t('minigame.iq.wrong'));verdict();return;}
    lights++;haptic('tap');setText(hint,t('minigame.iq.entered',{done:answer,total:sequence.length}));
    if(answer===sequence.length){earned++;haptic('good');setText(hint,t('minigame.iq.right'));verdict();}
   });total=config.memoryRounds;
  }else if(attribute==='strength'){
   setText(hint,t('minigame.strength.instructions'));
   // La pista entera es el control: con el dedo miras la barra, no un boton pequeno en una
   // esquina, asi que el objetivo tactil tiene que ser la barra.
   const track=button('',()=>{if(done||hit||phase!=='play')return;hit=true;const precision=strengthPrecision(visibleStrengthPosition,zoneCentre,zoneScale);earned+=precision;
    haptic(precision===1?'good':precision>0?'fair':'bad');
    setText(hint,precision===1?t('minigame.strength.perfect'):precision>=config.strengthEdgeScore?t('minigame.strength.close'):precision>0?t('minigame.strength.edge'):t('minigame.strength.miss'));
    // Sin esto la ronda seguia corriendo hasta agotar la ventana: acertar pronto premiaba con
    // dos segundos y medio de pantalla quieta.
    phase='resolve';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);},true);
   track.className='timing-track';
   const zone=node('div',undefined,'timing-zone'),core=node('div',undefined,'timing-core'),marker=node('div',undefined,'timing-marker'),time=node('div',undefined,'timing-time'),caption=node('span',t('minigame.strength.action'),'timing-caption');
   // El tiempo se agota EN la pista: en un juego de pulsacion exacta no se puede apartar la vista
   // de la barra para leer una linea de texto, y hasta ahora la ronda se cortaba sin aviso.
   // Zona y nucleo los coloca cada ronda `paintZone`, que es quien sabe donde ha caido.
   track.append(zone,core,marker,time,caption);
   strengthView={zone,core,time};targets=[marker];total=config.strengthRounds;
  }

  function beginRound(){
   phaseStart=performance.now();hit=false;
   if(attribute==='iq'){
    // Cada ronda es una cadena nueva, no la anterior mas una luz: alargar un prefijo ya memorizado
    // dejaba las ultimas rondas en recordar un solo paso.
    phase='show';answer=0;roundCorrect=true;
    sequence=newChain(config.memoryLengths[round]??config.memoryLengths.at(-1));
   }else{
    phase='play';
    if(attribute==='strength'){zoneCentre=pickZone(round?zoneCentre:null);zoneScale=config.strengthZoneShrink**round;zoneStart=zoneCentre<=.5?1:0;
     paintZone();paintTime(strengthWindow(round));visibleStrengthPosition=strengthPosition(0);targets[0].style.left=`${visibleStrengthPosition*100}%`;}
    controls.forEach(b=>b.disabled=false);
   }
  }
  const verdict=()=>{phase='resolve';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);};
  function nextRound(){
   round++;const count=attribute==='iq'?config.memoryRounds:total;
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
    // Intelecto y Fuerza dejan su veredicto en el hint, asi que aqui no se pisa: solo se le da
    // tiempo a leerlo.
    if(elapsed>=config.verdictDelay&&!held.size)nextRound();
   }else if(attribute==='iq'){
    if(phase==='show'){
     setText(hint,t('minigame.common.observeRound',{round:round+1,total:config.memoryRounds}));
     const lit=sequence[Math.floor(elapsed/config.memoryFlash)];
     controls.forEach((b,i)=>{b.disabled=true;b.classList.toggle('lit',i===lit&&elapsed%config.memoryFlash<380);});
     if(elapsed>=sequence.length*config.memoryFlash){phase='answer';phaseStart=performance.now();controls.forEach(b=>{b.disabled=false;b.classList.remove('lit');});}
    }else{if(!answer)setText(hint,t('minigame.iq.repeat'));if(elapsed>=memoryWindow(sequence.length)){haptic('bad');setText(hint,t('minigame.iq.tooSlow'));verdict();}}
   }else{
    const duration=strengthWindow(round);
    // Dejar pasar la ventana tambien se cuenta, y se dice con sus palabras: "fuera de zona"
    // describia un fallo de punteria que en realidad no se ha llegado a cometer.
    if(elapsed>=duration){hit=true;haptic('bad');paintTime(0);setText(hint,t('minigame.strength.timeout'));phase='resolve';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);}
    else if(!hit){setText(hint,t('minigame.strength.now'));visibleStrengthPosition=strengthPosition(elapsed);targets[0].style.left=`${visibleStrengthPosition*100}%`;paintTime(duration-elapsed);controls[0].disabled=false;}
    else controls[0].disabled=true;
   }
   if(done)return;
   // Fuerza tenia ventana de ronda pero no la enseñaba: se podia esperar a estar seguro y que la
   // ronda cambiara sola. Ahora la cuenta atras esta en la pista y tambien aqui, como en Intelecto.
   setText(status,attribute==='iq'?phase==='answer'?t('minigame.common.responseRound',{round:Math.min(round+1,config.memoryRounds),total:config.memoryRounds,seconds:Math.max(0,Math.ceil((memoryWindow(sequence.length)-(performance.now()-phaseStart))/1000))}):t('minigame.common.observeStatus',{round:Math.min(round+1,config.memoryRounds),total:config.memoryRounds})
    :attribute==='strength'&&phase==='play'?t('minigame.common.timedRound',{round:round+1,total:roundsFor(attribute),seconds:Math.max(0,Math.ceil((strengthWindow(round)-(performance.now()-phaseStart))/1000))})
    :t('minigame.common.round',{round:round+1,total}));
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
