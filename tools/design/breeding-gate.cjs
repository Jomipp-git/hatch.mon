// Probabilidad de que se pueda criar, condición a condición, por las dos vías: QR entre dos
// jugadores y Ditto en solitario. La ventana de etapa se lee de LIFE_CONFIG: estaba escrita a mano
// con el 0,35 de cuando JOVEN y MADURO eran etapas distintas, y la capa 1 las fusionó en ADULTO.
process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
(async()=>{
 const h=await setup();
 h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
 const info=JSON.parse(h.run(`JSON.stringify(Object.keys(evolutionConfig).map(id=>{const d=PokemonData.get(id)||{};
   return {id,name:d.DisplayName||id,egg:d.EggGroup||null,breedable:d.Breedable===true,stage:d.EvolutionStage||null,genderless:d.Genderless===true,rarity:d.Rarity??null,male:d.MaleRatio??null};}))`));
 const stages=JSON.parse(h.run('JSON.stringify(LIFE_CONFIG.stages.map(s=>({id:s.id,until:s.until})))'));
 const breedingStage=h.run('BREEDING_CONFIG.lifeStage');
 const eligible=info.filter(p=>p.breedable&&p.stage!=='Baby'&&!p.genderless&&p.rarity!==5);
 console.log(`## Elegibles para criar: ${eligible.length} de ${info.length} formas`);
 const why={noBreedable:0,baby:0,genderless:0,rarity5:0};
 for(const p of info){if(eligible.includes(p))continue;
  if(!p.breedable)why.noBreedable++;else if(p.stage==='Baby')why.baby++;else if(p.genderless)why.genderless++;else if(p.rarity===5)why.rarity5++;}
 console.log('  descartadas por: Breedable=false',why.noBreedable,'· Baby',why.baby,'· sin género',why.genderless,'· rareza 5',why.rarity5);
 const g={};for(const p of eligible)g[p.egg]=(g[p.egg]||0)+1;
 console.log('\n## Grupos huevo entre las elegibles');
 for(const [k,v] of Object.entries(g).sort((a,b)=>b[1]-a[1]))console.log(`  ${String(k).padEnd(16)} ${v}`);
 let ok=0,total=0;
 for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){total++;
  const a=eligible[i],b=eligible[j];
  if(a.egg===b.egg)ok++;}
 console.log(`\n  pares elegibles y compatibles: ${ok} de ${total} (${(ok/total*100).toFixed(1)}%)`);
 let ok2=0,total2=0;
 for(let i=0;i<info.length;i++)for(let j=i+1;j<info.length;j++){total2++;
  const a=info[i],b=info[j];
  if(eligible.includes(a)&&eligible.includes(b)&&a.egg===b.egg)ok2++;}
 const species=ok2/total2;
 console.log(`  pares del repertorio COMPLETO que podrían criar: ${ok2} de ${total2} (${(species*100).toFixed(1)}%)`);
 // Ventana de la etapa que exige BREEDING_CONFIG, como fracción de la vida, leída del motor.
 let from=0,window=0;
 for(const s of stages){const until=s.until===null||!Number.isFinite(s.until)?1:s.until;
  if(s.id===breedingStage)window=until-from; from=until;}
 console.log(`\n  ventana de ${breedingStage}: ${(window*100).toFixed(0)}% de la vida (leída de LIFE_CONFIG.stages)`);
 const gen=0.75;
 console.log('\n## Vía QR: dos jugadores al azar, en un momento al azar');
 console.log(`  especies elegibles y compatibles ......... ${(species*100).toFixed(1)}%`);
 console.log(`  ambos en ${breedingStage} a la vez ${'.'.repeat(Math.max(1,24-breedingStage.length))} ${(window*window*100).toFixed(1)}%`);
 console.log(`  al menos uno hembra ...................... ${(gen*100).toFixed(0)}%`);
 const p=species*window*window*gen;
 console.log(`  producto .................................. ${(p*100).toFixed(2)}%   = 1 de cada ${Math.round(1/p)}`);
 console.log('\n  Y encima, para los dos: Ánimo >=70, cuidados >=40, <=1 deposición, suciedad <=50,');
 console.log('  luz encendida, sin enfermedad, sin mote pendiente, sin objeto encontrado.');
 console.log('  Más las dos personas juntas para escanear el QR.');
 // Vía Ditto: no hay segundo jugador, así que ni conjunción de etapas ni filtro de género.
 // Se pregunta al adapter de verdad en vez de reimplementar contract.dittoRule.
 const ditto=JSON.parse(h.run(`(()=>{
   const snap=g=>({phase:'alive',birthScene:false,nicknamePending:false,foundItem:null,lightsOff:false,pokerus:false,gender:g,
     nickname:'',pokemonId:null,care:{hambre:100,felicidad:100,energia:100,higiene:100}});
   const ent=(sid,g)=>({id:'probe-'+sid,kind:'creature',speciesId:sid,offspring:null,snapshot:snap(g)});
   const partner=ent('0132A0','genderless');partner.id='probe-ditto';
   const rows=[];
   for(const id of Object.keys(evolutionConfig)){
     const d=PokemonData.get(id);if(!d)continue;
     const gs=d.Genderless?['genderless']:[...(d.MaleRatio>0?['male']:[]),...(d.FemaleRatio>0?['female']:[])];
     const r=PokemonData.compatibility(ent(id,gs[0]||'genderless'),partner);
     const off=r.ok?PokemonData.legacyId(r.offspring):null;
     rows.push({id,name:d.DisplayName,ok:r.ok,off,inStarters:off?STARTERS.includes(off):false});
   }
   return JSON.stringify(rows);
 })()`));
 const compat=ditto.filter(r=>r.ok),usable=compat.filter(r=>r.inStarters);
 console.log('\n## Vía Ditto: un jugador solo, en un momento al azar');
 console.log(`  formas compatibles con Ditto ............. ${compat.length} de ${info.length} (${(compat.length/info.length*100).toFixed(1)}%)`);
 console.log(`  ...con descendencia dentro de STARTERS ... ${usable.length} de ${compat.length}`);
 console.log(`  en ${breedingStage} ${'.'.repeat(Math.max(1,32-breedingStage.length))} ${(window*100).toFixed(1)}%`);
 const solo=(usable.length/info.length)*window;
 console.log(`  producto .................................. ${(solo*100).toFixed(1)}%   = 1 de cada ${(1/solo).toFixed(1)}`);
 console.log(`\n  mejora frente a la vía QR: x${(solo/p).toFixed(0)}`);
 console.log('  La descendencia es siempre BaseOffspringId del progenitor: Ditto devuelve la base de');
 console.log('  TU línea, no una especie nueva. No da Pokédex; da continuidad de linaje.');
})().catch(e=>{console.error(e);process.exit(1)});
