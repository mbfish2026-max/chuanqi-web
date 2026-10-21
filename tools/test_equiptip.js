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

// node tools/test_equiptip.js —— 白装默认回收 + v4 迁移 + 更好装备提醒队列 + 品质分布
ctx.clearTimeout=clearTimeout; ctx.UI={layerTop:null}; ctx.esc=s=>s; ctx.stuffColor=()=>'#fff'; ctx.save=()=>{}; ctx.refreshAll=()=>{};
vm.runInContext(fs.readFileSync(path.join(root,'js/ui_equiptip.js'),'utf8'),ctx,{filename:'ui_equiptip.js'});
R('loadConfigs()').then(()=>{
  const S=ctx.Systems, G=R('G'), ST=S.settings;
  R("newRole('提醒',1)"); const r=G.role;
  ok(r.settings.recycle.white===true && r.ver>=4, '新档白装默认回收 ver='+r.ver);
  ok(r.settings.game.equipTip===true, '提醒默认开');
  // 旧档迁移: white=false 未显式设置 -> 打开; 显式设置过 -> 保留
  const old={settings:{recycle:{white:false}, drug:{life:{on:true,id:100010,pct:65}}}, ver:3, bag:[], equip:{}};
  ST.ensure(old); ok(old.settings.recycle.white===true && old.lootCfg.auto[1]===true, 'v3 旧档迁移白装回收开');
  const old2={settings:{recycle:{white:false,_whiteSet:true}}, ver:3, bag:[], equip:{}};
  ST.ensure(old2); ok(old2.settings.recycle.white===false, '显式关闭的保留');
  ST.ensure(old); old.settings.recycle.white=false; ST.ensure(old); ok(old.settings.recycle.white===false, '迁移只跑一次');
  // 提醒队列
  r.level=30; r.equip={}; r.bag.length=0; const T=ctx.EquipTip; T.queue.length=0;
  const c=R("CFG.item.list.filter(function(x){return x.type==2&&x.stdmode==5&&x.needlevel<=30&&x.needlevel>=10&&(!x.profession||x.profession==1)})[0]");
  const lo=R("createStuff("+c.id+",1,2)"), hi=R("createStuff("+c.id+",1,5)");
  // 去随机: 极品/词缀随机会让 hi 偶尔不如 lo -> 固定 lo 为基础属性, hi 明显更强
  lo.nonsuch=0; lo.affix=null; lo.affixes=null; Object.keys(lo.attr).forEach(k=>lo.attr[k]=R('cfg')('item',c.id)[k]||0);
  hi.attr=Object.assign({},lo.attr); hi.attr.maxzs+=200; hi.attr.minzs+=100;
  R('addItem')(lo); ok(T.queue.length===1, '可穿更好装备入队');
  R('addItem')(lo); ok(T.queue.length===1, '同 uid 去重');
  R('addItem')(hi); ok(T.queue.length===1 && T.queue[0].uid===hi.uid, '同部位只保留最好');
  const hl=R("CFG.item.list.filter(function(x){return x.type==2&&x.stdmode==10&&x.needlevel>30})[0]");
  R('addItem')(R("createStuff("+hl.id+",1,3)")); ok(T.queue.length===1, '等级不足不提醒');
  ST.set('game.equipTip', false); R('addItem')(R("createStuff("+c.id+",1,4)")); ok(T.queue.length===1, '设置关闭不提醒');
  ST.set('game.equipTip', true); T.queue.length=0;
  const w=R("createStuff("+c.id+",1,1)"); w.q=1; w.nonsuch=0; w.set=null; w.uq=null; S.loot._killing={q:1,cfg:{lvl:20,name:'x'}}; S.loot._batch=null; const v=R('addItem')(w); S.loot._killing=null;
  ok(v===false && T.queue.length===0, '自动回收的白装不提醒');
  // 品质分布: 普通怪白装 < 85%
  let n={1:0,2:0,3:0,4:0,5:0}, t=0; for(let i=0;i<20000;i++){ const q=S.loot.rollQuality(25,20,0,1); n[q]++; t++; }
  ok(n[1]/t<0.85 && n[2]/t>0.08 && n[4]>0 && n[5]>0, '普通怪品质分布 '+JSON.stringify(n));
  console.log(fails?fails+' FAILED':'ALL PASS'); process.exit(fails?1:0);
});
