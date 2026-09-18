'use strict';
// Amabilidad. Caida continua de 26 objetos durante ~26 s: se recogen las latas con un cesto que
// sigue al dedo y se esquivan flores y hojas. Vive aparte de `trainingActivities.js` por el mismo
// motivo que `styleTracing.js`: no tiene rondas, asi que la maquinaria de tarjeta, ventana y
// veredicto no le sirve. Entrega una nota cruda de 0 a 1 y la puntua TrainingActivities, que es
// donde viven los umbrales de las cuatro actividades.
globalThis.CleanupCatch=(()=>{
 const t=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
 // Cuantas latas y cuantas plantas caen lo fija la config, nunca el azar: el denominador del
 // marcador tiene que ser el mismo en todas las partidas o la mejor marca mide la suerte. El azar
 // elige el ORDEN, la columna y nada mas — azar de entrada, no de salida.
 const config=Object.freeze({
  // Con 18+8 el juego salia demasiado facil, y la medicion decia por que: solo el 2% de los pasos
  // de un objeto al siguiente dejaba menos de 250 ms de margen, o sea que casi nunca habia prisa.
  // Con 22+10 ese porcentaje sube al 17% y el margen del peor caso baja de 167 ms a 35. Mas arriba
  // no se puede: a 34 objetos el margen se vuelve negativo y el +5 empieza a depender del sorteo.
  cans:22,plants:10,
  // El hueco entre salidas se cierra con el indice, asi que la pista se va llenando.
  gapBase:940,gapStep:10,
  // Y cada objeto tarda menos en cruzar: 2.650 ms el primero, 1.450 el ultimo (-45%), la misma
  // familia de curva que Fuerza (-48%) y Estilo (-44%). Es la unica curva que hay.
  fallBase:2650,fallDrop:1200,
  // «Caen a diferentes velocidades»: tres ritmos que rotan por indice. Es determinista —la suma de
  // dificultad no cambia entre partidas— pero en pantalla nunca caen dos iguales seguidos.
  fallVariation:Object.freeze([1,.84,1.16]),
  // Banda del cesto, en altura normalizada. Es una franja y no una linea: con una linea, un objeto
  // rapido podia saltarsela entre dos fotogramas y no llegar a tocarse nunca.
  // El borde inferior estaba en .94 y dejaba solo 71 ms de margen para cruzar la pista despues de
  // esquivar una planta (medido con kindness-reach.cjs): una planta solo se puede soltar cuando SALE
  // de la banda, mientras que una lata desaparece al entrar. Con .90 el margen sube a 150 ms.
  catchTop:.80,catchBottom:.90,
  // El ancho del objeto es a la vez su dibujo y su caja de colision: lo que se ve es lo que puntua.
  basketWidth:.24,itemWidth:.10,
  // El cesto no se teletransporta al dedo: lo persigue. Sin esto, arrastrar de un lado a otro
  // recogia todo lo que hubiera en medio sin haberlo pretendido.
  basketSpeed:.0042,
  // Para teclado, que no tiene posicion absoluta a la que ir.
  keyStep:.06});
 const CANS=Object.freeze(['lata']),PLANTS=Object.freeze(['flor','hoja']);
 const spawnAt=index=>{let at=0;for(let i=0;i<index;i++)at+=config.gapBase-config.gapStep*i;return at;};
 const total=()=>config.cans+config.plants;
 const fallMs=index=>{const span=total()-1||1;
  return (config.fallBase-config.fallDrop*index/span)*config.fallVariation[index%config.fallVariation.length];};
 // Duracion teorica: cuando aterriza el ultimo. No es un tope de tiempo, es el final de la lista.
 const duration=()=>{const last=total()-1;return spawnAt(last)+fallMs(last);};
 // Baraja de Fisher-Yates sobre un multiconjunto fijo. Se sortea el orden, no la cantidad.
 function deal(rng=Math.random){
  const deck=[...Array.from({length:config.cans},()=>true),...Array.from({length:config.plants},()=>false)];
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  return deck;
 }
 function plan(rng=Math.random){
  return deal(rng).map((isCan,index)=>({index,isCan,
   kind:(isCan?CANS:PLANTS)[Math.floor(rng()*(isCan?CANS:PLANTS).length)],
   // La columna se sortea dentro de la pista util, dejando medio objeto de margen a cada lado.
   x:config.itemWidth/2+rng()*(1-config.itemWidth),
   at:spawnAt(index),fall:fallMs(index)}));
 }
 function mount({field,hint,status,node,haptic=()=>false,onFinish,now=()=>performance.now(),rng=Math.random}){
  field.className='minigame-field catch-field';
  hint.textContent=t('minigame.kindness.instructions');
  const lane=node('div',undefined,'catch-lane');
  lane.setAttribute('role','application');lane.setAttribute('aria-label',t('minigame.kindness.laneLabel'));
  lane.tabIndex=0;
  const basket=node('div',undefined,'catch-basket');
  const time=node('div',undefined,'catch-time');
  lane.append(basket,time);field.append(lane);
  const items=plan(rng),span=duration();
  let basketX=.5,target=.5,caught=0,spoiled=0,startedAt=now(),last=startedAt,frame=null,disposed=false,pointer=null,laneRect=null,keys=0;
  const requestFrame=globalThis.requestAnimationFrame||(fn=>setTimeout(fn,16)),cancelFrame=globalThis.cancelAnimationFrame||clearTimeout;
  basket.style.width=`${config.basketWidth*100}%`;
  const paintBasket=()=>{basket.style.left=`${(basketX-config.basketWidth/2)*100}%`;};
  const setText=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
  const clampX=value=>Math.max(config.basketWidth/2,Math.min(1-config.basketWidth/2,value));
  const aim=event=>{const rect=laneRect||lane.getBoundingClientRect();
   if(!(rect?.width>0))return;target=clampX((event.clientX-rect.left)/rect.width);};
  lane.addEventListener('pointerdown',event=>{if(disposed||(event.button!==undefined&&event.button!==0))return;
   event.preventDefault();pointer=event.pointerId;laneRect=lane.getBoundingClientRect();lane.setPointerCapture?.(event.pointerId);aim(event);});
  lane.addEventListener('pointermove',event=>{if(disposed||event.pointerId!==pointer)return;event.preventDefault();
   const samples=event.getCoalescedEvents?.();for(const sample of samples?.length?samples:[event])aim(sample);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])
   lane.addEventListener(name,event=>{if(event.pointerId===pointer){if(lane.hasPointerCapture?.(pointer))lane.releasePointerCapture?.(pointer);pointer=null;laneRect=null;}});
  // El teclado mueve por pasos: sin el, el minijuego solo existe para quien puede arrastrar.
  lane.addEventListener('keydown',event=>{if(disposed)return;
   const step=event.key==='ArrowLeft'?-config.keyStep:event.key==='ArrowRight'?config.keyStep:0;
   if(!step)return;event.preventDefault?.();keys++;target=clampX(target+step);});
  function land(item,hit){
   item.done=true;
   if(hit){if(item.isCan){caught++;haptic('good');}else{spoiled++;haptic('bad');}}
   if(item.node){item.node.dataset.result=hit?(item.isCan?'correct':'wrong'):'gone';
    const gone=item.node;item.node=null;gone.remove?.();}
  }
  function step(){
   if(disposed)return;
   const at=now(),delta=Math.min(120,at-last);last=at;
   // El cesto persigue al dedo a velocidad tope. Con teclado el objetivo ya viene por pasos, asi
   // que la misma persecucion vale para los dos controles.
   const reach=config.basketSpeed*delta,gap=target-basketX;
   basketX=Math.abs(gap)<=reach?target:basketX+Math.sign(gap)*reach;
   paintBasket();
   const elapsed=at-startedAt;
   time.style.width=`${Math.max(0,Math.min(1,elapsed/span))*100}%`;
   for(const item of items){
    if(item.done)continue;
    const progress=(elapsed-item.at)/item.fall;
    if(progress<0)continue;
    if(!item.node){item.node=node('div',undefined,'catch-item');
     item.node.dataset.object=item.kind;item.node.dataset.kind=item.isCan?'can':'plant';
     item.node.setAttribute('aria-hidden','true');
     item.node.style.left=`${(item.x-config.itemWidth/2)*100}%`;item.node.style.width=`${config.itemWidth*100}%`;
     lane.append(item.node);}
    if(progress>=1){land(item,false);continue;}
    item.node.style.top=`${progress*100}%`;
    if(progress>=config.catchTop&&progress<=config.catchBottom&&
       Math.abs(item.x-basketX)<=(config.basketWidth+config.itemWidth)/2)land(item,true);
   }
   setText(hint,t('minigame.kindness.tally',{cans:caught,total:config.cans}));
   setText(status,t('minigame.kindness.timeLeft',{seconds:Math.max(0,Math.ceil((span-elapsed)/1000))}));
   if(items.every(item=>item.done)){disposed=true;
    // Recoger una planta descuenta una lata. Es el unico coste de equivocarse: no se quita nada ya
    // cobrado, se retiene premio, que es como castiga el resto del juego.
    onFinish(Math.max(0,caught-spoiled)/config.cans);return;}
   frame=requestFrame(step);
  }
  paintBasket();frame=requestFrame(step);
  return ()=>{disposed=true;if(frame!==null)cancelFrame(frame);frame=null;
   if(pointer!==null&&lane.hasPointerCapture?.(pointer))lane.releasePointerCapture?.(pointer);pointer=null;};
 }
 return Object.freeze({config,plan,spawnAt,fallMs,duration,deal,mount});
})();
