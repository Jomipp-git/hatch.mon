// Carga los saves del ultimo push con el runtime ACTUAL y comprueba que arrancan y siguen vivos.
process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
const SAVES=require('node:path').join(__dirname,'saves-viejos.json');
if(!require('node:fs').existsSync(SAVES)){
  console.error('Falta saves-viejos.json. Ejecuta primero save-generate.cjs con el runtime antiguo.');
  process.exit(1);
}
const saves=require(SAVES);
const MIN=60*1000,HOUR=60*MIN;
(async()=>{
 let fallos=0;
 for(const [name,save] of Object.entries(saves)){
  let line=`  ${name.padEnd(24)}`;
  try{
   const h=await setup({initialSave:save});
   const valido=h.run('validSave(state)');
   const version=h.run('state.version');
   const phase=h.run('state.phase');
   const arranca=h.run('typeof state==="object"&&state!==null');
   // que siga funcionando: 2 h de juego simulado
   const t=h.run('state.lastSync')||1000;
   for(let i=1;i<=24;i++)h.run(`sync(${t+i*5*MIN})`);
   const vitalOk=h.run('state.vital?Vital.valid(state.vital,state.age):true');
   const attOk=h.run('Attention.valid(state)');
   const stage=h.run('state.vital?Vital.getLifeStage(state):null');
   const bloqueo=h.run('typeof storageWarning==="string"?storageWarning:""');
   // ida y vuelta: guardar con el runtime nuevo y volver a validar
   h.run('save({immediate:true})');
   const roundtrip=JSON.parse(h.storage.get('hatch.mon.v3'));
   const h2=await setup({initialSave:roundtrip});
   const revalido=h2.run('validSave(state)');
   line+=` valido:${valido}  ida-vuelta:${revalido}  version:${version}  phase:${phase}  vital:${vitalOk}  atencion:${attOk}  etapa:${stage}`;
   if(bloqueo)line+=`  AVISO:${bloqueo}`;
   if(valido!==true||vitalOk!==true||attOk!==true||version!==12||revalido!==true){fallos++;line+='   <-- FALLO';}
  }catch(e){fallos++;line+=`   <-- EXCEPCION: ${e.message}`;}
  console.log(line);
 }
 console.log(`\nsaves que fallan: ${fallos} de ${Object.keys(saves).length}`);
 process.exit(fallos?1:0);
})().catch(e=>{console.error('ERROR',e);process.exit(1)});
