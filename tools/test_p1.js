// node tools/test_p1.js —— P1：死亡 / 离线 / 特权 / 历练
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, clearInterval, setInterval,
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}),
  toast:()=>{}, location:{reload(){}, search:''}, window:null, document:{getElementById:()=>null}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
const files=[
  'js/data.js','js/game.js','js/move.js',
  'js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js',
  'js/systems/lilian.js','js/systems/buff.js','js/systems/hero.js','js/systems/quest.js',
  'js/systems/lootdata/tc.js','js/systems/lootdata/uniques.js','js/systems/lootdata/sets.js',
  'js/systems/loot.js','js/systems/settings.js',
  'js/systems/prerogative.js','js/systems/die.js','js/systems/offline.js'
];
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
ctx.FX={emit(){}, attach(){}};
ctx.UI={main:1}; // die UI 存在时不走兜底
ctx.showRoleDie=function(){ ctx._dieShown=true; };

let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R=s=>vm.runInContext(s,ctx);

R('loadConfigs()').then(()=>{
  const S=ctx.Systems, G=R('G');
  R("newRole('测P1',1)");
  const r=G.role;
  ok(r.ver>=4, 'newRole ver>=4 got '+r.ver);
  ok(!!r.prerogative && r.prerogative._zdhsup===false, '默认无特权');

  // —— 死亡 ——
  r.settings.afk.autoRevive=false; // 手动复活流程 (自动复活见 test_fix1.js)
  R('G.role.mapId=1003; enterMap(1003)');
  R('G.role.hp=0; roleDie()');
  ok(G.dead===true && G.paused===true, '死亡后 paused/dead');
  ok(ctx._dieShown===true, '触发死亡 UI（不直接回城）');
  ok(G.role.mapId===1003, '死亡后仍在原地图 '+G.role.mapId);
  // 元宝不足原地
  r.yuanbao=0;
  ok(S.die.reviveLocal(false)==='元宝不足', '原地复活元宝不足');
  r.yuanbao=50;
  ok(S.die.reviveLocal(false).indexOf('OK')===0 && !G.dead && r.yuanbao===30, '20元宝原地复活');
  // 再死 → 回城
  R('G.role.hp=0; roleDie()');
  const mid=G.role.mapId;
  const reborn=(R('mapCfg()')||{}).rebornmap || 1001;
  ok(S.die.reviveCity().indexOf('OK')===0 && !G.dead, '回城复活');
  ok(G.role.mapId===reborn || G.role.hp>0, '回城后地图/满血');

  // —— 离线 ——
  r.level=10; r.lastSave=Date.now()-3*3600*1000;
  const off=S.offline.calc();
  ok(!!off && off.limitHour===6, '默认离线上限 6h');
  ok(off.minute===180 || off.minute===181, '3小时分钟数 got '+off.minute);
  const lc=R('cfg("levelup",10)');
  const expectExp=Math.ceil(lc.addexp/(6*60)*off.minute);
  ok(off.exp===expectExp, '经验按 levelup.addexp 比例 got '+off.exp+' expect '+expectExp);
  const g0=r.gold, e0=r.exp;
  ok(S.offline.claim(off,1).indexOf('OK')===0 && r.gold===g0+off.gold, '免费×1 发放金币');
  // 特权 12h
  r.prerogative._huishoutime=Date.now()+864e5*10;
  S.prerogative.refresh();
  ok(S.prerogative.offlineHours()===12 && S.prerogative.recycleRate()===1, '回收特权→12h+满额回收');
  r.lastSave=Date.now()-8*3600*1000;
  const off2=S.offline.calc();
  ok(off2.limitHour===12 && off2.minute===480, '8h 离线在 12h 帽内');
  // 元宝×5
  r.yuanbao=1000;
  const cost=off2.costYuanbao, y0=r.yuanbao, g1=r.gold;
  ok(S.offline.claimYuanbao(off2).indexOf('OK')===0 && r.yuanbao===y0-cost && r.gold===g1+off2.gold*5, '元宝×5');

  // —— 特权购买 ——
  r.yuanbao=500;
  const br=S.prerogative.buy(30, 2);
  ok(br.indexOf('OK')===0 && S.prerogative.isActive('zs') && S.prerogative.killExpPct()===10, '战神月卡');
  ok(r.yuanbao===500-300, '元宝扣 rmb*10');
  ok(S.prerogative.claimYuanbao('zs').indexOf('OK')===0, '领取战神每日100');
  ok(S.prerogative.claimYuanbao('zs')==='今日已领取', '不可重复领');

  // 回收 50%
  r.prerogative._huishoutime=0; S.prerogative.refresh();
  ok(S.prerogative.recycleRate()===0.5, '无回收特权 50%');
  const eq=R('(function(){var c=CFG.item.list.find(function(x){return x.type==2&&x.sellprice>0&&x.needlevel<=10;});var s=createStuff(c.id,1,1);s.q=1;addItem(s);return s;})()');
  const price=R('stuffCfg(G.role.bag[G.role.bag.length-1]).sellprice');
  const gBefore=r.gold;
  const rec=S.fenjie.recycle(eq.uid);
  ok(rec.indexOf('OK')===0 && r.gold===gBefore+Math.ceil(price*1*0.5), '回收半价 got +'+(r.gold-gBefore)+' expect '+Math.ceil(price*0.5));

  // —— 历练 ——
  const ch=S.lilian.chapters();
  ok(ch.length>=3 && ch[0].tasks.length>0 && ch[3] && ch[3].locked, '章节锁定 id>1003');
  // 完成一个等级任务
  r.level=99;
  const t0=ch[0].tasks[0];
  const ch2=S.lilian.chapters()[0];
  const claimable=ch2.tasks.filter(x=>x.canClaim);
  ok(claimable.length>=1, '高等级后有可领任务');
  if(claimable[0]){
    const res=S.lilian.claim(claimable[0].id);
    ok(res.indexOf('OK')===0 && r.tasksDone[claimable[0].id], '领取历练奖励');
  }
  ok(typeof S.lilian.claimAll==='function', 'claimAll 存在');
  ok(S.lilian.stageBg(ch[0]).indexOf('stage_1001')>=0, '章节背景');

  // 存档迁移
  const old={name:'旧',prof:1,level:5,exp:0,gold:0,yuanbao:100,hp:100,mp:50,mapId:1003,bag:[],equip:{},skills:{},kills:{},stat:{},tasksDone:{},ver:3,lastSave:Date.now()};
  store['cq_web_save_v1']=JSON.stringify({role:old});
  ok(R('load()') && G.role.ver>=4 && G.role.prerogative && G.role.prerogative._lixianup===false, '旧档迁移 ver4+prerogative');

  console.log(fails?('\n'+fails+' FAILED'):'\nALL PASS');
  process.exit(fails?1:0);
}).catch(e=>{ console.error(e); process.exit(1); });
