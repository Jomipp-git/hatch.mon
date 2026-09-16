process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
(async()=>{
 const h=await setup();
 h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
 console.log('## Catálogo de objetos (sumideros)');
 const cat=JSON.parse(h.run('JSON.stringify(Object.fromEntries(Object.entries(itemCatalog).map(([k,v])=>[k,{price:v.price,kind:v.kind}])))'));
 const byKind={};
 for(const [id,v] of Object.entries(cat)){(byKind[v.kind]??=[]).push(`${id}:${v.price}`);}
 for(const [k,v] of Object.entries(byKind))console.log(`  ${k.padEnd(14)} (${v.length}) ${v.join(' ')}`);
 const prices=Object.values(cat).map(v=>v.price);
 console.log(`  precios: min ${Math.min(...prices)}  max ${Math.max(...prices)}  distintos ${[...new Set(prices)].sort((a,b)=>a-b).join(', ')}`);
 console.log('\n## Recompensa por entrenamiento');
 console.log('  COIN_REWARDS ->',h.run('JSON.stringify(COIN_REWARDS)'));
 console.log('\n## Tienda diaria: qué sale cada día');
 const seen={},counts={};
 for(let d=0;d<120;d++){
  const day=new Date(2026,0,1+d);
  const ids=JSON.parse(h.run(`JSON.stringify(dailyShop(new Date(${day.getTime()})))`));
  for(const id of ids){counts[id]=(counts[id]||0)+1;}
  if(d<6)console.log(`  ${day.toISOString().slice(0,10)}  ${ids.join(', ')}`);
  seen[d]=ids.length;
 }
 const sizes=[...new Set(Object.values(seen))];
 console.log(`  tamaño de la tienda: ${sizes.join('/')} objetos por día`);
 console.log('  frecuencia en 120 días:');
 for(const [id,n] of Object.entries(counts).sort((a,b)=>b[1]-a[1]))console.log(`    ${id.padEnd(12)} ${n} días  (${(n/120*100).toFixed(0)}%)  precio ${cat[id].price}`);
 const nunca=Object.keys(cat).filter(id=>!counts[id]);
 console.log('  nunca aparecen:',nunca.length?nunca.join(', '):'(ninguno)');
})().catch(e=>{console.error(e);process.exit(1)});
