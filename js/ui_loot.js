// [loot] 装备系统 UI 包装 (不改 ui.js): tipEquip 增加 暗金/套装/对比/加锁/分解; 背包格 锁图标/升级箭头; role_bag 增加 "分" 按钮 → 原版 role_setup 自动分解设置
(function(){
  if (!window.Systems || !Systems.loot) return;
  var L = Systems.loot, UQC = '#C8A040', SETC = '#32C63D', GRAY = '#8a8070';
  function cloneNode(n, parent){ return new CC.Node(JSON.parse(JSON.stringify(n.d)), parent); }
  function line(p, t, col){ var tpl = p.ref('itemAttr'), n = new CC.Node(tpl.d, null); n.active = true; n.setString(t); if (col) n.setColor(col); p.ref('attrRoot').addChild(n); return n; }
  function bonusText(b){ return Object.keys(b).map(function(k){ return (L.ANAME[k] || k) + '+' + b[k]; }).join(' '); }

  // 图标缺失兜底: item.txt 里部分装备 (原版就没有图, 如 雷霆/烈焰/光芒 靴腰带护腕, 镇天/玄天/倚天剑) 用部位剪影图代替, 不显示空格
  var ICON_OK = {}, PART_IMG = {5: 'weapon', 10: 'clothes', 15: 'helmet', 20: 'neckless', 22: 'ring', 23: 'ring', 24: 'bracelet', 25: 'bracelet', 62: 'shoes', 64: 'belt'};
  function iconFallback(node, c){ if (!node || !c || !c.icon) return; var url = IMG + 'icon/' + c.icon + '.png', st = ICON_OK[url];
    var apply = function(){ if (!PART_IMG[c.stdmode]) return; node.setImage(IMG + 'main/img_equip_' + PART_IMG[c.stdmode] + '.png'); node.el.style.opacity = .85; node.el.dataset.iconFallback = c.icon; };
    if (typeof ICON_LIST != 'undefined') return iconHas(c.icon) ? undefined : apply(); // 有清单: 同步判断, 不发探测请求
    if (st === false) return apply(); if (st === true) return;
    if (!st) { st = ICON_OK[url] = new Promise(function(res){ var im = new Image(); im.onload = function(){ ICON_OK[url] = true; res(true); }; im.onerror = function(){ ICON_OK[url] = false; res(false); }; im.src = url; }); }
    st.then(function(ok){ if (!ok) apply(); }); }
  L.iconFallback = iconFallback;

  var _ms = makeStuff;
  makeStuff = function(s, opts){
    var it = _ms(s, opts); if (!s || !G.role) return it;
    var c = stuffCfg(s); if (!c || c.type != 2) return it;
    iconFallback(it.ref('iconEquip'), c);
    if (s.lock) it.ref('lockIcon').setActive(true);
    var lab = it.ref('labName');
    if (s.uq) { lab.setColor(UQC); lab.el.style.textShadow = '0 0 5px #ff9a00'; }
    else if (s.set) lab.el.style.textShadow = '0 0 4px ' + SETC;
    if ((!opts || (opts.slot == null && opts.click !== false)) && G.role.bag.indexOf(s) != -1 && G.role.level >= c.needlevel) {
      var cp = L.compare(s.uid); if (cp && cp.power.delta > 0) it.ref('upcombat').setActive(true);
    }
    return it;
  };

  var _te = tipEquip;
  tipEquip = function(s, opts){
    _te(s, opts);
    var p = UI.popups[UI.popups.length - 1], c = stuffCfg(s), equipped = opts && opts.slot, r = G.role; if (!p) return;
    if (s.uq) { p.ref('labName').setString('★' + c.name + (s.ench ? ' +' + s.ench : '')); p.ref('labName').setColor(UQC); p.ref('labQuality').setString('暗金'); p.ref('labQuality').setColor(UQC); }
    else if (s.set) { p.ref('labQuality').setString('套装'); p.ref('labQuality').setColor(SETC); }
    var setKey = L.SET_OF[s.id];
    if (setKey) { var z = L.SETS[setKey], n = L.setCounts(r.equip)[setKey] || 0;
      line(p, '【' + z.name + '套装】 (' + n + '/' + z.ids.length + ')', SETC);
      line(p, z.ids.map(function(id){ var on = Object.keys(r.equip).some(function(k){ return r.equip[k] && r.equip[k].id == id; }); return (on ? '●' : '○') + cfg('item', id).name.replace(z.name, ''); }).join(' '), GRAY);
      [2, 3, 5].forEach(function(k){ if (z.bonus[k]) line(p, k + '件：' + bonusText(z.bonus[k]), n >= k ? SETC : GRAY); });
    }
    if (!equipped && r.bag.indexOf(s) != -1) { var cp = L.compare(s.uid);
      if (cp) { line(p, '—— 对比' + (cp.equipped ? '已装备 ' + stuffCfg(cp.equipped).name : '空位') + ' ——', '#DCD3C7');
        line(p, '战斗力 ' + (cp.power.delta >= 0 ? '+' : '') + cp.power.delta, cp.power.delta >= 0 ? SETC : '#d62f2f');
        cp.rows.filter(function(x){ return x.delta; }).slice(0, 5).forEach(function(x){ line(p, x.label + ' ' + (x.delta > 0 ? '+' : '') + x.delta, x.delta > 0 ? SETC : '#d62f2f'); }); }
    }
    p.ref('attrRoot').layout();
    // 原版 btnLock = 加锁; 回收改为 分解(精华), 放在克隆按钮上
    var nodes = p.ref('btnNodes'), lk = p.ref('btnLock');
    if (r.bag.indexOf(s) != -1) {
      lk.setActive(true); lk.find('label').setString(s.lock ? '解锁' : '加锁');
      lk.on(function(){ msg(Systems.bag.toggleLock(s.uid)); closePopup(p); tipEquip(s, opts); });
      var sv = cloneNode(lk, null); sv.name = 'btnSalvage'; sv.find('label').setString('分解'); nodes.addChild(sv);
      sv.on(function(){ closePopup(p); msg(L.salvage(s.uid)); });
      nodes.d.ly.sx = 16; nodes.layout();
    }
    fitTip(p);
  };

  // 词条变多时 tipEquip 原版固定高度会溢出: 按 attrRoot 实际高度下移描述/按钮并拉长底板 (节点结构不变)
  function fitTip(p){ var ar = p.ref('attrRoot'); ar.layout(); var y = 72 - ar.h - 14;
    var dsc = p.ref('equipDesc'), dn = dsc && dsc.parent; if (dn && dn.active && dsc.el.textContent && dsc.el.textContent !== 'label') { dn.y = y; dn.place(); y -= 60; }
    var bn = p.ref('btnNodes'); bn.y = Math.min(-40, y - 34); bn.place();
    var rm = p.ref('btnRemake'); rm.x = 240; rm.y = 40; rm.place();
    var bg = p.findDeep('img_bg_tipbase'); bg.h = Math.max(440, 336 - (bn.y - 27 - 24)); bg.place();
    var ui = p.findDeep('uiRoot'), extra = bg.h - 440; ui.y = 92 + extra / 2; ui.place();
    // 套装+对比行多时底板会顶出舞台上沿 (标题被裁): 按实际位置下移, 保持在舞台内 (留 12 设计像素)
    try { var st = (UI.stage && UI.stage.el || document.getElementById('stage')).getBoundingClientRect(), k = st.height / 1334, br = bg.el.getBoundingClientRect();
      if (k > 0) { var over = (st.top + 12 * k) - br.top; if (over > 0) { ui.y -= Math.min(over, Math.max(0, st.bottom - 12 * k - br.bottom)) / k; ui.place(); } } } catch (e) {} }

  // ---------- 背包: 自动整理 + 分解设置入口 ----------
  var _db = drawBag;
  drawBag = function(b){
    _db(b);
    b.ref('btnSort').on(function(){ msg(Systems.bag.sort()); if (L.cfg().autoSort) {} refreshAll(); });
    var lab = b.ref('lab_bag'); lab.setString(lab.el.textContent + '  精华 ' + (G.role.essence || 0));
    if (!b._salv) { var sb = cloneNode(b.ref('btnSort'), b.ref('btnSort').parent); sb.noWidget = true; sb.x = -40; sb.place(); sb.find('name').setString('分'); sb.on(function(){ tipSalvage(); }); b._salv = sb; }
  };

  // ---------- 原版 role_setup "回收设置" → 自动分解规则 ----------
  window.tipSalvage = function(){
    var p = popup('role_setup'), cf = L.cfg();
    closeBtn(p, p.ref('btnClose'));
    var note = p.findDeep('img_bg1').find('label'); if (note) note.setString('※分解得精华(5精华=1洗练石)，锁定/套装/暗金保留  精华 ' + (G.role.essence || 0));
    var map = {noProfession: ['offProf'], eNonsuch: ['keepNonsuch', true], eWhite: [1], eGreen: [2], eBule: [3], ePurple: [4]};
    Object.keys(map).forEach(function(ref){ var t = p.ref(ref); if (!t) return; var k = map[ref][0], inv = map[ref][1];
      t.children.forEach(function(ch){ if (ch.lb && ch.el.textContent === '自动回收') ch.setString('自动分解'); });
      var get = function(){ var v = typeof k === 'number' ? cf.auto[k] : cf[k]; return inv ? !v : !!v; };
      var cm = t.find('checkmark'); cm.setActive(get());
      t.on(function(){ var v = !get(); if (typeof k === 'number') cf.auto[k] = v; else cf[k] = inv ? !v : v; cm.setActive(get()); });
    });
    var life = p.ref('lifeRevert'); if (life) { var lc = life.find('checkmark'); lc.setActive(!!G.settings.autoDrug); life.on(function(){ G.settings.autoDrug = !G.settings.autoDrug; lc.setActive(G.settings.autoDrug); }); }
    var bs = p.findDeep('btnSave');
    if (bs) { bs.on(function(){ save(); closePopup(p); msg('OK:设置已保存'); });
      var all = cloneNode(bs, bs.parent); all.x = bs.x + 220; all.place(); all.find('label').setString('一键分解'); all.on(function(){ save(); closePopup(p); msg(L.salvageAll()); });
      bs.x -= 120; bs.place(); all.x = bs.x + 240; all.place(); }
  };
  // 开发入口: ?eq=tip|set|salvage|bag 用于截图
  var q = /[?&]eq=(\w+)/.exec(location.search);
  if (q) var iv = setInterval(function(){ if (!G.role || !UI.main) return; clearInterval(iv); var r = G.role; r.level = Math.max(r.level, 60);
    var mk = function(id, qq){ var s = createStuff(id, 1, qq); L.finalize(s); addItem(s); return s; };
    var a = mk(105034, 5), st = [110013, 115011, 120019, 122020].map(function(id){ return mk(id, 4); }); mk(105022, 5); mk(105005, 1); mk(110002, 3); mk(124019, 4);
    if (r.prof == 1) st.slice(0, 3).forEach(function(s){ equipItem(s.uid); });
    a.lock = true;
    if (q[1] == 'tip') tipEquip(a, {}); else if (q[1] == 'set') tipEquip(st[3], {}); else if (q[1] == 'salvage') tipSalvage();
    else if (q[1] == 'beam') { var k = 0; setInterval(function(){ var ms = (G.battle && G.battle.mons || []).filter(function(m){ return !m.dead; }); if (!ms.length) return;
        var d = [[3, '[蓝]轻型盔甲'], [4, '圣战宝甲', 1], [5, '屠龙', 0, 1]][k % 3]; FXE('drop', {m: ms[k % ms.length], q: d[0], name: d[1], set: !!d[2], uq: !!d[3]}); k++; }, 350); }
    else if (q[1] == 'bag') { UI.tab = 'role'; UI.roleTab = 'bag'; if (typeof refreshAll == 'function') refreshAll(); }
  }, 200);
})();
