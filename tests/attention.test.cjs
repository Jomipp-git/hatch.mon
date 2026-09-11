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

  console.log('attention tests passed');
})().catch(error=>{console.error(error);process.exitCode=1});
