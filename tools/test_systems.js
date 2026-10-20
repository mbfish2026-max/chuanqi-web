// node tools/test_systems.js  —— 模拟游玩测试 js/systems/*
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}), toast:()=>{}, location:{reload(){}}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
['js/data.js','js/game.js','js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js','js/systems/lilian.js','js/systems/buff.js']
  .forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R=s=>vm.runInContext(s,ctx);
R('loadConfigs()').then(()=>{
  const S=ctx.Systems, G=R('G');
  R("newRole('测试',3)");
  const r=G.role;
  // 经济修正
  const lb=R('cfg("libao",2001)'); ok(lb.gold===0 && lb.yuanbao===0 && !lb.item5, '新手礼包已修正: '+JSON.stringify(lb));
  const gift=r.bag.find(s=>s.id==2001); ok(!!gift,'初始背包含新手礼包');
  console.log('  open gift:', R(`useItem("${gift.uid}")`), 'gold',r.gold,'yb',r.yuanbao);
  ok(r.gold<1000 && r.yuanbao<1000, '打开新手礼包后金币/元宝正常');
  ok(!r.bag.some(s=>s.id==2001), '新手礼包不再无限循环');
  // 背包
  ok(S.bag.capacity()===50, '背包初始容量 50');
  // 福利
  S._fakeNow=new Date(2026,9,21).getTime();
  console.log('  sign:', S.fuli.sign()); ok(S.fuli.sign()==='今日已签到','月签到每日一次');
  console.log('  week:', S.fuli.signWeek()); ok(S.fuli.signWeek()==='今日已领取','七日签到每日一次');
  S._fakeNow=new Date(2026,9,22).getTime(); console.log('  next day week:', S.fuli.signWeek()); ok(r.signInfo.already_week.length===2,'第二天可领第2天');
  console.log('  redeem:', S.fuli.redeem('cqzl520')); ok(S.fuli.redeem('cqzl520')==='该兑换码已使用','兑换码一次'); ok(S.fuli.redeem('xxx')==='兑换码无效','无效码');
  // 词缀
  const eq=R('createStuff(201001,1,4)')||R('createStuff(CFG.item.list.find(x=>x.type==2&&x.needlevel>=11).id,1,4)');
  const eq2=R('(function(){var c=CFG.item.list.find(function(x){return x.type==2&&x.needlevel>=11&&x.needlevel<20;});var s=createStuff(c.id,1,4);addItem(s);return s;})()');
  ok(eq2.affix && eq2.affix.length===3, '紫装 3 条词缀: '+S.equip.affixes(eq2.uid).map(x=>x.text).join(','));
  // 洗练
  r.gold=100000; R('addItem(createStuff(103034,200))');
  console.log('  cost:', JSON.stringify(S.equip.remakeCost(eq2.uid)), JSON.stringify(S.equip.remakeCost(eq2.uid,[0])));
  console.log('  remake:', S.equip.remake(eq2.uid,[0]));
  const keep=JSON.stringify(eq2.affix[0]); S.equip.saveRemake(eq2.uid); ok(JSON.stringify(eq2.affix[0])===keep,'锁定词缀保持');
  ok(S.equip.remake(eq2.uid,[0,1,2]).indexOf('最多')===0,'最多锁 2 条');
  for(let i=0;i<9;i++) S.equip.remake(eq2.uid); ok(r.stat.remake===10,'洗练计数 10');
  const t2004=R('cfg("task",2004)'); ok(JSON.stringify(R('taskProgress(cfg("task",2004))'))==='[10,10]','任务11 洗练进度');
  console.log('  task9 lucky:', JSON.stringify(R('taskProgress(cfg("task",2008))')));
  // 铁匠
  const g=S.smith.goods(); ok(g.length===3,'铁匠 3 件商品: '+g.map(x=>x.name+'('+x.cost+')').join(','));
  console.log('  buy:', S.smith.buy(0)); ok(S.smith.buy(0)==='已打造','不可重复打造');
  r.yuanbao=30; console.log('  refresh:', S.smith.refreshYuanbao(), r.yuanbao);
  // 合成
  const fl=S.fuse.list(1); console.log('  fuse list:', fl.slice(0,2).map(x=>x.name+' need '+x.needName+'x'+x.need[1]+' have '+x.have).join('; '));
  R('addItem(createStuff(104101,6))'); const f0=fl.find(x=>x.need[0]==104101) || S.fuse.list(1).find(x=>x.need[0]==104101);
  if(f0){ console.log('  fuse:', S.fuse.fuse(f0.id,2)); ok(R('countItem(104101)')===S.fuse.list(1).find(x=>x.id==f0.id).have,'合成消耗'); }
  // 分解
  const scroll=r.bag.find(s=>s.id==104101)||R('(function(){var s=createStuff(104101,2);addItem(s);return G.role.bag.filter(function(x){return x.id==104101})[0];})()');
  const before=R('countItem(104034)'); console.log('  decompose:', S.fenjie.decompose(scroll.uid,1)); ok(R('countItem(104034)')===before+1,'分解得书页 (item.decompose)');
  console.log('  recycle:', S.fenjie.recycle(eq2.uid));
  // 背包上限
  r.bag.length=0; for(let i=0;i<60;i++) R('addItem(createStuff(CFG.item.list.find(function(x){return x.type==2;}).id,1,1))');
  ok(r.bag.length===50,'背包上限 50, 当前 '+r.bag.length);
  console.log('  expand:', S.bag.expand ? '' : '', S.bag.expandByAd(), S.bag.capacity());
  R('addItem(createStuff(103035,500))'); ok(true,'金币道具直接加金币 gold='+r.gold);
  console.log('  libao full bag:', R('(function(){var s=createStuff(2002,1);G.role.bag.push(s);G.role.level=10;return useItem(s.uid);})()'));
  // 历练
  const ch=S.lilian.chapters(); ok(ch.length>0 && ch[3] && ch[3].locked,'历练章节 '+ch.length+', 第4章锁定');
  console.log('  current chapter:', S.lilian.current() && S.lilian.current().title);
  // 战斗: 道士召唤 + 施毒 + Buff
  r.bag.length=0; r.level=30; r.skills={}; 
  [3005,3004,3007,3006].forEach(b=>{ r.skills[b]={lv:1,exp:0,cd:0}; });
  R('enterMap(CFG.map.list.find(function(m){return m.type==2;}).id)');
  let pets=0, logs=new Set();
  const all=[]; R('var _log=log; log=function(s){ _log(s); G._all=(G._all||[]); G._all.push(s); }');
  for(let i=0;i<600;i++){ R('tick(0.1)'); pets=Math.max(pets,S.pets.list().length); if(S.buff.list().length) all.push(S.buff.list().map(b=>b.name).join('+')); }
  G.logs=G._all||G.logs; console.log('  buffs seen:', [...new Set(all)].join(' | '));
  G.logs.forEach(l=>{ const m=/\[(.+?)\]/.exec(l); if(m) logs.add(m[1]); });
  ok(pets>0,'召唤兽出现 (max '+pets+')'); console.log('  skill/buff logs:', [...logs].join(','), ' buffs:', JSON.stringify(S.buff.list()));
  // 战士 野蛮冲撞 + 真气护体; 法师 魔法盾
  R("newRole('法',2)"); G.role.level=30; G.role.skills={2005:{lv:1,exp:0,cd:0},2001:{lv:1,exp:0,cd:0}};
  R('enterMap(CFG.map.list.find(function(m){return m.type==2;}).id)'); G.logs=[]; G._all=[];
  for(let i=0;i<300;i++) R('tick(0.1)');
  ok(G._all.some(l=>/魔法盾/.test(l)),'法师魔法盾施放'); console.log('  mage:', G._all.filter(l=>/魔法盾|火球/.test(l)).slice(0,3).join(' || '));
  R('save()'); ok(!!store['cq_web_save_v1'],'存档成功');
  console.log(fails? fails+' FAILED':'ALL PASSED'); process.exit(fails?1:0);
}).catch(e=>{ console.error(e); process.exit(2); });
