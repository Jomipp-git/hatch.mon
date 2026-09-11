/* Persistent relationship; care rules stay in Vital. No asset dependency. */
'use strict';
const RELATIONSHIP_CONFIG={max:100,perHeart:20,closeBond:60,positiveMood:.5,attentionMax:12,attentionDecayPerMinute:.2,positiveTapLimit:3,penaltyCooldownMs:300000,
  goodCareMinimum:70,goodCarePerMinute:.04,rewards:{care:.6,play:1.5,train:1.5,cure:3,evolve:5,touch:.25}};
globalThis.Relationship=(()=>{
 const t=(key,vars)=>globalThis.HatchI18n.t(key,vars);
 const fresh=()=>({points:0,attention:0,lastPenaltyAge:null});
 function reward(s,event,multiplier=1){if(!s.relationship||!['alive','critical'].includes(s.phase))return;const gain=(RELATIONSHIP_CONFIG.rewards[event]||0)*multiplier;s.relationship.points=Math.min(RELATIONSHIP_CONFIG.max,s.relationship.points+gain);}
 function tick(s){const r=s.relationship;if(!r)return;r.attention=Math.max(0,r.attention-RELATIONSHIP_CONFIG.attentionDecayPerMinute);if(!s.pokerus&&Object.values(s.care).every(v=>v>=RELATIONSHIP_CONFIG.goodCareMinimum))r.points=Math.min(RELATIONSHIP_CONFIG.max,r.points+RELATIONSHIP_CONFIG.goodCarePerMinute);}
 function interact(s){
  if(!s.relationship||!['alive','critical'].includes(s.phase)||s.birthScene||s.nicknamePending||s.foundItem!==null)return null;
  const r=s.relationship;r.attention=Math.min(RELATIONSHIP_CONFIG.attentionMax,r.attention+1);
  const penalty=()=>{if(r.lastPenaltyAge===null||s.age-r.lastPenaltyAge>=RELATIONSHIP_CONFIG.penaltyCooldownMs){s.care.felicidad=Math.max(0,s.care.felicidad-1);r.lastPenaltyAge=s.age;}};
  if(s.lightsOff){s.lightsOff=false;if(s.sleep)s.sleep.napping=false;penalty();return {kind:'wake',message:t('relationship.message.0')};}
  if(s.pokerus||s.phase==='critical')return {kind:'sick',message:t('relationship.message.1')};
  if(r.attention>RELATIONSHIP_CONFIG.positiveTapLimit){penalty();return {kind:'startled',message:t('relationship.message.3')};}
  reward(s,'touch');s.care.felicidad=Math.min(100,s.care.felicidad+RELATIONSHIP_CONFIG.positiveMood);return {kind:'happy',message:r.points>=RELATIONSHIP_CONFIG.closeBond?t('relationship.message.4'):t('relationship.message.5')};
 }
 const hearts=s=>Math.min(5,Math.floor((s.relationship?.points||0)/RELATIONSHIP_CONFIG.perHeart));
 function evaluateMinBond(s,minimumHearts){
  if(minimumHearts===null||minimumHearts===undefined||minimumHearts==='')return {minimumHearts:null,minimumPoints:0,met:true};
  if(typeof minimumHearts!=='number'||!Number.isFinite(minimumHearts)||minimumHearts<0||minimumHearts>RELATIONSHIP_CONFIG.max/RELATIONSHIP_CONFIG.perHeart)throw Error('MinBond debe estar entre 0 y 5 corazones');
  const minimumPoints=minimumHearts*RELATIONSHIP_CONFIG.perHeart;
  return {minimumHearts,minimumPoints,met:(s?.relationship?.points||0)>=minimumPoints};
 }
 function valid(r){return r&&Number.isFinite(r.points)&&r.points>=0&&r.points<=RELATIONSHIP_CONFIG.max&&Number.isFinite(r.attention)&&r.attention>=0&&r.attention<=RELATIONSHIP_CONFIG.attentionMax&&(r.lastPenaltyAge===null||Number.isFinite(r.lastPenaltyAge)&&r.lastPenaltyAge>=0);}
 return Object.freeze({fresh,reward,tick,interact,hearts,evaluateMinBond,valid});
})();
