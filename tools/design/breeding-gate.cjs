process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
(async()=>{
 const h=await setup();
 h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
 const info=JSON.parse(h.run(`JSON.stringify(Object.keys(evolutionConfig).map(id=>{const d=PokemonData.get(id)||{};
   return {id,egg:d.EggGroup||null,breedable:d.Breedable===true,stage:d.EvolutionStage||null,genderless:d.Genderless===true,rarity:d.Rarity??null,male:d.MaleRatio??null};}))`));
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
  if(a.egg===b.egg||a.egg==='Ditto'||b.egg==='Ditto')ok++;}
 console.log(`\n  pares elegibles y compatibles: ${ok} de ${total} (${(ok/total*100).toFixed(1)}%)`);
 // sobre el total del repertorio, no solo elegibles
 let ok2=0,total2=0;
 for(let i=0;i<info.length;i++)for(let j=i+1;j<info.length;j++){total2++;
  const a=info[i],b=info[j];
  const ea=eligible.includes(a),eb=eligible.includes(b);
  if(ea&&eb&&(a.egg===b.egg||a.egg==='Ditto'||b.egg==='Ditto'))ok2++;}
 console.log(`  pares del repertorio COMPLETO que podrían criar: ${ok2} de ${total2} (${(ok2/total2*100).toFixed(1)}%)`);
 const maduro=0.35, gen=0.75;
 console.log('\n## La puerta completa (dos jugadores al azar, en un momento al azar)');
 console.log(`  especies elegibles y compatibles ......... ${(ok2/total2*100).toFixed(1)}%`);
 console.log(`  ambos en MADURO a la vez ................. ${(maduro*maduro*100).toFixed(1)}%`);
 console.log(`  al menos uno hembra ...................... ${(gen*100).toFixed(0)}%`);
 const p=(ok2/total2)*maduro*maduro*gen;
 console.log(`  producto .................................. ${(p*100).toFixed(2)}%   = 1 de cada ${Math.round(1/p)}`);
 console.log('\n  Y encima, para los dos: Ánimo >=70, cuidados >=40, <=1 deposición, suciedad <=50,');
 console.log('  luz encendida, sin enfermedad, sin mote pendiente, sin objeto encontrado, y ninguno');
 console.log('  que haya criado ya. Más las dos personas juntas para escanear el QR.');
})().catch(e=>{console.error(e);process.exit(1)});
