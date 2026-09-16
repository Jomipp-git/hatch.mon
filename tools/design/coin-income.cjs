// Ritmo real de ingreso: cuántos entrenamientos caben en un día y cuántas monedas dan.
// Rota los CUATRO atributos. Entrenando solo uno, beginTraining lo rechaza al llegar a 100 y la
// fuente se cierra sola: eso daba 29-46 mon/día, cuatro veces por debajo del ingreso real.
process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
const MIN=60*1000,HOUR=60*MIN;
async function run(label,gain,{checkEveryMs=HOUR}={}){
 const h=await setup();
 h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
 const start=9*HOUR;h.run(`state.lastSync=${start};state.coins=0`);
 const modes=JSON.parse(h.run('JSON.stringify(TRAIN)'));
 let trainings=0,blockedByAP=0,blockedByEnergy=0,next=0;
 for(let t=start+5*MIN;t<=start+7*24*HOUR;t+=5*MIN){
  h.run(`sync(${t})`);
  if(!h.run('alive()'))break;
  if((t-start)%checkEveryMs===0){
   // cuidados básicos
   h.run('while(state.care.hambre<70&&state.trainer.energy>=1){careAction("alimentar")}');
   h.run('if(state.care.higiene<60&&state.trainer.energy>=1)careAction("limpiar")');
   // entrenar mientras se pueda
   for(let i=0;i<8;i++){
    const ap=h.run('state.trainer.energy'),en=h.run('state.care.energia'),off=h.run('!!state.lightsOff');
    if(off)break;
    if(ap<1){blockedByAP++;break;}
    if(en<8){blockedByEnergy++;break;}
    // El primer atributo que aún admita entrenamiento; si ninguno admite, se acabó la fuente.
    let done=false;
    for(let n=0;n<modes.length;n++){
     const mode=modes[(next+n)%modes.length];
     if(h.run(`beginTraining("${mode}")&&finishTraining("${mode}",${gain})`)===true){next=(next+n+1)%modes.length;done=true;break;}
    }
    if(!done)break;
    trainings++;
   }
  }
 }
 const coins=h.run('state.coins');
 console.log(`\n### ${label}`);
 console.log(`  entrenamientos en 7 d: ${trainings}  (${(trainings/7).toFixed(1)}/día)`);
 console.log(`  monedas: ${coins}  (${(coins/7).toFixed(0)}/día)`);
 console.log(`  veces frenado por acciones: ${blockedByAP}   por energía: ${blockedByEnergy}`);
 console.log(`  atributos finales: ${modes.map(m=>`${m} ${h.run(`state.training.${m}`)}`).join(' · ')}`);
 return coins/7;
}
(async()=>{
 const a=await run('Jugador flojo (siempre +2)',2);
 const b=await run('Jugador medio (siempre +3)',3);
 const c=await run('Jugador experto (siempre +5)',5);
 console.log('\n## Tiempo hasta comprar, con revisión cada hora   (una vida son ~4,0-4,9 d)');
 for(const [label,perDay] of [['flojo',a],['medio',b],['experto',c]]){
  const line=[35,50,70,180,190,300].map(p=>`${p}:${(p/perDay).toFixed(1)}d`).join('  ');
  console.log(`  ${label.padEnd(8)} ${perDay.toFixed(0)} mon/día  ->  ${line}`);
 }
})().catch(e=>{console.error(e);process.exit(1)});
