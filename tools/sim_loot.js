// node tools/sim_loot.js [seed=20261021] [kills=20000] —— 固定种子掉率模拟 (TC 每怪掉落 + 品质判定 + 暗金/套装)
// 只用 Systems.loot.tcPick (不跑战斗), Math.random 换成 mulberry32(seed) 保证可复现; 输出 每怪品质×等级 的件数/千杀 与品质分布
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..'); const store={};
const SEED=+(process.argv[2]||20261021), KILLS=+(process.argv[3]||20000);
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const M=Object.create(Math); M.random=mulberry32(SEED);
const ctx={console, Math:M, Date, JSON, Promise, setTimeout, localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  fetch:u=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(root,u),'utf8'))}), toast:()=>{}, location:{reload(){}}};
ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
const files=['js/data.js','js/game.js','js/move.js','js/systems/core.js','js/systems/fuli.js','js/systems/equip.js','js/systems/smith.js','js/systems/lilian.js','js/systems/buff.js','js/systems/hero.js'];
['tc','uniques','sets'].forEach(n=>{ const f='js/systems/lootdata/'+n+'.js'; if(fs.existsSync(path.join(root,f))) files.push(f); });
files.push('js/systems/loot.js');
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
const R=s=>vm.runInContext(s,ctx);
R('loadConfigs()').then(()=>{
  const L=ctx.Systems.loot; R("newRole('模拟',1)");
  const rows=[], tot={};
  for(const lvl of [10,25,40,55]) for(const q of [1,3,5]){
    const c={n:0,1:0,2:0,3:0,4:0,5:0,uq:0,set:0}; const m={q, cfg:{lvl}};
    for(let i=0;i<KILLS;i++) L.tcPick(m).forEach(s=>{ c.n++; c[s.q]++; if(s.uq) c.uq++; if(s.set) c.set++; });
    rows.push(`怪Lv${String(lvl).padStart(2)} q${q}: ${(c.n*1000/KILLS).toFixed(1).padStart(6)} 件/千杀 | 白${c[1]} 绿${c[2]} 蓝${c[3]} 紫${c[4]} 橙${c[5]} | 套装${c.set} 暗金${c.uq}`);
    for(const k in c) tot[k]=(tot[k]||0)+c[k];
  }
  console.log('seed='+SEED+' kills/行='+KILLS+' 基底池='+L.bases().length+(L.DATA_FILE?' (数据表: '+L.DATA_FILE+')':''));
  rows.forEach(r=>console.log(r)); console.log('合计 '+JSON.stringify(tot));
});
