const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./uiHarness.cjs');
const ADMIN_UID='a81c13f7-a9d6-46d5-aa5c-66512b25ed68';

function authenticated(h,uid){h.win.HatchAdmin=Object.freeze({isAdmin:()=>uid===ADMIN_UID});}
function clickOak(h,count){for(let index=0;index<count;index++)h.els['oak-portrait'].fire('click');}
function panelKeys(node){return node.children.flatMap(child=>[child.dataset?.key,...panelKeys(child)].filter(Boolean));}

test('development keeps testing available without the secret unlock',async()=>{
 const h=await setup({development:true});
 assert.equal(h.run('canUseTesting()'),true);assert.ok(h.win.HatchMon);
});

test('production admin unlock requires exactly ten Oak portrait clicks',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 h.run('showPanel("settings")');assert.ok(!panelKeys(h.els['panel-content']).includes('testing-reset'));
 clickOak(h,9);assert.equal(h.run('adminCheatsUnlocked'),false);assert.equal(h.run('canUseTesting()'),false);
 h.els['oak-portrait'].fire('click');assert.equal(h.run('adminCheatsUnlocked'),true);assert.equal(h.run('canUseTesting()'),true);
 assert.ok(panelKeys(h.els['panel-content']).includes('testing-reset'));
});

test('Oak click sequence expires after five seconds',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);
 clickOak(h,9);h.advance(5001);h.els['oak-portrait'].fire('click');
 assert.equal(h.run('adminCheatsUnlocked'),false);assert.equal(h.run('adminOakClicks'),1);
});

test('non-admins cannot unlock or call cheats in production',async()=>{
 const h=await setup({development:false});authenticated(h,'different-user');
 clickOak(h,10);
 assert.equal(h.run('adminCheatsUnlocked'),false);assert.equal(h.run('canUseTesting()'),false);
 assert.equal(h.run('skipTime(1)'),false);
 assert.equal(h.run('forceEvolution("pikachu")'),false);
 assert.equal(h.run('resetGame()'),false);
});

test('unlock is memory-only and locks on runtime stop or reload',async()=>{
 const h=await setup({development:false});authenticated(h,ADMIN_UID);clickOak(h,10);
 assert.equal(h.run('adminCheatsUnlocked'),true);h.run('window.HatchRuntime.stop()');
 assert.equal(h.run('adminCheatsUnlocked'),false);
 const reloaded=await setup({development:false});authenticated(reloaded,ADMIN_UID);
 assert.equal(reloaded.run('adminCheatsUnlocked'),false);assert.equal(reloaded.run('canUseTesting()'),false);
});
