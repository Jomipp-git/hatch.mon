const {test}=require('node:test'),assert=require('node:assert/strict');const {setup}=require('./uiHarness.cjs');
test('Strength: zona movil que se estrecha, tiempo visible, pointerdown, cinco rondas perfectas',async()=>{
 const h=await setup();h.run('var frames=new Map(),frameId=0;globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId};globalThis.cancelAnimationFrame=id=>frames.delete(id);var gains=[];TrainingActivities.launch("strength",{commit:(a,g)=>{gains.push(g);return true}})');
 const frame=()=>h.run('var batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(performance.now()))');
 // La pista es el control: un unico boton con zona, nucleo, marcador, barra de tiempo y rotulo.
 const field=h.els['training-game-content'].children[3],button=field.children[0];
 const [zone,core,marker,time]=button.children;
 const cfg=key=>h.run(`TrainingActivities.config.${key}`);
 const at=()=>parseFloat(marker.style.left),centre=()=>parseFloat(core.style.left)+parseFloat(core.style.width)/2;
 const centres=[],widths=[];
 for(let round=0;round<5;round++){
  h.advance(cfg('prepare'));frame();
  const target=centre();centres.push(target);widths.push(parseFloat(zone.style.width));
  // El marcador entra por el extremo opuesto a la zona: no hay ronda que se gane al habilitarse.
  assert.ok(Math.abs(at()-target)>40,'la ronda arranca lejos de la zona');
  assert.equal(parseFloat(time.style.width),100,'y con la barra de tiempo entera');
  // Recorrido lineal: llegar cuesta exactamente la distancia, sin frenadas en los extremos.
  h.advance(Math.abs(target-at())/100*cfg('strengthSweep'));frame();
  assert.ok(Math.abs(at()-target)<1e-9,'y avanza a velocidad constante');
  assert.ok(parseFloat(time.style.width)<100,'mientras la barra de tiempo se vacia');
  // Event arrives a second after the last frame; score the position actually displayed.
  h.advance(1000);button.events.pointerdown[0]({button:0,pointerId:1,preventDefault(){}});button.events.click[0]({detail:1});
  assert.equal(h.els['training-game-content'].children[1].textContent,'¡En el centro!');
  // Acertar corta la ronda: ya no hay que agotar la ventana mirando la pantalla.
  h.advance(cfg('verdictDelay')+1);frame();
 }
 assert.equal(h.run('gains.join()'),'5');assert.equal(h.run('frames.size'),0);
 // La zona salta de sitio cada ronda y nunca repite vecindario.
 for(let i=1;i<centres.length;i++)assert.ok(Math.abs(centres[i]-centres[i-1])>=cfg('strengthZoneShift')*100-1e-9,`la ronda ${i+1} mueve la zona`);
 for(const c of centres)assert.ok(c>=cfg('strengthZoneMin')*100-1e-9&&c<=cfg('strengthZoneMax')*100+1e-9,'dentro de la banda util');
 // Y la curva de dificultad es el estrechamiento, no la velocidad.
 for(let i=1;i<widths.length;i++)assert.ok(Math.abs(widths[i]-widths[i-1]*cfg('strengthZoneShrink'))<1e-9,`la ronda ${i+1} estrecha la zona`);
 const precision=(pos,...rest)=>h.run(`TrainingActivities.strengthPrecision(${[pos,...rest].join(',')})`);
 const core0=cfg('strengthCoreRadius'),zone0=cfg('strengthZoneRadius'),miss0=cfg('strengthMissRadius');
 for(const pos of [.5-core0,.5,.5+core0])assert.equal(precision(pos),1,'el nucleo puntua 1 exacto');
 for(const pos of [.5-zone0,.5+zone0])assert.ok(Math.abs(precision(pos)-cfg('strengthEdgeScore'))<1e-9,'y el borde de la zona pintada, .7');
 assert.ok(precision(.47)<1&&precision(.47)>precision(.44),'entre medias baja de forma continua');
 for(const pos of [.5-miss0,.5+miss0,.05,.95])assert.equal(precision(pos),0,'fuera del radio de fallo no puntua');
 assert.ok(precision(.35)>0&&precision(.35)<cfg('strengthEdgeScore'));
 // La misma curva, movida y a escala: es lo unico que cambia entre rondas.
 const scale=cfg('strengthZoneShrink');
 assert.equal(precision(.3+core0*scale,.3,scale),1,'el nucleo viaja con la zona y encoge con ella');
 assert.ok(Math.abs(precision(.3+zone0*scale,.3,scale)-cfg('strengthEdgeScore'))<1e-9);
 assert.equal(precision(.3+miss0*scale,.3,scale),0);
 assert.ok(precision(.3+core0,.3,scale)<1,'lo que en la ronda 1 era clavarla ya no lo es en la 2');
});
test('Strength continuous frames stop on cancel/background; same position scores equally at 60/90/120 Hz',async()=>{
 const seen=[];
 for(const hz of [60,90,120]){
  const h=await setup();h.run('var frames=new Map(),frameId=0;globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId};globalThis.cancelAnimationFrame=id=>frames.delete(id);TrainingActivities.launch("strength",{commit:()=>true})');
  for(let i=0;i<Math.ceil(1.1*hz);i++){h.advance(1000/hz);h.run('var batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(performance.now()))');}
  const track=h.els['training-game-content'].children[3].children[0];
  const position=parseFloat(track.children[2].style.left)/100;
  assert.ok(Number.isFinite(position));
  // Se puntua lo que se ha dibujado, sea cual sea la cadencia de repintado del dispositivo.
  const precision=h.run(`TrainingActivities.strengthPrecision(${position})`),edge=h.run('TrainingActivities.config.strengthEdgeScore');
  track.events.pointerdown[0]({button:0,pointerId:1,preventDefault(){}});
  assert.equal(h.els['training-game-content'].children[1].textContent,
   precision===1?'¡En el centro!':precision>=edge?'Cerca del centro':precision>0?'Al borde de la zona':'Fuera de zona',
   `${hz} Hz puntua la posicion dibujada`);
  seen.push(precision);
  h.doc.hidden=true;h.doc.events.visibilitychange();assert.equal(h.run('frames.size'),0);
 }
 assert.equal(seen.length,3);
});
test('main visuals pause behind training while physiology and immediate commit remain active',async()=>{
 const h=await setup();h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");render();var oldAge=state.age;trainingVisuals(true);var node=document.getElementById("stats").children[0];');
 h.advance(60000);for(const fn of h.intervals.values())fn();assert.ok(h.run('state.age>oldAge'));assert.equal(h.run('trainingVisualsPaused'),true);h.run('trainingVisuals(false)');assert.equal(h.run('trainingVisualsPaused'),false);
});
test('Style coalesces paints without dropping scorer samples; drag reads geometry once',async()=>{
 const h=await setup();h.run('var frames=new Map(),frameId=0;globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId};globalThis.cancelAnimationFrame=id=>frames.delete(id);TrainingActivities.launch("style",{commit:()=>true})');
 const canvas=h.els['training-game-content'].children[3].children[0];let paints=0,rects=0;canvas.getContext().clearRect=()=>paints++;canvas.getBoundingClientRect=()=>{rects++;return{left:0,top:0,width:320,height:220}};canvas.setPointerCapture=()=>{};canvas.hasPointerCapture=()=>false;
 const path=h.run(`StyleTracing.path(0,${canvas.dataset.seed})`),event=p=>({pointerId:1,button:0,clientX:p[0],clientY:p[1],preventDefault(){}});
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
