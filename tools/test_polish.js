// node tools/test_polish.js —— 自动回收→金币 / SystemMsg / 红点查询
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, clearInterval, setInterval,
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}),
  toast:()=>{}, location:{reload(){}, search:''},
  window:null, document:{getElementById:()=>null, addEventListener(){}, removeEventListener(){},
    createElement:()=>({style:{}, appendChild(){}, querySelector(){return null;}, setAttribute(){}})}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
const files=[
  'js/data.js','js/game.js','js/move.js',
  'js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js',
  'js/systems/lilian.js','js/systems/buff.js','js/systems/hero.js','js/systems/quest.js',
  'js/systems/lootdata/tc.js','js/systems/lootdata/uniques.js','js/systems/lootdata/sets.js',
  'js/systems/loot.js','js/systems/settings.js','js/systems/prerogative.js'
];
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
ctx.FX={emit(){}, attach(){}};
ctx.FXE=function(){};

let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R=s=>vm.runInContext(s,ctx);

R('loadConfigs()').then(()=>{
  const S=ctx.Systems, G=R('G'), L=S.loot;
  R("newRole('抛光',1)");
  const r=G.role;
  S.settings.set('recycle.white', true);
  S.settings.set('afk.autoPick', true);

  // 手动分解仍精华
  const uq=R('(function(){var s=createStuff(105022,1,5); Systems.loot.finalize(s); addItem(s); return s;})()');
  const e0=r.essence||0;
  const res=L.salvage(uq.uid);
  ok(res.indexOf('OK')===0 && r.essence===e0+15, '手动分解→精华');

  // 无特权：自动回收 50%
  r.gold=0;
  const w=R('(function(){var c=CFG.item.list.find(function(x){return x.type==2&&x.stdmode==5&&x.sellprice>0&&x.needlevel<=10;}); var s=createStuff(c.id,1,1); s.nonsuch=0; return s;})()');
  const full=(R('stuffCfg')(w).sellprice||0)*1;
  const batch=L.beginKill({q:1,cfg:{name:'稻草人',lvl:1},exp:10});
  R('addItem')(w);
  ok(r.bag.every(x=>x.uid!==w.uid), '自动回收未入包');
  ok(batch.reclaim.length===1 && batch.fullGold===full, 'batch 记录回收');
  const logs0=G.logs.length;
  L.endKill({q:1,cfg:{name:'稻草人'},exp:10}, batch);
  const last=G.logs[G.logs.length-1]||'';
  ok(r.gold===Math.ceil(full*0.5), '无特权回收金币 50% got '+r.gold);
  ok(/击杀了/.test(last) && /自动回收了/.test(last) && /获得了金币/.test(last), 'SystemMsg 含击杀+自动回收文案');
  ok(/抛光/.test(last) && /稻草人/.test(last), 'SystemMsg 含角色名与怪名');

  // 特权满额
  S.prerogative.ensure();
  const p=S.prerogative.get();
  p._zdhsup=true; p._huishoutime=Date.now()+86400000*30;
  r.gold=0;
  const w2=R('(function(){var c=CFG.item.list.find(function(x){return x.type==2&&x.stdmode==5&&x.sellprice>0&&x.needlevel<=10;}); var s=createStuff(c.id,1,1); s.nonsuch=0; return s;})()');
  const full2=(R('stuffCfg')(w2).sellprice||0);
  const b2=L.beginKill({q:1,cfg:{name:'多钩猫',lvl:1},exp:12});
  R('addItem')(w2);
  L.endKill({q:1,cfg:{name:'多钩猫'},exp:12}, b2);
  ok(r.gold===Math.ceil(full2*1), '特权回收满额 got '+r.gold);
  ok(S.prerogative.recycleRate()===1, 'recycleRate=1');

  // 红点查询（无 DOM，测逻辑）
  ok(typeof S.fuli.canSign==='function', 'fuli.canSign');
  ok(typeof S.lilian.chapters==='function', 'lilian.chapters');
  const ch=S.lilian.chapters();
  ok(Array.isArray(ch) && ch.length>0, '历练章节列表');
  const qr=S.quest.red();
  ok(qr && 'any' in qr && 'main' in qr, 'quest.red 结构');

  // killMonster 端到端：造怪击杀
  r.gold=1000; G.logs.length=0;
  S.settings.set('recycle.white', true);
  // 关闭 TC 以免干扰
  L.tcOff=true;
  R(`(function(){
    var b={mons:[], roleIdx:26};
    G.battle=b;
    var m={uid:'m1', cfg:{id:1,name:'鹿',rebirth:3,dorp1:[],dorp2:[],dorp3:[],dorp4:[]}, q:1, exp:5, hp:0, boss:0, dead:false, ac:0};
    // 直接走 killMonster
    killMonster(b, m);
  })()`);
  const klog=G.logs.filter(s=>/击杀了/.test(s));
  ok(klog.length>=1, 'killMonster 产出击杀 SystemMsg');
  ok(klog.some(s=>/经验 \\+/.test(s)||/经验 \\+/.test(s)||/经验/.test(s)), '击杀消息含经验');

  console.log(fails? fails+' FAILED':'ALL PASSED');
  process.exit(fails?1:0);
}).catch(e=>{ console.error(e); process.exit(2); });
