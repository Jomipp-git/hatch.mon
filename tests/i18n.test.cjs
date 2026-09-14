const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const {setup}=require('./uiHarness.cjs');
test('locale switches, defaults safely and exposes both supported languages',()=>{const nodes=[];const document={documentElement:{lang:'es'},querySelectorAll:()=>nodes};const context=vm.createContext({document,globalThis:{}});vm.runInContext(fs.readFileSync('i18n.js','utf8'),context);const i18n=context.globalThis.HatchI18n;assert.equal(i18n.getLanguage(),'es');assert.equal(i18n.t('shop'),'Tienda');i18n.setLanguage('en');assert.equal(i18n.t('shop'),'Shop');assert.equal(document.documentElement.lang,'en');i18n.setLanguage('unknown');assert.equal(i18n.getLanguage(),'es');assert.equal(i18n.t('missing.key'),i18n.t('errors.generic'));});
test('catalog locales have matching, nonempty keys',()=>{const context=vm.createContext({document:{documentElement:{},querySelectorAll:()=>[]},globalThis:{}});vm.runInContext(fs.readFileSync('i18n.js','utf8'),context);const audit=context.globalThis.HatchI18n.audit();assert.equal(audit.missingEs.length,0);assert.equal(audit.missingEn.length,0);assert.equal(audit.empty.length,0);});
test('responsive layout declares supported narrow and tablet breakpoints',()=>{const html=fs.readFileSync('index.html','utf8');for(const width of [320,375,390,430,768])assert.match(html,new RegExp(width<=430?'max-width:430px|max-width:370px|max-width:330px':'min-width:600px'));assert.match(html,/overflow:auto/);assert.match(html,/touch-action:none/);});

