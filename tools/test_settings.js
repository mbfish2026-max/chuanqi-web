// node tools/test_settings.js —— 设置系统（原版 role_setup + 挂机/技能/游戏钩子）
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, clearInterval, setInterval,
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}),
  toast:()=>{}, location:{reload(){}, search:''}, window:null, document:{getElementById:()=>null}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
['js/data.js','js/game.js','js/move.js','js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js','js/systems/lilian.js','js/systems/buff.js','js/systems/hero.js','js/systems/quest.js','js/systems/lootdata/tc.js','js/systems/lootdata/uniques.js','js/systems/lootdata/sets.js','js/systems/loot.js','js/systems/settings.js']
  .forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
// stub FX for flags
ctx.FX={emit(){}, attach(){}};
vm.runInContext('Systems.settings && Systems.settings.ensure && null', ctx);

let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R=s=>vm.runInContext(s,ctx);

R('loadConfigs()').then(()=>{
  const S=ctx.Systems, G=R('G'), ST=S.settings;
  R("newRole('测设',1)");
  const r=G.role;
  ok(r.ver>=3, 'newRole ver>=3 got '+r.ver);
  ok(!!r.settings && r.settings.drug.life.on===true && r.settings.drug.life.pct===65, '默认生命回复 on@65%');
  ok(r.settings.drug.magic.on===false && r.settings.sound===true, '默认魔法关、音效开');
  ok(r.lootCfg.auto[1]===true && r.lootCfg.keepNonsuch===true, 'lootCfg 已同步(白装默认回收)');

  // 回收开关 → shouldAuto
  ST.set('recycle.white', true);
  R('addItem(createStuff(105001,1,1))'); // 白装
  const white=r.bag.filter(s=>s.q===1 && S.findStuff(s.uid))[0] || r.bag.find(s=>stuffCfg(s).type==2 && s.q===1);
  // create a white equip explicitly
  const w=R('(function(){var c=CFG.item.list.find(function(x){return x.type==2&&x.stdmode==5&&x.needlevel<=10;});var s=createStuff(c.id,1,1);s.lock=false;addItem(s);return s;})()');
  ok(S.loot.shouldAuto(w)===true, '白装自动回收开启后 shouldAuto');
  ST.set('recycle.white', false);
  ok(S.loot.shouldAuto(w)===false, '关闭白装后不回收');

  // 药品阈值与指定 id
  r.level=60; r.bag.length=0;
  R('addItem(createStuff(100014,5))'); // 强效金创药
  R('addItem(createStuff(100024,5))');
  R('addItem(createStuff(100032,5))');
  ST.setDrugId('life', 100014);
  ST.set('drug.life.pct', 80);
  ST.set('drug.life.on', true);
  ST.set('drug.magic.on', true); ST.setDrugId('magic',100024); ST.set('drug.magic.pct', 90);
  ST.set('drug.special.on', true); ST.setDrugId('special',100032); ST.set('drug.special.pct', 50);
  const a=R('calcAttr()'); r.hp=Math.floor(a.maxhp*0.5); r.mp=Math.floor(a.maxmp*0.2);
  R('DRUG.hp=0;DRUG.mp=0; autoDrug(calcAttr())');
  ok(R('countItem(100014)')===4, '生命药按指定 id 消耗');
  ok(R('countItem(100024)')===4, '魔法药按指定 id 消耗');
  // special also triggers on low hp — may have consumed after life already filled DRUG.hp
  // reset and only special
  r.bag.forEach(s=>{ if([100014,100024,100032].indexOf(s.id)>=0) s.count=5; });
  ST.set('drug.life.on', false); ST.set('drug.magic.on', false);
  R('DRUG.hp=0;DRUG.mp=0; G.role.hp=Math.floor(calcAttr().maxhp*0.4); autoDrug(calcAttr())');
  ok(R('countItem(100032)')===4, '特殊药按生命%触发');

  // 技能禁用
  r.skills={1002:{lv:1,exp:0,cd:0},1004:{lv:1,exp:0,cd:0}};
  ST.setSkillEnabled(1002, false);
  const cands=R('(function(){var c=[]; eachSkill(function(sc,st,base){ if(sc.triggertype==1) c.push([sc,st]); }); return H("skillCands", c); })()');
  ok(cands.every(p=>Math.floor(p[0].id/10)!==1002), '禁用技能不进 skillCands');

  // 挂机：关自动战斗
  ST.set('afk.autoCombat', false);
  ok(ST.combatAllowed()===false, '关闭自动战斗');
  ST.set('afk.autoCombat', true);
  ok(ST.combatAllowed()===true, '开启自动战斗');

  // FX flags
  ST.set('game.dmgNumbers', false);
  ok(ST.fxAllows('dmg')===false, '关闭伤害数字');
  ST.set('game.screenShake', false);
  ok(ST.fxAllows('shake')===false, '关闭震屏');
  ST.rebindFx && ST.rebindFx();
  ok(ctx.CQ_FX_FLAGS && ctx.CQ_FX_FLAGS.dmg()===false, 'CQ_FX_FLAGS 生效');
  ST.set('game.fxQuality', 0); ST.rebindFx && ST.rebindFx();
  ok(ctx.CQ_FX_FLAGS.low()===true, '低特效质量 CQ_FX_FLAGS.low');
  ST.set('game.fxQuality', 1); ST.rebindFx && ST.rebindFx();
  ok(ctx.CQ_FX_FLAGS.low()===false, '高特效质量 low=false');

  // 存档迁移：旧档无 settings
  const old={name:'旧',prof:1,level:10,exp:0,gold:0,yuanbao:0,hp:100,mp:50,mapId:1003,bag:[],equip:{},skills:{},kills:{},stat:{},tasksDone:{},
    lootCfg:{auto:{1:true,2:false,3:false,4:false},keepNonsuch:true,offProf:false,keepSet:true,keepUnique:true}, ver:2};
  store['cq_web_save_v1']=JSON.stringify({role:old, settings:{autoDrug:false}});
  ok(R('load()') && G.role.ver>=3 && G.role.settings.recycle.white===true && G.role.settings.drug.life.on===false, '旧存档迁移 ver3 + lootCfg/autoDrug');

  // 音效写入
  ST.set('sound', false);
  R('save()');
  const raw=JSON.parse(store['cq_web_save_v1']);
  ok(raw.role.settings.sound===false, 'settings 写入存档');

  console.log(fails?('\n'+fails+' FAILED'):'\nALL PASS');
  process.exit(fails?1:0);
}).catch(e=>{ console.error(e); process.exit(1); });
