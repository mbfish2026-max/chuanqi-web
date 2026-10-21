// node tools/test_books35.js —— 1级新手礼包附赠 35 级及以前本职业技能书 + 旧存档补发
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..'); const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}), toast:()=>{}, location:{reload(){}}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
['js/data.js','js/game.js','js/move.js','js/systems/core.js','js/systems/buff.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R=s=>vm.runInContext(s,ctx);
R('loadConfigs()').then(()=>{
  const S=ctx.Systems, G=R('G');
  for(const prof of [1,2,3]){
    R(`newRole('t',${prof})`); const r=G.role, books=S.books35(prof);
    console.log('  prof',prof, books.map(id=>R(`cfg('item',${id}).name`)).join(','));
    ok(books.length>=5, 'prof '+prof+' 有书');
    const g=r.bag.find(s=>s.id==2001); console.log('  ', R(`useItem("${g.uid}")`));
    ok(books.every(id=>r.bag.some(s=>s.id==id)), 'prof '+prof+' 开礼包得到全部技能书');
    r.level=35; const b=r.bag.find(s=>s.id==books[0]); const m=R(`useItem("${b.uid}")`); ok(/^OK|学会|习得/.test(m)||Object.keys(r.skills).length>0, '可学习: '+m);
    const n=r.bag.length; R('H("loaded", G.role)'); ok(r.bag.length===n, '不重复补发');
  }
  R(`newRole('m',2)`); ok(G.role.skills[2001] && G.role.skills[2001].lv==1, '法师出生自带火球术');
  R(`newRole('d',3)`); ok(G.role.skills[3005] && G.role.skills[3005].lv==1, '道士出生自带召唤骷髅');
  R(`newRole('z',1)`); ok(Object.keys(G.role.skills).length==0, '战士无出生技能');
  R(`newRole('d',3)`); R('enterMap(CFG.map.list.find(m=>m&&m.type==2).id)'); R('if(!G.battle) startBattle(mapCfg())');
  for(let i=0;i<200 && !(G.battle&&G.battle._pets&&G.battle._pets.length);i++){ G.role.mp=999; R('H("tick",0.2,G.battle,calcAttr(),null)'); }
  ok(G.battle && G.battle._pets && G.battle._pets.length>0, '1级道士可召唤: '+(G.battle&&G.battle._pets||[]).length);
  { R(`newRole('od',3)`); const r=G.role; r.skills={}; r.bag=[]; R('H("loaded", G.role)'); ok(r.skills[3005], '旧道士存档补发召唤骷髅'); }
  // 旧存档: 礼包已开, 无标记
  R(`newRole('old',2)`); const r=G.role; r.bag=r.bag.filter(s=>s.id!=2001); R('H("loaded", G.role)');
  ok(S.books35(2).every(id=>r.bag.some(s=>s.id==id)) && r.books35, '旧存档补发');
  console.log(fails?'FAILED '+fails:'ALL PASS'); process.exit(fails?1:0);
});
