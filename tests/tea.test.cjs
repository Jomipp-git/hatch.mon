const assert=require('node:assert/strict');
const {setup}=require('./uiHarness.cjs');

(async()=>{
  const h=await setup();
  h.run('state.incubationRemaining=0;hatch(()=>0);finishBirthScene();setNickname("");dailyShop=()=>["tea"]');
  assert.equal(h.run('itemCatalog.tea.price'),50);
  h.run('state.coins=50;buyShopItem("tea")');
  assert.equal(h.run('state.coins'),0);
  assert.equal(h.run('state.inventory.tea'),1);
  for(const [energy,expected] of [[10,60],[40,90],[60,100],[99,100]]){
    h.run(`state.inventory.tea=1;state.trainer.energy=6;state.care={hambre:41,felicidad:52,energia:${energy},higiene:63}`);
    assert.equal(h.run('useItem("tea")'),true);
    assert.equal(h.run('state.inventory.tea'),0);
    assert.equal(h.run('state.trainer.energy'),5);
    assert.equal(h.run('state.care.energia'),expected);
    assert.equal(h.run('state.care.hambre'),41);
    assert.equal(h.run('state.care.felicidad'),52);
    assert.equal(h.run('state.care.higiene'),63);
  }
  assert.equal(h.run('t("item.tea")'),'Té');
  assert.equal(h.run('t("ui.shop.tea")'),'Recupera 50 de energía.');
  h.run('I18n.setLanguage("en")');
  assert.equal(h.run('t("item.tea")'),'Tea');
  assert.equal(h.run('t("ui.shop.tea")'),'Restores 50 Energy.');
  console.log('PASS tea: price, daily shop purchase, AP, capped Energy, isolated care stats and ES/EN copy.');
})().catch(error=>{console.error(error);process.exitCode=1});
