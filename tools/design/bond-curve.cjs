// ¿Los umbrales 40/60/80 llegan a tiempo para las evoluciones que los exigirían?
process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
const MIN=60*1000,HOUR=60*MIN;
async function cross(perMinute,everyMs){
 const h=await setup();
 h.run(`RELATIONSHIP_CONFIG.goodCarePerMinute=${perMinute}`);
 h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
 const start=9*HOUR;h.run(`state.lastSync=${start}`);
 h.run(`globalThis.__care=()=>{while(state.care.hambre<92&&state.trainer.energy>=1)careAction('alimentar');
   if(state.care.higiene<85&&state.trainer.energy>=1)careAction('limpiar');
   if(state.care.felicidad<85&&state.trainer.energy>=1&&state.care.energia>=5)careAction('jugar');return 1;}`);
 const hit={40:null,60:null,80:null,100:null};
 let t=start;
 for(;t<=start+6*24*HOUR;t+=5*MIN){
  h.run(`sync(${t})`);if(!h.run('alive()'))break;
  if((t-start)%everyMs===0)h.run('__care()');
  const p=h.run('state.relationship.points');
  for(const k of [40,60,80,100])if(hit[k]===null&&p>=k)hit[k]=(t-start)/(24*HOUR);
 }
 return {hit,death:(t-start)/(24*HOUR)};
}
(async()=>{
 // edades minimas de las reglas que hoy exigen Vinculo
 const h=await setup();
 h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
 const rules=JSON.parse(h.run('JSON.stringify(Object.entries(evolutionConfig).flatMap(([f,c])=>(c.rules||[]).filter(r=>r.minBond!=null).map(r=>({to:r.to,age:r.ageMs/86400000}))))'));
 const ages={};for(const r of rules)ages[r.age]=(ages[r.age]||0)+1;
 console.log('## Edad minima de las 17 reglas que exigen Vinculo');
 console.log('  '+Object.entries(ages).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}d: ${v} reglas`).join('  ·  '));
 console.log('\n## Cuando se cruzan 40 / 60 / 80 / 100 puntos');
 for(const v of [.005,.008]){
  console.log(`\n  goodCarePerMinute ${v}`);
  for(const [lbl,ms] of [['cada 30 min',30*MIN],['cada 2 h',2*HOUR],['cada 4 h',4*HOUR]]){
   const r=await cross(v,ms);
   const f=x=>r.hit[x]===null?'  nunca':r.hit[x].toFixed(2).padStart(6);
   console.log(`    ${lbl.padEnd(12)} 40:${f(40)}  60:${f(60)}  80:${f(80)}  100:${f(100)}   muerte ${r.death.toFixed(2)}`);
  }
 }
})().catch(e=>{console.error(e);process.exit(1)});
