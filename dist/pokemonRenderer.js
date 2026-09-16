/* Render canvas PMD, reproducción del huevo y fallback retro. */
'use strict';
const POKEMON_RENDER_CONFIG={maxWidth:112,maxHeight:120,placeholderScale:4,
  // A form only seen through someone else's code shows as a solid shape: every visible pixel
  // becomes this one tone. Dark grey rather than black, which reads as a hole in the grid.
  silhouette:[58,58,68],
  // Los cuatro tonos del filtro `#lcd-palette` de index.html, en 0-255. En iOS el filtro SVG del
  // ancestro no llega al canvas —probado: en WebKit de escritorio sí, así que es cosa del
  // compositor de iOS—, así que el sprite se cuantiza aquí. Donde el filtro SÍ llega se aplica dos
  // veces, y eso es inofensivo: se comprobó en Chromium y WebKit que la segunda pasada devuelve los
  // mismos píxeles, porque la luminancia de cada tono cae dentro de su propia banda.
  lcdPalette:[[38,59,48],[82,105,74],[145,164,119],[213,223,187]],
  palette:[null,'#344e3b','#71915b','#bed09a'],
  placeholder:{type:'matrix',pixels:[
    '0000000000000000',
    '0000011111100000',
    '0001122222211000',
    '0012223333222100',
    '0122333333332210',
    '0123313333132210',
    '0123313333132210',
    '0122333333332210',
    '0122331113332210',
    '0012233333322100',
    '0001122222211000',
    '0000011111100000',
    '0000000000000000'
  ]},
  memorial:{type:'matrix',pixels:['00111100','01222210','12311321','12311321','12111121','12311321','12333321','12333321','12222221','11111111']}
};
globalThis.PokemonRenderer=(()=>{
  const cache=new Map();
  function definition(speciesId){return POKEMON_RENDER_CONFIG.placeholder;}
  function load(src){
    if(!cache.has(src))cache.set(src,new Promise(resolve=>{
      const img=new Image(),timeout=setTimeout(()=>resolve(null),5000);img.onload=()=>{clearTimeout(timeout);resolve(img);};img.onerror=()=>{clearTimeout(timeout);resolve(null);};img.src=src;
    }));return cache.get(src);
  }
  const preloaded=new Set();
  function preloadNearby(speciesId,isShiny){
    const key=`${speciesId}:${isShiny}`;if(preloaded.has(key)||typeof PmdVisuals==='undefined')return;preloaded.add(key);
    const sources=new Set(['normal','sleep','sick','eat','train','happy','startled'].map(state=>PmdVisuals.candidates(speciesId,state,isShiny)[0]?.src).filter(Boolean));
    const warm=()=>{for(const src of sources)void load(src);};
    if(globalThis.requestIdleCallback)requestIdleCallback(warm,{timeout:1000});else setTimeout(warm,100);
  }
  function frameBounds(def){
    const c=def.crop||{x:0,y:0,width:def.width||16,height:def.height||16};
    return def.frameBounds||[[c.x,c.y,c.x+c.width,c.y+c.height]];
  }
  const geometryCache=new Map();
  function geometry(speciesId,list=false){
    const id=PokemonData.canonicalId(speciesId),key=id+':'+list;
    if(geometryCache.has(key))return geometryCache.get(key);
    const base=definition(id),idle=(typeof PmdVisuals==='undefined'?null:PmdVisuals.candidates(id,'normal')[0])||base;
    const c=idle.crop||{width:16,height:16};
    const animations=typeof PmdVisuals==='undefined'?[base]:[false,true].flatMap(shiny=>(list?['normal']:Object.keys(PMD_STATE_FALLBACKS)).flatMap(state=>PmdVisuals.candidates(id,state,shiny)));
    const sizes=animations.flatMap(d=>frameBounds(d).map(b=>[b[2]-b[0],b[3]-b[1]]));
    const target=84,limit=98;
    const metric=list&&typeof PMD_LIST_METRICS!=='undefined'?PMD_LIST_METRICS[id]:null;
    const scale=metric?Math.min(Math.sqrt(2700/metric.opaqueArea),limit/metric.width,limit/metric.height,limit/Math.max(...sizes.map(b=>b[0])),limit/Math.max(...sizes.map(b=>b[1]))):Math.min(target/c.height,limit/c.width,limit/Math.max(...sizes.map(b=>b[0])),limit/Math.max(...sizes.map(b=>b[1])));
    const result=Object.freeze({scale,width:104,height:104,baseline:101});geometryCache.set(key,result);return result;
  }
  function create(host,{list=false}={}){
    let key=null,serial=0,timer=null,canvas=null,paused=false,currentDraw=null;
    function flatten(){
      // Semi-transparent edges become fully opaque, so the shape reads as one mass, not a blur.
      const ctx=canvas.getContext('2d');
      if(typeof ctx.getImageData!=='function')return;
      const frame=ctx.getImageData(0,0,canvas.width,canvas.height),data=frame.data;
      const [r,g,b]=POKEMON_RENDER_CONFIG.silhouette;
      for(let i=0;i<data.length;i+=4){if(!data[i+3])continue;data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;}
      ctx.putImageData(frame,0,0);
    }
    // Mismo cálculo que el filtro SVG: luminancia y cuatro bandas discretas.
    function quantise(){
      const ctx=canvas.getContext('2d');
      if(typeof ctx.getImageData!=='function')return;
      const frame=ctx.getImageData(0,0,canvas.width,canvas.height),data=frame.data;
      const tones=POKEMON_RENDER_CONFIG.lcdPalette;
      for(let i=0;i<data.length;i+=4){
        if(!data[i+3])continue;
        const luma=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;
        const tone=tones[Math.min(tones.length-1,Math.floor(luma*tones.length))];
        data[i]=tone[0];data[i+1]=tone[1];data[i+2]=tone[2];
      }
      ctx.putImageData(frame,0,0);
    }
    const cancel=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
    const stop=()=>{serial++;cancel();key=null;currentDraw=null;host.replaceChildren();};
    function matrix(def){
      const pixels=def.pixels,width=pixels[0].length,height=pixels.length;
      const scale=Math.max(1,Math.min(POKEMON_RENDER_CONFIG.placeholderScale,Math.floor(POKEMON_RENDER_CONFIG.maxWidth/width),Math.floor(POKEMON_RENDER_CONFIG.maxHeight/height)));
      const offsetX=Math.floor((canvas.width-width*scale)/2),offsetY=canvas.height-height*scale;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);
      const palette=def.palette||POKEMON_RENDER_CONFIG.palette;
      pixels.forEach((row,y)=>Array.from(row).forEach((value,x)=>{if(palette[Number(value)]){ctx.fillStyle=palette[Number(value)];ctx.fillRect(offsetX+x*scale,offsetY+y*scale,scale,scale);}}));
    }
    function renderPokemon(speciesId,{dead=false,resting=false,visualState='normal',animate=true,isShiny=false,silhouette=false,lcd=false}={}){
      const nextKey=`${speciesId}:${dead}:${resting}:${visualState}:${animate}:${isShiny}:${silhouette}:${lcd}`;
      if(key===nextKey)return;if(!list&&!dead)preloadNearby(speciesId,isShiny);stop();key=nextKey;const token=serial;
      canvas=document.createElement('canvas');canvas.className='pokemon-pixels';canvas.setAttribute('aria-hidden','true');host.append(canvas);
      const metrics=geometry(speciesId,list);canvas.width=metrics.width;canvas.height=metrics.height;canvas.style.width=`${metrics.width*1.3}px`;canvas.style.height=`${metrics.height*1.3}px`;
      const available=typeof PmdVisuals==='undefined'?[]:PmdVisuals.candidates(speciesId,visualState,isShiny);
      const definitions=dead?[POKEMON_RENDER_CONFIG.memorial]:[...available,POKEMON_RENDER_CONFIG.placeholder];
      const seen=new Set();const candidates=definitions.filter(d=>{const key=d.src||d;if(seen.has(key))return false;seen.add(key);return true;});
      host.dataset.speciesId=PokemonData.canonicalId(speciesId)||'';host.classList.toggle('resting',resting&&!dead);
      function attempt(){
        if(serial!==token)return;
        const def=candidates.shift()||POKEMON_RENDER_CONFIG.placeholder;
        if(visualState==='eat'&&def.animationName==='Eat'&&!PmdVisuals.stableEat(speciesId,def)){attempt();return;}
        if(def.type==='matrix'||def.type==='bitmap'){host.dataset.visual=dead?'memorial':'placeholder';matrix(def);if(silhouette)flatten();if(lcd)quantise();return;}
        host.dataset.visual='loading';
        load(def.src).then(img=>{
        if(serial!==token)return;
        if(!img){attempt();return;}
        const w=def.width||img.naturalWidth,h=def.height||img.naturalHeight;
        const columns=def.type==='sheet'?def.columns:1,frames=def.type==='sheet'?def.frames:1,row=def.row||0;
        if(!Number.isInteger(w)||!Number.isInteger(h)||w<=0||h<=0||w*columns>img.naturalWidth||(row+1)*h>img.naturalHeight||frames>columns){attempt();return;}
        const first=list?def.frameBounds?.[0]:null;
        const crop=first?{x:first[0],y:first[1],width:first[2]-first[0],height:first[3]-first[1]}:def.crop||{x:0,y:0,width:w,height:h};
        if(crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>w||crop.y+crop.height>h){attempt();return;}
        if((list?[frameBounds(def)[0]]:frameBounds(def)).some(b=>(b[2]-b[0])*metrics.scale>98||(b[3]-b[1])*metrics.scale>98)){attempt();return;}
        host.dataset.visual='asset';host.dataset.asset=def.src;host.dataset.visualState=visualState;host.dataset.silhouette=String(silhouette);
        canvas.classList.toggle('feeding-idle',visualState==='eat'&&def.animationName!=='Eat'&&animate);
        const scale=metrics.scale;let frame=0;
        currentDraw=()=>{
          cancel();if(serial!==token||paused)return;
          const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.save();if(def.flip){ctx.translate(canvas.width,0);ctx.scale(-1,1);}
          const b=frameBounds(def)[frame]||frameBounds(def)[0];
          const fw=b[2]-b[0],fh=b[3]-b[1];
          const x=Math.max(3,Math.min(canvas.width-3-fw*scale,(canvas.width-crop.width*scale)/2+(b[0]-crop.x)*scale));
          const y=Math.max(3,Math.min(metrics.baseline-fh*scale,metrics.baseline-(crop.y+crop.height-b[1])*scale));
          ctx.drawImage(img,frame*w+b[0],row*h+b[1],fw,fh,x,y,fw*scale,fh*scale);ctx.restore();
          if(silhouette)flatten();
          if(lcd)quantise();
          if(animate&&frames>1&&!(visualState==='faint'&&frame===frames-1)&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
            const delay=typeof PmdVisuals==='undefined'?def.durations?.[frame]||1000/(def.fps||4):PmdVisuals.frameDuration(def,frame);frame=(frame+1)%frames;timer=setTimeout(currentDraw,delay);
          }
        };currentDraw();
      });
      }attempt();
    }
    return {renderPokemon,stop,pause(){paused=true;cancel();},resume(){paused=false;currentDraw?.();}};
  }
  function createEgg(sprite,{config,motion:eggMotion,createFallback}){
const eggAssets=new Map();
function loadEggAsset(assetConfig){
  return new Promise(resolve=>{
    const image=new Image();let settled=false;
    const finish=value=>{if(settled)return;settled=true;clearTimeout(deadline);image.onload=null;image.onerror=null;resolve(value);};
    const deadline=setTimeout(()=>finish(null),5000);
    image.onload=()=>{
      const w=image.naturalWidth,h=image.naturalHeight;
      finish(w>0&&h>0&&w%config.columns===0&&h%config.rows===0
        ?{image,width:w/config.columns,height:h/config.rows}:null);
    };
    image.onerror=()=>finish(null);image.src=assetConfig.url;
  });
}
const eggPending=new Map();let eggReference=null;
function prepareEgg(phase){
  if(!config.phases[phase])return Promise.resolve();
  if(!eggPending.has(phase))eggPending.set(phase,loadEggAsset(config.phases[phase]).then(asset=>{
    if(asset&&!eggReference)eggReference=asset;
    eggAssets.set(phase,asset&&asset.width===eggReference.width&&asset.height===eggReference.height?asset:null);
  }));
  return eggPending.get(phase);
}
function createEggController(sprite){
  let phase=null,index=0,timeout=null,due=0,remaining=0,token=0,ready=false,complete=null,done=false,holding=false;
  let paused=document.hidden,asset=null;
  const clear=()=>{if(timeout!==null)clearTimeout(timeout);timeout=null;};
  function paint(frame){
    sprite.dataset.eggPhase=String(phase);sprite.dataset.eggFrame=String(frame);
    if(asset){
      if(!sprite.classList.contains('sheet'))sprite.classList.add('sheet');
      sprite.textContent='';
      // La geometría del archivo solo define la proporción, nunca el tamaño en pantalla.
      const longest=Math.max(asset.width,asset.height);
      sprite.style.setProperty('--frame-ratio-width',String(asset.width/longest));sprite.style.setProperty('--frame-ratio-height',String(asset.height/longest));
      sprite.style.backgroundImage=`url("${config.phases[phase].url}")`;
      // Con fondo 400%×400%, cada tercio del recorrido corresponde a una celda.
      sprite.style.backgroundPosition=`${frame%4*100/(config.columns-1)}% ${Math.floor(frame/4)*100/(config.rows-1)}%`;
    }else{sprite.classList.remove('sheet');sprite.style.backgroundImage='';sprite.replaceChildren(createFallback());}
  }
  function schedule(delay){
    clear();remaining=delay;
    if(paused||!ready||done||phase===null)return;
    due=performance.now()+delay;timeout=setTimeout(step,delay);
  }
  function finish(){
    clear();done=true;const callback=complete;complete=null;if(callback)callback();
  }
  function step(){
    timeout=null;
    if(paused||!ready||done||phase===null)return;
    const phaseConfig=config.phases[phase];
    if(eggMotion.matches){finish();return;} // Solo fase 5 agenda este caso.
    if(index+1<phaseConfig.sequence.length){index++;paint(phaseConfig.sequence[index]);schedule(1000/phaseConfig.fps);return;}
    if(phase===5){
      if(!holding){holding=true;schedule(phaseConfig.revealPauseMs||0);return;}
      finish();return;
    }
    index=0;paint(phaseConfig.sequence[0]);
    schedule(phaseConfig.pause[0]+Math.random()*(phaseConfig.pause[1]-phaseConfig.pause[0]));
  }
  function startPlayback(){
    asset=eggAssets.get(phase)||null;ready=true;index=0;
    const phaseConfig=config.phases[phase];
    paint(eggMotion.matches&&phase===5?phaseConfig.frames-1:phaseConfig.sequence[0]);
    if(eggMotion.matches){if(phase===5)schedule(350);return;}
    schedule(phase===5?1000/phaseConfig.fps:phaseConfig.pause[0]+Math.random()*(phaseConfig.pause[1]-phaseConfig.pause[0]));
  }
  function setPhase(next,onComplete=null){
    if(phase===next)return; // render() periódico no reinicia frames ni temporizadores.
    clear();phase=next;ready=false;done=false;holding=false;index=0;complete=onComplete;
    const request=++token;
    // Retener el frame anterior mientras termina la precarga, evitando parpadeos.
    prepareEgg(next).then(()=>{if(request===token&&phase===next){startPlayback();void prepareEgg(next+1);}});
  }
  function stop(){clear();token++;phase=null;ready=false;complete=null;done=false;asset=null;}
  function pause(){if(paused)return;paused=true;if(timeout!==null)remaining=Math.max(0,due-performance.now());clear();}
  function resume(){if(!paused)return;paused=false;if(ready&&!done&&phase!==null&&(!eggMotion.matches||phase===5))schedule(remaining);}
  function motionChanged(){
    if(!ready||phase===null||done)return;clear();
    if(eggMotion.matches){paint(phase===5?15:0);if(phase===5)schedule(350);}
    else{paint(config.phases[phase].sequence[index]);schedule(1000/config.phases[phase].fps);}
  }
  eggMotion.addEventListener('change',motionChanged);
  return {setPhase,stop,pause,resume};
}
    return createEggController(sprite);
  }
  return Object.freeze({create,createEgg,definition,geometry});
})();
