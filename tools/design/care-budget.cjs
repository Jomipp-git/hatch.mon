// Bloque 3: la factura de mantenimiento frente al presupuesto de acciones.
process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
const MIN=60*1000,HOUR=60*MIN;
(async()=>{
 const rows=[];
 for(const away of [10,12,14,24]){
  const h=await setup();
  h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
  const start=9*HOUR+ (away>=10?12*HOUR:0);
  h.run(`state.lastSync=${start};state.care.hambre=100;state.care.higiene=100;state.care.felicidad=100;state.care.energia=100;state.trainer.energy=6`);
  // pasar el tiempo fuera
  for(let t=start+5*MIN;t<=start+away*HOUR;t+=5*MIN){h.run(`sync(${t})`);if(!h.run('alive()'))break;}
  if(!h.run('alive()')){rows.push({away,muerto:true});continue;}
  const before=JSON.parse(h.run('JSON.stringify({h:Math.round(state.care.hambre),g:Math.round(state.care.higiene),a:Math.round(state.care.felicidad),e:Math.round(state.care.energia),ap:Math.round(state.trainer.energy*10)/10})'));
  // rutina del jugador: limpiar, alimentar hasta 100, jugar hasta 100
  const r=JSON.parse(h.run(`(()=>{let limpiar=0,comer=0,jugar=0;
    if(state.care.higiene<95&&state.trainer.energy>=1&&careAction('limpiar'))limpiar++;
    while(state.care.hambre<95&&state.trainer.energy>=1&&careAction('alimentar'))comer++;
    while(state.care.felicidad<95&&state.trainer.energy>=1&&state.care.energia>=5&&careAction('jugar'))jugar++;
    if(state.care.higiene<80&&state.trainer.energy>=1&&careAction('limpiar'))limpiar++;
    return JSON.stringify({limpiar,comer,jugar,apLeft:Math.round(state.trainer.energy*10)/10,
      load:Math.round(state.vital.recentFeedingLoad*100)/100,
      h:Math.round(state.care.hambre),g:Math.round(state.care.higiene),a:Math.round(state.care.felicidad)});})()`));
  const risk=JSON.parse(h.run('JSON.stringify(DIGESTION_CONFIG.abuseRisks)'));
  const chance=risk.filter(x=>r.load>=x.load).pop();
  rows.push({away,before,...r,riesgo:chance?chance.chance:0});
 }
 console.log('## Coste de "dejarlo todo a 100" al volver, con 6 acciones de presupuesto\n');
 console.log('  fuera | barras al volver (H/Hig/Án/En) | limpiar+comer+jugar | acciones gastadas | quedan | carga comida | riesgo enfermar');
 for(const r of rows){
  if(r.muerto){console.log(`  ${String(r.away).padStart(4)}h | MUERTO antes de volver`);continue;}
  const gastadas=r.limpiar+r.comer+r.jugar;
  console.log(`  ${String(r.away).padStart(4)}h | ${String(r.before.h).padStart(3)}/${String(r.before.g).padStart(3)}/${String(r.before.a).padStart(3)}/${String(r.before.e).padStart(3)} | ${r.limpiar}+${r.comer}+${r.jugar} | ${String(gastadas).padStart(2)} de 6 | ${String(r.apLeft).padStart(4)} | ${String(r.load).padStart(4)} | ${(r.riesgo*100).toFixed(0)}%`);
 }
})().catch(e=>{console.error(e);process.exit(1)});
