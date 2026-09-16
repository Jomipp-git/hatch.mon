/* Bloque C: configuración y simulación por minutos, sin catálogo Pokémon propio. */
'use strict';
const LIFE_CONFIG={day:86400000,baseDays:4,variationDays:.15,minDays:3.5,maxDays:5,
  normalQuality:65,poorAdjustmentDays:-.35,excellentAdjustmentDays:.75,
  stages:[{id:'CRÍA',until:.20,hunger:1.10,hygiene:.95,recovery:1.15,play:1,risk:1},
    // JOVEN y MADURO eran 2,4 de los 4 dias de vida con todos los multiplicadores a 1 salvo un
    // play 1.10 en JOVEN: dos nombres para la misma etapa. Fusionadas en ADULTO, que es la linea
    // base contra la que CRIA y SENIOR se definen. Se pierde ese play 1.10 del 20-45% de la vida.
    {id:'ADULTO',until:.80,hunger:1,hygiene:1,recovery:1,play:1,risk:1},
    {id:'SENIOR',until:Infinity,hunger:1.08,hygiene:1.10,recovery:.85,play:1,risk:1.15}]};
const CARE_CONFIG={hour:3600000,minute:60000,max:100,
  decay:{hambre:8,felicidad:4,energia:0,higiene:5},sleepDecay:{hambre:3.6,felicidad:.8,energia:0,higiene:2},sleepRecovery:24,awakeRecovery:2,restRecovery:8,
  difficulty:{baseline:1,minFactor:.9,maxDecay:1.20,maxRisk:1.30,decayWeight:.10,riskWeight:.15},
  feed:{hunger:25,digestion:1,dirt:6,load:1},berry:{hunger:5,digestion:.35,dirt:2,load:1,attribute:5},
  play:{happiness:20,energy:5,dirt:3},clean:{hygiene:55,happiness:3,dirt:0},
  training:{gain:5,energy:8,hunger:4,dirt:3,ap:1},itemAP:1,evolutionItemAP:0,trainerMax:6,trainerRecoveryPerMinute:.1,
  costs:{alimentar:1,jugar:1,luz:0,limpiar:1,curar:1,auxiliar:1},dropChance:.10,
  aid:{steps:3,restore:40},cure:{restore:40},epsilon:1e-8};
const DIGESTION_CONFIG={max:6,maxPoops:3,minDelayMinutes:45,maxDelayMinutes:120,
  perPoop:1,dirtPerPoop:4,hygieneFactors:[1,1.25,1.6,2],dirtMaxPenalty:.35,
  loadDecayPerHour:.75,warningLoad:2,abuseRisks:[{load:3,chance:.15},{load:4,chance:.30},{load:5,chance:.50}]};
const SICKNESS_CONFIG={hygieneThreshold:20,energyThreshold:8,exposureMinutes:120,
  poopCount:2,poopAgeMinutes:180,riskPerHour:.08,maxRiskPerHour:.18,
  happinessDecay:1.5,otherDecay:1.12,recovery:.8,
  messages:{hygiene:'illness.hygiene',
    energy:'illness.energy',
    poops:'illness.poops',
    food:'illness.food'}};
