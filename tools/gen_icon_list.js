// node tools/gen_icon_list.js —— 生成 js/icon_list.js (assets/images/icon/ 下现有图标清单)
// 用途: 装备/道具图标缺失时不再发起请求(避免 404), 直接走部位剪影兜底。新增/删除图标后务必重跑本脚本, tools/test_icons.js 会检查清单与目录一致。
const fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..'), dir=path.join(root,'assets/images/icon');
const names=fs.readdirSync(dir).filter(f=>/\.png$/.test(f)&&!/@\dx\.png$/.test(f)).map(f=>f.slice(0,-4)).sort();
const out='// 自动生成, 勿手改: node tools/gen_icon_list.js (assets/images/icon/*.png, '+names.length+' 个)\n'
 +'var ICON_LIST = {'+names.map(n=>JSON.stringify(n)+':1').join(',')+'};\n'
 +'// 图标是否存在; 清单未加载时按存在处理(保持旧行为)\n'
 +'function iconHas(name){ return !!name && (typeof ICON_LIST === "undefined" || ICON_LIST[name] === 1); }\n';
fs.writeFileSync(path.join(root,'js/icon_list.js'), out);
console.log('js/icon_list.js: '+names.length+' icons');
if (typeof module!=='undefined') module.exports={names};
