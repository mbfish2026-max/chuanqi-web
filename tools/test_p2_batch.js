// node tools/test_p2_batch.js —— 音频 stub / 多角色 / 引导 / 运营商店
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, clearInterval, setInterval,
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}),
  toast:()=>{}, location:{reload(){}, search:''},
  window:null, document:{getElementById:()=>null, addEventListener(){}, removeEventListener(){}},
  Audio: undefined};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
const files=[
  'js/data.js','js/game.js','js/move.js',
  'js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js',
  'js/systems/lilian.js','js/systems/buff.js','js/systems/hero.js','js/systems/quest.js',
  'js/systems/lootdata/tc.js','js/systems/lootdata/uniques.js','js/systems/lootdata/sets.js',
  'js/systems/loot.js','js/systems/settings.js',
  'js/systems/prerogative.js','js/systems/die.js','js/systems/offline.js',
  'js/systems/audio.js','js/systems/roles.js','js/systems/guide.js','js/systems/yyshop.js'
];
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
ctx.FX={emit(){}, attach(){}};

let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R=s=>vm.runInContext(s,ctx);

R('loadConfigs()').then(()=>{
  const S=ctx.Systems, G=R('G');

  // —— 音频 ——
  ok(!!S.audio, 'audio API');
  ok(S.audio.playSfx('ui_click')===false, '无 Audio 时 playSfx=false');
  ok(S.audio.playBgm('music_login')===false, '无 Audio 时 playBgm=false');
  R("newRole('音效测',1)");
  S.audio.setEnabled(false);
  ok(S.audio.enabled()===false, 'sound 关');
  S.audio.setEnabled(true);
  ok(S.audio.enabled()===true, 'sound 开');
  ok(fs.existsSync(path.join(root,'assets/audio/bgsound_login.mp3')), 'login BGM 文件');
  ok(fs.existsSync(path.join(root,'assets/audio/ui_click.mp3')), 'click SFX 文件');

  // —— 多角色 ——
  Object.keys(store).forEach(k=>delete store[k]);
  G.role=null;
  ok(S.roles.count()===0, '空 count=0');
  R("newRole('甲',1)"); R('save()');
  ok(S.roles.count()===1 && G.role.ver>=5, '甲 ver>=5 got '+G.role.ver);
  const idA=G.role.roleId;
  R("newRole('乙',2)"); R('save()');
  ok(S.roles.count()===2, '两角色');
  const idxA=S.roles.list().find(x=>!x.empty && x.meta.name==='甲').index;
  ok(S.roles.loadSlot(idxA) && G.role.name==='甲' && G.role.roleId===idA, '切回甲');
  // 迁移
  Object.keys(store).forEach(k=>delete store[k]);
  store['cq_web_save_v1']=JSON.stringify({role:{name:'旧档',prof:3,level:7,bag:[],equip:{},skills:{},kills:{},stat:{},tasksDone:{},mapId:1001,gold:0,yuanbao:0,hp:100,mp:50,exp:0},settings:{}});
  G.role=null;
  S.roles.migrate();
  ok(S.roles.count()===1 && S.roles.list()[0].meta.name==='旧档', '单档迁移');
  ok(S.roles.loadSlot(0) && G.role.level===7, '迁移可加载');
  R("newRole('丙',1)"); R('save()');
  R("newRole('丁',2)"); R('save()');
  ok(S.roles.count()===3 && S.roles.freeIndex()===-1, '满3槽');
  ok(S.roles.deleteSlot(S.roles.selectId()).indexOf('OK')===0 && S.roles.count()===2, '删除');

  // —— 引导 ——
  R("newRole('引导',1)");
  G.role.guideStage=0;
  ctx.location.search='';
  ok(S.guide.active(), '可引导');
  const info=S.guide.currentInfo();
  ok(!!info && info.stage===1001 && /传奇/.test(info.text||''), 'introduce 文案 got '+(info&&info.text||'').slice(0,20));
  ok(!!R('CFG.guide') && !!R('CFG.guide.byId[1001]'), 'guide.txt 已加载');
  S.guide.advance();
  ok(S.guide.getStage()===1002, '→jumpbag');
  S.guide.skipAll();
  ok(S.guide.getStage()===1011 && !S.guide.active(), 'skip→finish');
  ctx.location.search='?noguide=1';
  G.role.guideStage=0;
  ok(S.guide.disabledByQuery(), '?noguide=1');
  S.guide.ensureStart();
  ok(G.role.guideStage===1011, 'noguide→finish');
  ctx.location.search='';

  // —— 运营商店 ——
  R("newRole('云游',1)");
  G.role.gold=10000;
  const drugs=S.yyshop.drugList();
  ok(drugs.length>=3, '药店条目 '+drugs.length);
  const itemId=drugs[0].items;
  const buy=S.yyshop.buyDrug(drugs[0],1);
  ok(buy.indexOf('OK')===0 && R('countItem('+itemId+')')>=1, '买药');
  R('(function(){var c=CFG.item.list.find(function(x){return x.type==2&&x.sellprice>0&&x.needlevel<=1;});var s=createStuff(c.id,1,1);s.q=1;addItem(s);})()');
  G.role.percentYy=100; G.role.yyReclaim=200;
  const prev=S.yyshop.previewQuality(1,true);
  ok(prev.count>=1 && prev.gold>0, '回收预览 '+prev.gold);
  const g0=G.role.gold;
  const rec=S.yyshop.reclaimByQuality(1,true);
  ok(rec.indexOf('OK')===0 && G.role.gold===g0+prev.gold, '回收入账');
  R('addItem(createStuff(103038,2))');
  const p0=G.role.percentYy;
  const rf=S.yyshop.useGuwanRefresh();
  ok(rf.indexOf('OK')===0, '古玩刷新 '+rf);
  ok(S.yyshop.guwanCount()===1, '古玩余1');
  ok(G.role.percentYy>=50 && G.role.percentYy<=199, '比例范围 '+G.role.percentYy);

  console.log(fails?('FAILED '+fails):'ALL PASS');
  process.exit(fails?1:0);
}).catch(e=>{ console.error(e); process.exit(1); });
