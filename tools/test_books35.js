// node tools/test_books35.js —— 1级新手礼包附赠 35 级及以前本职业技能书 + 旧存档补发
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..'); const store={};
const ctx={console, Math, Date, JSON, Promise, setTimeout, localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}), toast:()=>{}, location:{reload(){}}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
['js/data.js','js/game.js','js/systems/core.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
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
  // 旧存档: 礼包已开, 无标记
  R(`newRole('old',2)`); const r=G.role; r.bag=r.bag.filter(s=>s.id!=2001); R('H("loaded", G.role)');
  ok(S.books35(2).every(id=>r.bag.some(s=>s.id==id)) && r.books35, '旧存档补发');
  console.log(fails?'FAILED '+fails:'ALL PASS'); process.exit(fails?1:0);
});
