const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,advance}=await setup();
for(let round=0;round<5;round++){
 run(`var trace=StyleTracing.createScorer(${round});var path=trace.points;trace.start(path[0]);for(const p of path.slice(1))trace.move(p)`);
 assert.ok(run('trace.complete()'));assert.equal(run('StyleTracing.grade(trace.score())'),5);
}
for(const [score,gain]of [[0,1],[.4,2],[.6,3],[.75,4],[.9,5],[1,5]])assert.equal(run(`StyleTracing.grade(${score})`),gain);
// La tolerancia se mide en pixeles reales: un lienzo dibujado a la mitad de su espacio logico la
// duplica, porque el dedo que traza no se encoge con el lienzo.
assert.equal(run('StyleTracing.createScorer(4).tolerance'),10);
assert.equal(run('StyleTracing.createScorer(4,{scale:2}).tolerance'),20);
assert.equal(run('StyleTracing.createScorer(4,{scale:.5}).tolerance'),10,'y nunca se aprieta por debajo de lo disenado');
run('var wide=StyleTracing.createScorer(4);wide.rescale(2)');assert.equal(run('wide.tolerance'),20);
// El mismo seed reconstruye el mismo trazo; seeds distintos, trazos distintos.
assert.deepEqual(run('StyleTracing.path(2,77)'),run('StyleTracing.path(2,77)'));
assert.notDeepEqual(run('StyleTracing.path(2,77)'),run('StyleTracing.path(2,78)'));
run('var trace=StyleTracing.createScorer(0);trace.start(trace.points[0]);trace.move([300,10])');assert.ok(run('trace.score()')<.9);
run('globalThis.result=null;var commits=0;TrainingActivities.launch("style",{commit:(k,g)=>{result=g;commits++;return true}})');
const field=els['training-game-content'].children[3],canvas=field.children[0];canvas.getBoundingClientRect=()=>({left:10,top:20,width:640,height:440});let captured=null;
canvas.setPointerCapture=id=>{captured=id};canvas.hasPointerCapture=id=>captured===id;canvas.releasePointerCapture=()=>{captured=null};
const fire=(type,p,id=7)=>{for(const fn of canvas.events[type]||[])fn({pointerId:id,button:0,clientX:10+p[0]*2,clientY:20+p[1]*2,preventDefault(){}})};
advance(120000);assert.equal(run('result'),null,'No timeout during careful tracing');
for(let round=0;round<5;round++){
 const path=run(`StyleTracing.path(${round},${canvas.dataset.seed})`);fire('pointerdown',path[0]);assert.equal(captured,7);
 for(const p of path.slice(1)){advance(100);fire('pointermove',p);}
 fire('pointerup',path.at(-1));assert.equal(captured,null);
}
assert.equal(run('result'),5);assert.equal(run('commits'),1);
// Terminar recorrido esta justo bajo el lienzo: sin trazo empezado no cierra la ronda con un cero.
run('globalThis.zero=null;TrainingActivities.launch("style",{commit:(k,g)=>{zero=g;return true}})');
const fresh=els['training-game-content'].children[3].children[1];
assert.equal(fresh.disabled,true,'Terminar recorrido llega deshabilitado');
for(let i=0;i<6;i++)fresh.fire('click');
assert.equal(run('zero'),null,'y rozarlo no gasta las cinco rondas');
run('TrainingActivities.cancel()');fire('pointerup',[0,0]);assert.equal(run('commits'),1);
run('TrainingActivities.launch("style",{commit:()=>{commits++;return true}});TrainingActivities.cancel()');assert.equal(run('commits'),1);
console.log('PASS Style: all five paths perfect +5, errors reduce score, thresholds, slow tracing, scaled coordinates, a per-session seed, pointer capture/release, cancellation and no double reward.');
})().catch(e=>{console.error(e);process.exitCode=1});
