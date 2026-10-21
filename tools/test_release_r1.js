// release r1: R1 顶栏等级不被注释吞掉 / R2 角色页刷新 / 宠物攻速 / 任务进度不重叠 (静态检查)
var fs = require('fs'), path = require('path'), R = path.join(__dirname, '..'), pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('FAIL', m); } }
var ui = fs.readFileSync(R + '/js/ui.js', 'utf8');
var lv = ui.split('\n').filter(function(l){ return l.indexOf("ref('labLevel').setString") >= 0; });
ok(lv.length && lv.every(function(l){ var i = l.indexOf('//'); return i < 0 || i > l.indexOf('labLevel'); }), 'R1 labLevel setString 不在注释内');
// 任何 js: 行尾注释后面再出现像代码的语句 (xxx.ref( / .setString( ... ;)
fs.readdirSync(R + '/js').concat(fs.readdirSync(R + '/js/systems').map(function(f){ return 'systems/' + f; })).filter(function(f){ return /\.js$/.test(f); }).forEach(function(f){
  fs.readFileSync(R + '/js/' + f, 'utf8').split('\n').forEach(function(l, i){
    var m = l.match(/\s\/\/[^'"]*?(\b\w+\.(ref|setString|setActive|setColor)\([^)]*\)[^;]*;)\s*$/); ok(!m, 'code after // in ' + f + ':' + (i + 1)); }); });
ok(/UI\.pageKey === 'main_role'\) \{ lastUi = now; refreshAll\(\)/.test(ui), 'R2 主循环刷新角色页');
var bf = fs.readFileSync(R + '/js/systems/buff.js', 'utf8');
ok(/PET_ATK_INTERVAL=1\.0/.test(bf) && /FXE\('petatk'/.test(bf), '宠物攻速 1.0s + petatk 事件');
ok(/function schedLine/.test(ui) && !/ti\.ref\('lab_scheduleCnt'\)\.setString/.test(fs.readFileSync(R + '/js/ui_systems.js', 'utf8')), '任务进度合并为一行');
console.log('test_release_r1: ' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
