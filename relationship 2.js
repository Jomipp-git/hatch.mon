/* Persistent relationship; care rules stay in Vital. No asset dependency. */
'use strict';
const RELATIONSHIP_CONFIG={max:100,perHeart:20,closeBond:60,positiveMood:.5,attentionMax:12,attentionDecayPerMinute:.2,positiveTapLimit:3,penaltyCooldownMs:300000,
  goodCareMinimum:70,goodCarePerMinute:.04,rewards:{care:.6,play:1.5,train:1.5,cure:3,evolve:5,touch:.25}};
globalThis.Relationship=(()=>{
 const fresh=()=>({points:0,attention:0,lastPenaltyAge:null});
 function reward(s,event,multiplier=1){if(!s.relationship||!['alive','critical'].includes(s.phase))return;const gain=(RELATIONSHIP_CONFIG.rewards[event]||0)*multiplier;s.relationship.points=Math.min(RELATIONSHIP_CONFIG.max,s.relationship.points+gain);}
 function tick(s){const r=s.relationship;if(!r)return;r.attention=Math.max(0,r.attention-RELATIONSHIP_CONFIG.attentionDecayPerMinute);if(!s.pokerus&&Object.values(s.care).every(v=>v>=RELATIONSHIP_CONFIG.goodCareMinimum))r.points=Math.min(RELATIONSHIP_CONFIG.max,r.points+RELATIONSHIP_CONFIG.goodCarePerMinute);}
 function interact(s){
  if(!s.relationship||!['alive','critical'].includes(s.phase)||s.birthScene||s.nicknamePending||s.foundItem!==null)return null;
  const r=s.relationship;r.attention=Math.min(RELATIONSHIP_CONFIG.attentionMax,r.attention+1);
  const penalty=()=>{if(r.lastPenaltyAge===null||s.age-r.lastPenaltyAge>=RELATIONSHIP_CONFIG.penaltyCooldownMs){s.care.felicidad=Math.max(0,s.care.felicidad-1);r.lastPenaltyAge=s.age;}};
  if(s.lightsOff){s.lightsOff=false;penalty();return {kind:'wake',message:'Se ha despertado sobresaltado. Necesitaba descansar.'};}
  if(s.pokerus||s.phase==='critical')return {kind:'sick',message:'No se encuentra bien. Acompáñalo con calma.'};
  if(s.care.energia<20)return {kind:'tired',message:'Está cansado. Le vendrá bien descansar.'};
  if(r.attention>RELATIONSHIP_CONFIG.positiveTapLimit){penalty();return {kind:'startled',message:'Necesita un poco de espacio.'};}
  reward(s,'touch');s.care.felicidad=Math.min(100,s.care.felicidad+RELATIONSHIP_CONFIG.positiveMood);return {kind:'happy',message:r.points>=RELATIONSHIP_CONFIG.closeBond?'Reconoce tu cariño y se acerca.':'Le gusta que estés aquí.'};
 }
 const hearts=s=>Math.min(5,Math.floor((s.relationship?.points||0)/RELATIONSHIP_CONFIG.perHeart));
 function valid(r){return r&&Number.isFinite(r.points)&&r.points>=0&&r.points<=RELATIONSHIP_CONFIG.max&&Number.isFinite(r.attention)&&r.attention>=0&&r.attention<=RELATIONSHIP_CONFIG.attentionMax&&(r.lastPenaltyAge===null||Number.isFinite(r.lastPenaltyAge)&&r.lastPenaltyAge>=0);}
 return Object.freeze({fresh,reward,tick,interact,hearts,valid});
})();
