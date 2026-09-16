// Playwright global o el instalado por npx. Requiere el servidor local en marcha:
//   python3 tools/serveLocal.py --offline
const {execSync}=require('node:child_process'),fs=require('node:fs');
function playwright(){
  if(process.env.PLAYWRIGHT_MODULE)return require(process.env.PLAYWRIGHT_MODULE);
  const roots=[];
  try{roots.push(execSync('npm root -g',{encoding:'utf8'}).trim()+'/playwright');}catch{}
  try{for(const d of fs.readdirSync(process.env.HOME+'/.npm/_npx'))roots.push(process.env.HOME+'/.npm/_npx/'+d+'/node_modules/playwright');}catch{}
  for(const r of roots)if(fs.existsSync(r))return require(r);
  console.error('No encuentro Playwright. Instala el navegador con: npx playwright install chromium');
  process.exit(1);
}
const {chromium}=playwright();
const OUT=require('node:path').join(__dirname,'')+'/';
(async()=>{
 const b=await chromium.launch();
 const page=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
 await page.goto('http://127.0.0.1:8080/index.html',{waitUntil:'networkidle'});
 await page.evaluate(async()=>{
  for(const tag of document.querySelectorAll('script[data-game-src]'))await new Promise((r,j)=>{const s=document.createElement('script');s.src=tag.dataset.gameSrc;s.onload=r;s.onerror=j;document.head.append(s);});
  const g=document.createElement('script');g.textContent=document.getElementById('game-source').textContent;document.head.append(g);
  document.getElementById('auth-gate').hidden=true;document.getElementById('game-root').hidden=false;
 });
 await page.evaluate(`state=freshState(Date.now());state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname('Pika');
  state.pokemonId='pikachu';state.age=2.2*24*60*60*1000;state.relationship.points=70;state.coins=900;
  state.social.eggs=[{id:HatchMonSocial.uid(),kind:'egg',speciesId:'eevee',offspring:'eevee',createdAt:Date.now(),parents:[],snapshot:snapshotOf(freshState())},
                     {id:HatchMonSocial.uid(),kind:'egg',speciesId:'dratini',offspring:'dratini',createdAt:Date.now(),parents:[],snapshot:snapshotOf(freshState())}];
  render();`);
 await page.waitForTimeout(700);
 await page.locator('#screen').screenshot({path:OUT+'ia-botones.png'});
 for(const [file,js] of [['ia-crianza.png',"showPanel('social')"],['ia-pokedex.png',"collectionTab='companion';showPanel('pokedex')"],['ia-mochila.png',"state.inventory={thunder:1,berry:2,tea:1};showPanel('inventory')"]]){
  await page.evaluate(js); await page.waitForTimeout(800);
  await page.locator('#panel').screenshot({path:OUT+file});
  console.log(file,'·',await page.evaluate(()=>document.getElementById('panel-title').textContent));
 }
 await b.close();
})().catch(e=>{console.error('ERROR',e.message);process.exit(1)});
