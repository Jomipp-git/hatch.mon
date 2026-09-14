'use strict';
globalThis.StyleTracing=(()=>{
 const t=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
 const config=Object.freeze({width:320,height:220,tolerances:[18,16,14,12,10],samples:120});
 // Las cinco familias son fijas y en orden de dificultad, porque la tolerancia baja con la ronda;
 // lo que cambia por partida es la amplitud y el sentido de cada trazo. Antes las cinco curvas
 // eran identicas en cada partida y a la tercera ya era memoria muscular.
 const curves=[
  (t,v)=>[30+260*t,160-(80+40*v.amplitude)*Math.sin(Math.PI*t)],
  (t,v)=>[25+270*t,110+(45+25*v.amplitude)*Math.sin(2*Math.PI*t)*v.way],
  (t,v)=>[160+(80+30*v.amplitude)*Math.sin(2*Math.PI*t)*v.way,25+170*t],
  (t,v)=>{const angle=-Math.PI/2+t*Math.PI*2*(1.25+v.amplitude*.5)*v.way,r=75-55*t;return [160+Math.cos(angle)*r,110+Math.sin(angle)*r];},
  (t,v)=>[25+270*t,110+(50+25*v.amplitude)*Math.sin(3*Math.PI*t)*Math.sin(Math.PI*t)*v.way]
 ];
 function variant(seed,round){
  let h=(seed^Math.imul(round+1,2654435761))>>>0;
  h=Math.imul(h^h>>>15,2246822507)>>>0;h=Math.imul(h^h>>>13,3266489909)>>>0;
  return {amplitude:((h>>>8)&255)/255,way:h&1?1:-1};
 }
 const path=(round,seed=0)=>{const v=variant(seed,round);return Array.from({length:config.samples+1},(_,i)=>curves[round](i/config.samples,v));};
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 // `scale` compensa que el lienzo se dibuje mas pequeno de lo que mide su espacio logico: en un
 // movil de 375 px el canvas de 320 se pinta a ~228, asi que una tolerancia de 10 quedaba en 7 px
 // reales, mas fina que la yema de un dedo y con el dedo encima tapando la linea.
 function createScorer(round,{seed=0,scale=1}={}){
  // La escala solo puede ensanchar: un lienzo mas grande que su espacio logico no debe apretar la
  // tolerancia por debajo de la disenada para la ronda.
  const widen=value=>config.tolerances[round]*Math.max(1,Number.isFinite(value)&&value>0?value:1);
  const points=path(round,seed);let tolerance=widen(scale),progress=0,travel=0,error=0,previous=null;
  const current=()=>{const i=Math.min(points.length-2,Math.floor(progress)),t=progress-i;return [points[i][0]+(points[i+1][0]-points[i][0])*t,points[i][1]+(points[i+1][1]-points[i][1])*t];};
  function start(p){if(distance(p,current())>tolerance)return false;previous=p;return true;}
  function sample(p,weight){
   let nearest=Infinity,best=progress;
   for(let i=Math.max(0,Math.floor(progress)-1);i<Math.min(points.length-1,Math.floor(progress)+9);i++){
    const a=points[i],b=points[i+1],dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
    const d=distance(p,[a[0]+dx*t,a[1]+dy*t]);if(d<nearest){nearest=d;best=i+t;}
   }
   travel+=weight;error+=weight*Math.min(1,Math.max(0,nearest-tolerance*.3)/(tolerance*.7));
   if(nearest<=tolerance)progress=Math.max(progress,best);
   return nearest<=tolerance;
  }
  function move(p){if(!previous)return false;const from=previous,length=distance(from,p),steps=Math.max(1,Math.ceil(length/2));let centered=true;
   for(let i=1;i<=steps;i++)centered=sample([from[0]+(p[0]-from[0])*i/steps,from[1]+(p[1]-from[1])*i/steps],length/steps)&&centered;
   previous=p;return centered;
  }
  const end=()=>{previous=null;};
  const rescale=next=>{tolerance=widen(next);};
  return {points,get tolerance(){return tolerance;},rescale,start,move,end,current,progress:()=>progress/(points.length-1),complete:()=>progress>=points.length-1-.5,score:()=>Math.min(1,progress/(points.length-1))*(travel?Math.max(0,1-error/travel):0)};
 }
 function mount({field,hint,status,node,haptic=()=>false,onFinish}){
  field.className='minigame-field tracing-field';hint.textContent=t('minigame.style.instructions');
  const canvas=node('canvas'),next=node('button',t('minigame.style.finishPath'));canvas.width=config.width;canvas.height=config.height;canvas.className='tracing-canvas';canvas.setAttribute('aria-label',t('minigame.style.canvasLabel'));next.type='button';next.disabled=true;field.append(canvas,next);
  // El seed queda en el DOM para que una prueba pueda reconstruir el mismo trazo que se esta
  // pintando sin que el modulo tenga que guardar estado global.
  const seed=Math.floor(Math.random()*2147483647);canvas.dataset.seed=String(seed);
  const measure=rect=>{const box=rect||canvas.getBoundingClientRect();return box?.width>0?config.width/box.width:1;};
  let round=0,scorer=createScorer(0,{seed,scale:measure()}),pointer=null,disposed=false,centered=true,trail=[],scores=[],paintFrame=null,gestureRect=null;
  const requestFrame=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16)),cancelFrame=globalThis.cancelAnimationFrame||clearTimeout;
  function scheduleDraw(){if(paintFrame!==null||disposed)return;paintFrame=requestFrame(()=>{paintFrame=null;if(!disposed)draw();});}
  function draw(){
   const ctx=canvas.getContext('2d');ctx.clearRect(0,0,config.width,config.height);ctx.lineCap='round';ctx.lineJoin='round';
   const stroke=(points,color,width)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
   stroke(scorer.points,'#b1c1ad',scorer.tolerance*2);stroke(scorer.points,'#718568',2);
   const end=Math.floor(scorer.progress()*(scorer.points.length-1));stroke([...scorer.points.slice(0,end+1),scorer.current()],'#263b30',5);
   ctx.fillStyle=centered?'#52694a':'#263b30';for(const p of trail)ctx.fillRect(Math.round(p[0]/3)*3-2,Math.round(p[1]/3)*3-2,4,4);
   const start=scorer.current(),finish=scorer.points.at(-1);ctx.strokeStyle='#263b30';ctx.lineWidth=2;ctx.strokeRect(finish[0]-6,finish[1]-6,12,12);ctx.fillStyle='#263b30';ctx.fillRect(start[0]-6,start[1]-6,12,12);ctx.fillStyle='#d5dfbb';ctx.fillRect(start[0]-2,start[1]-2,4,4);
   // Terminar solo se ofrece con el trazo empezado: esta justo debajo del lienzo y es facil rozarlo
   // al levantar el dedo, y antes eso cerraba la ronda con un cero.
   next.disabled=scorer.progress()<=0;
   status.textContent=t('minigame.style.progress',{round:round+1,total:curves.length,percent:Math.round(scorer.progress()*100)});
  }
  function release(){const id=pointer;pointer=null;scorer.end();if(id!==null&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);}
  function advance(){if(disposed||next.disabled)return;release();const score=scorer.score();scores.push(score);haptic(score>=.75?'good':score>=.4?'fair':'bad');round++;if(round===curves.length){disposed=true;onFinish(scores.reduce((a,b)=>a+b,0)/scores.length);return;}scorer=createScorer(round,{seed,scale:measure()});trail=[];centered=true;draw();}
  const position=e=>{const r=gestureRect||canvas.getBoundingClientRect();return [(e.clientX-r.left)*config.width/r.width,(e.clientY-r.top)*config.height/r.height];};
  canvas.addEventListener('pointerdown',e=>{if(disposed||pointer!==null||(e.button!==undefined&&e.button!==0))return;e.preventDefault();gestureRect=canvas.getBoundingClientRect();scorer.rescale(measure(gestureRect));if(!scorer.start(position(e))){haptic('bad');hint.textContent=t('minigame.style.startHere');return;}hint.textContent=t('minigame.style.instructions');pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);trail=[position(e)];scheduleDraw();});
  canvas.addEventListener('pointermove',e=>{if(disposed||e.pointerId!==pointer)return;e.preventDefault();const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e]){const p=position(sample);centered=scorer.move(p);trail.push(p);if(trail.length>12)trail.shift();}canvas.dataset.centered=String(centered);scheduleDraw();});
  canvas.addEventListener('pointerup',e=>{if(disposed||e.pointerId!==pointer)return;e.preventDefault();scorer.move(position(e));release();if(scorer.complete())advance();else draw();});
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===pointer){release();draw();}});
  next.addEventListener('click',advance);draw();
  return ()=>{disposed=true;if(paintFrame!==null)cancelFrame(paintFrame);paintFrame=null;release();};
 }
 // Sin `grade` propio: la media del trazo se entrega cruda y la puntua TrainingActivities, que es
 // donde viven los umbrales de las cuatro actividades.
 return Object.freeze({config,path,createScorer,mount});
})();
