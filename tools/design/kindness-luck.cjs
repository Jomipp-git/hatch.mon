// Amabilidad: cuánto de la nota es habilidad y cuánto es el sorteo de basura por ronda.
const ROUNDS=7,BASE=1800,STEP=120,MIN_T=2,MAX_T=4;
const T=[.92,.78,.58,.32];
const grade=s=>{const v=Math.max(0,Math.min(1,s));const i=T.findIndex(m=>v>=m);return i<0?1:5-i;};
const COINS=[0,2,4,7,11,16];
console.log('## Presupuesto de tiempo por basura, según la ronda y lo que sortee el azar\n');
console.log('  ronda | ventana | 2 basuras | 3 basuras | 4 basuras');
for(const r of [0,3,6]){const w=BASE-STEP*r;
 console.log(`   ${r}    | ${w} ms | ${(w/2).toFixed(0)} ms/toque | ${(w/3).toFixed(0)} ms/toque | ${(w/4).toFixed(0)} ms/toque`);}
console.log(`\n  rango completo: ${BASE/MIN_T} ms por toque en el mejor caso, ${((BASE-STEP*6)/MAX_T).toFixed(0)} ms en el peor.`);
console.log(`  eso es un factor ${ (BASE/MIN_T) / ((BASE-STEP*6)/MAX_T) | 0 }x de variación, y la curva que diseñaste solo cubre -40%.`);
console.log('\n## Reparto de notas para un jugador de habilidad FIJA (10.000 sesiones cada uno)');
console.log('  R = ms que tarda en reconocer y tocar una basura\n');
for(const R of [250,300,350,400,500,600]){
 const hist={1:0,2:0,3:0,4:0,5:0};
 for(let n=0;n<10000;n++){
  let earned=0,total=0;
  for(let r=0;r<ROUNDS;r++){
   const w=BASE-STEP*r;
   const count=MIN_T+Math.floor(Math.random()*(MAX_T-MIN_T+1));
   total+=count;earned+=Math.min(count,Math.floor(w/R));
  }
  hist[grade(earned/total)]++;
 }
 const dist=[1,2,3,4,5].map(g=>`${g}:${(hist[g]/100).toFixed(0)}%`).join(' ');
 const esperado=[1,2,3,4,5].reduce((a,g)=>a+COINS[g]*hist[g]/10000,0);
 const notas=[1,2,3,4,5].filter(g=>hist[g]>0);
 console.log(`  R=${R} ms  ${dist}   -> notas posibles: ${notas.join('/')}   monedas esperadas ${esperado.toFixed(1)}`);
}
console.log('\n## Comparación: en Fuerza, Intelecto y Estilo la dificultad por ronda es determinista.');
console.log('  Fuerza: ventana y zona fijadas por la ronda. Intelecto: 2,3,4,5,6 luces. Estilo: tolerancia 18..10 px.');
console.log('  Amabilidad es el único cuya dificultad por ronda la sortea el azar DESPUÉS de cobrar la sesión.');
