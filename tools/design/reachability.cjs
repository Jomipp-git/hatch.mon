// Reachability grid: isolate each need by neutralising the others, so priority masking
// cannot hide a tier that the rules can actually produce.
process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
const MIN=60*1000,HOUR=60*MIN;
const PERS=['sleepy','glutton','playful','independent','affectionate','mischievous','patient','complainer'];
(async()=>{
 const h=await setup();
 h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
 const T=10*HOUR;
 // probe(setup) -> "type.severity" or null, evaluated twice so persistence gates open
 const probe=(js,gap=60*MIN)=>{
   h.run(`state.attentionEvent=null;state.attentionMeta=Attention.freshMeta(${T});state.attentionSettings=Attention.freshSettings();${js}`);
   h.run(`Attention.evaluate(state,${T});Attention.evaluate(state,${T+gap})`);
   return h.run('state.attentionEvent&&state.attentionEvent.active?state.attentionEvent.type+"."+state.attentionEvent.severity:"null"');
 };
 const collect=(label,gen)=>{
   const found=new Map();
   for(const {js,tag} of gen()){const r=probe(js);if(r!=='null'){const a=found.get(r)||[];a.push(tag);found.set(r,a);}}
   console.log(`\n## ${label}`);
   for(const [k,v] of [...found].sort())console.log(`  ${k.padEnd(24)}  ${v.length} combinaciones · p.ej. ${v[0]}`);
   if(!found.size)console.log('  (ninguna severidad producida)');
   return found;
 };
 const base=(extra='')=>`state.phase='alive';state.pokerus=false;state.vital.poops=[];state.care.hambre=100;state.care.higiene=100;state.care.energia=100;state.lightsOff=false;state.attentionMeta.lastInteractionAt=${T};${extra}`;

 collect('HAMBRE aislada (sin poop, sin pokerus, higiene 100)',function*(){
  for(const p of PERS)for(const off of [false,true])for(let v=0;v<=100;v++)
   yield {js:base(`state.personality='${p}';state.lightsOff=${off};state.care.hambre=${v};`),tag:`${p} hambre=${v} lightsOff=${off}`};
 });
 collect('SUCIEDAD aislada (hambre 100, sin pokerus)',function*(){
  for(const off of [false,true])for(const n of [0,1,2,3])for(let v=0;v<=100;v++)
   yield {js:base(`state.lightsOff=${off};state.care.higiene=${v};state.vital.poops=${JSON.stringify(Array.from({length:n},(_,i)=>({id:i+1,createdAge:0})))};`),tag:`higiene=${v} poops=${n} lightsOff=${off}`};
 });
 collect('ENFERMEDAD aislada (pokerus, hambre 100, sin poop)',function*(){
  for(const ph of ['alive','critical'])for(const e of [0,10,20,21,50,100])for(const hi of [0,10,20,21,50,100])
   yield {js:base(`state.pokerus=true;state.phase='${ph}';state.care.energia=${e};state.care.higiene=${hi};`),tag:`phase=${ph} energia=${e} higiene=${hi}`};
 });
 collect('ABURRIMIENTO aislado (todo lo demás al 100)',function*(){
  for(const p of PERS)for(const hrs of [0,1,2,3,4,6,12,24,72,240])
   yield {js:base(`state.personality='${p}';state.attentionMeta.lastInteractionAt=${T}-${hrs}*${HOUR};`),tag:`${p} sin interacción ${hrs}h`};
 });

 // Umbrales exactos de hambre por personalidad
 console.log('\n## Umbrales de hambre (frontera entre severidades)');
 for(const p of PERS){
  const row=[];let prev=null;
  for(let v=100;v>=0;v--){const r=probe(base(`state.personality='${p}';state.care.hambre=${v};`));if(r!==prev){row.push(`${v}→${r}`);prev=r;}}
  console.log(`  ${p.padEnd(14)} ${row.join('  ')}`);
 }
})().catch(e=>{console.error(e);process.exit(1)});
