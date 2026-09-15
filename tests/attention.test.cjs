const assert=require('node:assert/strict');
const {setup}=require('./uiHarness.cjs');

const HOUR=60*60*1000,MINUTE=60*1000;
async function born(options={}){
  const h=await setup(options);
  h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname(\"\")');
  return h;
}
function resetAttention(h,now){h.run(`state.attentionEvent=null;state.attentionMeta=Attention.freshMeta(${now});state.attentionSettings=Attention.freshSettings()`);}

(async()=>{
  // Legacy saves receive optional defaults once and persist them with no schema change.
  const legacyHarness=await setup();
  const legacy=JSON.parse(legacyHarness.run('delete state.attentionEvent;delete state.attentionMeta;delete state.attentionSettings;JSON.stringify(state)'));
  const restored=await setup({initialSave:legacy});
  assert.equal(restored.run('validSave(state)'),true);
  assert.equal(restored.run('state.attentionEvent'),null);
  assert.equal(restored.run('state.attentionSettings.notificationsEnabled'),false);
  restored.run('save({immediate:true})');
  const persisted=JSON.parse(restored.storage.get('hatch.mon.v3'));
  assert.ok(persisted.attentionMeta&&persisted.attentionSettings);

  const h=await born(),start=10*HOUR;
  resetAttention(h,start);
  h.run('state.care.hambre=28');
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+11*MINUTE})`);
  assert.equal(h.run('state.attentionEvent.type'),'hunger');
  assert.equal(h.run('state.attentionEvent.severity'),'needsAttention');
  const created=h.run('state.attentionEvent.createdAt');
  h.run(`Attention.evaluate(state,${start+20*MINUTE})`);
  assert.equal(h.run('state.attentionEvent.createdAt'),created,'the same unresolved event is not recreated');
  h.run('careAction("alimentar")');
  assert.equal(h.run('state.attentionEvent.active'),false,'feeding resolves hunger');

  resetAttention(h,start);h.run('state.care.hambre=10;state.care.higiene=15;state.vital.poops=[{id:1,createdAge:0}];state.pokerus=true');
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+16*MINUTE})`);
  assert.equal(h.run('state.attentionEvent.type'),'sick','only the highest-priority active need is presented');
  h.run('careAction("curar")');
  assert.equal(h.run('state.attentionEvent.type'),'hunger','after curing, the remaining urgent need takes over');

  resetAttention(h,start);h.run('state.care.hambre=100;state.care.higiene=30;state.vital.poops=[{id:1,createdAge:0}]');
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+11*MINUTE})`);
  assert.equal(h.run('state.attentionEvent.type'),'poop');
  h.run('careAction("limpiar")');
  assert.equal(h.run('state.attentionEvent.active'),false,'cleaning resolves the cleanup alert');

  resetAttention(h,start);h.run(`state.care.hambre=100;state.care.higiene=100;state.vital.poops=[];state.pokerus=false;state.attentionMeta.lastInteractionAt=${start-4*HOUR}`);
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+16*MINUTE})`);
  assert.equal(h.run('state.attentionEvent.type'),'bored');
  h.run('careAction("jugar")');
  assert.equal(h.run('state.attentionEvent.active'),false,'play resolves boredom');
  resetAttention(h,start);h.run(`state.attentionMeta.lastInteractionAt=${start-4*HOUR}`);
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+16*MINUTE});interactWithPokemon()`);
  assert.equal(h.run('state.attentionEvent.active'),false,'direct interaction also resolves boredom');

  resetAttention(h,start);h.run('state.personality="glutton";state.care.hambre=35');
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+16*MINUTE})`);
  assert.equal(h.run('state.attentionEvent.type'),'hunger','gluttons ask for food earlier');
  resetAttention(h,start);h.run('state.personality="patient";state.care.hambre=35');
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+16*MINUTE})`);
  assert.equal(h.run('state.attentionEvent'),null,'patients defer noncritical hunger');
  resetAttention(h,start);h.run(`state.personality="playful";state.care.hambre=100;state.attentionMeta.lastInteractionAt=${start-3*HOUR}`);
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+16*MINUTE})`);
  assert.equal(h.run('state.attentionEvent.type'),'bored','playful companions ask for social time earlier');
  resetAttention(h,start);h.run(`state.personality="independent";state.attentionMeta.lastInteractionAt=${start-3*HOUR}`);
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+16*MINUTE})`);
  assert.equal(h.run('state.attentionEvent'),null,'independent companions defer social alerts');

  resetAttention(h,start);h.run(`state.lightsOff=true;state.care.hambre=28;state.care.higiene=30;state.vital.poops=[{id:1,createdAge:0}];state.attentionMeta.lastInteractionAt=${start-5*HOUR}`);
  h.run(`Attention.evaluate(state,${start+2*HOUR})`);
  assert.equal(h.run('state.attentionEvent'),null,'sleep suppresses deferred hunger, cleanup and boredom');
  h.run('state.care.hambre=10');h.run(`Attention.evaluate(state,${start+2*HOUR})`);
  assert.equal(h.run('state.attentionEvent.type'),'hunger','urgent hunger is never deferred');

  resetAttention(h,start);h.run('state.attentionSettings.notificationsEnabled=true;state.attentionEvent={type:"bored",createdAt:1,severity:"warning",notified:false,active:true,resolvedAt:null,lastNotifiedAt:0,context:"bored"}');
  assert.equal(h.run(`Attention.notificationDue(state,${start})`),true);
  h.run(`Attention.markNotified(state,${start})`);
  assert.equal(h.run(`Attention.notificationDue(state,${start+MINUTE})`),false,'the same alert is not repeated');
  h.run('state.attentionEvent={type:"hunger",createdAt:2,severity:"warning",notified:false,active:true,resolvedAt:null,lastNotifiedAt:0,context:"hunger"}');
  assert.equal(h.run(`Attention.notificationDue(state,${start+HOUR})`),false,'noncritical notifications share a two-hour cooldown');
  assert.equal(h.run('Attention.isQuiet({quietStart:23,quietEnd:8},new Date(2026,0,1,23).getTime())'),true);
  assert.equal(h.run('Attention.isQuiet({quietStart:23,quietEnd:8},new Date(2026,0,1,12).getTime())'),false);
  h.run('state.attentionSettings={notificationsEnabled:true,quietStart:0,quietEnd:23}');
  assert.equal(h.run(`Attention.notificationDue(state,${start+3*HOUR})`),false,'quiet hours suppress browser delivery without clearing the event');
  h.run(`state.attentionMeta=Attention.freshMeta(${start+3*HOUR});state.attentionSettings={notificationsEnabled:true,quietStart:0,quietEnd:0};state.attentionEvent={type:"hunger",createdAt:1,severity:"warning",notified:false,active:true,resolvedAt:null,lastNotifiedAt:0,context:"hunger"};document.hidden=true;globalThis.Notification=class{static permission="granted";constructor(){globalThis.__notifications=(globalThis.__notifications||0)+1}}`);
  assert.equal(h.run(`deliverAttention(${start+3*HOUR})`),true);
  assert.equal(h.run('__notifications'),1);
  assert.equal(h.run('state.attentionEvent.notified'),true);

  const notificationHarness=await born();
  notificationHarness.run('window.Notification={permission:"denied"}');
  assert.equal(await notificationHarness.run('requestAttentionNotifications()'),false);
  assert.equal(notificationHarness.run('state.attentionSettings.notificationsEnabled'),false);
  notificationHarness.run('delete window.Notification');
  assert.equal(await notificationHarness.run('requestAttentionNotifications()'),false,'unsupported browsers keep alerts in-app');

  // Time escalation: an unmet need climbs on its own, so the three declared levels are all reachable
  // and a serious call is not the end of the conversation.
  resetAttention(h,start);
  h.run(`state.personality='sleepy';state.lightsOff=false;state.care.hambre=100;state.care.higiene=100;state.pokerus=false;state.vital.poops=[];state.attentionMeta.lastInteractionAt=${start-4*HOUR}`);
  h.run(`Attention.evaluate(state,${start});Attention.evaluate(state,${start+16*MINUTE})`);
  assert.equal(h.run('state.attentionEvent.severity'),'warning','boredom still opens at warning');
  h.run(`Attention.evaluate(state,${start+4*HOUR+MINUTE})`);
  assert.equal(h.run('state.attentionEvent.severity'),'needsAttention','an ignored need climbs one step per escalation span');
  h.run(`Attention.evaluate(state,${start+8*HOUR+MINUTE})`);
  assert.equal(h.run('state.attentionEvent.severity'),'serious','boredom can now reach the top of the ladder');
  assert.equal(h.run('state.attentionEvent.type'),'bored');
  h.run(`Attention.markInteraction(state,${start+8*HOUR+2*MINUTE})`);
  assert.equal(h.run('state.attentionEvent.active'),false,'interacting still clears boredom at any severity');

  // Thresholds are a floor that time can only raise, never lower.
  resetAttention(h,start);
  h.run(`state.lightsOff=false;state.pokerus=true;state.care.hambre=100;state.care.higiene=100;state.care.energia=100;state.attentionMeta.lastInteractionAt=${start}`);
  h.run(`Attention.evaluate(state,${start})`);
  assert.equal(h.run('state.attentionEvent.severity'),'needsAttention','a need that arrives urgent is never announced as mild');
  h.run(`Attention.evaluate(state,${start+4*HOUR+MINUTE})`);
  assert.equal(h.run('state.attentionEvent.severity'),'serious','untreated sickness escalates even while its numbers hold still');

  resetAttention(h,start);
  h.run('state.lightsOff=false;state.pokerus=false;state.attentionSettings.notificationsEnabled=true;state.attentionSettings.quietStart=0;state.attentionSettings.quietEnd=0;state.care.hambre=10');
  h.run(`Attention.evaluate(state,${start})`);
  assert.equal(h.run('state.attentionEvent.severity'),'serious');
  assert.equal(h.run(`Attention.notificationDue(state,${start})`),true);
  h.run(`Attention.markNotified(state,${start})`);
  assert.equal(h.run(`Attention.notificationDue(state,${start+3*HOUR})`),false,'a serious call does not repeat before its own timer');
  assert.equal(h.run(`Attention.notificationDue(state,${start+4*HOUR})`),true,'a serious call repeats instead of going silent until death');

  // Quiet hours hold routine calls, but a dying companion gets one call through and only one.
  resetAttention(h,start);
  const night=new Date(2026,0,1,1).getTime();
  h.run(`state.lightsOff=false;state.pokerus=false;state.phase='alive';state.care.hambre=10;state.attentionSettings={notificationsEnabled:true,quietStart:23,quietEnd:8};state.attentionMeta=Attention.freshMeta(${night})`);
  h.run(`Attention.evaluate(state,${night})`);
  assert.equal(h.run('state.attentionEvent.severity'),'serious');
  assert.equal(h.run(`Attention.notificationDue(state,${night})`),false,'a serious call in quiet hours waits while the companion is merely alive');
  h.run("state.phase='critical'");
  assert.equal(h.run(`Attention.notificationDue(state,${night})`),true,'a critical companion breaks through quiet hours');
  h.run(`Attention.markNotified(state,${night})`);
  assert.equal(h.run('state.attentionEvent.quietBreak'),true);
  assert.equal(h.run(`Attention.notificationDue(state,${night+5*HOUR})`),false,'the exception is spent: later repeats wait for morning');
  const reloaded=JSON.parse(h.run('JSON.stringify(state.attentionEvent)'));
  h.run(`state.attentionEvent=${JSON.stringify(reloaded)};Attention.ensure(state,${night+5*HOUR})`);
  assert.equal(h.run('state.attentionEvent.quietBreak'),true,'the spent exception survives a reload');

  console.log('attention tests passed');
})().catch(error=>{console.error(error);process.exitCode=1});
