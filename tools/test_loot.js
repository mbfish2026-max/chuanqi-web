// node tools/test_loot.js —— 装备系统改造 (js/systems/loot.js) 测试; 与 test_systems.js 同一 vm 方式
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..'); const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}), toast:()=>{}, location:{reload(){}}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
['js/data.js','js/game.js','js/move.js','js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js','js/systems/lilian.js','js/systems/buff.js','js/systems/hero.js','js/systems/lootdata/tc.js','js/systems/lootdata/uniques.js','js/systems/lootdata/sets.js','js/systems/loot.js']
  .forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R=s=>vm.runInContext(s,ctx);
R('loadConfigs()').then(()=>{
  const S=ctx.Systems, G=R('G'), L=S.loot;
  R("newRole('装备',1)"); const r=G.role;
  ok(r.ver===2 && r.essence===0, '新角色 role.ver=2');
  // 部位校验
  const sm=new Set(R('CFG.item.list').filter(c=>c.type==2&&c.id<200000).map(c=>c.stdmode));
  ok([5,10,15,20,22,24,62,64].every(x=>sm.has(x)) && !sm.has(23) && !sm.has(25), 'stdmode 部位: 22/24 存在, 23/25 仅作第二槽');
  ok(R('cfg("item",122017)').stdmode===22 && R('cfg("item",124016)').stdmode===24, '22=戒指 24=手镯 (文档猜测相反)');
  // 品质公式
  ok(L.mfEff(1000,250)===200 && L.mfEff(100,0)===100, 'MF 递减 MF*F/(MF+F)');
  ok(L.chance(5,30,30,0,1)===51200 && L.chance(5,30,30,0,5)<L.chance(5,30,30,0,1), '橙色判定 c=(400-0)*128, BOSS 系数折减');
  ok(L.chance(3,40,10,0,1) < L.chance(3,20,10,0,1), 'ilvl 越高越易出稀有');
  const cnt={1:0,2:0,3:0,4:0,5:0}; for(let i=0;i<20000;i++) cnt[L.rollQuality(30,25,0,1)]++;
  ok(cnt[1]>cnt[2] && cnt[2]>cnt[3] && cnt[3]>cnt[5] && cnt[5]>0, '品质分布 白>绿>蓝>橙: '+JSON.stringify(cnt));
  const cb={1:0,2:0,3:0,4:0,5:0}; for(let i=0;i<20000;i++) cb[L.rollQuality(30,25,300,5)]++;
  ok(cb[5]>cnt[5]*3, 'BOSS+MF 提升橙色: '+cb[5]+' vs '+cnt[5]);
  // TC 每怪掉落
  const m5={q:5,cfg:{lvl:40}}, m1={q:1,cfg:{lvl:40}}; let n5=0,n1=0;
  for(let i=0;i<500;i++){ n5+=L.tcPick(m5).length; n1+=L.tcPick(m1).length; }
  ok(n5>n1*10, 'TC: BOSS 掉落远多于普通 '+n5+' vs '+n1);
  const tl=[]; for(let i=0;i<300;i++) tl.push(...L.tcPick(m5)); ok(tl.every(s=>{const c=R('cfg("item",'+s.id+')'); return c.needlevel<=43 && c.needlevel>=28 && [5,10,15,20,22,24,62,64].includes(c.stdmode);}), 'TC 基底按等级窗口与可穿部位');
  ok(tl.every(s=>s.il===40), '掉落记录 ilvl');
  // 暗金
  const t=R('createStuff(105034,1,5)'); L.finalize(t);
  ok(t.uq===105034 && t.affix.length===4 && t.affix.every(x=>x.fixed), '屠龙 暗金固定词条: '+S.equip.affixes(t.uid)?.length);
  const yt=R('cfg("item",105036)'); ok(yt.needlevel===50 && yt.maxzs===70, '倚天剑 GM 行已修正');
  ok(['屠龙','裁决之杖','骨玉权杖','龙纹剑','嗜魂法杖','倚天剑'].every(n=>Object.values(L.UNIQUES).some(u=>u.name===n)), '暗金名单齐全');
  ok(Object.keys(L.UNIQUES).every(id=>R('cfg("item",'+id+')').name===L.UNIQUES[id].name), '暗金 id 与 item.txt 名称一致');
  // 同组不叠加
  let dup=0; for(let i=0;i<300;i++){ const s=R('createStuff(110013,1,5)'); const codes=s.affix.map(x=>x.code); if(new Set(codes).size!==codes.length) dup++; }
  ok(dup===0, '同组词缀不重复 (300 件橙装)');
  ok(S.equip.alvlOf(40,30)===25 && S.equip.alvlOf(90,40)===81, 'alvl 公式');
  // 套装
  ok(Object.values(L.SETS).every(z=>z.ids.every(id=>R('cfg("item",'+id+')').name.indexOf(z.name==='魔神'||z.name==='幽灵'||z.name==='战神'?'':z.name)>=0)), '套装 id 名称前缀一致');
  r.level=60; const a0=R('calcAttr()');
  [110013,115011,120019,122020,124019].forEach(id=>{ const s=R('createStuff('+id+',1,4)'); L.finalize(s); R('addItem')(s); R('equipItem')(s.uid); });
  const sb=L.setBonus(r.equip); ok(sb.count.shengzhan===5 && sb.active.length===3, '圣战 5 件 → 2/3/5 件加成激活');
  const a1=R('calcAttr()'); ok(a1.adddamage>=10 && a1.critical>=6, '套装 5 件属性生效');
  // 对比
  const nw=R('createStuff(105022,1,5)'); L.finalize(nw); R('addItem')(nw); const cp=L.compare(nw.uid);
  ok(cp && cp.slot===5 && cp.power.delta>0 && cp.rows.find(x=>x.key==='atkmax').delta>0, '对比: 裁决 战力 +'+cp.power.delta);
  // 锁定 / 分解 / 自动分解
  S.bag.toggleLock(nw.uid); ok(S.loot.salvage(nw.uid)==='装备已锁定' && R('sellItem')(nw.uid)==='物品已锁定', '锁定阻止分解与出售');
  S.bag.toggleLock(nw.uid); console.log('  ', L.salvage(nw.uid)); ok(r.essence===15, '暗金分解 15 精华');
  L.setAuto(1,true); const w=R('createStuff(105005,1,1)'); w.nonsuch=0; L._killing={q:1,cfg:{lvl:10}}; const before=r.bag.length; R('addItem')(w); L._killing=null;
  ok(r.bag.length===before && r.essence===16, '自动分解白装 → 精华');
  const st=R('createStuff(110014,1,4)'); L.finalize(st); L._killing={q:1,cfg:{lvl:55}}; L.setAuto(4,true); R('addItem')(st); L._killing=null;
  ok(r.bag.some(x=>x.uid===st.uid), '自动分解保留套装件');
  r.essence=20; console.log('  ', L.exchangeStone(2)); ok(r.essence===10, '精华兑换洗练石');
  // 整理
  ['105005','110013','105034'].forEach(id=>R('addItem')(R('createStuff('+id+',1,'+(id==='105005'?1:id==='110013'?3:5)+')')));
  S.bag.sort(); const eqs=r.bag.filter(s=>R('cfg("item",'+s.id+')').type==2); ok(eqs.every((s,i)=>!i||eqs[i-1].q>=s.q), '整理: 装备品质降序');
  // 存档迁移
  const old={name:'旧',prof:1,level:40,exp:0,gold:0,yuanbao:0,bag:[{uid:'a',id:105034,count:1,q:5,ench:0,attr:{},nonsuch:0},{uid:'b',id:110013,count:1,q:4,ench:0,attr:{},nonsuch:0}],equip:{},skills:{},kills:{},stat:{},tasksDone:{}};
  store['cq_web_save_v1']=JSON.stringify({role:old,settings:{}}); ok(R('load()') && G.role.ver===2, '旧存档 (无 ver) 迁移到 ver 2, key 仍为 cq_web_save_v1');
  ok(G.role.bag[0].uq===105034 && G.role.bag[1].set==='shengzhan' && G.role.bag[0].lock===false && G.role.lootCfg, '迁移: 暗金/套装标记 + lock/lootCfg');
  R('save()'); ok(JSON.parse(store['cq_web_save_v1']).role.ver===2, '存档写入 ver');
  console.log(fails? fails+' FAILED':'ALL PASSED'); process.exit(fails?1:0);
}).catch(e=>{ console.error(e); process.exit(2); });
