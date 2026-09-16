// Escenario real: mantenimiento mediocre toda la vida + un empujon intensivo, temprano o tardio.
process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
const MIN=60*1000,HOUR=60*MIN;
async function play(label,{pushFrom=null,pushTo=null}={}){
 const h=await setup();
 h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
 const start=9*HOUR;h.run(`state.lastSync=${start}`);
 h.run(`globalThis.__base=()=>{ // mantenimiento justo: lo mantiene vivo, calidad mediocre
   while(state.care.hambre<55&&state.trainer.energy>=1)careAction('alimentar');
   if(state.care.higiene<40&&state.trainer.energy>=1)careAction('limpiar');return 1;}`);
 h.run(`globalThis.__push=()=>{ // atencion intensiva
   while(state.care.hambre<95&&state.trainer.energy>=1)careAction('alimentar');
   if(state.care.higiene<90&&state.trainer.energy>=1)careAction('limpiar');
   if(state.care.felicidad<90&&state.trainer.energy>=1&&state.care.energia>=5)careAction('jugar');return 1;}`);
 const base=h.run('state.vital.baseLifespan')/(24*HOUR);
 let t=start,pushed=0;
 for(;t<=start+8*24*HOUR;t+=5*MIN){
  h.run(`sync(${t})`);
  if(!h.run('alive()'))break;
  const frac=h.run('state.age')/h.run('state.vital.baseLifespan');
  const inPush=pushFrom!==null&&frac>=pushFrom&&frac<pushTo;
  if((t-start)%(2*HOUR)===0)h.run('__base()');
  if(inPush&&(t-start)%(30*MIN)===0){h.run('__push()');pushed++;}
 }
 const life=h.run('state.vital.lifespan')/(24*HOUR);
 const age=(t-start)/(24*HOUR);
 console.log(`  ${label.padEnd(30)} base ${base.toFixed(3)} -> vida ${life.toFixed(3)}  (${((life-base)*24>=0?'+':'')}${((life-base)*24).toFixed(1)} h)   murió el día ${age.toFixed(2)}   empujones ${pushed}`);
 return (life-base)*24;
}
(async()=>{
 console.log('## Mantenimiento justo toda la vida, mas un empujon de un tercio de vida');
 const solo=await play('sin empujón');
 const early=await play('empujón en el primer tercio',{pushFrom:0,pushTo:.33});
 const mid=await play('empujón en el tercio central',{pushFrom:.33,pushTo:.67});
 const late=await play('empujón en el último tercio',{pushFrom:.67,pushTo:1.2});
 console.log('\n## Lo que aporta el empujón según cuándo se da');
 console.log(`  temprano ${(early-solo).toFixed(1)} h  ·  central ${(mid-solo).toFixed(1)} h  ·  tardío ${(late-solo).toFixed(1)} h`);
})().catch(e=>{console.error(e);process.exit(1)});
