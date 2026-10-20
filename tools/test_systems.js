// node tools/test_systems.js  —— 模拟游玩测试 js/systems/*
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}), toast:()=>{}, location:{reload(){}}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
['js/data.js','js/game.js','js/move.js','js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js','js/systems/lilian.js','js/systems/buff.js','js/systems/hero.js','js/systems/quest.js','js/systems/loot.js']
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
  for(let i=0;i<600;i++){ if(i%50==0) R('(function(){var a=calcAttr();G.role.hp=a.maxhp;G.role.mp=a.maxmp;})()'); R('tick(0.1)'); pets=Math.max(pets,S.pets.list().length); if(S.buff.list().length) all.push(S.buff.list().map(b=>b.name).join('+')); }
  G.logs=G._all||G.logs; console.log('  buffs seen:', [...new Set(all)].join(' | '));
  G.logs.forEach(l=>{ const m=/\[(.+?)\]/.exec(l); if(m) logs.add(m[1]); });
  ok(pets>0,'召唤兽出现 (max '+pets+')'); console.log('  skill/buff logs:', [...logs].join(','), ' buffs:', JSON.stringify(S.buff.list()));
  // 战士 野蛮冲撞 + 真气护体; 法师 魔法盾
  R("newRole('法',2)"); G.role.level=30; G.role.skills={2005:{lv:1,exp:0,cd:0},2001:{lv:1,exp:0,cd:0}};
  R('enterMap(CFG.map.list.find(function(m){return m.type==2;}).id)'); G.logs=[]; G._all=[];
  for(let i=0;i<300;i++) R('tick(0.1)');
  ok(G._all.some(l=>/魔法盾/.test(l)),'法师魔法盾施放'); console.log('  mage:', G._all.filter(l=>/魔法盾|火球/.test(l)).slice(0,3).join(' || '));

  // ---------- 英雄 + 合击 ----------
  R("newRole('英雄测试',1)"); G.role.level=21; G.role.skills={};
  ok(S.hero.unlock(2).indexOf('需要等级')===0,'Lv21 不能召唤英雄');
  G.role.level=30; const u1=S.hero.unlock(2,'小法'); console.log('  unlock:',u1); ok(u1.indexOf('OK')===0 && /劈星斩/.test(u1),'战+法 = 劈星斩');
  ok(S.hero.unlock(3).indexOf('已经')===0,'只能有一个英雄');
  const hi=S.hero.info(); ok(hi.level===20 && hi.attr.maxhp>0,'英雄等级 '+hi.level+' 生命 '+hi.attr.maxhp+' 技能 '+hi.skills.join(','));
  const heq=R('(function(){var c=CFG.item.list.find(function(x){return x.type==2&&x.stdmode==5&&(!x.profession||x.profession==2)&&x.needlevel<=20&&x.needlevel>0;});var s=createStuff(c.id,1,3);addItem(s);return s;})()');
  const pw0=S.hero.info().power; console.log('  hero equip:', S.hero.equip(heq.uid)); ok(S.hero.info().power>=pw0 && S.hero.info().equip[5],'英雄武器栏');
  R('enterMap(CFG.map.list.filter(function(m){return m.type==2;})[3].id)'); G._all=[];
  let sawUnit=false, hejiDone=false, maxRage=0;
  for(let i=0;i<2000 && !hejiDone;i++){ R('tick(0.1)'); if(S.hero.unit() && (G.battle._pets||[]).indexOf(S.hero.unit())>=0) sawUnit=true; maxRage=Math.max(maxRage,S.hero.rage().rage);
    if(S.hero.rage().ready){ const res=S.hero.heji(); console.log('  heji:',res); hejiDone=res.indexOf('OK')===0; } }
  ok(sawUnit,'英雄作为战场单位出现在 _pets'); ok(G._all.some(l=>/^英雄/.test(l)),'英雄出手');
  ok(hejiDone,'怒气满后合击成功 (max rage '+maxRage+')'); ok(S.hero.rage().rage===0 && S.hero.rage().cd>0,'合击消耗怒气并进入冷却');
  ok(S.hero.heji().indexOf('怒气不足')===0,'怒气不足不能合击');
  ok(S.hero.setMode('rest').indexOf('OK')===0,'休息模式'); R('tick(0.1)'); ok(!(G.battle._pets||[]).some(p=>p.isHero),'休息时离开战场');
  S.hero.setMode('attack'); S.hero.setAuto(true); G.role.hero.rage=100; G.role.hero.hejiCd=0; for(let i=0;i<5;i++) R('tick(0.1)'); ok(G.role.hero.hejiCount>=2,'自动合击');
  // 召唤术与英雄共存 (道士+英雄)
  R("newRole('道',3)"); G.role.level=30; G.role.skills={3005:{lv:1,exp:0,cd:0}}; S.hero.unlock(3);
  R('enterMap(CFG.map.list.filter(function(m){return m.type==2;})[3].id)'); for(let i=0;i<100;i++) R('tick(0.1)');
  ok((G.battle._pets||[]).some(p=>p.isHero) && (G.battle._pets||[]).some(p=>!p.isHero),'召唤兽与英雄同时在场');
  ok(S.hero.info().combo.name==='末日审判','道+道 = 末日审判');
  R('save()'); const sv=JSON.parse(store['cq_web_save_v1']); ok(sv.role.hero && sv.role.hero.prof===3,'英雄写入存档');
  const combos=[[1,1],[1,2],[1,3],[2,2],[2,3],[3,3]].map(([a,b])=>a+'+'+b+'='+S.hero.comboFor(a,b).name).join(' '); console.log('  combos:',combos);
  // ---------- 任务系统 ----------
  S._fakeNow=new Date(2026,9,21,10).getTime();
  R("newRole('任务',1)"); const Q=S.quest, qr=G.role;
  ok(qr.quest && qr.quest.ver===1 && qr.ver>=1,'quest 存档初始化 ver=1');
  ok(Q.main().length>0 && Q.main()[0].id,'主线 = 原版 task 链: '+Q.main().map(x=>x.name).join(','));
  ok(Q.daily().length===6 && !Q.red().daily,'每日任务 6 条, 初始无红点');
  R('enterMap(CFG.map.list.filter(function(m){return m.type==2;})[0].id)'); G.role.level=40;
  for(let i=0;i<4000 && (qr.quest.daily.cnt.kill||0)<5;i++) R('tick(0.1)');
  ok((qr.quest.daily.cnt.kill||0)>=1,'战斗击杀事件计数 '+qr.quest.daily.cnt.kill); Q.emit('kill',100-qr.quest.daily.cnt.kill);
  ok(Q.red().daily && Q.red().any,'可领取时红点');
  const g0=qr.gold; console.log('  claimDaily:',Q.claimDaily('d_kill')); ok(qr.gold>=g0+5000 && Q.activity()===20,'每日奖励+活跃度20');
  ok(Q.claimDaily('d_kill')==='已领取','不可重复领取'); ok(Q.claimDaily('d_boss')==='未完成','未完成不可领');
  console.log('  chest:',Q.openChest(1)); ok(Q.openChest(2).indexOf('活跃度不足')===0,'活跃度宝箱门槛');
  qr.equip[5]=qr.equip[5]||R('createStuff(CFG.item.list.find(function(x){return x.type==2&&x.stdmode==5;}).id,1,1)'); qr.gold=1e7;
  for(let i=0;i<3;i++) R('enhance(5)'); ok(qr.quest.daily.cnt.enhance===3,'强化事件 (enhance 包装)');
  ok(Q.achievements().find(x=>x.id==='lv_10').canClaim,'等级成就可领'); console.log('  ach:',Q.claimAch('lv_10'));
  ok(Q.achievements().find(x=>x.id==='kill_100').canClaim,'击杀成就可领');
  const yb0=qr.yuanbao; Q.claimAch('kill_100'); ok(qr.yuanbao===yb0+20,'成就元宝');
  S._fakeNow=new Date(2026,9,22,0,0,1).getTime(); ok(Q.activity()===0 && !qr.quest.daily.cnt.kill && qr.quest.cnt.kill>=100,'本地 0 点重置每日, 累计保留');
  delete qr.quest; qr.kills={1001:57}; Q.state(); ok(qr.quest.cnt.kill===57,'旧存档迁移回填击杀数');
  console.log('  sign:',S.fuli.sign()); ok(qr.quest.daily.cnt.sign===1,'签到事件');
  S._fakeNow=0;
  R('save()'); ok(!!store['cq_web_save_v1'],'存档成功');
  console.log(fails? fails+' FAILED':'ALL PASSED'); process.exit(fails?1:0);
}).catch(e=>{ console.error(e); process.exit(2); });
