const {test}=require('node:test'),assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
test('Strength: visual perfect zone, pointerdown, stale frame tolerance, five perfect rounds, no duplicate click',async()=>{
 const h=await setup();h.run('var frames=new Map(),frameId=0;globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId};globalThis.cancelAnimationFrame=id=>frames.delete(id);var gains=[];TrainingActivities.launch("strength",{commit:(a,g)=>{gains.push(g);return true}})');
 const frame=()=>h.run('var batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(performance.now()))');
 const field=h.els['training-game-content'].children[3],marker=field.children[0].children[1],button=field.children[1];
 for(let round=0;round<5;round++){
  h.advance(600);frame();assert.equal(parseFloat(marker.style.left),50);
  // Event arrives a second after the last frame; score the position actually displayed.
  h.advance(1000);button.events.pointerdown[0]({button:0,pointerId:1,preventDefault(){}});button.events.click[0]({detail:1});
  assert.equal(h.els['training-game-content'].children[1].textContent,'¡En el centro!');h.advance(2000);frame();
 }
 assert.equal(h.run('gains.join()'),'5');assert.equal(h.run('frames.size'),0);
 for(const pos of [.4,.45,.5,.55,.6])assert.equal(h.run(`TrainingActivities.strengthPrecision(${pos})`),1);
 for(const pos of [.399,.601])assert.ok(h.run(`TrainingActivities.strengthPrecision(${pos})`)<1);
});
test('Strength continuous frames stop on cancel/background; same position scores equally at 60/90/120 Hz',async()=>{
 for(const hz of [60,90,120]){
  const h=await setup();h.run('var frames=new Map(),frameId=0;globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId};globalThis.cancelAnimationFrame=id=>frames.delete(id);TrainingActivities.launch("strength",{commit:()=>true})');
  for(let i=0;i<Math.ceil(.7*hz);i++){h.advance(1000/hz);h.run('var batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(performance.now()))');}
  const position=parseFloat(h.els['training-game-content'].children[3].children[0].children[1].style.left)/100;
  assert.ok(Number.isFinite(position));assert.equal(h.run(`TrainingActivities.strengthPrecision(${position})`),position>=.4&&position<=.6?1:Math.max(0,position<.4?position/.4:(1-position)/.4));
  h.doc.hidden=true;h.doc.events.visibilitychange();assert.equal(h.run('frames.size'),0);
 }
});
test('main visuals pause behind training while physiology and immediate commit remain active',async()=>{
 const h=await setup();h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");render();var oldAge=state.age;trainingVisuals(true);var node=document.getElementById("stats").children[0];');
 h.advance(60000);for(const fn of h.intervals.values())fn();assert.ok(h.run('state.age>oldAge'));assert.equal(h.run('trainingVisualsPaused'),true);h.run('trainingVisuals(false)');assert.equal(h.run('trainingVisualsPaused'),false);
});
test('Style coalesces paints without dropping scorer samples; drag reads geometry once',async()=>{
 const h=await setup();h.run('var frames=new Map(),frameId=0;globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId};globalThis.cancelAnimationFrame=id=>frames.delete(id);TrainingActivities.launch("style",{commit:()=>true})');
 const canvas=h.els['training-game-content'].children[3].children[0];let paints=0,rects=0;canvas.getContext().clearRect=()=>paints++;canvas.getBoundingClientRect=()=>{rects++;return{left:0,top:0,width:320,height:220}};canvas.setPointerCapture=()=>{};canvas.hasPointerCapture=()=>false;
 const path=h.run('StyleTracing.path(0)'),event=p=>({pointerId:1,button:0,clientX:p[0],clientY:p[1],preventDefault(){}});
 canvas.events.pointerdown[0](event(path[0]));for(const p of path.slice(1,25))canvas.events.pointermove[0](event(p));assert.equal(paints,0);assert.equal(rects,1);assert.equal(h.run('frames.size'),1);h.run('var batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn())');assert.equal(paints,1);h.run('TrainingActivities.cancel()');assert.equal(h.run('frames.size'),0);
});
test('egg loads current/next only; active PMD images reused across reactions',async()=>{
 const h=await setup();assert.equal(h.images.filter(i=>i.url?.includes('assets/eggs/')).length,2);
 h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");render()');h.advance(100);await h.flush();
 const before=h.images.length;h.run('render();render();render()');await h.flush();assert.equal(h.images.length,before);
 for(const kind of ['sleep','eat','train','sick','happy','normal','eat']){h.run(`petReaction('${kind}')`);await h.flush();}
 const urls=h.images.filter(i=>i.url?.includes('assets/pmd/')).map(i=>i.url);assert.equal(new Set(urls).size,urls.length);
});
test('Kindness keeps targets stable while a pointer spans a round boundary',async()=>{
 const h=await setup();h.run('TrainingActivities.launch("kindness",{commit:()=>true})');h.advance(640);const field=h.els['training-game-content'].children[3],buttons=field.children;const b=buttons[0],label=b.textContent;
 b.events.pointerdown[0]({pointerId:1,button:0});h.advance(2000);assert.equal(b.textContent,label);assert.equal(field.children[0],b);b.events.pointerup[0]({pointerId:1});b.events.click[0]({detail:1});assert.equal(b.disabled,true);h.advance(500);assert.equal(field.children[0],b);
});
