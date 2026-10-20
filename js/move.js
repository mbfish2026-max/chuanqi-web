// 战场走位 (port of AStar.js + BattleTool.updateRole / onMonsterInstruct / onPartnerInstruct)
// 6x5 grid, index = x + 6*y. Role/monster/pet each occupy one cell; A* (4-neighbour, Manhattan, occupied cells blocked).
// Role: if no monster within its max skill distance (Chebyshev), steps one cell toward nearest monster every walkwait (1.3s).
// Monster: attacks only when adjacent (Chebyshev 1) to role/pet, otherwise steps toward the nearest of them.
// Pet: attacks when adjacent, otherwise steps toward nearest monster.
var MOVE = (function(){
  var COLS = 6, ROWS = 5, N = 30, ROLE_START = 26, MON_START = [1, 3, 5, 8, 10, 13, 15, 17, 20, 22, 7, 11];
  function xy(i){ return [i % COLS, Math.floor(i / COLS)]; }
  function cheb(a, b){ var p = xy(a), q = xy(b); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])); }
  function manh(a, b){ var p = xy(a), q = xy(b); return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]); }
  function occ(b){ var o = {}; if (b.roleIdx != null) o[b.roleIdx] = 'role';
    b.mons.forEach(function(m){ if (!m.dead && m.idx != null) o[m.idx] = m; }); (b._pets || []).forEach(function(p){ if (p.hp > 0 && p.idx != null) o[p.idx] = p; }); return o; }
  function freeCell(b, near){
    var o = occ(b), free = []; for (var i = 0; i < N; i++) if (!o[i]) free.push(i);
    if (!free.length) return -1;
    if (near != null) { free.sort(function(a, c){ return cheb(a, near) - cheb(c, near); }); return free[0]; }
    return free[Math.floor(Math.random() * free.length)];
  }
  // MapGrid.onSerchMovePath: A* from s to e; e may be occupied (target), others block
  function path(b, s, e){
    var o = occ(b), open = [{i: s, g: 0, f: manh(s, e), p: null}], closed = {}, best = {};
    while (open.length) {
      open.sort(function(a, c){ return a.f - c.f; }); var cur = open.shift();
      if (cur.i === e) { var r = []; while (cur) { r.unshift(cur.i); cur = cur.p; } return r; }
      closed[cur.i] = 1; var c = xy(cur.i);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function(d){
        var x = c[0] + d[0], y = c[1] + d[1]; if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
        var j = x + y * COLS; if (closed[j] || (o[j] && j !== e)) return;
        var g = cur.g + 1; if (best[j] != null && best[j] <= g) return; best[j] = g;
        open.push({i: j, g: g, f: g + manh(j, e), p: cur});
      });
    }
    return [];
  }
  // fallback BattleTool.getMoveIdx: greedy step when A* finds nothing
  function greedy(b, s, e){ var o = occ(b), p = xy(s), q = xy(e), c = [];
    if (p[0] > q[0]) c.push(s - 1); if (p[0] < q[0]) c.push(s + 1); if (p[1] > q[1]) c.push(s - 6); if (p[1] < q[1]) c.push(s + 6);
    for (var k = 0; k < c.length; k++) if (c[k] >= 0 && c[k] < N && !o[c[k]]) return c[k]; return -1; }
  function stepToward(b, s, e){ var p = path(b, s, e); if (p.length > 2 || (p.length === 2 && p[1] !== e)) return p[1]; return p.length ? -1 : greedy(b, s, e); }

  function roleRange(){ var d = 1; if (typeof eachSkill === 'function') eachSkill(function(sc){ if (sc.triggertype == 1 && sc.distance > d) d = sc.distance; }); return d; }
  function ensure(b){
    if (b.roleIdx == null) b.roleIdx = ROLE_START;
    b.mons.forEach(function(m, k){
      if (m.dead) { m._wasDead = true; return; }
      if (m.idx == null || m._wasDead) { m._wasDead = false; var occ0 = occ(b), want = MON_START[k % MON_START.length]; m.idx = (m.idx == null && !occ0[want]) ? want : freeCell(b); m.moveT = 0.5 + Math.random() * 1.5; }
    });
    (b._pets || []).forEach(function(p){ if (p.idx == null) { p.idx = freeCell(b, b.roleIdx); p.moveT = 1; } });
  }
  function nearestMon(b, i){ var best = null, bd = 99; b.mons.forEach(function(m){ if (m.dead || m.idx == null) return; var d = cheb(i, m.idx); if (d < bd) { bd = d; best = m; } }); return best; }
  // target for the role: in range, prefer previous target (rolevo.getAtkTarget)
  function roleTarget(b){
    ensure(b); var R = roleRange(), inR = b.mons.filter(function(m){ return !m.dead && m.idx != null && cheb(b.roleIdx, m.idx) <= R; });
    if (!inR.length) return null;
    if (b._tgt && inR.indexOf(b._tgt) >= 0) return b._tgt;
    inR.sort(function(a, c){ return cheb(b.roleIdx, a.idx) - cheb(b.roleIdx, c.idx); }); return b._tgt = inR[0];
  }
  function monCanAttack(b, m){ ensure(b); if (m.idx == null) return false;
    if (cheb(m.idx, b.roleIdx) <= 1) return 'role';
    var pets = (b._pets || []).filter(function(p){ return p.hp > 0 && p.idx != null && cheb(m.idx, p.idx) <= 1; }); return pets.length ? 'pet' : false; }
  function emitMove(who, from, to){ if (typeof FX !== 'undefined' && FX.onMove) FX.onMove(who, from, to); }
  function update(b, dt){
    ensure(b);
    var walk = (G.role && CFG.profession && CFG.profession.raw && typeof PROF_KEY !== 'undefined' && (CFG.profession.raw[PROF_KEY[G.role.prof]] || {}).walkwait) || 1.3;
    b.roleMoveT = (b.roleMoveT || 0) - dt;
    if (b.roleMoveT <= 0) { b.roleMoveT = walk;
      if (!roleTarget(b)) { var t = nearestMon(b, b.roleIdx); var e = t ? t.idx : Math.floor(Math.random() * N);
        var n = stepToward(b, b.roleIdx, e); if (n >= 0) { b.roleIdx = n; } } }
    b.mons.forEach(function(m){ if (m.dead || m.idx == null) return; m.moveT = (m.moveT || 0) - dt; if (m.moveT > 0) return; m.moveT = (m.cfg.walk_spd || 1.6) + Math.random() * .6;
      if ((m._buffs || []).some(function(x){ return (x.vertigo || x.frozen) && x.left > 0; })) return;
      if (monCanAttack(b, m)) return;
      var tg = b.roleIdx, bd = cheb(m.idx, b.roleIdx); (b._pets || []).forEach(function(p){ if (p.hp > 0 && p.idx != null && cheb(m.idx, p.idx) < bd) { bd = cheb(m.idx, p.idx); tg = p.idx; } });
      var n = stepToward(b, m.idx, tg); if (n >= 0) m.idx = n; });
    (b._pets || []).forEach(function(p){ if (p.hp <= 0 || p.idx == null) return; p.moveT = (p.moveT || 0) - dt; if (p.moveT > 0) return; p.moveT = 1.2;
      var t = nearestMon(b, p.idx); if (!t || cheb(p.idx, t.idx) <= 1) return; var n = stepToward(b, p.idx, t.idx); if (n >= 0) p.idx = n; });
  }
  // eAttackKey from grid delta (BattleTool.getAtkDirectionKey)
  function dirKey(from, to){ var p = xy(from), q = xy(to), dx = Math.sign(q[0] - p[0]), dy = Math.sign(q[1] - p[1]);
    return ({'0,-1': 'up', '0,1': 'down', '-1,0': 'left', '1,0': 'right', '1,-1': 'slant_rightup', '-1,-1': 'slant_leftup', '1,1': 'slant_rightdown', '-1,1': 'slant_leftdown'})[dx + ',' + dy] || 'up'; }
  return {ensure: ensure, update: update, roleTarget: roleTarget, monCanAttack: monCanAttack, path: path, cheb: cheb, dirKey: dirKey, roleRange: roleRange};
})();
