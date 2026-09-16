// Bloque 1: esperanza de vida. Rango declarado vs alcanzable, y cuánto la mueve el cuidado.
process.chdir(require('node:path').join(__dirname,'..','..'));
const fs=require('fs'),vm=require('vm');
const ctx=vm.createContext({globalThis:null,Math,Date,JSON,console,Number,Object,Array,isNaN});
ctx.globalThis=ctx;
ctx.PokemonData={get:()=>({}),roots:()=>[]};
vm.runInContext(fs.readFileSync('vitalSimulation.js','utf8'),ctx);
const L=vm.runInContext('LIFE_CONFIG',ctx);
const DAY=L.day;
// baseLifespan por semilla: recorrer muchos ids
const fresh=id=>vm.runInContext(`JSON.stringify(Vital.fresh(${JSON.stringify(id)}))`,ctx);
let mn=1e9,mx=-1e9;const vals=[];
for(let i=0;i<4000;i++){const v=JSON.parse(fresh('id-'+i));const d=v.baseLifespan/DAY;vals.push(d);mn=Math.min(mn,d);mx=Math.max(mx,d);}
vals.sort((a,b)=>a-b);
console.log('## baseLifespan (4.000 compañeros)');
console.log(`  declarado en config: baseDays ${L.baseDays} ± ${L.variationDays}   min ${L.minDays}  max ${L.maxDays}`);
console.log(`  observado: ${mn.toFixed(3)} – ${mx.toFixed(3)} d   mediana ${vals[2000].toFixed(3)}`);
const adj=q=>q<L.normalQuality?(1-q/L.normalQuality)*L.poorAdjustmentDays:(q-L.normalQuality)/(100-L.normalQuality)*L.excellentAdjustmentDays;
console.log('\n## Rango de vida alcanzable = baseLifespan + ajuste por calidad');
console.log(`  peor caso teórico: ${(mn+adj(0)).toFixed(2)} d      mejor caso teórico: ${(mx+adj(100)).toFixed(2)} d`);
console.log(`  tope declarado maxDays ${L.maxDays} -> ${(mx+adj(100))>=L.maxDays?'ALCANZABLE':'NUNCA ALCANZABLE'}`);
console.log(`  suelo declarado minDays ${L.minDays} -> ${(mn+adj(0))<=L.minDays?'alcanzable':'nunca alcanzable'}`);
console.log('\n## Qué compra cada nivel de calidad media (sobre una base de 4,00 d)');
for(const q of [0,20,40,50,65,70,75,80,90,100]){
 const a=adj(q);console.log(`  calidad ${String(q).padStart(3)}  ->  ${a>=0?'+':''}${a.toFixed(3)} d  (${a>=0?'+':''}${(a*24).toFixed(1)} h)   vida ${(4+a).toFixed(2)} d`);
}
console.log('\n## Etapas vitales, como fracción de la vida');
let prev=0;
for(const st of L.stages){const until=st.until===null||st.until===Infinity?1:st.until;
 console.log(`  ${st.id.padEnd(7)} ${(prev*100).toFixed(0)}%–${(until*100).toFixed(0)}%  =  ${((until-prev)*4).toFixed(2)} d en una vida de 4 d   hambre×${st.hunger} higiene×${st.hygiene} recuperación×${st.recovery} riesgo×${st.risk}`);
 prev=until;}
