// node tools/test_boss_respawn.js —— BOSS 统一 10 分钟刷新 + 特权减半
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}), toast:()=>{}, location:{reload(){}}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
['js/data.js','js/game.js','js/move.js','js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js','js/systems/lilian.js','js/systems/buff.js','js/systems/hero.js','js/systems/quest.js','js/systems/lootdata/tc.js','js/systems/lootdata/uniques.js','js/systems/lootdata/sets.js','js/systems/loot.js','js/systems/settings.js','js/systems/prerogative.js']
  .forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R=s=>vm.runInContext(s,ctx);
R('loadConfigs()').then(()=>{
  const G=R('G'); R("newRole('测试',1)");
  ok(R('BOSS_RESPAWN_SEC')===600, 'BOSS_RESPAWN_SEC=600');
  const maps=R('CFG.map.list.filter(function(x){return x.boss&&x.reborn;}).slice(0,3).map(function(x){return x.id;})');
  const kill=(mapId)=>R(`(function(){G.role.mapId=${mapId};var mc=mapCfg();var bid=[].concat(mc.boss)[0];var m=spawnMonster(mc,bid,true);var b={mons:[m]};var t=Date.now();killMonster(b,m);return {left:(G.role.stat['boss_'+m.cfg.id]-t)/1000,reborn:mc.reborn,gone:b.mons.length===0};})()`);
  (maps.length?maps:[R('G.role.mapId')]).forEach(id=>{ const k=kill(id); ok(Math.abs(k.left-600)<2 && k.gone, `地图${id} (原 reborn=${k.reborn}) BOSS 刷新 ${k.left.toFixed(1)}s ≈600`); });
  G.role.prerogative={_zhanshentime:Date.now()+86400000};
  const id=maps[0]||R('G.role.mapId'); const k=kill(id);
  ok(Math.abs(k.left-300)<2, `特权减半 ${k.left.toFixed(1)}s ≈300`);
  console.log(fails?'FAILED '+fails:'ALL PASS'); process.exit(fails?1:0);
}).catch(e=>{ console.error(e); process.exit(1); });
