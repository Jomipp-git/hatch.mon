// Genera saves con el runtime del ultimo push, en varios estados realistas.
const DIR=process.argv[2];
if(!DIR){
  console.error('Uso: node tools/design/save-generate.cjs <directorio-con-el-runtime-antiguo>');
  console.error('Para obtenerlo:  git archive <commit> | tar -x -C /tmp/hatchmon-old');
  process.exit(1);
}
process.chdir(DIR);
const {setup}=require(DIR+'/tests/uiHarness.cjs');
const MIN=60*1000,HOUR=60*MIN;
const out={};
async function grab(name,fn){
 const h=await setup();
 await fn(h);
 h.run('save({immediate:true})');
 out[name]=JSON.parse(h.storage.get('hatch.mon.v3'));
 console.log(`  ${name.padEnd(24)} version ${out[name].version}  phase ${out[name].phase}  claves ${Object.keys(out[name]).length}`);
}
(async()=>{
 await grab('huevo-recien-creado',async h=>{});
 await grab('vivo-dia-1',async h=>{
  h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Pika")');
  const t=9*HOUR;h.run(`state.lastSync=${t}`);
  for(let i=1;i<=288;i++){h.run(`sync(${t+i*5*MIN})`);if(i%12===0)h.run('careAction("alimentar")');}
 });
 await grab('vivo-con-aviso-activo',async h=>{
  h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Eve")');
  const t=9*HOUR;h.run(`state.lastSync=${t};state.care.hambre=12;state.attentionSettings.notificationsEnabled=true`);
  h.run(`Attention.evaluate(state,${t});Attention.evaluate(state,${t+20*MIN});Attention.markNotified(state,${t+20*MIN})`);
 });
 await grab('evolucionado-y-entrenado',async h=>{
  h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Kad")');
  h.run('state.training.iq=80;state.training.strength=60;state.coins=740;state.inventory={thunder:2,medicine:1}');
  h.run('state.age=2.2*24*60*60*1000');
  const r=h.run('JSON.stringify((current().rules||[]).map(x=>x.to))');
  h.run('if((current().rules||[])[0])forceEvolution(current().rules[0].to)');
  console.log('      (evolucion probada, rutas:',r+')');
 });
 await grab('muerto-por-vejez',async h=>{
  h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("Rip")');
  h.run('state.coins=300');
  const t=9*HOUR;h.run(`state.lastSync=${t}`);
  // vivir hasta morir de viejo, cuidandolo bien para que no sea abandono
  for(let i=1;i<=2600;i++){
   h.run(`sync(${t+i*5*MIN})`);
   if(i%6===0)h.run('while(state.care.hambre<90&&state.trainer.energy>=1)careAction("alimentar");if(state.care.higiene<70&&state.trainer.energy>=1)careAction("limpiar")');
   if(h.run('state.phase')==='dead')break;
  }
  console.log('      (fase final:',h.run('state.phase'),'· memorias:',h.run('state.social.memorials.length'),')');
 });
 require('fs').writeFileSync(require('node:path').join(__dirname,'saves-viejos.json'),JSON.stringify(out));
 console.log('\nsaves guardados:',Object.keys(out).length);
})().catch(e=>{console.error('ERROR',e.message);process.exit(1)});
