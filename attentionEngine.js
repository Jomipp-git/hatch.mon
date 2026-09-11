/* Persistent attention calls. The game owns state and presentation; this module only prioritizes needs. */
'use strict';
const ATTENTION_CONFIG=Object.freeze({
  nonCriticalCooldownMs:2*60*60*1000,
  quietStart:23,quietEnd:8,
  boredomWaitMs:3*60*60*1000,
  persistenceMs:Object.freeze({warning:15*60*1000,needsAttention:10*60*1000,serious:0}),
  priorities:Object.freeze({sick:500,hungerCritical:400,poop:300,hunger:200,bored:100})
});
globalThis.Attention=(()=>{
  const types=['hunger','poop','sick','bored'];
  const severities=['warning','needsAttention','serious'];
  const typeMeta=()=>Object.fromEntries(types.map(type=>[type,{since:null,lastNotifiedAt:0,lastResolvedAt:0,lastSeverity:null}]));
  const freshMeta=(now=Date.now())=>({lastInteractionAt:now,lastEvaluatedAt:now,lastNonCriticalNotificationAt:0,types:typeMeta()});
  const freshSettings=()=>({notificationsEnabled:false,quietStart:ATTENTION_CONFIG.quietStart,quietEnd:ATTENTION_CONFIG.quietEnd});
  const cloneEvent=event=>event?{...event}:null;
  const own=(object,key)=>!!object&&Object.hasOwn(object,key);
  function ensure(state,now=Date.now()){
    if(!state.attentionMeta||typeof state.attentionMeta!=='object')state.attentionMeta=freshMeta(now);
    if(!Number.isFinite(state.attentionMeta.lastInteractionAt))state.attentionMeta.lastInteractionAt=now;
    if(!Number.isFinite(state.attentionMeta.lastEvaluatedAt))state.attentionMeta.lastEvaluatedAt=now;
    if(!Number.isFinite(state.attentionMeta.lastNonCriticalNotificationAt))state.attentionMeta.lastNonCriticalNotificationAt=0;
    if(!state.attentionMeta.types||typeof state.attentionMeta.types!=='object')state.attentionMeta.types=typeMeta();
    for(const type of types){
      const meta=state.attentionMeta.types[type]||{};state.attentionMeta.types[type]={...meta,
        since:Number.isFinite(meta.since)?meta.since:null,lastNotifiedAt:Number.isFinite(meta.lastNotifiedAt)?meta.lastNotifiedAt:0,
        lastResolvedAt:Number.isFinite(meta.lastResolvedAt)?meta.lastResolvedAt:0,lastSeverity:severities.includes(meta.lastSeverity)?meta.lastSeverity:null};
    }
    if(!state.attentionSettings||typeof state.attentionSettings!=='object')state.attentionSettings=freshSettings();
    state.attentionSettings.notificationsEnabled=state.attentionSettings.notificationsEnabled===true;
    for(const key of ['quietStart','quietEnd'])if(!Number.isInteger(state.attentionSettings[key])||state.attentionSettings[key]<0||state.attentionSettings[key]>23)state.attentionSettings[key]=ATTENTION_CONFIG[key];
    if(!state.attentionEvent||typeof state.attentionEvent!=='object'||!types.includes(state.attentionEvent.type)||!severities.includes(state.attentionEvent.severity))state.attentionEvent=null;
    else state.attentionEvent={...state.attentionEvent,type:state.attentionEvent.type,createdAt:Number.isFinite(state.attentionEvent.createdAt)?state.attentionEvent.createdAt:now,severity:state.attentionEvent.severity,notified:state.attentionEvent.notified===true,active:state.attentionEvent.active!==false,resolvedAt:Number.isFinite(state.attentionEvent.resolvedAt)?state.attentionEvent.resolvedAt:null,lastNotifiedAt:Number.isFinite(state.attentionEvent.lastNotifiedAt)?state.attentionEvent.lastNotifiedAt:0,context:typeof state.attentionEvent.context==='string'?state.attentionEvent.context:state.attentionEvent.type};
    return state;
  }
  const isQuiet=(settings,timestamp=Date.now())=>{const hour=new Date(timestamp).getHours(),{quietStart,quietEnd}=settings;return quietStart===quietEnd?false:quietStart>quietEnd?(hour>=quietStart||hour<quietEnd):(hour>=quietStart&&hour<quietEnd);};
  function personality(state){return PERSONALITY_CONFIG[state.personality]||PERSONALITY_CONFIG.sleepy;}
  function candidates(state,now){
    if(!['alive','critical'].includes(state.phase)||!state.care||!state.vital)return [];
    const p=personality(state),sleeping=state.lightsOff,care=state.care,vital=state.vital,result=[];
    if(state.pokerus)result.push({type:'sick',severity:state.phase==='critical'||care.energia<=20||care.higiene<=20?'serious':'needsAttention',priority:ATTENTION_CONFIG.priorities.sick,immediate:true});
    if(care.hambre<=15)result.push({type:'hunger',severity:'serious',priority:ATTENTION_CONFIG.priorities.hungerCritical,immediate:true});
    else if(!sleeping&&care.hambre<=30*Math.max(.5,p.hungerPrompt))result.push({type:'hunger',severity:'needsAttention',priority:ATTENTION_CONFIG.priorities.hunger,immediate:false});
    else if(!sleeping&&care.hambre<=42*p.hungerPrompt)result.push({type:'hunger',severity:'warning',priority:ATTENTION_CONFIG.priorities.hunger,immediate:false});
    if(vital.poops.length||care.higiene<=35){const serious=care.higiene<=20||vital.poops.length>=2;if(!sleeping||serious)result.push({type:'poop',severity:serious?'serious':'needsAttention',priority:ATTENTION_CONFIG.priorities.poop,immediate:serious});}
    const boredAfter=ATTENTION_CONFIG.boredomWaitMs/Math.max(.25,p.socialDemand);
    if(!sleeping&&!state.pokerus&&now-state.attentionMeta.lastInteractionAt>=boredAfter)result.push({type:'bored',severity:'warning',priority:ATTENTION_CONFIG.priorities.bored,immediate:false});
    return result.sort((a,b)=>b.priority-a.priority);
  }
  function resolve(state,event,now){if(!event)return;event.active=false;event.resolvedAt=now;state.attentionMeta.types[event.type].lastResolvedAt=now;}
  function evaluate(state,now=Date.now()){
    ensure(state,now);now=Math.max(now,state.attentionMeta.lastEvaluatedAt);const all=candidates(state,now),candidate=all[0]||null,active=state.attentionEvent?.active?state.attentionEvent:null;
    for(const type of types){const current=all.find(entry=>entry.type===type),meta=state.attentionMeta.types[type];if(current){if(meta.since===null)meta.since=state.attentionMeta.lastEvaluatedAt||now;}else meta.since=null;}
    state.attentionMeta.lastEvaluatedAt=now;
    if(!candidate){if(active)resolve(state,active,now);return state.attentionEvent;}
    const meta=state.attentionMeta.types[candidate.type],wait=candidate.immediate?0:ATTENTION_CONFIG.persistenceMs[candidate.severity];
    if(now-meta.since<wait){if(active&&!all.some(entry=>entry.type===active.type)){resolve(state,active,now);return null;}if(active&&active.type===candidate.type&&candidate.severity!==active.severity)active.severity=candidate.severity;return active;}
    if(active&&active.type===candidate.type){if(active.severity!==candidate.severity){active.severity=candidate.severity;active.notified=false;active.context=candidate.type;}return active;}
    if(active)resolve(state,active,now);
    state.attentionEvent={type:candidate.type,createdAt:now,severity:candidate.severity,notified:false,active:true,resolvedAt:null,lastNotifiedAt:0,context:candidate.type};
    return state.attentionEvent;
  }
  function markInteraction(state,now=Date.now()){ensure(state,now);now=Math.max(now,state.attentionMeta.lastEvaluatedAt);state.attentionMeta.lastInteractionAt=now;const event=state.attentionEvent;if(event?.active&&event.type==='bored')resolve(state,event,now);}
  function notificationDue(state,now=Date.now()){
    ensure(state,now);const event=state.attentionEvent;if(!event?.active||!state.attentionSettings.notificationsEnabled||isQuiet(state.attentionSettings,now))return false;
    if(event.notified&&event.lastNotifiedAt&&event.severity===state.attentionMeta.types[event.type].lastSeverity)return false;
    if(event.severity!=='serious'&&now-state.attentionMeta.lastNonCriticalNotificationAt<ATTENTION_CONFIG.nonCriticalCooldownMs)return false;
    return true;
  }
  function markNotified(state,now=Date.now()){
    ensure(state,now);const event=state.attentionEvent;if(!event?.active)return false;event.notified=true;event.lastNotifiedAt=now;const meta=state.attentionMeta.types[event.type];meta.lastNotifiedAt=now;meta.lastSeverity=event.severity;if(event.severity!=='serious')state.attentionMeta.lastNonCriticalNotificationAt=now;return true;
  }
  function valid(state){
    const event=state.attentionEvent,meta=state.attentionMeta,settings=state.attentionSettings;
    return (!event||(types.includes(event.type)&&severities.includes(event.severity)&&Number.isFinite(event.createdAt)&&typeof event.notified==='boolean'&&typeof event.active==='boolean'&&(event.resolvedAt===null||Number.isFinite(event.resolvedAt))&&Number.isFinite(event.lastNotifiedAt)&&typeof event.context==='string'))&&
      !!meta&&Number.isFinite(meta.lastInteractionAt)&&Number.isFinite(meta.lastEvaluatedAt)&&Number.isFinite(meta.lastNonCriticalNotificationAt)&&!!meta.types&&types.every(type=>{const item=meta.types[type];return item&&(item.since===null||Number.isFinite(item.since))&&Number.isFinite(item.lastNotifiedAt)&&Number.isFinite(item.lastResolvedAt)&&(item.lastSeverity===null||severities.includes(item.lastSeverity));})&&
      !!settings&&typeof settings.notificationsEnabled==='boolean'&&Number.isInteger(settings.quietStart)&&Number.isInteger(settings.quietEnd)&&settings.quietStart>=0&&settings.quietStart<24&&settings.quietEnd>=0&&settings.quietEnd<24;
  }
  const messageKey=event=>`attention.${event.type}.${event.severity}`;
  return Object.freeze({freshMeta,freshSettings,ensure,evaluate,markInteraction,notificationDue,markNotified,valid,isQuiet,messageKey,cloneEvent});
})();
