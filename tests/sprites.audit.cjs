// Run from project root. Complete asset inventory and exact-content duplicates.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('node:assert/strict');
const ctx=vm.createContext({});const run=s=>vm.runInContext(s,ctx);
for(const f of ['evolutionTable.js','hatchmonData_v2.js','pokemonDataAdapter.js','pokemonRenderer.js'])run(fs.readFileSync(f,'utf8'));
const mapping=run('POKEMON_VISUALS'),playable=run('Object.keys(evolutionTable).map(id=>({id:PokemonData.canonicalId(id),name:PokemonData.get(id).DisplayName}))');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('assets/sprites').filter(p=>!p.endsWith('.DS_Store')),used=Object.values(mapping).filter(d=>d.src).map(d=>d.src);
const groups=key=>{const m=new Map();for(const f of files){const k=key(f);if(!m.has(k))m.set(k,[]);m.get(k).push(f)}return [...m.values()].filter(a=>a.length>1)};
const duplicateFiles=groups(f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'));
for(const p of playable){const d=mapping[p.id];assert.ok(d,`Missing mapping ${p.id}`);if(d.type==='placeholder')continue;assert.ok(fs.existsSync(d.src),d.src);const buf=fs.readFileSync(d.src);assert.equal(buf.readUInt32BE(16)%d.width,0);assert.equal(buf.readUInt32BE(20)%d.height,0);assert.ok(d.frames<=d.columns);assert.equal(d.frames,d.durations.length);assert.ok(d.crop.x+d.crop.width<=d.width);assert.ok(d.crop.y+d.crop.height<=d.height);assert.equal(run(`PokemonRenderer.definition('${p.id}').src`),d.src)}
assert.equal(new Set(used).size,used.length,'Two species share a file');
const duplicateMapped=duplicateFiles.filter(a=>a.filter(f=>used.includes(f)).length>1);assert.equal(duplicateMapped.length,0,'Identical mapped sheets');
assert.notEqual(mapping['0174A0'].src,mapping['0126A0'].src);
assert.ok(mapping['0026L0'].src.includes('raichu_alola'));assert.ok(mapping['0849A0'].src.includes('toxtricity_amped'));assert.ok(mapping['0849B0'].src.includes('toxtricity_low_key'));
const directories=fs.readdirSync('assets/sprites',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
const report={playable:playable.length,assetDirectories:directories.length,pngFiles:files.filter(f=>f.endsWith('.png')).length,ownSprites:used.length,placeholders:playable.filter(p=>mapping[p.id].type==='placeholder'),duplicateMappings:[],duplicateMappedFiles:duplicateMapped,duplicateFileGroups:duplicateFiles,unusedDirectories:directories.filter(d=>!used.some(f=>f.startsWith(`assets/sprites/${d}/`))),unusedFiles:files.filter(f=>!used.includes(f))};
fs.writeFileSync('tests/sprite-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,duplicateFileGroups:duplicateFiles.length,unusedFiles:report.unusedFiles.length},null,2));
