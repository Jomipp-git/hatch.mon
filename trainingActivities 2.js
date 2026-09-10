'use strict';
globalThis.TrainingActivities=(()=>{
 const modes={iq:'Intelecto',strength:'Fuerza',kindness:'Amabilidad',style:'Estilo'};
 const config=Object.freeze({tick:40,memoryRounds:5,memoryResponse:4000,memoryFlash:550,strengthRounds:5,strengthWindow:3000,cleanupRounds:10,cleanupWindow:1500,prepare:600});
 const launchers={};let active=null;
 const grade=score=>score>=1-1e-9?5:1+Math.floor(Math.max(0,Math.min(1,score))*4);
 function register(attribute,launcher){if(!Object.hasOwn(modes,attribute)||typeof launcher!=='function')throw Error('Actividad no válida');launchers[attribute]=launcher;}
 function launch(attribute,{commit}){
  if(!Object.hasOwn(modes,attribute)||active)return false;
  let done=false,timer=null,dialog=null,dispose=null;
  const stop=()=>{clearTimeout(timer);timer=null;dispose?.();dispose=null;};
  const cancel=()=>{if(done)return false;done=true;stop();active=null;if(dialog?.open)dialog.close();return false;};
  const complete=(gain=5)=>{if(done)return false;done=true;stop();active=null;return commit(attribute,Math.max(1,Math.min(5,Math.round(gain))));};
  active={cancel};
  if(launchers[attribute])return launchers[attribute]({complete,cancel,attribute});
  dialog=document.getElementById('training-game');const host=document.getElementById('training-game-content');host.replaceChildren();
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const title=node('h2',modes[attribute]),hint=node('p',''),status=node('p',''),field=node('div',undefined,'minigame-field'),exit=node('button','Cancelar');exit.type='button';exit.addEventListener('click',cancel);
  host.append(title,hint,status,field,exit);dialog.showModal();
  let earned=0,total=0,targets=[],sequence=[],answer=0,round=0,hit=false,phase='prepare',phaseStart=performance.now(),roundCorrect=true;
  const controls=[];const held=new Set(),presses=new Map();
  const strengthPosition=t=>(Math.sin(t/(420-round*60))+1)/2;
  const button=(label,fn)=>{const b=node('button',label);b.type='button';b.addEventListener('pointerdown',event=>{b.setPointerCapture?.(event.pointerId);held.add(b);presses.set(b,{round,valid:phase==='play'});});b.addEventListener('pointerup',()=>held.delete(b));b.addEventListener('pointercancel',()=>{held.delete(b);presses.delete(b);});b.addEventListener('lostpointercapture',()=>held.delete(b));b.addEventListener('click',()=>{const press=presses.get(b);presses.delete(b);if(press&&press.round!==round)return;fn(press);});field.append(b);controls.push(b);return b;};
  const finish=(result=null)=>{const gain=result??(attribute==='iq'?Math.max(1,earned):grade(total?earned/total:0)),ok=complete(gain);field.replaceChildren();hint.textContent=ok?['','Sigue practicando','Un buen comienzo','¡Correcto!','¡Muy bien!','¡Perfecto!'][gain]:'No se pudo completar: revisa energía y AP.';status.textContent=ok?`${modes[attribute]} · +${gain}`:'Sin coste ni recompensa';exit.textContent='Volver';exit.addEventListener('click',()=>dialog.close());};
  if(attribute==='style'){dispose=StyleTracing.mount({field,hint,status,node,onFinish:finish});return true;}
  if(attribute==='iq'){
   hint.textContent='Observa las luces y repite el orden.';
   for(let i=0;i<4;i++)button(['A','B','C','D'][i],()=>{
    if(done||phase!=='answer'||performance.now()-phaseStart>=config.memoryResponse)return;
    if(i!==sequence[answer])roundCorrect=false;answer++;
    if(answer===sequence.length){if(roundCorrect)earned++;nextRound();}
   });total=config.memoryRounds;
  }else if(attribute==='strength'){
   hint.textContent='Pulsa cuando el marcador entre en la zona central.';
   const track=node('div',undefined,'timing-track'),zone=node('div',undefined,'timing-zone'),marker=node('div',undefined,'timing-marker');track.append(zone,marker);field.append(track);
   button('¡Ahora!',()=>{if(done||hit||phase!=='play')return;const t=performance.now()-phaseStart;if(t>=config.strengthWindow)return;hit=true;const distance=Math.abs(strengthPosition(t)-.5);const precision=Math.max(0,1-Math.max(0,distance-.1)/.4);earned+=precision;hint.textContent=precision===1?'¡En el centro!':precision>0?'Cerca del centro':'Fuera de zona';});
   targets=[marker];total=config.strengthRounds;
  }else if(attribute==='kindness'){
   hint.textContent='Recoge PAPEL, LATA y BOTELLA. Conserva FLOR y HOJA.';
   for(let i=0;i<6;i++)button('',press=>{if(done||phase!=='play'||(!press?.valid&&performance.now()-phaseStart>=config.cleanupWindow)||controls[i].disabled)return;controls[i].disabled=true;earned+=targets[i]?1:-1;hint.textContent=targets[i]?'¡Recogido!':'Eso se conserva';controls[i].dataset.result=targets[i]?'correct':'wrong';});
  }

  function beginRound(){
   phaseStart=performance.now();hit=false;
   if(attribute==='iq'){
    phase='show';answer=0;roundCorrect=true;sequence=Array.from({length:round+2},()=>Math.floor(Math.random()*4));
   }else{
    phase='play';controls.forEach(b=>b.disabled=false);
    if(attribute==='kindness'){
     const offset=Math.floor(Math.random()*6);targets=controls.map((_,i)=>(i+offset)%6<3);total+=3;
     controls.forEach((b,i)=>{b.disabled=false;delete b.dataset.result;b.textContent=targets[i]?['PAPEL','LATA','BOTELLA'][i%3]:['FLOR','HOJA'][i%2];b.dataset.object=b.textContent.toLowerCase();});
    }
   }
  }
  function nextRound(){
   round++;const count=attribute==='iq'?config.memoryRounds:attribute==='kindness'?config.cleanupRounds:total;
   if(round>=count){finish();return;}if(attribute==='strength'){phase='prepare';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);}else beginRound();
  }
  function tick(){
   if(done)return;field.dataset.phase=phase;const elapsed=performance.now()-phaseStart;
   if(phase==='prepare'){
    hint.textContent='PREPARADOS…';controls.forEach(b=>b.disabled=true);if(elapsed>=config.prepare)beginRound();
   }else if(phase==='resolve'){hint.textContent='Siguiente tanda…';if(elapsed>=300&&!held.size)nextRound();
   }else if(attribute==='iq'){
    if(phase==='show'){
     hint.textContent=`Ronda ${round+1}/5 · Observa…`;
     const lit=sequence[Math.floor(elapsed/config.memoryFlash)];
     controls.forEach((b,i)=>{b.disabled=true;b.classList.toggle('lit',i===lit&&elapsed%config.memoryFlash<380);});
     if(elapsed>=sequence.length*config.memoryFlash){phase='answer';phaseStart=performance.now();controls.forEach(b=>{b.disabled=false;b.classList.remove('lit');});}
    }else{hint.textContent='Repite la secuencia.';if(elapsed>=config.memoryResponse)nextRound();}
   }else{
    const duration=attribute==='strength'?config.strengthWindow:config.cleanupWindow;
    if(elapsed>=duration){if(attribute==='kindness'){if(!held.size){phase='resolve';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);}}else nextRound();}
    else if(attribute==='strength'){if(!hit)hint.textContent='¡AHORA! Pulsa en la zona central';targets[0].style.left=`${strengthPosition(elapsed)*100}%`;controls[0].disabled=hit;}

    else if(!hint.textContent.startsWith('¡Recogido!')&&hint.textContent!=='Eso se conserva')hint.textContent='Recoge basura; conserva plantas.';
   }
   if(done)return;
   status.textContent=attribute==='iq'?`Ronda ${Math.min(round+1,5)}/5 · ${phase==='answer'?Math.max(0,Math.ceil((config.memoryResponse-(performance.now()-phaseStart))/1000))+' s para responder':'Observa sin prisa'}`:`Ronda ${round+1}/${attribute==='kindness'?config.cleanupRounds:total}`;
   if(!done)timer=setTimeout(tick,config.tick);
  }
  tick();return true;
 }
 function cancel(){return active?.cancel()||false;}
 return Object.freeze({modes,config,grade,launch,register,cancel});
})();
