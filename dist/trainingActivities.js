'use strict';
globalThis.TrainingActivities=(()=>{
 const t=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
 const modes=Object.freeze({iq:'minigame.attribute.iq',strength:'minigame.attribute.strength',kindness:'minigame.attribute.kindness',style:'minigame.attribute.style'});
 const modeName=attribute=>t(modes[attribute]);
 const config=Object.freeze({tick:40,memoryRounds:5,memoryResponse:4000,memoryFlash:550,strengthRounds:5,strengthWindow:3000,strengthPerfectMin:.4,strengthPerfectMax:.6,cleanupRounds:10,cleanupWindow:1500,prepare:600});
 const launchers={};let active=null;
 const grade=score=>score>=1-1e-9?5:1+Math.floor(Math.max(0,Math.min(1,score))*4);
 const strengthPrecision=position=>position>=config.strengthPerfectMin&&position<=config.strengthPerfectMax?1:Math.max(0,position<config.strengthPerfectMin?position/config.strengthPerfectMin:(1-position)/(1-config.strengthPerfectMax));
 function register(attribute,launcher){if(!Object.hasOwn(modes,attribute)||typeof launcher!=='function')throw Error(t('minigame.error.invalidActivity'));launchers[attribute]=launcher;}
 function launch(attribute,{commit,onActive=()=>{},formatReward=()=>''}){
  if(!Object.hasOwn(modes,attribute)||active)return false;
  let done=false,timer=null,frame=null,dialog=null,dispose=null;
  const requestFrame=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
  const cancelFrame=globalThis.cancelAnimationFrame||clearTimeout;
  const stop=()=>{clearTimeout(timer);timer=null;if(frame!==null)cancelFrame(frame);frame=null;dispose?.();dispose=null;};
  const cancel=()=>{if(done)return false;done=true;stop();active=null;if(dialog?.open)dialog.close();onActive(false);return false;};
  const complete=(gain=5)=>{if(done)return false;done=true;stop();active=null;try{return commit(attribute,Math.max(1,Math.min(5,Math.round(gain))));}finally{onActive(false);}};
  active={cancel};onActive(true);
  if(launchers[attribute])return launchers[attribute]({complete,cancel,attribute});
  dialog=document.getElementById('training-game');const host=document.getElementById('training-game-content');host.replaceChildren();
  const setText=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const title=node('h2',modeName(attribute)),hint=node('p',''),status=node('p',''),field=node('div',undefined,'minigame-field'),exit=node('button',t('minigame.common.cancel'));exit.type='button';exit.addEventListener('click',cancel);
  host.append(title,hint,status,field,exit);dialog.showModal();
  let earned=0,total=0,targets=[],sequence=[],answer=0,round=0,hit=false,phase='prepare',phaseStart=performance.now(),roundCorrect=true;
  const controls=[];const held=new Set(),presses=new Map();
  let visibleStrengthPosition=.5;
  const strengthPosition=t=>(Math.sin(t/(420-round*60))+1)/2;
  const button=(label,fn,onPress=false)=>{const b=node('button',label);b.type='button';b.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;if(onPress){event.preventDefault();fn();return;}b.setPointerCapture?.(event.pointerId);held.add(b);presses.set(b,{round,valid:phase==='play'});});b.addEventListener('pointerup',()=>held.delete(b));b.addEventListener('pointercancel',()=>{held.delete(b);presses.delete(b);});b.addEventListener('lostpointercapture',()=>held.delete(b));b.addEventListener('click',event=>{if(onPress){if(event.detail===0)fn();return;}const press=presses.get(b);presses.delete(b);if(press&&press.round!==round)return;fn(press);});field.append(b);controls.push(b);return b;};
  const finish=(result=null)=>{const gain=result??(attribute==='iq'?Math.max(1,earned):grade(total?earned/total:0)),ok=complete(gain);field.replaceChildren();setText(hint,ok?t(`minigame.result.grade.${gain}`):t('minigame.result.commitFailed'));setText(status,ok?t('minigame.result.statGain',{stat:modeName(attribute),gain,reward:formatReward(gain)}):t('minigame.result.noReward'));exit.textContent=t('minigame.common.back');exit.addEventListener('click',()=>dialog.close());};
  if(attribute==='style'){dispose=StyleTracing.mount({field,hint,status,node,onFinish:finish});return true;}
  if(attribute==='iq'){
   setText(hint,t('minigame.iq.instructions'));
   for(let i=0;i<4;i++)button(['A','B','C','D'][i],()=>{
    if(done||phase!=='answer'||performance.now()-phaseStart>=config.memoryResponse)return;
    if(i!==sequence[answer])roundCorrect=false;answer++;
    if(answer===sequence.length){if(roundCorrect)earned++;nextRound();}
   });total=config.memoryRounds;
  }else if(attribute==='strength'){
   setText(hint,t('minigame.strength.instructions'));
   const track=node('div',undefined,'timing-track'),zone=node('div',undefined,'timing-zone'),marker=node('div',undefined,'timing-marker');zone.style.left=`${config.strengthPerfectMin*100}%`;zone.style.width=`${(config.strengthPerfectMax-config.strengthPerfectMin)*100}%`;track.append(zone,marker);field.append(track);
   button(t('minigame.strength.action'),()=>{if(done||hit||phase!=='play')return;hit=true;const precision=strengthPrecision(visibleStrengthPosition);earned+=precision;setText(hint,precision===1?t('minigame.strength.perfect'):precision>0?t('minigame.strength.close'):t('minigame.strength.miss'));},true);
   targets=[marker];total=config.strengthRounds;
  }else if(attribute==='kindness'){
   setText(hint,t('minigame.kindness.instructions'));
   for(let i=0;i<6;i++)button('',press=>{if(done||phase!=='play'||(!press?.valid&&performance.now()-phaseStart>=config.cleanupWindow)||controls[i].disabled)return;controls[i].disabled=true;earned+=targets[i]?1:-1;setText(hint,targets[i]?t('minigame.kindness.collected'):t('minigame.kindness.keep'));controls[i].dataset.result=targets[i]?'correct':'wrong';});
  }

  function beginRound(){
   phaseStart=performance.now();hit=false;
   if(attribute==='iq'){
    phase='show';answer=0;roundCorrect=true;sequence=Array.from({length:round+2},()=>Math.floor(Math.random()*4));
   }else{
    phase='play';if(attribute==='strength'){visibleStrengthPosition=.5;targets[0].style.left='50%';}controls.forEach(b=>b.disabled=false);
    if(attribute==='kindness'){
     const offset=Math.floor(Math.random()*6);targets=controls.map((_,i)=>(i+offset)%6<3);total+=3;
     const trash=[['papel','minigame.kindness.paper'],['lata','minigame.kindness.can'],['botella','minigame.kindness.bottle']],keep=[['flor','minigame.kindness.flower'],['hoja','minigame.kindness.leaf']];
     controls.forEach((b,i)=>{const [id,key]=(targets[i]?trash:keep)[i%(targets[i]?trash.length:keep.length)];b.disabled=false;delete b.dataset.result;b.textContent=t(key);b.dataset.object=id;});
    }
   }
  }
  function nextRound(){
   round++;const count=attribute==='iq'?config.memoryRounds:attribute==='kindness'?config.cleanupRounds:total;
   if(round>=count){finish();return;}if(attribute==='strength'){phase='prepare';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);}else beginRound();
  }
  function tick(){
   if(done)return;if(field.dataset.phase!==phase)field.dataset.phase=phase;const elapsed=performance.now()-phaseStart;
   if(phase==='prepare'){
    setText(hint,t('minigame.common.prepare'));controls.forEach(b=>b.disabled=true);if(elapsed>=config.prepare)beginRound();
   }else if(phase==='resolve'){setText(hint,t('minigame.common.nextRound'));if(elapsed>=300&&!held.size)nextRound();
   }else if(attribute==='iq'){
    if(phase==='show'){
     setText(hint,t('minigame.common.observeRound',{round:round+1,total:config.memoryRounds}));
     const lit=sequence[Math.floor(elapsed/config.memoryFlash)];
     controls.forEach((b,i)=>{b.disabled=true;b.classList.toggle('lit',i===lit&&elapsed%config.memoryFlash<380);});
     if(elapsed>=sequence.length*config.memoryFlash){phase='answer';phaseStart=performance.now();controls.forEach(b=>{b.disabled=false;b.classList.remove('lit');});}
    }else{setText(hint,t('minigame.iq.repeat'));if(elapsed>=config.memoryResponse)nextRound();}
   }else{
    const duration=attribute==='strength'?config.strengthWindow:config.cleanupWindow;
    if(elapsed>=duration){if(attribute==='kindness'){if(!held.size){phase='resolve';phaseStart=performance.now();controls.forEach(b=>b.disabled=true);}}else nextRound();}
    else if(attribute==='strength'){if(!hit)setText(hint,t('minigame.strength.now'));if(!hit){visibleStrengthPosition=strengthPosition(elapsed);targets[0].style.left=`${visibleStrengthPosition*100}%`;}controls[0].disabled=hit;}

    else if(hint.textContent!==t('minigame.kindness.collected')&&hint.textContent!==t('minigame.kindness.keep'))setText(hint,t('minigame.kindness.reminder'));
   }
   if(done)return;
   setText(status,attribute==='iq'?phase==='answer'?t('minigame.common.responseRound',{round:Math.min(round+1,config.memoryRounds),total:config.memoryRounds,seconds:Math.max(0,Math.ceil((config.memoryResponse-(performance.now()-phaseStart))/1000))}):t('minigame.common.observeStatus',{round:Math.min(round+1,config.memoryRounds),total:config.memoryRounds}):t('minigame.common.round',{round:round+1,total:attribute==='kindness'?config.cleanupRounds:total}));
   if(!done){if(attribute==='strength')frame=requestFrame(tick);else timer=setTimeout(tick,config.tick);}
  }
  tick();return true;
 }
 function cancel(){return active?.cancel()||false;}
 return Object.freeze({modes,config,grade,strengthPrecision,launch,register,cancel,isActive:()=>active!==null});
})();
