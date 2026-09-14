const fs=require('node:fs');
const runtimeFiles=['index.html','appBootstrap.mjs','authService.mjs','cloudSaveService.mjs','appEnvironment.js','pokemonDataAdapter.js','socialEngine.js','vitalSimulation.js','relationship.js','attentionEngine.js','pokedex.js','shiny.js','shellSkins.js','pokemonRenderer.js','pmdRenderer.js','trainingActivities.js','styleTracing.js'];
// Exact, reviewed technical markers; never use broad file or language exemptions.
const exceptions=[{file:'trainingActivities.js',text:"['A','B','C','D']",reason:'Language-independent memory pad symbols.'},{file:'index.html',text:'<noscript>Activa JavaScript para iniciar sesión. · Enable JavaScript to sign in.</noscript>',reason:'JavaScript is disabled; the JavaScript catalog cannot run.'},{file:'index.html',text:'hatch.mon',reason:'Product name.'},{file:'index.html',text:'Hatch.mon',reason:'Product name.'}];
function scanSource(source,file='snippet.js'){
 const results=[];let code=source;
 if(file.endsWith('.html')){
  const markup=source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,'');
  for(const match of markup.matchAll(/>([^<>]+)</g)){const text=match[1].trim();if(/[\p{L}]/u.test(text)&&!exceptions.some(e=>e.file===file&&e.text.includes(text)))results.push({kind:'html',text});}
  for(const m of markup.matchAll(/\s(?:title|placeholder|aria-label)="([^"]+)"/g))if(/[\p{L}]/u.test(m[1]))results.push({kind:'attribute',text:m[1]});
  code=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 }
 code=code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 const patterns=[/\.(?:textContent|innerHTML|outerHTML|title|placeholder)\s*=\s*(['"`])([\s\S]*?)\1/g,/(?:showToast|toast|alert|confirm|prompt|socialStatus)\(\s*(['"`])([\s\S]*?)\1/g,/\b(?:el|node)\(\s*['"][^'"]+['"]\s*,\s*(['"`])([\s\S]*?)\1/g,/setAttribute\(\s*['"](?:aria-label|title|placeholder)['"]\s*,\s*(['"`])([\s\S]*?)\1/g,/\b(?:state|s)\.message\s*=\s*(['"`])([\s\S]*?)\1/g];
 for(const pattern of patterns)for(const match of code.matchAll(pattern)){
  const text=match[2].replace(/\$\{[^}]*\}/g,'');if(!/[\p{L}]/u.test(text))continue;
  if(exceptions.some(e=>e.file===file&&e.text===text))continue;
  // Script injection is bootstrap code, not rendered copy.
  if(match[0].startsWith('script.textContent')||text.includes('(()=>{'))continue;
  results.push({kind:'javascript',text:match[2]});
 }
 return results;
}
function scan(){return runtimeFiles.flatMap(file=>scanSource(fs.readFileSync(file,'utf8'),file).map(x=>({file,...x})));}
module.exports={scanSource,scan,runtimeFiles,exceptions};