const BREEDING_CONFIG={lifeStage:'ADULTO',happiness:70,minCare:40,maxPoops:1,maxDirt:50,oncePerLife:true};
const PERSONALITY_CONFIG=Object.freeze({
  sleepy:{labelKey:'personality.sleepy',socialDemand:1,hungerPrompt:1},
  glutton:{labelKey:'personality.glutton',socialDemand:1,hungerPrompt:1.15},
  playful:{labelKey:'personality.playful',socialDemand:1.25,hungerPrompt:1},
  independent:{labelKey:'personality.independent',socialDemand:.6,hungerPrompt:1},
  affectionate:{labelKey:'personality.affectionate',socialDemand:1.25,hungerPrompt:1},
  mischievous:{labelKey:'personality.mischievous',socialDemand:1,hungerPrompt:1},
  patient:{labelKey:'personality.patient',socialDemand:.8,hungerPrompt:.8},
  complainer:{labelKey:'personality.complainer',socialDemand:1.15,hungerPrompt:1.2}
});
// napLimitMinutes se conserva únicamente para normalizar y validar saves legacy.
const SLEEP_CONFIG=Object.freeze({nightStart:21,nightEnd:9,restStart:30,restEnd:50,napLimitMinutes:90});
globalThis.Vital=(()=>{
  const vitalText=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
  const bound=(x,a=0,b=CARE_CONFIG.max)=>Math.min(b,Math.max(a,x));
  function seed(id){let h=2166136261;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
  function random(v){v.rng=(Math.imul(v.rng,1664525)+1013904223)>>>0;return v.rng/4294967296;}
  function fresh(id){
    const v={rng:seed(id),baseLifespan:0,lifespan:0,qualitySum:0,qualityMinutes:0,
      digestion:0,dirt:0,poops:[],poopSerial:0,nextPoopAt:null,recentFeedingLoad:0,
      exposure:{hygiene:0,energy:0},illnessCause:null,deathCause:null,hasProducedEgg:false};
    v.baseLifespan=(LIFE_CONFIG.baseDays+(random(v)*2-1)*LIFE_CONFIG.variationDays)*LIFE_CONFIG.day;
    v.lifespan=v.baseLifespan;return v;
  }
  // Excepcion de los 19 Pokemon Baby: no alcanzan la etapa adulta por edad, solo evolucionando. El
  // catalogo ya los marca con EvolutionStage 'Baby' y todos tienen al menos una evolucion, asi que
  // ninguno queda encallado. Consecuencia de balance: un Baby sin evolucionar nunca entra en SENIOR,
  // asi que se libra de sus penalizaciones, y tampoco puede criar, que es lo canonico.
  const isBaby=s=>PokemonData.get(s.pokemonId)?.EvolutionStage==='Baby';
  const getLifeStage=s=>s.phase==='egg'||!s.vital?null:isBaby(s)?LIFE_CONFIG.stages[0].id:LIFE_CONFIG.stages.find(stage=>s.age<s.vital.lifespan*stage.until).id;
  const getLifeModifiers=s=>LIFE_CONFIG.stages.find(stage=>stage.id===getLifeStage(s));
  function difficulty(id){
    const d=PokemonData.get(id)?.CareDifficulty;
    // Un dato ausente se señala: nunca se deriva de Rarity ni se inventa una ficha.
    if(!Number.isFinite(d))throw Error(`CareDifficulty canónico no disponible: ${id}`);
    const c=CARE_CONFIG.difficulty;
    return {decay:bound(1+(d-c.baseline)*c.decayWeight,c.minFactor,c.maxDecay),risk:bound(1+(d-c.baseline)*c.riskWeight,c.minFactor,c.maxRisk)};
  }
  function infect(s,cause){if(s.pokerus)return false;s.pokerus=true;s.vital.illnessCause=cause;s.message=vitalText(SICKNESS_CONFIG.messages[cause]);return true;}
  function schedule(s){const c=DIGESTION_CONFIG;s.vital.nextPoopAt=s.age+(c.minDelayMinutes+random(s.vital)*(c.maxDelayMinutes-c.minDelayMinutes))*CARE_CONFIG.minute;}
  function eat(s,meal){
    const v=s.vital,full=s.care.hambre===CARE_CONFIG.max;
    s.care.hambre=bound(s.care.hambre+meal.hunger);v.digestion=bound(v.digestion+meal.digestion,0,DIGESTION_CONFIG.max);v.dirt=bound(v.dirt+meal.dirt);
    if(v.nextPoopAt===null)schedule(s);
    let message=full?vitalText('care.meal.0'):vitalText('care.meal.1');
    if(full){
      v.recentFeedingLoad+=meal.load;
      if(Math.ceil(v.recentFeedingLoad)>=DIGESTION_CONFIG.warningLoad)message=vitalText('care.meal.2');
      // Una sola tirada por acción de ingesta, nunca desde tick().
      const chance=abuseRisk(v.recentFeedingLoad);
      if(!s.pokerus&&chance>0&&random(v)<chance&&infect(s,'food'))message=s.message;
    }
    return message;
  }
  function abuseRisk(load){return DIGESTION_CONFIG.abuseRisks.reduce((risk,step)=>Math.ceil(load)>=step.load?step.chance:risk,0);}
  function clean(s){s.vital.poops=[];s.vital.dirt=CARE_CONFIG.clean.dirt;s.care.higiene=bound(s.care.higiene+CARE_CONFIG.clean.hygiene);s.care.felicidad=bound(s.care.felicidad+CARE_CONFIG.clean.happiness);}
  const personalityIds=Object.keys(PERSONALITY_CONFIG);
  const personalityFor=(rng=Math.random)=>personalityIds[Math.min(personalityIds.length-1,Math.floor(rng()*personalityIds.length))];
  const sleepDay=(timestamp=Date.now())=>{const d=new Date(timestamp);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
  const isNight=(timestamp=Date.now())=>{const hour=new Date(timestamp).getHours();return hour>=SLEEP_CONFIG.nightStart||hour<SLEEP_CONFIG.nightEnd;};
  function ensureSleep(s,timestamp=Date.now()){
    if(!s.sleep||typeof s.sleep!=='object'||Array.isArray(s.sleep))s.sleep={};
    s.sleep.fatigue=Number.isFinite(s.sleep.fatigue)?bound(s.sleep.fatigue):0;
    s.sleep.napMinutes=Number.isFinite(s.sleep.napMinutes)?Math.floor(bound(s.sleep.napMinutes,0,SLEEP_CONFIG.napLimitMinutes)):0;
    s.sleep.napping=s.sleep.napping===true;
    s.sleep.energyResting=s.sleep.energyResting===true;
    if(typeof s.sleep.napDay!=='string'||!s.sleep.napDay)s.sleep.napDay=sleepDay(timestamp);
    return s.sleep;
  }
  function energyResting(s){
    const sleep=ensureSleep(s);
    if(s.care.energia<=SLEEP_CONFIG.restStart)sleep.energyResting=true;
    else if(s.care.energia>=SLEEP_CONFIG.restEnd)sleep.energyResting=false;
    return sleep.energyResting;
  }
  function sleepPermission(s,timestamp=Date.now()){
    return isNight(timestamp)||energyResting(s)?{ok:true}:{ok:false,reason:'notSleepy'};
  }
  function sleepTick(s,timestamp=Date.now()){
    energyResting(s);
    if(s.lightsOff&&!isNight(timestamp)&&!s.sleep.energyResting)s.lightsOff=false;
  }
  function tick(s){
    const v=s.vital,m=getLifeModifiers(s),d=difficulty(s.pokemonId),c=CARE_CONFIG,dc=DIGESTION_CONFIG;
    const resting=energyResting(s);
    v.recentFeedingLoad=Math.max(0,v.recentFeedingLoad-dc.loadDecayPerHour/60);
    if(v.digestion>0&&v.poops.length<dc.maxPoops){
      if(v.nextPoopAt===null)schedule(s);
      if(s.age>=v.nextPoopAt){v.poops.push({id:++v.poopSerial,createdAge:s.age});v.digestion=Math.max(0,v.digestion-dc.perPoop);v.dirt=bound(v.dirt+dc.dirtPerPoop);v.nextPoopAt=null;if(v.digestion>0)schedule(s);}
    }else if(v.poops.length>=dc.maxPoops)v.nextPoopAt=null;
    for(const k of Object.keys(c.decay)){
      let rate=(s.lightsOff?c.sleepDecay:c.decay)[k];
      if(k==='hambre')rate*=m.hunger*d.decay;
      if(k==='higiene')rate*=m.hygiene*d.decay*dc.hygieneFactors[v.poops.length]*(1+v.dirt/100*dc.dirtMaxPenalty);
      if(s.pokerus)rate*=k==='felicidad'?SICKNESS_CONFIG.happinessDecay:SICKNESS_CONFIG.otherDecay;
      if(k==='energia')rate=-(s.lightsOff?c.sleepRecovery:resting?c.restRecovery:c.awakeRecovery);
      s.care[k]=bound(s.care[k]-rate/60);if(s.care[k]<c.epsilon)s.care[k]=0;
    }
    energyResting(s);
    v.qualitySum+=(s.care.hambre+s.care.felicidad+s.care.higiene)/3;v.qualityMinutes++;
    const quality=v.qualitySum/v.qualityMinutes,normal=LIFE_CONFIG.normalQuality;
    // La vida se acumula minuto a minuto en vez de recalcularse desde la media de toda la vida. Con
    // la media, el minuto 4.300 pesaba 1/4.300 y cuidar solo el ultimo tercio valia lo mismo que no
    // cuidar nunca (-3,6 h frente a -3,4 h). Ahora cada minuto aporta su parte del rango completo,
    // asi que cuidar cuenta siempre que se haga: toda la vida da el rango entero, el ultimo tercio
    // da su tercio. Y no es una ventana: los minutos buenos del principio no se pierden.
    const sample=(s.care.hambre+s.care.felicidad+s.care.higiene)/3;
    const rate=sample<normal?(1-sample/normal)*LIFE_CONFIG.poorAdjustmentDays:
      (sample-normal)/(100-normal)*LIFE_CONFIG.excellentAdjustmentDays;
    const share=CARE_CONFIG.minute/v.baseLifespan;
    v.lifespan=bound(v.lifespan+rate*share*LIFE_CONFIG.day,LIFE_CONFIG.minDays*LIFE_CONFIG.day,LIFE_CONFIG.maxDays*LIFE_CONFIG.day);
    for(const [cause,key,threshold] of [['hygiene','higiene',SICKNESS_CONFIG.hygieneThreshold]])
      v.exposure[cause]=s.care[key]<threshold?v.exposure[cause]+1:0;
    const cause=v.exposure.hygiene>=SICKNESS_CONFIG.exposureMinutes?'hygiene':
      v.poops.filter(p=>s.age-p.createdAge>=SICKNESS_CONFIG.poopAgeMinutes*c.minute).length>=SICKNESS_CONFIG.poopCount?'poops':null;
    if(!s.pokerus&&cause){const hourly=Math.min(SICKNESS_CONFIG.maxRiskPerHour,SICKNESS_CONFIG.riskPerHour*m.risk*d.risk);if(random(v)<1-Math.pow(1-hourly,1/60))infect(s,cause);}
  }
  function breedingReason(s){
    if(!s.vital||getLifeStage(s)!==BREEDING_CONFIG.lifeStage)return vitalText('breeding.matureOnly');
    if(BREEDING_CONFIG.oncePerLife&&s.vital.hasProducedEgg)return vitalText('breeding.alreadyProduced');
    if(s.phase!=='alive'||s.pokerus||s.care.felicidad<BREEDING_CONFIG.happiness||Object.values(s.care).some(n=>n<BREEDING_CONFIG.minCare)||
      s.vital.poops.length>BREEDING_CONFIG.maxPoops||s.vital.dirt>BREEDING_CONFIG.maxDirt)return vitalText('breeding.needsCare');
    return null;
  }
  function valid(v,age){
    const num=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(n)&&n>=0&&n<=max;
    return !!v&&Number.isInteger(v.rng)&&num(v.rng,4294967295)&&num(v.baseLifespan)&&v.baseLifespan>= (LIFE_CONFIG.baseDays-LIFE_CONFIG.variationDays)*LIFE_CONFIG.day&&v.baseLifespan<=(LIFE_CONFIG.baseDays+LIFE_CONFIG.variationDays)*LIFE_CONFIG.day&&
      num(v.lifespan,LIFE_CONFIG.maxDays*LIFE_CONFIG.day)&&v.lifespan>=LIFE_CONFIG.minDays*LIFE_CONFIG.day&&
      Number.isInteger(v.qualityMinutes)&&num(v.qualityMinutes)&&num(v.qualitySum,100*v.qualityMinutes)&&num(v.digestion,DIGESTION_CONFIG.max)&&num(v.dirt,100)&&num(v.recentFeedingLoad)&&
      Number.isInteger(v.poopSerial)&&num(v.poopSerial)&&Array.isArray(v.poops)&&v.poops.length<=DIGESTION_CONFIG.maxPoops&&v.poops.every(p=>p&&Number.isInteger(p.id)&&p.id>0&&p.id<=v.poopSerial&&num(p.createdAge,age))&&new Set(v.poops.map(p=>p.id)).size===v.poops.length&&
      (v.nextPoopAt===null||num(v.nextPoopAt))&&v.exposure&&num(v.exposure.hygiene)&&num(v.exposure.energy)&&typeof v.hasProducedEgg==='boolean'&&
      [null,...Object.keys(SICKNESS_CONFIG.messages)].includes(v.illnessCause)&&[null,'natural','neglect'].includes(v.deathCause);
  }
  return Object.freeze({fresh,getLifeStage,getLifeModifiers,difficulty,eat,clean,tick,valid,breedingReason,abuseRisk,personalityFor,ensureSleep,sleepPermission,sleepTick,energyResting,isNight});
})();
