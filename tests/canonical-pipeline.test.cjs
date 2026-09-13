const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{spawnSync}=require('node:child_process');

const context=vm.createContext({});
for(const file of ['evolutionTable.js','hatchmonData_v2.js','pokemonDataAdapter.js','assets/pmd/manifest.js','assets/skins/themes.js','assets/pmd/listMetrics.js'])
 vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
// Values cross a vm realm, so JSON round-tripping keeps host prototypes for deepEqual.
const run=source=>JSON.parse(vm.runInContext(`JSON.stringify(${source})`,context)??'null');
const archive=JSON.parse(fs.readFileSync('master/hatchmonData_v2.json'));

test('generated artifacts match the canonical workbook',()=>{
 const result=spawnSync('python3',['tools/generateCanonicalData.py','--check'],{encoding:'utf8'});
 assert.equal(result.status,0,`Regenerate with: python3 tools/syncCanonical.py\n${result.stderr||result.stdout}`);
});

test('the runtime admits exactly the species connected by a MinAgeDays rule',()=>{
 const admitted=new Set(archive.evolutionRules.filter(r=>r.MinAgeDays!==null).flatMap(r=>[r.FromId,r.ToId]));
 assert.deepEqual(run('Object.values(evolutionTable).map(e=>e.canonicalId)').sort(),[...admitted].sort());
 assert.deepEqual(run('HATCHMON_DATA.evolutionRules.map(r=>r.RuleId)').sort(),
  archive.evolutionRules.filter(r=>r.MinAgeDays!==null).map(r=>r.RuleId).sort());
 // Ditto carries no evolution rule but contract['Ditto'] keeps it a live breeding partner.
 const extra=run('HATCHMON_DATA.pokemon.map(p=>p.PokemonId)').filter(id=>!admitted.has(id));
 assert.deepEqual(extra,archive.pokemon.filter(p=>p.EggGroup==='Ditto').map(p=>p.PokemonId));
});

test('legacy IDs stay pinned so existing saves keep resolving',()=>{
 const pins=JSON.parse(fs.readFileSync('master/legacyIds.json'));
 for(const [canonical,legacy] of Object.entries(pins))assert.equal(run(`PokemonData.canonicalId(${JSON.stringify(legacy)})`),canonical,legacy);
 assert.equal(new Set(Object.values(pins)).size,Object.keys(pins).length,'duplicate legacy ID');
 for(const id of run('Object.keys(evolutionTable)'))assert.ok(Object.values(pins).includes(id),`${id} missing from legacyIds.json`);
});

test('every admitted species arrives with assets, shiny variant and shell theme',()=>{
 const missing={assets:[],shiny:[],themes:[],metrics:[]};
 for(const canonical of run('Object.values(evolutionTable).map(e=>e.canonicalId)')){
  const variant=run(`PMD_ASSETS[${JSON.stringify(canonical)}]`);
  if(!variant?.sprites?.Idle?.src)missing.assets.push(canonical);
  if(!variant?.shiny?.sprites?.Idle?.src)missing.shiny.push(canonical);
  if(!run(`Object.hasOwn(SHELL_THEMES,${JSON.stringify(canonical)})`))missing.themes.push(canonical);
  if(!run(`Object.hasOwn(PMD_LIST_METRICS,${JSON.stringify(canonical)})`))missing.metrics.push(canonical);
 }
 assert.deepEqual(missing,{assets:[],shiny:[],themes:[],metrics:[]});
});

test('every runtime file the page loads is staged in dist',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const referenced=[...html.matchAll(/(?:src|data-game-src)="([^"#:]+)"/g)].map(m=>m[1]).filter(name=>fs.existsSync(name));
 for(const name of ['index.html','assets/pmd/manifest.js','assets/skins/themes.js',...referenced]){
  assert.ok(fs.existsSync(`dist/${name}`),`dist/${name} missing; run python3 tools/buildMobileRuntime.py`);
  assert.deepEqual(fs.readFileSync(`dist/${name}`),fs.readFileSync(name),`dist/${name} is stale`);
 }
});