test('Oak and evolution diagnostics render from centralized keys in English',async()=>{
 const {run,els}=await setup();
 run("HatchI18n.setLanguage('en');state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname('');state.age=DAY;state.relationship.points=40;showPanel('oak')");
 const text=node=>String(node.textContent||'')+node.children.map(text).join(' ');const output=text(els['panel-content']);
 for(const expected of ['Life stage','Age','Breeding','Evolution','Hunger'])assert.match(output,new RegExp(expected));
 assert.doesNotMatch(output,/oak\.|Evolución|Etapa|Edad/);
 assert.equal(run("t('evolution.success',{from:'Pichu',to:'Pikachu'})"),'Pichu evolved into Pikachu!');
 assert.equal(run("t('oak.requirement.bond',{hearts:2})"),'Bond ≥ 2 ♥');
});
test('Connect, QR and breeding use localized UI and validation messages',async()=>{
 const {run,els,doc}=await setup();
 run("HatchI18n.setLanguage('en');state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname('');showPanel('social')");
 const text=node=>String(node.textContent||'')+node.children.map(text).join(' ');const output=text(els['panel-content']);
 for(const expected of ['Share companion','Breed','Receive Egg','Share Egg','Generate QR'])assert.match(output,new RegExp(expected));
 assert.equal(run("PokemonData.genderLabel('male')"),'Male');
 assert.equal(run('Vital.breedingReason(state)'),'It can only breed at the MATURE life stage.');
 assert.throws(()=>run("HatchMonSocial.unpack('bad',()=>true)"),/incomplete or corrupt/);
 run("selectSocialFlow('receive');socialAction(()=>importEntity('bad'))");
 assert.match(doc.getElementById('social-status').textContent,/incomplete or corrupt/);
});
test('authentication and system messages have English catalog entries and use presentation keys',()=>{
 const document={documentElement:{lang:'es'},querySelectorAll:()=>[]},context=vm.createContext({document,globalThis:{}});vm.runInContext(fs.readFileSync('i18n.js','utf8'),context);const i18n=context.globalThis.HatchI18n;
 i18n.setLanguage('en');for(const [key,value] of [['auth.signIn','Sign in'],['auth.loadingSession','Checking session…'],['auth.sessionExpired','Your session has expired. Sign in again.'],['errors.network','No internet connection. Check it and reload the page.'],['system.unsynced','Not synced. Progress is saved on this device.']])assert.equal(i18n.t(key),value);
 const bootstrap=fs.readFileSync('appBootstrap.mjs','utf8'),cloud=fs.readFileSync('cloudSaveService.mjs','utf8'),auth=fs.readFileSync('authService.mjs','utf8');
 // Keys can reach t() directly or through a helper, so presence of the key is what is asserted.
 for(const key of ['auth.verifyingAccount','auth.loadingTitle','auth.loadingSession','auth.sessionCheckFailed'])assert.ok(bootstrap.includes(`'${key}'`),key);
 assert.match(cloud,/systemText\('system\.unsynced'\)/);
 for(const key of ['auth.invalidCredentials','auth.emailUnconfirmed','auth.serverError'])assert.ok(auth.includes(`'${key}'`),key);
 // Every catalog key the auth surfaces name must exist in both languages.
 for(const key of [...bootstrap.matchAll(/'(auth\.[a-zA-Z.]+)'/g),...auth.matchAll(/'(auth\.[a-zA-Z.]+)'/g)].map(m=>m[1])){
  for(const language of ['es','en']){i18n.setLanguage(language);assert.notEqual(i18n.t(key),key,`${key} missing in ${language}`);}
 }
});
test('training minigames render catalog text, including results and canvas labels',async()=>{
 const document={documentElement:{lang:'es'},querySelectorAll:()=>[]},context=vm.createContext({document,globalThis:{}});vm.runInContext(fs.readFileSync('i18n.js','utf8'),context);const i18n=context.globalThis.HatchI18n;
 i18n.setLanguage('en');for(const [key,value] of [['minigame.iq.instructions','Watch the lights and repeat the order.'],['minigame.strength.action','Now!'],['minigame.style.progress','2/5 · 75 %'],['minigame.result.coinsSuffix',' · +25 coins']])assert.equal(i18n.t(key,key==='minigame.style.progress'?{round:2,total:5,percent:75}:key==='minigame.result.coinsSuffix'?{coins:25}:{}),value);
 const activities=fs.readFileSync('trainingActivities.js','utf8'),tracing=fs.readFileSync('styleTracing.js','utf8'),html=fs.readFileSync('index.html','utf8');
 assert.match(activities,/t\('minigame\.result\.statGain'/);assert.match(activities,/t\('minigame\.common\.responseRound'/);assert.match(tracing,/t\('minigame\.style\.canvasLabel'\)/);assert.match(html,/data-i18n-aria="minigame\.common\.dialogLabel"/);assert.match(html,/t\('minigame\.result\.coinsSuffix'/);
});
test('catalog has no duplicate keys or mismatched interpolation parameters',()=>{
 const source=fs.readFileSync('i18n.js','utf8'),context=vm.createContext({document:{documentElement:{},querySelectorAll:()=>[]}});vm.runInContext(source,context);const audit=context.HatchI18n.audit();assert.equal(audit.placeholderMismatch.length,0,JSON.stringify(audit.placeholderMismatch));
 for(const block of source.split(/\n  "(?:es|en)": \{/).slice(1)){const keys=[...block.split('\n  }')[0].matchAll(/^    "([^"]+)":/gm)].map(m=>m[1]);assert.equal(new Set(keys).size,keys.length);}
});
test('hardcoded-copy guard covers text, toast, HTML and the actual runtime',()=>{
 const {scanSource,scan}=require('./i18n-audit.cjs');
 for(const code of ['button.textContent = "Comprar"','toast("Error al guardar")','element.innerHTML = `<p>Texto visible</p>`'])assert.ok(scanSource(code).length,code);
 assert.equal(scanSource("button.textContent = t('buy')").length,0);assert.deepEqual(scan(),[]);
});
test('language changes refresh rendered messages and placeholders without reload',()=>{
 const message={textContent:'',children:[],getAttribute:()=>null},label={dataset:{i18nPlaceholder:'optionalNickname'},setAttribute(name,v){this[name]=v},children:[]};
 const document={documentElement:{},querySelectorAll(selector){if(selector==='*')return [message,label];if(selector==='[data-i18n-placeholder]')return [label];return [];}};
 const ctx=vm.createContext({document});vm.runInContext(fs.readFileSync('i18n.js','utf8'),ctx);const i18n=ctx.HatchI18n;
 message.textContent=i18n.t('ui.found',{name:i18n.t('item.berry')});i18n.setLanguage('en');assert.equal(message.textContent,'You found Berry! It was added to your Bag.');assert.equal(label.placeholder,'Optional nickname');i18n.setLanguage('es');assert.equal(message.textContent,'¡Encontraste Baya! Se ha guardado en tu mochila.');
});
test('settings persists locale and old or invalid preferences safely default to Spanish',async()=>{
 const game=await setup();game.run("showPanel('settings')");const buttons=game.els['panel-content'].querySelectorAll('button');buttons.find(b=>b.textContent==='English').fire('click');assert.equal(game.run('HatchI18n.getLanguage()'),'en');assert.equal(game.storage.get('hatch.mon.language'),'en');assert.match(game.run("LABELS.hambre"),/Hunger/);
 const saved=JSON.parse(game.run('JSON.stringify(state)'));const loaded=await setup({initialSave:saved,initialLanguage:'en'});assert.equal(loaded.run('HatchI18n.getLanguage()'),'en');assert.equal(loaded.run('state.social.active.id'),saved.social.active.id);
 for(const initialLanguage of [null,'invalid','{"language":"en"}']){const old=await setup({initialSave:saved,initialLanguage});assert.equal(old.run('HatchI18n.getLanguage()'),'es');assert.equal(old.run('state.social.active.id'),saved.social.active.id);}
});
test('cloud language roundtrip and pre-language envelope preserve game progress',async()=>{
 const {snapshotCache,hydrateCache}=await import('../cloudSaveService.mjs');const values=new Map(),cache={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const fixture={version:12,pokemonId:'pichu',care:{hambre:67.5},inventory:{berry:3},milestones:[{from:'pichu',to:'pikachu'}]};
 for(const language of [undefined,null,'invalid','es','en']){hydrateCache(cache,{game:fixture,preferences:{language}});const out=snapshotCache(cache);assert.equal(out.preferences.language,language==='en'?'en':'es');assert.equal(out.game.pokemonId,fixture.pokemonId);assert.deepEqual(out.game.care,fixture.care);assert.deepEqual(out.game.inventory,fixture.inventory);assert.deepEqual(out.game.milestones,fixture.milestones);}
});
test('Shop, collection, care and training labels render in English and Spanish',async()=>{
 const {run,els}=await setup();const text=n=>String(n.textContent||'')+(n.children||[]).map(text).join(' ');
 run("HatchI18n.setLanguage('en');showPanel('shop')");assert.match(text(els['panel-content']),/Coins: 0/);assert.match(text(els['panel-content']),/Buy/);
 run("closePanel();state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname('');showPanel('training')");assert.match(text(els['panel-content']),/Intellect/);assert.match(text(els['panel-content']),/Practice/);
 run("closePanel();showPanel('pokedex');collectionTab='memories';renderPokedex()");assert.match(text(els['panel-content']),/MEMORIES/);assert.match(text(els['panel-content']),/No departed/);
 run("HatchI18n.setLanguage('es');renderPokedex()");assert.match(text(els['panel-content']),/MEMORIAS/);
 assert.equal(run("Vital.eat(state,CARE_CONFIG.feed)"),'Ya parece bastante lleno.');run("HatchI18n.setLanguage('en')");assert.match(run("Vital.eat(state,CARE_CONFIG.feed)"),/full|rest/);
});
test('raw platform errors never leak through the localized presentation layer',()=>{
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('i18n.js','utf8'),ctx);const i=ctx.HatchI18n;i.setLanguage('es');assert.equal(i.errorMessage(new Error('DOMException: device failed'),'qr.cameraUnavailable'),i.t('qr.cameraUnavailable'));const message=i.t('qr.codeUsed');i.setLanguage('en');assert.equal(i.errorMessage({message}),i.t('qr.codeUsed'));
});
