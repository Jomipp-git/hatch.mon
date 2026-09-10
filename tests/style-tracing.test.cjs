const assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
(async()=>{const {run,els,advance}=await setup();
for(let round=0;round<5;round++){
 run(`var trace=StyleTracing.createScorer(${round});var path=trace.points;trace.start(path[0]);for(const p of path.slice(1))trace.move(p)`);
 assert.ok(run('trace.complete()'));assert.equal(run('StyleTracing.grade(trace.score())'),5);
}
for(const [score,gain]of [[0,1],[.4,2],[.6,3],[.75,4],[.9,5],[1,5]])assert.equal(run(`StyleTracing.grade(${score})`),gain);
run('var trace=StyleTracing.createScorer(0);trace.start(trace.points[0]);trace.move([300,10])');assert.ok(run('trace.score()')<.9);
run('globalThis.result=null;var commits=0;TrainingActivities.launch("style",{commit:(k,g)=>{result=g;commits++;return true}})');
const field=els['training-game-content'].children[3],canvas=field.children[0];canvas.getBoundingClientRect=()=>({left:10,top:20,width:640,height:440});let captured=null;
canvas.setPointerCapture=id=>{captured=id};canvas.hasPointerCapture=id=>captured===id;canvas.releasePointerCapture=()=>{captured=null};
const fire=(type,p,id=7)=>{for(const fn of canvas.events[type]||[])fn({pointerId:id,button:0,clientX:10+p[0]*2,clientY:20+p[1]*2,preventDefault(){}})};
advance(120000);assert.equal(run('result'),null,'No timeout during careful tracing');
for(let round=0;round<5;round++){
 const path=run(`StyleTracing.path(${round})`);fire('pointerdown',path[0]);assert.equal(captured,7);
 for(const p of path.slice(1)){advance(100);fire('pointermove',p);}
 fire('pointerup',path.at(-1));assert.equal(captured,null);
}
assert.equal(run('result'),5);assert.equal(run('commits'),1);fire('pointerup',[0,0]);assert.equal(run('commits'),1);
run('TrainingActivities.launch("style",{commit:()=>{commits++;return true}});TrainingActivities.cancel()');assert.equal(run('commits'),1);
console.log('PASS Style: all five paths perfect +5, errors reduce score, thresholds, slow tracing, scaled coordinates, pointer capture/release, cancellation and no double reward.');
})().catch(e=>{console.error(e);process.exitCode=1});
