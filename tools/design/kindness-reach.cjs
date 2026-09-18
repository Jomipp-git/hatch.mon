// Amabilidad: ¿cuánto de la nota es habilidad y cuánto el sorteo? Antes el sorteo era la cantidad de
// basura por ronda y movía la dificultad más que la curva. Con el minijuego de caída lo único que
// sortea el azar es el ORDEN y la COLUMNA, así que la pregunta cambia: ¿puede el cesto llegar
// siempre a tiempo, caiga donde caiga? Si no, el +5 depende del sorteo y eso es azar de salida.
process.chdir(require('node:path').join(__dirname,'..','..'));
globalThis.performance ??= {now:()=>0};
require(require('node:path').join(__dirname,'..','..','cleanupCatch.js'));
const C=globalThis.CleanupCatch,c=C.config,N=c.cans+c.plants;
const T=[.92,.78,.58,.32];
const grade=s=>{const v=Math.max(0,Math.min(1,s));const i=T.findIndex(m=>v>=m);return i<0?1:5-i;};
const COINS=[0,2,4,7,11,16];
const entry=i=>C.spawnAt(i)+c.catchTop*C.fallMs(i),exit=i=>C.spawnAt(i)+c.catchBottom*C.fallMs(i);

console.log('## El calendario de caída, que lo fija la config y no el azar\n');
console.log('  objeto | sale a | tarda en caer | en la banda del cesto');
for(const i of [0,1,2,12,13,N-2,N-1])
 console.log(`   ${String(i).padStart(2)}    | ${(C.spawnAt(i)/1000).toFixed(1).padStart(4)} s | ${String(Math.round(C.fallMs(i))).padStart(4)} ms      | ${(entry(i)/1000).toFixed(1)} a ${(exit(i)/1000).toFixed(1)} s`);
console.log(`\n  ${N} objetos (${c.cans} latas, ${c.plants} plantas), siempre los mismos: el denominador del`);
console.log('  marcador 0-1000 no cambia entre partidas, así que la mejor marca es comparable consigo misma.');
console.log(`  curva: ${Math.round(C.fallMs(0))} ms de caída el primero, ${Math.round(C.fallMs(N-1))} ms el último.`);

console.log('\n## ¿Se solapan dos objetos en la banda del cesto?\n');
let overlaps=0,worst=0;
for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){
 const ov=Math.min(exit(i),exit(j))-Math.max(entry(i),entry(j));
 if(ov>0){overlaps++;worst=Math.max(worst,ov);}}
console.log(`  pares solapados: ${overlaps}${overlaps?` (hasta ${worst.toFixed(0)} ms)`:''}`);
console.log(overlaps
 ? '  🔴 dos a la vez en la banda: si uno es lata y otro planta y caen cerca, el +5 es imposible.'
 : '  ✅ ninguno. Nunca hay que elegir entre dos, así que el +5 no depende de dónde caigan.');

console.log('\n## ¿Llega el cesto?\n');
const cross=(1-c.basketWidth)/c.basketSpeed;
const order=[...Array(N).keys()].sort((a,b)=>entry(a)-entry(b));
let tightest=Infinity,at=null;
for(let k=1;k<order.length;k++){const gap=entry(order[k])-exit(order[k-1]);if(gap<tightest){tightest=gap;at=order[k];}}
console.log(`  cruzar la pista de punta a punta: ${cross.toFixed(0)} ms`);
console.log(`  hueco más corto entre dos objetos: ${tightest.toFixed(0)} ms (antes del objeto ${at})`);
console.log(tightest>=cross
 ? `  ✅ sobran ${(tightest-cross).toFixed(0)} ms en el peor caso. El cesto llega desde cualquier columna.`
 : '  🔴 hay un hueco más corto que el viaje: ese objeto se pierde según dónde caiga.');

console.log('\n## Con el sorteo real de columnas (10.000 partidas)\n');
// Una lata desaparece en cuanto entra en la banda, así que se puede soltar en `entry`. Una planta
// hay que seguir esquivándola hasta que SALE, así que ahí el presupuesto empieza en `exit`. Ese es
// el caso que aprieta, y es el que se mide.
let fails=0,worstMargin=Infinity,worstCase=null;
for(let run=0;run<10000;run++){
 const items=C.plan();
 const seq=[...Array(N).keys()].sort((a,b)=>entry(a)-entry(b));
 for(let k=1;k<seq.length;k++){
  const prev=seq[k-1],next=seq[k];
  const free=items[prev].isCan?entry(prev):exit(prev);
  const travel=Math.abs(items[next].x-items[prev].x)/c.basketSpeed;
  const margin=(entry(next)-free)-travel;
  if(margin<0)fails++;
  if(margin<worstMargin){worstMargin=margin;worstCase=`objeto ${next} tras ${items[prev].isCan?'una lata':'una planta'}`;}
 }
}
console.log(`  transiciones imposibles en 10.000 partidas: ${fails}`);
console.log(`  margen más ajustado visto: ${worstMargin.toFixed(0)} ms (${worstCase})`);
console.log(fails
 ? '  🔴 hay partidas donde el +5 no se puede sacar: el sorteo de columnas decide la nota.'
 : '  ✅ ninguna. El +5 es alcanzable en todas: el azar elige qué y dónde, nunca cuánto cuesta.');

const mins=C.duration()/60000;
console.log(`\n  duración ${(C.duration()/1000).toFixed(1)} s · ${(16/mins).toFixed(0)} monedas/min a un +5 (Fuerza 36, Intelecto 22)`);

console.log('\n  *Límite del método:* es geometría, no telemetría. Supone que el jugador ve venir cada objeto');
console.log('  y sale hacia él en cuanto puede, y no modela errores de juicio: dice si da tiempo, no cuánto');
console.log('  se falla distinguiendo una lata de una hoja.');
