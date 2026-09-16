// Bloque 4: los cuatro minijuegos cuestan lo mismo y pagan lo mismo. ¿Tardan lo mismo?
process.chdir(require('node:path').join(__dirname,'..','..'));
const fs=require('fs'),vm=require('vm');
const ctx=vm.createContext({globalThis:null,Math,JSON,console,Number,Object,Array,document:{},window:{}});
ctx.globalThis=ctx;
vm.runInContext(fs.readFileSync('trainingActivities.js','utf8'),ctx);
const c=vm.runInContext('(()=>{const s=String(TrainingActivities.launch);return null;})()',ctx);
// leer config por regex, es un Object.freeze literal
const src=fs.readFileSync('trainingActivities.js','utf8');
const num=k=>{const m=src.match(new RegExp(k+':\\s*([0-9.]+)'));return m?parseFloat(m[1]):null;};
const MEM=[2,3,4,5,6];
const memoryFlash=num('memoryFlash'),memoryBase=num('memoryBase'),memoryStep=num('memoryStep');
const strengthRounds=num('strengthRounds'),sBase=num('strengthWindowBase'),sStep=num('strengthWindowStep');
const cleanRounds=num('cleanupRounds'),cBase=num('cleanupBase'),cStep=num('cleanupStep');
const verdict=num('verdictDelay');
const prep=1000;
console.log('## Duración teórica de cada minijuego (ventanas completas, sin contar la lectura de reglas)\n');
let iq=0;for(const n of MEM){iq+=n*memoryFlash + (memoryBase+memoryStep*n) + verdict;}
iq+=prep*MEM.length;
let st=0;for(let r=0;r<strengthRounds;r++){st+=(sBase+sStep*r)+verdict+prep;}
let ki=0;for(let r=0;r<cleanRounds;r++){ki+=(cBase-cStep*r)+verdict+prep;}
const rows=[
 ['Intelecto',iq,'5 secuencias de 2 a 6 luces'],
 ['Fuerza',st,'5 rondas de 3,0 a 4,2 s'],
 ['Amabilidad',ki,'7 tandas de 1,8 a 1,08 s'],
 ['Estilo',null,'5 trazados SIN tiempo máximo'],
];
for(const [name,ms,note] of rows){
 const s=ms===null?null:ms/1000;
 console.log(`  ${name.padEnd(11)} ${s===null?'    sin tope':(s.toFixed(1)+' s').padStart(11)}   ${note}`);
}
console.log('\n## Pago por minuto, si clavas un +5 (16 monedas)');
for(const [name,ms] of rows){
 if(ms===null){console.log(`  ${name.padEnd(11)} depende de lo despacio que tracees`);continue;}
 console.log(`  ${name.padEnd(11)} ${(16/(ms/60000)).toFixed(0)} monedas/min   (y ${(5/(ms/60000)).toFixed(1)} puntos de atributo/min)`);
}
console.log('\n## Curvas de dificultad, estrechamiento de la ronda 1 a la última');
console.log(`  Intelecto   secuencia 2 -> 6 luces            (+200% de carga de memoria)`);
console.log(`  Fuerza      nucleo 67 ms -> 35 ms             (-48%)`);
console.log(`  Amabilidad  ventana ${cBase} ms -> ${cBase-cStep*(cleanRounds-1)} ms   (-${(100-(cBase-cStep*(cleanRounds-1))/cBase*100).toFixed(0)}%)`);
console.log(`  Estilo      tolerancia 18 px -> 10 px         (-44%)`);
console.log('\n## Mapeo de rendimiento a nota');
console.log('  Fuerza / Amabilidad / Estilo: s normalizado 0..1 -> GRADE_THRESHOLDS [.92,.78,.58,.32]');
console.log('  Intelecto: NO pasa por la curva. gain = rondas acertadas a la primera, con mínimo 1.');
console.log('    -> 0 aciertos y 1 acierto pagan lo mismo (nota 1, 2 monedas): distinción muerta.');
