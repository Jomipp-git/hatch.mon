process.chdir(require('node:path').join(__dirname,'..','..'));
const {setup}=require('../../tests/uiHarness.cjs');
const DAY=86400000;
(async()=>{
 const h=await setup();
 h.run('state=freshState(1000);state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("")');
 const rules=JSON.parse(h.run(`JSON.stringify(Object.entries(evolutionConfig).flatMap(([from,cfg])=>(cfg.rules||[]).map(r=>({from,to:r.to,ageDays:r.ageMs/${DAY},item:!!r.item}))))`));
 const out={};for(const r of rules)(out[r.from]??=[]).push(r);
 const roots=Object.keys(out).filter(id=>!rules.some(r=>r.to===id));
 const longest=(id,seen=new Set())=>{if(seen.has(id))return [];seen.add(id);let best=[];
   for(const r of out[id]||[]){const p=[r,...longest(r.to,new Set(seen))];if(p.length>best.length)best=p;}return best;};
 const lasts=[];
 for(const root of roots){const p=longest(root);if(p.length)lasts.push({root,last:p[p.length-1].ageDays,n:p.length,needsItem:p.some(r=>r.item)});}
 lasts.sort((a,b)=>a.last-b.last);
 const hist={};for(const l of lasts)hist[l.last.toFixed(1)]=(hist[l.last.toFixed(1)]||0)+1;
 console.log('## Última evolución de cada línea (26 raíces)');
 console.log('  edad de la última evolución -> nº de líneas:',Object.entries(hist).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}d:${v}`).join('  '));
 const life=4.0;
 console.log('\n  como % de una vida típica de 4,00 d:');
 for(const [k,v] of Object.entries(hist).sort((a,b)=>a[0]-b[0])){
  const pct=(+k)/life*100;const etapa=pct<20?'CRÍA':pct<45?'JOVEN':pct<80?'MADURO':'SENIOR';
  console.log(`    día ${k} = ${pct.toFixed(0)}% de la vida (${etapa})  ->  ${v} líneas   tiempo restante ${(life-k).toFixed(1)} d`);
 }
 const flat=lasts.filter(l=>l.last<=2).length;
 console.log(`\n  líneas cuya última evolución ocurre el día 2 o antes: ${flat} de ${lasts.length} (${(flat/lasts.length*100).toFixed(0)}%)`);
 console.log(`  -> para esas líneas, los últimos ${(life-2).toFixed(1)} d (50% de la vida) no tienen ningún hito de evolución`);
 console.log(`  líneas que necesitan comprar algún objeto: ${lasts.filter(l=>l.needsItem).length} de ${lasts.length}`);
})().catch(e=>{console.error(e);process.exit(1)});
