// Battle FX layer: one <canvas> over the battlefield (map_battle), driven by FX.emit() events from game.js.
// Sprite-sheet FX from assets/fx/<pinyin>/{sheet.png,fx.json}; procedural fallbacks (particles/glow/lightning/fire wall/arc slash).
// Floating damage/heal numbers, hit flash on monster cards, screen shake, buff auras (魔法盾/毒/冰/烈火).
var FX = (function(){
  var W = 750, H = 731;                       // battle area in design px
  var MAX_P = 500;
  var SKILL_DIR = {1002: 'gongsha', 1003: 'gongsha', 1004: 'banyue', 1005: 'yemanchongzhuang', 1007: 'liehuo',
    2001: 'huoqiu', 2002: 'leidianshu', 2003: 'huoqiang', 2005: 'mofadun', 2007: 'bingpaoxiao',
    3002: 'zhiliaoshu', 3003: 'linghunhuofu', 3004: 'shidu', 3005: 'zhaohuan', 3007: 'shenshengzhanjia'};
  var NAME_BASE = {};                         // skill name -> base id (filled lazily from CFG.skill)
  var sheets = {};                            // dir -> {img, meta, ok}
  var canvas = null, ctx = null, host = null, dpr = 1, scale = 1;
  var parts = [], anims = [], texts = [], bolts = [], rings = [], shake = 0, flashA = 0, flashC = '#fff', running = false, last = 0;

  function loadSheet(dir){
    if (sheets[dir]) return sheets[dir];
    var s = sheets[dir] = {ok: false, failed: false};
    fetch('assets/fx/' + dir + '/fx.json').then(function(r){ if (!r.ok) throw 0; return r.json(); }).then(function(meta){
      var img = new Image(); img.onload = function(){ s.img = img; s.meta = meta; s.cols = Math.max(1, Math.floor(img.width / meta.frameW)); s.ok = true; };
      img.onerror = function(){ s.failed = true; }; img.src = 'assets/fx/' + dir + '/sheet.png';
    }).catch(function(){ s.failed = true; });
    return s;
  }
  // 预载全部技能 + 合击 sheet, 首次合击不再走程序化兜底
  var HEJI_DIRS = ['heji_pohunzhan', 'heji_pixingzhan', 'heji_leitingyiji', 'heji_huolongqiyan', 'heji_shihunzhaoze', 'heji_morishenpan'];
  function preload(){ Object.keys(SKILL_DIR).forEach(function(k){ loadSheet(SKILL_DIR[k]); }); HEJI_DIRS.forEach(function(d){ loadSheet(d); loadSheet(d + '_charge'); }); }

  // ---------- canvas / geometry ----------
  function attach(holderNode){
    if (!holderNode) return;
    if (host === holderNode.el && canvas && canvas.parentNode === host) return;
    host = holderNode.el;
    canvas = document.createElement('canvas'); canvas.className = 'fx-canvas';
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;pointer-events:none;z-index:50';
    host.appendChild(canvas); ctx = canvas.getContext('2d'); resize();
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function resize(){
    if (!canvas) return;
    var r = canvas.getBoundingClientRect(); scale = r.width / W || 1;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var bw = Math.round(W * scale * dpr), bh = Math.round(H * scale * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  }
  window.addEventListener('resize', function(){ setTimeout(resize, 50); });
  function centerOf(el){                       // element centre in battle design coords
    if (!el || !canvas) return {x: W / 2, y: H / 2};
    var c = canvas.getBoundingClientRect(), r = el.getBoundingClientRect(), k = W / (c.width || 1);
    return {x: (r.left + r.width / 2 - c.left) * k, y: (r.top + r.height / 2 - c.top) * k, w: r.width * k, h: r.height * k};
  }
  function monEl(m){ var i = G.battle ? G.battle.mons.indexOf(m) : -1; var it = i >= 0 && UI.monItems ? UI.monItems[i] : null; return it ? it.el : null; }
  function roleEl(){ return UI.roleItem ? UI.roleItem.el : null; }
  function visible(){ return canvas && UI.battle && UI.pageKey === 'fight' && canvas.isConnected; }

  // ---------- primitives ----------
  function P(o){ if (parts.length >= MAX_P) parts.shift(); o.life = o.max = o.life || 0.6; o.vx = o.vx || 0; o.vy = o.vy || 0; o.g = o.g || 0; o.s = o.s || 4; o.drag = o.drag == null ? 0.98 : o.drag; parts.push(o); return o; }
  function burst(x, y, n, col, spd, size, life, opts){
    opts = opts || {};
    for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random()); P({x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opts.up || 0), s: size * (0.5 + Math.random()), c: col[i % col.length], life: life * (0.6 + Math.random() * 0.6), g: opts.g || 0, shape: opts.shape}); }
  }
  function ring(x, y, r0, r1, col, life, w){ rings.push({x: x, y: y, r0: r0, r1: r1, c: col, life: life, max: life, w: w || 6}); }
  function bolt(x0, y0, x1, y1, col, life){
    var pts = [[x0, y0]], n = 9;
    for (var i = 1; i < n; i++) { var t = i / n; pts.push([x0 + (x1 - x0) * t + (Math.random() - .5) * 46, y0 + (y1 - y0) * t + (Math.random() - .5) * 12]); }
    pts.push([x1, y1]); bolts.push({pts: pts, c: col, life: life, max: life});
    // branch
    var k = 3 + Math.floor(Math.random() * 4), b = pts[k]; bolts.push({pts: [b, [b[0] + (Math.random() - .5) * 90, b[1] + 40 + Math.random() * 50]], c: col, life: life * .7, max: life * .7, thin: true});
  }
  function text(x, y, str, o){ if(window.CQ_FX_FLAGS && CQ_FX_FLAGS.dmg && !CQ_FX_FLAGS.dmg()) return; texts.push({x: x + (o.dx != null ? o.dx : (Math.random() - .5) * 30), y: y, str: str, c: o.c || '#fff', size: o.size || 30, life: o.life || 1.0, max: o.life || 1.0, vy: o.vy || -70, pop: 0}); }
  function sprite(dir, x, y, o){
    var s = loadSheet(dir); if (!s.ok) return false;
    o = o || {}; anims.push({s: s, x: x, y: y, t: 0, scale: o.scale || 1.4, rot: o.rot || 0, tx: o.tx, ty: o.ty, dur: o.dur, done: o.done});
    return true;
  }
  function flashCard(el, kind){
    if (typeof POP !== 'undefined') POP.hit(el, kind === 'crit');
    if (!el) return; el.classList.remove('fx-hit', 'fx-hit-crit'); void el.offsetWidth; el.classList.add(kind === 'crit' ? 'fx-hit-crit' : 'fx-hit');
    clearTimeout(el._fxT); el._fxT = setTimeout(function(){ el.classList.remove('fx-hit', 'fx-hit-crit'); }, 260);
  }
  function screenShake(v){ if(window.CQ_FX_FLAGS && CQ_FX_FLAGS.shake && !CQ_FX_FLAGS.shake()) return; shake = Math.max(shake, v); }
  function screenFlash(c, a){ flashC = c; flashA = Math.max(flashA, a); }

  // ---------- procedural skill effects ----------
  var PROC = {
    slash: function(s, t, big){ // basic / 攻杀 / 刺杀
      var n = big ? 3 : 1;
      for (var i = 0; i < n; i++) (function(i){ setTimeout(function(){
        var a = -0.9 + (Math.random() - .5) * .6 + i * .5; parts.push({arc: 1, x: t.x, y: t.y, r: 46 + i * 8, a0: a - 1.1, a1: a + 1.1, c: big ? '#ffe9a0' : '#ffffff', c2: big ? '#ff8a00' : '#9fd7ff', life: .22, max: .22, s: big ? 9 : 5});
        burst(t.x, t.y, big ? 14 : 6, big ? ['#fff3b0', '#ffb347', '#ff6a00'] : ['#ffffff', '#cfe8ff'], 260, 4, .35);
      }, i * 60); })(i);
    },
    banyue: function(s, t){ // 半月弯刀: big crescent sweep around self
      parts.push({arc: 1, x: s.x, y: s.y, r: 150, a0: Math.PI * 1.05, a1: Math.PI * 1.95, c: '#e8f6ff', c2: '#38b6ff', life: .35, max: .35, s: 22, sweep: 1});
      ring(s.x, s.y, 40, 190, 'rgba(120,200,255,0.9)', .35, 8); burst(s.x, s.y - 40, 24, ['#bfe9ff', '#5cc8ff', '#fff'], 360, 4, .5);
    },
    yeman: function(s, t){ // 野蛮冲撞: dash streak + dust
      for (var i = 0; i < 18; i++) P({x: s.x + (t.x - s.x) * i / 18, y: s.y + (t.y - s.y) * i / 18, s: 10 - i * .3, c: '#ffcf7a', life: .25 + i * .015});
      burst(t.x, t.y + 30, 22, ['#c9a26b', '#8d6e46', '#fff1c2'], 220, 6, .6, {up: 40}); screenShake(10);
    },
    liehuo: function(s, t){ // 烈火剑法: fire burst + shake
      ring(t.x, t.y, 10, 150, 'rgba(255,120,0,0.95)', .45, 12); ring(t.x, t.y, 5, 90, 'rgba(255,230,120,1)', .3, 6);
      burst(t.x, t.y, 60, ['#fff6b0', '#ffb300', '#ff5a00', '#d01d00'], 420, 7, .8, {g: -120});
      screenShake(18); screenFlash('#ff7a00', .25);
    },
    huoqiu: function(s, t, done){ projectile(s, t, ['#fff2a8', '#ff9a1f', '#ff3d00'], 18, 900, function(){ burst(t.x, t.y, 34, ['#fff2a8', '#ffb300', '#ff4d00'], 320, 6, .6, {g: -60}); ring(t.x, t.y, 8, 80, 'rgba(255,140,0,.9)', .3, 6); if (done) done(); }); },
    linghun: function(s, t, done){ projectile(s, t, ['#e6fbff', '#59d4ff', '#2f6bff'], 14, 760, function(){ burst(t.x, t.y, 26, ['#c6f3ff', '#4fb8ff', '#8e7bff'], 260, 5, .6); ring(t.x, t.y, 8, 70, 'rgba(90,180,255,.9)', .3, 5); if (done) done(); }, true); },
    leidian: function(s, t){ // 雷电术: lightning bolts from sky
      for (var i = 0; i < 3; i++) bolt(t.x + (Math.random() - .5) * 40, -10, t.x + (Math.random() - .5) * 16, t.y, i ? '#a8d8ff' : '#ffffff', .28 + i * .05);
      burst(t.x, t.y, 30, ['#ffffff', '#bfe3ff', '#6fb8ff'], 380, 4, .45); ring(t.x, t.y, 5, 90, 'rgba(180,220,255,1)', .25, 7);
      screenFlash('#cfe6ff', .35); screenShake(8);
    },
    huoqiang: function(s, t){ // 火墙: wall of flames for ~1.6s
      var x0 = t.x - 95, n = 0, iv = setInterval(function(){ if (++n > 26) return clearInterval(iv);
        for (var i = 0; i < 6; i++) P({x: x0 + Math.random() * 190, y: t.y + 40 + Math.random() * 10, vx: (Math.random() - .5) * 30, vy: -120 - Math.random() * 160, s: 9 + Math.random() * 9, c: ['#fff3a0', '#ffb300', '#ff5a00', '#c81e00'][i % 4], life: .7, drag: .96, flame: 1});
      }, 60);
      screenShake(6);
    },
    bing: function(s, t){ // 冰咆哮: ice shards + frost ring
      for (var i = 0; i < 26; i++) { var a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 260; P({x: t.x, y: t.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 6 + Math.random() * 6, c: ['#ffffff', '#bdf3ff', '#62c9ff'][i % 3], life: .7, shard: 1, rot: a}); }
      ring(t.x, t.y, 10, 130, 'rgba(160,230,255,.95)', .45, 10); screenFlash('#bff0ff', .2); screenShake(8);
    },
    shidu: function(s, t){ for (var i = 0; i < 26; i++) P({x: t.x + (Math.random() - .5) * 70, y: t.y + (Math.random() - .5) * 50, vx: (Math.random() - .5) * 40, vy: -20 - Math.random() * 40, s: 12 + Math.random() * 14, c: ['rgba(90,220,90,.6)', 'rgba(40,160,60,.55)', 'rgba(180,255,120,.5)'][i % 3], life: 1.1, cloud: 1, drag: .97}); },
    heal: function(s){ for (var i = 0; i < 34; i++) P({x: s.x + (Math.random() - .5) * 90, y: s.y + 40 - Math.random() * 30, vy: -60 - Math.random() * 120, s: 4 + Math.random() * 5, c: ['#d6ffb0', '#6dff8a', '#2fd36b'][i % 3], life: 1.0, plus: i % 4 === 0, drag: .99});
      ring(s.x, s.y, 20, 100, 'rgba(110,255,140,.9)', .5, 6); },
    shield: function(s){ ring(s.x, s.y, 20, 85, 'rgba(120,190,255,.95)', .5, 8); burst(s.x, s.y, 24, ['#d9eeff', '#7cc3ff', '#ffffff'], 200, 4, .6); },
    holy: function(s){ ring(s.x, s.y, 20, 110, 'rgba(255,215,90,.95)', .55, 9); burst(s.x, s.y, 30, ['#fff6c0', '#ffd34d', '#ffa800'], 240, 4, .7, {up: 60}); },
    summon: function(s){ parts.push({circle: 1, x: s.x, y: s.y + 40, r: 70, c: '#b46bff', life: 1.2, max: 1.2}); burst(s.x, s.y + 30, 40, ['#e2c4ff', '#9b5bff', '#ffffff'], 200, 5, 1.0, {up: 120}); screenFlash('#b46bff', .15); }
  };
  var PROC_BY_DIR = {gongsha: 'slashBig', banyue: 'banyue', yemanchongzhuang: 'yeman', liehuo: 'liehuo', huoqiu: 'huoqiu', linghunhuofu: 'linghun', leidianshu: 'leidian',
    huoqiang: 'huoqiang', bingpaoxiao: 'bing', shidu: 'shidu', zhiliaoshu: 'heal', mofadun: 'shield', shenshengzhanjia: 'holy', zhaohuan: 'summon'};
  function projectile(s, t, cols, size, speed, onHit, wobble){
    var dx = t.x - s.x, dy = t.y - s.y, d = Math.sqrt(dx * dx + dy * dy) || 1, dur = d / speed;
    parts.push({proj: 1, sx: s.x, sy: s.y, tx: t.x, ty: t.y, t: 0, dur: dur, cols: cols, s: size, life: dur, max: dur, onHit: onHit, wob: wobble});
  }
  function playSkill(dir, s, t, done){
    var meta = sheets[dir] && sheets[dir].ok ? sheets[dir].meta : null, proc = PROC_BY_DIR[dir];
    if (meta) {
      if (meta.type === 'projectile') {
        var a = Math.atan2(t.y - s.y, t.x - s.x), dx = t.x - s.x, dy = t.y - s.y, dur = Math.sqrt(dx * dx + dy * dy) / 820;
        sprite(dir, s.x, s.y, {tx: t.x, ty: t.y, dur: dur, rot: a, scale: .9, done: function(){ (PROC[proc] ? burst(t.x, t.y, 30, ['#fff2a8', '#ffb300', '#ff4d00'], 300, 6, .5) : 0); ring(t.x, t.y, 8, 80, 'rgba(255,200,120,.9)', .3, 6); if (done) done(); }});
        trailFollow(s, t, dur, dir === 'linghunhuofu' ? ['#bfefff', '#4fb8ff'] : ['#ffe08a', '#ff7a00']);
        return;
      }
      var at = meta.type === 'onSelf' ? s : t;
      sprite(dir, at.x, at.y, {scale: dir === 'huoqiang' ? 1.6 : 1.35});
      // keep the procedural extras that sell the impact (shake/flash/particles)
      if (dir === 'leidianshu') { screenFlash('#cfe6ff', .35); screenShake(8); bolt(t.x, -10, t.x, t.y, '#ffffff', .2); }
      else if (dir === 'liehuo') { screenShake(16); burst(t.x, t.y, 36, ['#fff6b0', '#ffb300', '#ff5a00'], 380, 6, .7, {g: -100}); }
      else if (dir === 'bingpaoxiao') { screenShake(6); burst(t.x, t.y, 18, ['#ffffff', '#bdf3ff'], 260, 5, .6); }
      else if (dir === 'banyue' || dir === 'yemanchongzhuang') { screenShake(8); }
      if (done) setTimeout(done, 120);
      return;
    }
    if (proc === 'slashBig') PROC.slash(s, t, true);
    else if (PROC[proc]) PROC[proc](s, t, done);
    else PROC.slash(s, t, false);
    if (proc !== 'huoqiu' && proc !== 'linghun' && done) setTimeout(done, 120);
  }
  function trailFollow(s, t, dur, cols){
    var t0 = performance.now(), iv = setInterval(function(){ var k = (performance.now() - t0) / 1000 / dur; if (k >= 1) return clearInterval(iv);
      var x = s.x + (t.x - s.x) * k, y = s.y + (t.y - s.y) * k; for (var i = 0; i < 3; i++) P({x: x + (Math.random() - .5) * 10, y: y + (Math.random() - .5) * 10, s: 5 + Math.random() * 5, c: cols[i % cols.length], life: .35}); }, 16);
  }
  function baseOf(sc){ return sc ? Math.floor(sc.id / 10) : 0; }
  function dirFor(sc){ return SKILL_DIR[baseOf(sc)] || null; }
  function nameToBase(name){
    if (!Object.keys(NAME_BASE).length && window.CFG && CFG.skill) CFG.skill.list.forEach(function(x){ if (x.id >= 10000) NAME_BASE[x.name] = Math.floor(x.id / 10); });
    return NAME_BASE[name];
  }

  // 8-direction attack anims (assets/main/attack_*.anim: back 2px @0.25s, lunge 10px @0.333s, home @0.583s)
  var DIRV = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], slant_rightup: [1, -1], slant_leftup: [-1, -1], slant_rightdown: [1, 1], slant_leftdown: [-1, 1]};
  function playAtk(el, key){
    var v = DIRV[key]; if (!el || !v || !el.animate) return; el.dataset.atk = key; if (typeof POP !== 'undefined') POP.atk(el);
    var f = function(k){ return (v[0] * k) + 'px ' + (v[1] * k) + 'px'; };
    el.animate([{translate: f(0), offset: 0}, {translate: f(-2), offset: .4286}, {translate: f(10), offset: .5714}, {translate: f(0), offset: 1}], {duration: 583, composite: 'add'});
  }
  function atkBetween(fromEl, toEl, fromIdx, toIdx){
    if (typeof MOVE !== 'undefined' && fromIdx != null && toIdx != null) return playAtk(fromEl, MOVE.dirKey(fromIdx, toIdx));
    var a = centerOf(fromEl), b = centerOf(toEl), dx = Math.sign(Math.round((b.x - a.x) / 60)), dy = Math.sign(Math.round((b.y - a.y) / 60));
    playAtk(fromEl, ({'0,-1': 'up', '0,1': 'down', '-1,0': 'left', '1,0': 'right', '1,-1': 'slant_rightup', '-1,-1': 'slant_leftup', '1,1': 'slant_rightdown', '-1,1': 'slant_leftdown'})[dx + ',' + dy]);
  }
  // ---------- events from game.js ----------
  function emit(type, o){
    if (!visible()) return;
    o = o || {};
    var s = centerOf(roleEl());
    if (type === 'attack') {
      atkBetween(roleEl(), monEl(o.target), G.battle && G.battle.roleIdx, o.target && o.target.idx);
      var t = centerOf(monEl(o.target)), sk = (o.skills || []).filter(function(x){ return dirFor(x); });
      var hit = function(){ var el = monEl(o.target); flashCard(el, o.crit ? 'crit' : 'hit');
        text(t.x, t.y - 20, (o.crit ? '暴击 ' : '') + '-' + o.dmg, {c: o.crit ? '#ffd23f' : '#ffffff', size: o.crit ? 48 : 32, life: o.crit ? 1.2 : .9});
        if (o.crit || o.dmg > (o.target.maxhp || 1) * 0.35) screenShake(o.crit ? 12 : 7); };
      if (sk.length) { var d = dirFor(sk[0]);
        if (d === 'huoqiu' || d === 'linghunhuofu') { var pdx = t.x - s.x, pdy = t.y - s.y; hold(o.target, Math.sqrt(pdx * pdx + pdy * pdy) / (sheets[d] && sheets[d].ok ? .82 : d === 'huoqiu' ? .9 : .76) + 140); }
        playSkill(d, s, t, hit); for (var i = 1; i < sk.length; i++) playSkill(dirFor(sk[i]), s, t); }
      else { PROC.slash(s, t, false); setTimeout(hit, 60); }
    } else if (type === 'miss') { var tm = centerOf(monEl(o.target)); text(tm.x, tm.y - 20, '闪避', {c: '#b8c7d9', size: 26}); }
    else if (type === 'hurt') { var r = roleEl(); flashCard(r, 'hit'); text(s.x, s.y - 20, '-' + o.d, {c: '#ff5a4f', size: 30}); var ms = centerOf(monEl(o.m)); burst(s.x, s.y, 8, ['#ff9a8a', '#ffffff'], 160, 3, .35); if (o.d > 0 && o.m && o.m.boss) screenShake(9); }
    else if (type === 'matk') { atkBetween(monEl(o.m), roleEl(), o.m && o.m.idx, G.battle && G.battle.roleIdx); }
    else if (type === 'dodge') text(s.x, s.y - 20, '闪避', {c: '#b8c7d9', size: 26});
    else if (type === 'heal') { PROC.heal(s); if (sheets.zhiliaoshu && sheets.zhiliaoshu.ok) sprite('zhiliaoshu', s.x, s.y, {scale: 1.3}); text(s.x, s.y - 30, '+' + o.amount, {c: '#5dff7a', size: 34, life: 1.2}); }
    else if (type === 'kill') { var hw = (o.m._fxHold || 0) - performance.now(); if (hw > 0) { var om = o.m; setTimeout(function(){ if (visible()) killFx(om); }, hw); } else killFx(o.m); }
    else if (type === 'cast') { var dir = SKILL_DIR[o.base], tt = o.target ? centerOf(monEl(o.target)) : s; if (dir) playSkill(dir, s, tt); }
    else if (type === 'heji') heji(o);                                  // [hero] 合击
    else if (type === 'heroatk') { var he = petEl(o.unit), tg = monEl(o.target), th = centerOf(tg); atkBetween(he, tg, o.unit && o.unit.idx, o.target && o.target.idx);
      PROC.slash(centerOf(he), th, false); flashCard(tg, o.crit ? 'crit' : 'hit'); text(th.x, th.y - 20, (o.crit ? '暴击 ' : '') + '-' + o.dmg, {c: '#7fd7ff', size: o.crit ? 44 : 30}); }
    else if (type === 'drop') dropBeam(o);                              // [loot] 掉落光柱 (按品质)
    else if (type === 'dot') { var td = centerOf(monEl(o.m)); text(td.x, td.y - 10, '-' + o.d, {c: '#7dff6a', size: 24, life: .8}); flashCard(monEl(o.m), 'hit'); }
  }
  function killFx(m){ var tk = centerOf(monEl(m)); burst(tk.x, tk.y, m.boss ? 70 : 26, m.q >= 4 ? ['#ffd24d', '#ff8a00', '#fff'] : ['#ffffff', '#d9c7a3', '#8f7c5a'], m.boss ? 420 : 240, 5, .7); ring(tk.x, tk.y, 10, m.boss ? 180 : 90, 'rgba(255,240,200,.9)', .4, 6); if (m.boss) { screenShake(22); screenFlash('#ffd24d', .35); } }
  // [loot] 掉落光柱: 蓝/紫/橙 不同颜色与高度, 暗金额外金环
  var BEAM = {3: ['#2E8DD6', '#9fd0ff'], 4: ['#D425D2', '#f2a8ff'], 5: ['#D96324', '#ffd27a']};
  function dropBeam(o){ var t = centerOf(monEl(o.m)), col = o.set ? ['#32C63D', '#b6ffbf'] : (BEAM[o.q] || BEAM[3]), hgt = o.q >= 5 ? 1 : o.q >= 4 ? .75 : .5;
    for (var i = 0; i < 36 * hgt + 10; i++) P({x: t.x + (Math.random() - .5) * 16, y: t.y + 30 - Math.random() * 20, vy: -(180 + Math.random() * 320) * hgt, s: 5 + Math.random() * 7, c: col[i % 2], life: .9 + Math.random() * .6, drag: .985});
    ring(t.x, t.y + 30, 6, 46 + 30 * hgt, col[0], .6, 4); if (o.uq) { ring(t.x, t.y + 30, 10, 120, '#ffd24d', .8, 6); screenFlash('#ffcc66', .18); }
    text(t.x, t.y - 70, (o.uq ? '★' : '') + o.name, {c: col[1], size: o.q >= 5 ? 34 : 26, life: 1.8, vy: -24}); }
  // ---------- [hero] 合击 FX: sheet assets/fx/heji_<pinyin>/ if present, else procedural (registerable) ----------
  function petEl(u){ var it = (UI.petItems || []).filter(function(x){ return x._pet === u; })[0]; return it ? it.el : null; }
  var HEJI = {
    heji_pohunzhan: function(s, h, ts){ ts.forEach(function(t, k){ setTimeout(function(){ PROC.slash(s, t, true); PROC.slash(h, t, true); burst(t.x, t.y, 30, ['#ffffff', '#ffd27a', '#ff6a00'], 360, 6, .6); }, k * 70); }); screenShake(16); },
    heji_pixingzhan: function(s, h, ts){ var t = ts[0]; for (var i = 0; i < 5; i++) bolt(t.x + (Math.random() - .5) * 40, t.y - 360, t.x, t.y, '#fff6c8', .5); ring(t.x, t.y, 10, 150, 'rgba(255,230,120,.95)', .5, 10); burst(t.x, t.y, 60, ['#fffbe0', '#ffd34d', '#ff8a00'], 460, 7, .8); screenShake(20); },
    heji_leitingyiji: function(s, h, ts){ ts.forEach(function(t){ bolt(t.x, t.y - 380, t.x, t.y, '#e6f2ff', .55); bolt(t.x + 20, t.y - 360, t.x, t.y, '#9fc8ff', .45); ring(t.x, t.y, 6, 90, 'rgba(140,190,255,.9)', .4, 6); }); screenShake(14); },
    heji_huolongqiyan: function(s, h, ts){ ts.forEach(function(t, k){ setTimeout(function(){ burst(t.x, t.y, 40, ['#fff2a8', '#ff9a1f', '#ff3d00'], 380, 7, .8, {g: -80}); ring(t.x, t.y, 8, 110, 'rgba(255,120,0,.9)', .45, 8); }, k * 90); }); screenShake(12); },
    heji_shihunzhaoze: function(s, h, ts){ ts.forEach(function(t){ for (var i = 0; i < 18; i++) P({x: t.x + (Math.random() - .5) * 110, y: t.y + 30 + (Math.random() - .5) * 30, vy: -10 - Math.random() * 30, s: 14 + Math.random() * 16, c: ['rgba(120,60,160,.6)', 'rgba(60,140,70,.55)'][i % 2], life: 1.6, cloud: 1, drag: .97}); }); },
    heji_morishenpan: function(s, h, ts){ ts.forEach(function(t){ ring(t.x, t.y, 10, 120, 'rgba(255,215,90,.95)', .6, 9); burst(t.x, t.y, 30, ['#fff6c0', '#ffd34d', '#ffffff'], 300, 5, .8, {up: 80}); }); PROC.heal(s); PROC.heal(h); }
  };
  function registerHeji(dir, fn){ HEJI[dir] = fn; }
  // 合击: 蓄力(玩家+英雄同时向目标突进, 两道能量流汇聚) -> 命中(sheet/程序特效) -> 伤害数字对齐 sheet 冲击帧; 被击杀的怪等数字出来后再倒下
  var HEJI_COL = {heji_pohunzhan: ['#fff3b0', '#ff8a00'], heji_pixingzhan: ['#fffbe0', '#ffd34d'], heji_leitingyiji: ['#e6f2ff', '#6fb8ff'],
    heji_huolongqiyan: ['#fff2a8', '#ff4d00'], heji_shihunzhaoze: ['#e2c4ff', '#5fd36b'], heji_morishenpan: ['#fff6c0', '#ffd34d']};
  var HEJI_WIND = 280;                                                 // ms 蓄力
  function hold(m, ms){ if (!m) return; var u = performance.now() + ms; if (!(m._fxHold > u)) m._fxHold = u;
    setTimeout(function(){ if (m.dead && UI.pageKey === 'fight' && typeof refreshScene === 'function') try { refreshScene(); } catch (e) {} }, ms + 20); }
  // 合击冲击帧(ms): fx.json "impact" (0-based 帧号) / fps; 没有 impact 时回退 sheet 时长 35%; 无 sheet 时 60ms
  function hejiImpact(sh){ if (!(sh && sh.ok)) return 60; var me = sh.meta;
    return me.impact != null && isFinite(+me.impact) ? Math.round(Math.max(0, Math.min(me.frames - 1, +me.impact)) / me.fps * 1000) : Math.round(me.frames / me.fps * 350); }
  // 群体合击伤害数字横向错开: 同一行(|dy|<46)相邻数字估算宽度重叠时左右推开
  function spreadX(ts, strs, size){ var xs = ts.map(function(t){ return t.x; }), wd = strs.map(function(str){ return str.length * size * .56 + 14; });
    for (var it = 0; it < 6; it++) for (var i = 0; i < xs.length; i++) for (var j = i + 1; j < xs.length; j++) {
      if (Math.abs(ts[i].y - ts[j].y) >= 46) continue; var a = xs[i] <= xs[j] ? i : j, c = a === i ? j : i, need = (wd[a] + wd[c]) / 2 - (xs[c] - xs[a]);
      if (need > 0) { xs[a] -= need / 2; xs[c] += need / 2; } }
    return xs.map(function(x, i){ return Math.max(wd[i] / 2, Math.min(W - wd[i] / 2, x)) - ts[i].x; }); }
  function heji(o){
    var hits = o.hits || [], b = G.battle; if (!hits.length) return;
    var unit = b && b._heroUnit, re = roleEl(), he = petEl(unit), m0 = hits[0].m, t0 = centerOf(monEl(m0)), s = centerOf(re), h = he ? centerOf(he) : null;
    var col = HEJI_COL[o.fx] || HEJI_COL.heji_pohunzhan, sh = sheets[o.fx]; if (!sh) { loadSheet(o.fx); sh = sheets[o.fx]; }
    var useSheet = !!(sh && sh.ok), imp = hejiImpact(sh), cdir = o.fx + '_charge', csh = loadSheet(cdir), useCharge = !!csh.ok;
    hits.forEach(function(x, k){ hold(x.m, HEJI_WIND + imp + k * 60 + 160); });
    // 蓄力: 玩家和英雄身上播放 heji_*_charge (能量向内汇聚), 程序能量流作补充; 没有 charge sheet 时用程序光环
    screenFlash('#ffcc66', .2);
    text(375, 140, o.name, {c: '#ffd23f', size: 64, life: 1.8, vy: -20, dx: 0});
    var charge = function(p){ if (useCharge) { var cm = csh.meta; sprite(cdir, p.x, p.y, {scale: 1.25}); if (cm.frames / cm.fps * 1000 < HEJI_WIND - 40) setTimeout(function(){ if (visible()) sprite(cdir, p.x, p.y, {scale: 1.25}); }, cm.frames / cm.fps * 1000); }
      else ring(p.x, p.y, 90, 12, col[1], HEJI_WIND / 1000, 6); };
    var stream = function(p){ if (useCharge) setTimeout(function(){ if (visible()) trailFollow(p, t0, (HEJI_WIND - 120) / 1000, col); }, 120); else trailFollow(p, t0, HEJI_WIND / 1000, col); };
    atkBetween(re, monEl(m0), b && b.roleIdx, m0.idx); charge(s); stream(s);
    if (he) { atkBetween(he, monEl(m0), unit && unit.idx, m0.idx); charge(h); stream(h); }
    setTimeout(function(){
      if (!visible()) return;
      var ts = hits.map(function(x){ return centerOf(monEl(x.m)); }), s2 = centerOf(roleEl()), h2 = he ? centerOf(he) : s2;
      screenFlash('#ffcc66', .35); screenShake(10);
      if (useSheet) ts.forEach(function(t){ sprite(o.fx, t.x, t.y, {scale: 1.4}); }); else (HEJI[o.fx] || HEJI.heji_pohunzhan)(s2, h2, ts);
      var strs = hits.map(function(x){ return '-' + x.d; }), dxs = hits.length > 1 ? spreadX(ts, strs, 46) : [0];
      hits.forEach(function(x, k){ setTimeout(function(){ var el = monEl(x.m), t = centerOf(el); flashCard(el, 'crit'); burst(t.x, t.y, 14, [col[0], col[1], '#ffffff'], 300, 5, .45);
        text(t.x, t.y - 20, strs[k], {c: '#ffb000', size: 46, life: 1.3, dx: dxs[k]}); if (!k) { screenShake(16); screenFlash("#ffffff", .16); } }, imp + k * 60); });
    }, HEJI_WIND);
  }
  // bridge for skills cast inside js/systems (buff.js logs "[技能名] ..."): play their FX without touching that code
  function hookLog(){
    if (typeof log !== 'function' || log._fx) return;
    var orig = log; log = function(s){ orig(s); try { onLog(String(s)); } catch (e) {} }; log._fx = true;
  }
  function onLog(s){
    if (!visible()) return;
    var m = /^\[([^\]]+)\]\s*(.*)$/.exec(s.replace(/<[^>]+>/g, '')); if (!m) return;
    var names = m[1].split('+'), rest = m[2], base = nameToBase(names[0]);
    if (/受到 (\d+) 伤害/.test(rest) && !/你对/.test(rest)) { var mn = rest.split(' 受到')[0], mon = G.battle && G.battle.mons.filter(function(x){ return x.cfg.name === mn && !x.dead; })[0]; if (mon) emit('dot', {m: mon, d: +RegExp.$1}); return; }
    if (/你对/.test(rest)) return;                      // normal attack log, handled by 'attack'
    if (/回复生命 (\d+)/.test(rest)) return;            // heal, handled by 'heal'
    if (base) emit('cast', {base: base, target: G.battle && G.battle.mons.filter(function(x){ return !x.dead; })[0]});
  }

  // ---------- auras (per frame, read state) ----------
  function drawAuras(t){
    var buffs = (window.Systems && Systems.buff && Systems.buff.list) ? Systems.buff.list() : [];
    var s = centerOf(roleEl());
    buffs.forEach(function(b){
      if (/魔法盾/.test(b.name) || b.shield > 0) { // bubble
        var r = 78 + Math.sin(t * 4) * 3, g = ctx.createRadialGradient(s.x, s.y, r * .55, s.x, s.y, r);
        g.addColorStop(0, 'rgba(80,160,255,0)'); g.addColorStop(.75, 'rgba(110,190,255,.22)'); g.addColorStop(1, 'rgba(190,230,255,.75)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,235,255,' + (.5 + .3 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2; ctx.stroke();
      } else if (/神圣|战甲/.test(b.name)) {
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,215,90,' + (.35 + .2 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(s.x, s.y + 55, 62, 16, 0, 0, Math.PI * 2); ctx.stroke();
      }
    });
    // monster status tints via CSS filters (cheap) + small particles
    if (G.battle) G.battle.mons.forEach(function(m){
      var el = monEl(m); if (!el) return;
      var names = (m._buffs || []).map(function(y){ return y.cfg && y.cfg.name || ''; }).join(',');
      var cls = /毒/.test(names) ? 'fx-poison' : /冰|冻/.test(names) ? 'fx-frozen' : /火|烈/.test(names) ? 'fx-burn' : '';
      if (el._fxTint !== cls) { if (el._fxTint) el.classList.remove(el._fxTint); if (cls) el.classList.add(cls); el._fxTint = cls; }
      if (cls && Math.random() < .25) { var c = centerOf(el); P({x: c.x + (Math.random() - .5) * 60, y: c.y + 20, vy: -40, s: 4, c: cls === 'fx-poison' ? 'rgba(120,255,100,.8)' : cls === 'fx-frozen' ? 'rgba(200,240,255,.9)' : 'rgba(255,150,40,.9)', life: .6}); }
    });
  }

  // ---------- render loop ----------
  function loop(now){
    requestAnimationFrame(loop);
    if (!canvas || !canvas.isConnected) return;
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    if (UI.pageKey !== 'fight') { parts.length = anims.length = texts.length = bolts.length = rings.length = 0; return; }
    resize();
    var k = scale * dpr; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(k, 0, 0, k, 0, 0);
    // shake the whole battle prefab (DOM) + canvas together
    if (shake > .3) { var sx = (Math.random() - .5) * shake, sy = (Math.random() - .5) * shake; host.style.transform = 'translate(' + sx + 'px,' + sy + 'px)'; shake *= Math.pow(.02, dt); }
    else if (shake) { shake = 0; host.style.transform = ''; }
    var t = now / 1000;
    drawAuras(t);
    ctx.globalCompositeOperation = 'lighter';
    // rings
    for (var i = rings.length - 1; i >= 0; i--) { var r = rings[i]; r.life -= dt; if (r.life <= 0) { rings.splice(i, 1); continue; }
      var p = 1 - r.life / r.max; ctx.globalAlpha = 1 - p; ctx.strokeStyle = r.c; ctx.lineWidth = r.w * (1 - p) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * easeOut(p), 0, Math.PI * 2); ctx.stroke(); }
    // particles
    for (i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.life -= dt; if (q.life <= 0) { if (q.onHit) q.onHit(); parts.splice(i, 1); continue; }
      var a = q.life / q.max;
      if (q.proj) { q.t += dt; var f = Math.min(1, q.t / q.dur), px = q.sx + (q.tx - q.sx) * f, py = q.sy + (q.ty - q.sy) * f - Math.sin(f * Math.PI) * 30 + (q.wob ? Math.sin(q.t * 30) * 6 : 0);
        glow(px, py, q.s * 2.6, q.cols[2] || q.cols[1], .55); glow(px, py, q.s * 1.4, q.cols[1], .9); glow(px, py, q.s * .6, q.cols[0], 1);
        for (var j = 0; j < 2; j++) P({x: px, y: py, vx: (Math.random() - .5) * 60, vy: (Math.random() - .5) * 60, s: q.s * .45, c: q.cols[j + 1] || q.cols[0], life: .3});
        continue; }
      if (q.arc) { var pr = 1 - a, a1 = q.sweep ? q.a0 + (q.a1 - q.a0) * Math.min(1, pr * 2.2) : q.a1;
        ctx.globalAlpha = a; ctx.lineCap = 'round';
        ctx.strokeStyle = q.c2; ctx.lineWidth = q.s * 2.2; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, q.a0, a1); ctx.stroke();
        ctx.strokeStyle = q.c; ctx.lineWidth = q.s; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, q.a0, a1); ctx.stroke(); continue; }
      if (q.circle) { ctx.globalAlpha = Math.min(1, a * 1.5); ctx.strokeStyle = q.c; ctx.lineWidth = 3; ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, .35); ctx.rotate(t * 2);
        ctx.beginPath(); ctx.arc(0, 0, q.r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); for (var m = 0; m < 6; m++) { var an = m * Math.PI / 3; ctx.lineTo(Math.cos(an) * q.r, Math.sin(an) * q.r); } ctx.closePath(); ctx.stroke(); ctx.restore(); continue; }
      q.vx *= q.drag; q.vy = q.vy * q.drag + q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      ctx.globalAlpha = a;
      if (q.cloud) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (1.4 - a * .4), 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; }
      else if (q.shard) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.c; ctx.beginPath(); ctx.moveTo(q.s * 2, 0); ctx.lineTo(0, q.s * .45); ctx.lineTo(-q.s, 0); ctx.lineTo(0, -q.s * .45); ctx.fill(); ctx.restore(); }
      else if (q.plus) { ctx.fillStyle = q.c; ctx.fillRect(q.x - q.s, q.y - q.s * .3, q.s * 2, q.s * .6); ctx.fillRect(q.x - q.s * .3, q.y - q.s, q.s * .6, q.s * 2); }
      else glow(q.x, q.y, q.s * (q.flame ? (0.6 + a) : 1), q.c, a);
    }
    // sprite-sheet anims
    for (i = anims.length - 1; i >= 0; i--) {
      var an2 = anims[i], s = an2.s, me = s.meta; an2.t += dt;
      var fr = Math.floor(an2.t * me.fps), x = an2.x, y = an2.y;
      if (an2.dur != null) { var ff = Math.min(1, an2.t / an2.dur); x = an2.x + (an2.tx - an2.x) * ff; y = an2.y + (an2.ty - an2.y) * ff; fr = fr % me.frames; if (ff >= 1) { anims.splice(i, 1); if (an2.done) an2.done(); continue; } }
      else if (fr >= me.frames) { anims.splice(i, 1); if (an2.done) an2.done(); continue; }
      var sw = me.frameW, sh = me.frameH, col = fr % s.cols, row = Math.floor(fr / s.cols), dw = sw * an2.scale, dh = sh * an2.scale;
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = me.blend === 'lighter' ? 'lighter' : 'source-over';
      ctx.save(); ctx.translate(x, y); if (an2.rot) ctx.rotate(an2.rot); ctx.drawImage(s.img, col * sw, row * sh, sw, sh, -dw / 2, -dh / 2, dw, dh); ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
    }
    // lightning
    for (i = bolts.length - 1; i >= 0; i--) { var b = bolts[i]; b.life -= dt; if (b.life <= 0) { bolts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, b.life / b.max * 1.6) * (Math.random() * .4 + .6);
      [[b.thin ? 6 : 14, 'rgba(120,180,255,.35)'], [b.thin ? 3 : 6, 'rgba(170,215,255,.8)'], [b.thin ? 1 : 2.5, b.c]].forEach(function(l){ ctx.strokeStyle = l[1]; ctx.lineWidth = l[0]; ctx.lineJoin = 'round'; ctx.beginPath(); b.pts.forEach(function(p, n){ n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); }); }
    // screen flash
    if (flashA > .01) { ctx.globalAlpha = flashA; ctx.fillStyle = flashC; ctx.fillRect(0, 0, W, H); flashA *= Math.pow(.004, dt); }
    // floating numbers
    ctx.globalCompositeOperation = 'source-over';
    for (i = texts.length - 1; i >= 0; i--) { var tx = texts[i]; tx.life -= dt; if (tx.life <= 0) { texts.splice(i, 1); continue; }
      tx.pop += dt; tx.y += tx.vy * dt; tx.vy *= .96; var sc = tx.pop < .12 ? 1 + (1 - tx.pop / .12) * .6 : 1, al = Math.min(1, tx.life / (tx.max * .4));
      ctx.globalAlpha = al; ctx.font = '900 ' + Math.round(tx.size * sc) + 'px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(4, tx.size / 6); ctx.strokeStyle = 'rgba(30,12,0,.9)'; ctx.strokeText(tx.str, tx.x, tx.y);
      if (tx.size >= 40) { var gr = ctx.createLinearGradient(0, tx.y - tx.size / 2, 0, tx.y + tx.size / 2); gr.addColorStop(0, '#fff7c2'); gr.addColorStop(.5, tx.c); gr.addColorStop(1, '#ff8a00'); ctx.fillStyle = gr; } else ctx.fillStyle = tx.c;
      ctx.fillText(tx.str, tx.x, tx.y); }
    ctx.globalAlpha = 1;
  }
  function glow(x, y, r, c, a){ if (r <= .5) return; ctx.globalAlpha = a; var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function easeOut(p){ return 1 - (1 - p) * (1 - p); }

  // demo/test helper: FX.demo('leidianshu')
  function demo(dir){ var s = centerOf(roleEl()), m = G.battle && G.battle.mons.filter(function(x){ return !x.dead; })[0], t = centerOf(monEl(m)); playSkill(dir, s, t, function(){ flashCard(monEl(m), 'crit'); text(t.x, t.y - 20, '暴击 -' + (500 + Math.floor(Math.random() * 500)), {c: '#ffd23f', size: 48, life: 1.4}); }); }
  return {registerHeji: registerHeji, heji: HEJI, hejiImpact: function(d){ return hejiImpact(sheets[d]); }, playAtk: playAtk, attach: attach, emit: emit, preload: preload, hookLog: hookLog, demo: demo, procedural: PROC, SKILL_DIR: SKILL_DIR, _sheets: sheets,
    stats: function(){ return {parts: parts.length, anims: anims.length, texts: texts.length}; }};
})();
