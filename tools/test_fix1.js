// node tools/test_fix1.js —— QA fix1: S2 自动复活/补药/退图, M1 死亡后不再扣血, G8 满包回收, M3 广告次数
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, clearInterval, setInterval,
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}),
  toast:()=>{}, location:{reload(){}, search:''}, window:null, document:{getElementById:()=>null}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
['js/data.js','js/game.js','js/move.js',
 'js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js',
 'js/systems/lilian.js','js/systems/buff.js','js/systems/hero.js','js/systems/quest.js',
 'js/systems/lootdata/tc.js','js/systems/lootdata/uniques.js','js/systems/lootdata/sets.js',
 'js/systems/loot.js','js/systems/settings.js','js/systems/prerogative.js','js/systems/die.js',
 'js/systems/offline.js','js/systems/yyshop.js'
].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
ctx.FX={emit(){}, attach(){}};
ctx.UI={main:1, popups:[]};
ctx.showRoleDie=function(){ ctx._dieShown=(ctx._dieShown||0)+1; };
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R=s=>vm.runInContext(s,ctx);

R('loadConfigs()').then(()=>{
  const S=ctx.Systems, G=R('G');
  R('Systems.settings.ensure && null');
  R("newRole('修一',1)"); R('Systems.settings.ensure(G.role)');
  const r=G.role;
  // ---- S2 默认值 ----
  const afk=new Proxy({},{get:(t,k)=>G.role.settings.afk[k],set:(t,k,v)=>(G.role.settings.afk[k]=v,true)});
  ok(afk.autoRevive===true && afk.autoBuyDrug===true && afk.autoRetreat===true, 'S2 默认 autoRevive/autoBuyDrug/autoRetreat 开');

  // ---- M1 ----
  R('enterMap(1003)');
  const a=R('calcAttr()');
  const mon=G.battle.mons[0]; mon.zs=mon.zsmax=a.maxhp*10; mon.cfg=Object.assign({},mon.cfg,{hit:999});
  r.hp=1; R('monsterAttack(G.battle, G.battle.mons[0], calcAttr())');
  ok(r.hp===0, 'M1 hp clamp 到 0, got '+r.hp);
  ok(G.dead===true, 'M1 阵亡标记');
  R('monsterAttack(G.battle, G.battle.mons[0], calcAttr())');
  ok(r.hp===0, 'M1 已阵亡后再次 monsterAttack 不扣血');
  ok(!ctx._dieShown, 'S2 自动复活开启时不弹死亡窗');

  // ---- S2 自动复活 ----
  r.gold=100000;
  R('G.role.bag=G.role.bag.filter(function(s){return stuffCfg(s).stdmode!=0;})');
  R('tick(1)'); ok(G.dead===true, 'S2 延时中仍阵亡');
  R('tick('+S.die.AUTO_DELAY+')');
  ok(G.dead===false && r.mapId===1003, 'S2 自动复活并回到挂机图 1003, map='+r.mapId);
  ok(r.hp===R('calcAttr()').maxhp, 'S2 复活满血');
  const life=r.settings.drug.life.id;
  ok(R('countItem('+life+')')>=S.settings.BUY_LOW, 'S2 复活后自动补药 '+R('countItem('+life+')'));
  ok(r.gold<100000, 'S2 补药扣金币');

  // 金币不够不买, 不变负
  R('G.role.bag=G.role.bag.filter(function(s){return stuffCfg(s).stdmode!=0;})'); r.gold=0;
  S.settings.autoBuyDrug(); ok(r.gold===0 && R('countItem('+life+')')===0, 'S2 金币不足不补药');
  // 关闭开关
  r.gold=100000; afk.autoBuyDrug=false; ok(S.settings.autoBuyDrug()===0, 'S2 autoBuyDrug=false 不买'); afk.autoBuyDrug=true;

  // 反复阵亡退图
  const prev=S.die.prevFightMap(1003);
  ok(prev===1002, 'S2 1003 的上一张战斗图 = 1002, got '+prev);
  ok(S.die.prevFightMap(1002)===null, 'S2 第一张战斗图无退路');
  r.stat.deaths={}; const seen=[];
  for(let i=0;i<S.die.RETREAT_N;i++){ R('G.role.hp=0; roleDie()'); R('tick(10)'); seen.push(r.mapId); }
  ok(seen.slice(0,-1).every(x=>x===1003), 'S2 前 '+(S.die.RETREAT_N-1)+' 次阵亡仍回 1003: '+seen);
  ok(r.mapId===1002 && !G.dead, 'S2 600s 内阵亡 '+S.die.RETREAT_N+' 次退回 1002, map='+r.mapId);
  // 关闭 autoRevive → 弹窗
  afk.autoRevive=false; R('G.role.hp=0; roleDie()');
  ok(G.dead===true && ctx._dieShown===1, 'S2 autoRevive=false 时弹死亡窗');
  R('tick(10)'); ok(G.dead===true, 'S2 关闭时不会自动复活');
  S.die.reviveCity(); afk.autoRevive=true;

  // ---- G8 满包回收 ----
  R(`(function(){
    var r=G.role; r.bag=[]; r.equip={}; r.level=30; r.bagCnt=6;
    var c=CFG.item.list.filter(function(x){return x&&x.type==2&&x.stdmode==10&&x.needlevel<=10&&(!x.profession||x.profession==r.prof);})[0];
    window._eqc=c;
    function mk(q,ex){ var s=createStuff(c.id,1,q); s.nonsuch=0; s.set=0; s.uq=0; for(var k in ex) s[k]=ex[k]; r.bag.push(s); return s; }
    window._w=mk(1); window._g=mk(2); window._lockG=mk(2,{lock:true}); window._blue=mk(3); window._ns=mk(2,{nonsuch:3});
    var med=CFG.item.list.filter(function(x){return x&&x.type!=2&&x.stdmode==0;})[0];
    r.bag.push(createStuff(med.id,1));
  })()`);
  ok(R('Systems.bag.isFull()')===true, 'G8 isFull=true (6/6)');
  // 身上穿更好的衣服 → 背包里白/绿都不比身上好
  R('(function(){ var s=createStuff(_eqc.id,1,4); s.attr.maxac+=50; G.role.equip[10]=s; })()');
  const gold0=r.gold;
  R('Systems.settings.set("recycle.white", false)'); // 关自动回收, 验证满包兜底逻辑本身
  const drop=R('(function(){ var s=createStuff(_eqc.id,1,3); s.nonsuch=0; return addItem(s); })()');
  const ids=R('G.role.bag.map(function(s){return s.uid})');
  ok(drop!==false && ids.length===5, 'G8 满包时回收后新掉落入包, bag='+ids.length);
  ok(!ids.includes(R('_w.uid')) && !ids.includes(R('_g.uid')), 'G8 回收白装+绿装');
  ok(ids.includes(R('_lockG.uid')) && ids.includes(R('_blue.uid')) && ids.includes(R('_ns.uid')), 'G8 保留锁定/蓝装/极品');
  ok(r.gold>gold0, 'G8 回收得金币');
  // 比身上更好的绿装不回收
  R('(function(){ var r=G.role; r.equip={}; r.bag=r.bag.slice(0,4); while(r.bag.length<r.bagCnt){ var s=createStuff(_eqc.id,1,2); s.nonsuch=0; r.bag.push(s); window._better=s; } })()');
  const lostBefore=r.stat.bagLost||0;
  const d2=R('(function(){ var s=createStuff(_eqc.id,1,2); s.nonsuch=0; return addItem(s); })()');
  ok(R('G.role.bag.some(function(s){return s.uid==_better.uid})'), 'G8 不回收比身上更好的绿装(身上无衣服)');
  ok(d2===false && (r.stat.bagLost||0)===lostBefore+1, 'G8 无可回收时仍提示丢失并计数');
  R('Systems.settings.set("recycle.white", true)');
  ok(R('Systems.settings.get().recycle.white')===true && R('Systems.settings.get().recycle.green')===false, 'G8 默认仍只自动回收白装');

  // ---- M3 广告复活每日上限 ----
  vm.runInContext(fs.readFileSync(path.join(root,'js/ui_die.js'),'utf8'),ctx,{filename:'js/ui_die.js'});
  const AD=R('CQ_DIE_AD'); r.bagCnt=50;
  ok(AD.MAX===3 && AD.left()===3, 'M3 每日 3 次');
  let okN=0; for(let i=0;i<AD.MAX;i++){ R('G.dead=true;G.paused=true;G.role.hp=0'); if(AD.revive().indexOf('OK')===0) okN++; }
  ok(okN===3 && AD.left()===0, 'M3 3 次成功后剩余 0');
  R('G.dead=true;G.paused=true;G.role.hp=0');
  const res=AD.revive(); ok(res.indexOf('OK')!==0 && G.dead===true, 'M3 第 4 次被拒: '+res);
  S._fakeNow=Date.now()+86400000; ok(AD.left()===3, 'M3 次日重置'); S._fakeNow=0;
  S.die.reviveCity();
  console.log(fails? fails+' FAIL' : 'ALL PASS'); process.exitCode = fails?1:0;
}).catch(e=>{ console.error(e); process.exitCode=1; });
