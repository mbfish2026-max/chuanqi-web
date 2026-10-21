// release fight: BOSS 不进前两行 (move.js) + 战场加高代码存在 (ui.js stretchBattle / fx.setHeight)
var fs = require('fs'), vm = require('vm'), R = require('path').join(__dirname, '..'), pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('FAIL', m); } }
var ctx = {G: {role: {}}, CFG: {}, Math: Math}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + '/js/move.js', 'utf8') + ';this.MOVE=MOVE;', ctx); var MOVE = ctx.MOVE;
for (var t = 0; t < 200; t++) {
  var boss = {boss: true, cfg: {walk_spd: .1}, dead: false}, mons = [boss]; for (var i = 0; i < 6; i++) mons.push({cfg: {walk_spd: .1}, dead: false});
  var b = {mons: mons, roleIdx: Math.floor(Math.random() * 30)}; MOVE.ensure(b); ok(boss.idx >= 12, 'boss spawn idx ' + boss.idx);
  boss.idx = Math.floor(Math.random() * 12); MOVE.ensure(b); ok(boss.idx >= 12, 'boss relocated from top rows');
  for (var s = 0; s < 30; s++) { b.roleIdx = s % 12; MOVE.update(b, 1); ok(boss.idx >= 12, 'boss stays >= row 2 while chasing'); }
}
var ui = fs.readFileSync(R + '/js/ui.js', 'utf8');
ok(/function stretchBattle\(/.test(ui) && !/f\.ref\('showRoot'\)\.find\('img_bg_fight'\)/.test(ui), 'stretchBattle 替代失效的 find(img_bg_fight)');
ok(/setHeight: setHeight/.test(fs.readFileSync(R + '/js/fx.js', 'utf8')), 'FX 画布随战场加高');
ok(/\[G1d\]/.test(ui) && /avail - need0/.test(ui) && /gridScale \|\| 1/.test(ui), 'G1d 格子底部避开英雄/合击条');
console.log('test_release_fight: ' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
