// node tools/test_icons.js —— 图标清单 js/icon_list.js 与 assets/images/icon/ 一致; 掉落池装备缺图时都有部位剪影可兜底
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const ctx={}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root,'js/icon_list.js'),'utf8'),ctx);
const list=Object.keys(ctx.ICON_LIST).sort();
const files=fs.readdirSync(path.join(root,'assets/images/icon')).filter(f=>/\.png$/.test(f)).map(f=>f.slice(0,-4)).sort();
const extra=list.filter(n=>!files.includes(n)), miss=files.filter(n=>!list.includes(n));
ok(!extra.length && !miss.length, '清单与目录一致 ('+list.length+' 个)'+(miss.length?' 未收录: '+miss.slice(0,10).join(','):'')+(extra.length?' 已不存在: '+extra.slice(0,10).join(','):'')+((miss.length||extra.length)?' → 运行 node tools/gen_icon_list.js':''));
ok(ctx.iconHas('ic_im105040') && !ctx.iconHas('ic_im105042') && !ctx.iconHas('') && !ctx.iconHas(undefined), 'iconHas: 至尊屠龙有图, 凌风无图, 空名无图');
const item=JSON.parse(fs.readFileSync(path.join(root,'assets/config/item.txt'),'utf8'));
const PART={5:1,10:1,15:1,20:1,22:1,23:1,24:1,25:1,62:1,64:1};
const eqNoIcon=Object.values(item).filter(v=>v&&v.type==2&&v.id>=100000&&v.id<200000&&!ctx.iconHas(v.icon));
ok(eqNoIcon.every(v=>PART[v.stdmode]), '缺图装备都有部位剪影 (缺图 '+eqNoIcon.length+' 件)');
const ui=fs.readFileSync(path.join(root,'js/ui.js'),'utf8'), html=fs.readFileSync(path.join(root,'index.html'),'utf8');
ok(/iconHas\(c\.icon\)/.test(ui), 'makeStuff 先查清单再设置图标');
ok(html.indexOf('js/icon_list.js')>0 && html.indexOf('js/icon_list.js')<html.indexOf('js/ui.js'), 'index.html 在 ui.js 之前加载 icon_list.js');
console.log(fails?('FAILED '+fails):'ALL PASS'); process.exit(fails?1:0);
