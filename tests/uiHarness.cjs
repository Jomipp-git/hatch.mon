const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const GAME_SOURCE=/<script type="text\/plain" id="game-source">([\s\S]*?)<\/script>/;
// index.html gets read while something may be rewriting it: a build, a generator, an editor save.
// A truncating write makes readFileSync return a partial file, so the match comes back null and the
// whole test dies on line one with an unrelated TypeError. Re-read, then say what actually happened.
const pause=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
function runtimeHtml(){
 let text='';
 for(let attempt=0;attempt<5;attempt++){
  text=fs.readFileSync('index.html','utf8');
  if(GAME_SOURCE.test(text))return text;
  pause(40);
 }
 throw Error(`index.html carries no game-source block after 5 reads (${text.length} bytes): it is being rewritten`);
}
const gameSource=()=>runtimeHtml().match(GAME_SOURCE)[1];
const html=runtimeHtml(),script=html.match(GAME_SOURCE)[1];
async function setup({encapsulated=false,development=true,missing=false,reduced=false,initialSave=null,initialDisplayMode=null,initialLanguage=null,initialShells=null,cloud=false,storageMap=null,runtimeSource=script,vitalSource=null,startTime=1000000}={}){
 // startTime is local wall-clock for the run; the default lands at night, so day/night behaviour
 // has to be set up front rather than advanced into, which would fire every scheduled timer.
 let now=startTime,next=0,doc;const timeouts=new Map(),intervals=new Map(),storage=storageMap||new Map(),images=[];
 class E{constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.events={};this.textContent='';this.value='';this.style={setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}};this.classList={set:new Set(),contains(x){return this.set.has(x)},add(...a){a.forEach(x=>this.set.add(x))},remove(...a){a.forEach(x=>this.set.delete(x))},toggle(x,on){on?this.set.add(x):this.set.delete(x)}};this.hidden=false;this.open=false;}
 getContext(){return this.context??=( {draws:[],fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},clearRect(){},save(){},restore(){},translate(){},scale(){},drawImage(...args){this.draws.push(args)}} )}toDataURL(){return 'data:image/png;base64,AA=='}play(){return Promise.resolve()}select(){}setAttribute(k,v){this[k]=v}addEventListener(k,f){(this.events[k]??=[]).push(f)}fire(k,extra){for(const f of this.events[k]||[])f({target:this,preventDefault(){},stopPropagation(){},...extra})}getBoundingClientRect(){return this.rect??{left:40,top:40,right:440,bottom:440,width:400,height:400}}append(...a){for(const e of a)if(e&&typeof e==='object')e.parent=this;this.children.push(...a)}remove(){const p=this.parent;if(!p)return;const i=p.children.indexOf(this);if(i>=0)p.children.splice(i,1);this.parent=null}replaceChildren(...a){for(const e of a)if(e&&typeof e==='object')e.parent=this;this.children=a;this.textContent=''}get firstChild(){return this.children[0]}querySelectorAll(s){return this.children.flatMap(e=>[...(e.tagName==='button'?[e]:[]),...e.querySelectorAll(s)])}focus(){doc.activeElement=this}showModal(){this.open=true}
 // `<dialog>.close()` no dispara `close` en el acto: el navegador lo encola. Dispararlo aqui de
 // forma sincrona escondia un fallo real, porque el listener corria antes de que existiera lo que
 // tenia que cancelar. Las pruebas que dependan del evento tienen que pasar por `flush()`.
 close(){if(!this.open)return;this.open=false;queueMicrotask(()=>this.fire('close'))}}
 const els={};for(const m of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"[^>]*>/g)){els[m[2]]=new E(m[1]);els[m[2]].hidden=/\bhidden\b/.test(m[0]);}
 const actions=[...html.matchAll(/<button[^>]*data-action="([^"]+)"/g)].map(m=>{const e=new E('button');e.dataset.action=m[1];return e});
 const panels=['inventory','training','oak','settings'].map(p=>{const e=new E('button');e.dataset.panel=p;return e});
 doc={activeElement:null,hidden:false,events:{},getElementById:id=>els[id]||Object.values(els).flatMap(root=>{const walk=e=>[e,...e.children.flatMap(walk)];return walk(root)}).find(e=>e.id===id)||null,createElement:t=>new E(t),querySelectorAll:s=>s==='[data-action]'?actions:panels,querySelector:s=>actions.find(b=>s.includes(`"${b.dataset.action}"`)),addEventListener(k,f){this.events[k]=f}};
 const motion={matches:reduced,addEventListener(k,f){this.changed=f}};
 const win={events:{},matchMedia:()=>motion,addEventListener(k,f){this.events[k]=f}};if(cloud)win.HatchCloud={queue(){}};
 class Image extends E{constructor(){super('img');this.naturalWidth=512;this.naturalHeight=512;images.push(this)}set src(s){this.url=s;if(s.startsWith('assets/pmd/')){if(!fs.existsSync(s)){Promise.resolve().then(()=>this.onerror?.());return;}const png=fs.readFileSync(s);this.naturalWidth=png.readUInt32BE(16);this.naturalHeight=png.readUInt32BE(20);}Promise.resolve().then(()=>missing?this.onerror?.():this.onload?.())}}
 if(initialShells)storage.set('hatch.mon.shells',JSON.stringify(initialShells));
 if(initialLanguage!==null)storage.set('hatch.mon.language',initialLanguage);
 if(initialDisplayMode)storage.set('hatch.mon.displayMode',initialDisplayMode);
 if(initialSave)storage.set('hatch.mon.v3',JSON.stringify(initialSave));
 const ctx=vm.createContext({HatchEnvironment:{isDevelopmentEnvironment:()=>development},TextEncoder,TextDecoder,btoa,atob,crypto:require('node:crypto').webcrypto,Image,document:doc,window:win,performance:{now:()=>now},Date:class extends Date{static now(){return now}},Math:Object.assign(Object.create(Math),{random:()=>.5}),setTimeout(fn,delay){timeouts.set(++next,{fn,at:now+delay});return next},clearTimeout:id=>timeouts.delete(id),setInterval(fn){intervals.set(++next,fn);return next},clearInterval:id=>intervals.delete(id),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
 const run=s=>vm.runInContext(s,ctx),flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
 const advance=ms=>{const end=now+ms;let n=0;while(true){const d=[...timeouts].filter(([,t])=>t.at<=end+1e-7).sort((a,b)=>a[1].at-b[1].at)[0];if(!d)break;if(n++>20000)throw Error('timer loop');now=d[1].at;timeouts.delete(d[0]);d[1].fn()}now=end;};
 run(fs.readFileSync('i18n.js','utf8'));run(fs.readFileSync('evolutionTable.js','utf8'));run(fs.readFileSync('hatchmonData_v2.js','utf8'));run(fs.readFileSync('pokemonDataAdapter.js','utf8'));run(vitalSource||fs.readFileSync('vitalSimulation.js','utf8'));for(const f of ['relationship.js','attentionEngine.js','pokedex.js','shiny.js','assets/skins/themes.js','shellSkins.js','memorialFrames.js','styleTracing.js','cleanupCatch.js','trainingActivities.js','assets/pmd/manifest.js','assets/pmd/listMetrics.js','pmdRenderer.js'])run(fs.readFileSync(f,'utf8'));run(fs.readFileSync('pokemonRenderer.js','utf8'));run(fs.readFileSync('socialEngine.js','utf8'));run(fs.readFileSync('vendor/qrcode.js','utf8'));run(encapsulated?'(()=>{'+runtimeSource+'})();':runtimeSource);await flush();
 return {run,flush,advance,els,timeouts,intervals,images,doc,win,motion,storage};
}

module.exports={setup,runtimeHtml,gameSource};
