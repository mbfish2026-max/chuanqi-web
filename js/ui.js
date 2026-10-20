// UI layer: original Cocos prefabs (ui/prefabs.js) rendered by js/cc.js, wired to the game logic in js/game.js.
// Node / property names follow the original scripts (Main.js, MainFight.js, MapBattle.js, MainRole.js, RoleBag.js ...).
var IMG = 'assets/images/';
var UI = {stage: null, main: null, fight: null, page: null, pageKey: 'fight', battle: null, popups: [], logShown: 0};
var PROF_NAME = ['', '战士', '法师', '道士'];
var QCOLOR = ['#DCD3C7', '#DCD3C7', '#32C63D', '#2E8DD6', '#D425D2', '#D96324'];
function inst(name){ return CC.instantiate(name); }
function sys(name){ return window.Systems && window.Systems[name]; }
function fmtNum(n){ n = Math.floor(n); return n >= 1e8 ? (n / 1e8).toFixed(2) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(2) + '万' : String(n); }
function setLab(node, s){ if (node) node.setString(s); }
function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]; }); }

// ---------- toast (tipToast prefab) ----------
function toast(s){
  if (!UI.stage) return;
  var t = inst('tipToast'), lab = t.find('label');
  lab.el.innerHTML = esc(s); lab.setColor('#ffffff');
  CC.mount(t, UI.layerTop); t.setPos(375, 667 + 100);
  t.el.style.transition = 'transform 1.2s, opacity 1.2s';
  // width follows the text (Layout resize container)
  setTimeout(function(){ var w = lab.el.offsetWidth + 60; t.setSize(w, 40); lab.setPos(0, 3); }, 0);
  setTimeout(function(){ t.el.style.opacity = '0'; t.el.style.transform = 'translateY(-80px)'; }, 900);
  setTimeout(function(){ t.destroy(); }, 2200);
}
function msg(res){ if (!res) return; toast(res.indexOf('OK') === 0 ? (res.slice(3) || '成功') : res); save(); refreshAll(); }

// ---------- popups ----------
function popup(name){
  var p = inst(name); CC.mount(p, UI.layerPop); UI.popups.push(p);
  var m = p.find('mask'); if (m) { m.el.style.background = 'rgba(0,0,0,.55)'; if (m.d.bt) m.on(function(){ closePopup(p); }); }
  return p;
}
function closePopup(p){ p.destroy(); UI.popups.splice(UI.popups.indexOf(p), 1); }
function closeBtn(p, path){ var b = typeof path === 'string' ? p.findDeep(path) : path; if (b) b.on(function(){ closePopup(p); }); }

// ---------- itemStuff ----------
function makeStuff(s, opts){
  opts = opts || {};
  var it = inst('itemStuff'), c = s ? stuffCfg(s) : null;
  var q = s ? (c.type == 2 ? s.q : (c.quality || 1)) : 0;
  it.ref('qualitybg').setImage(IMG + 'main/img_quality_item_' + Math.min(5, q) + '.png');
  var weapon = it.ref('weaponNode'), props = it.ref('propsNode');
  it.ref('upcombat').setActive(false); it.ref('lockIcon').setActive(false); it.ref('nonsuch').setActive(false); it.ref('intensifyKuang').setActive(false);
  var lab = it.ref('labName');
  if (!s) {
    props.setActive(false); weapon.setActive(true);
    if (opts.part) { it.ref('iconEquip').setImage(IMG + 'main/img_equip_' + opts.part + '.png'); it.ref('iconEquip').el.style.opacity = .6; }
    it.ref('intensify').setActive(false); lab.setString(opts.label || ''); lab.setColor('#9a8f7a');
    return it;
  }
  var isEq = c.type == 2;
  weapon.setActive(isEq); props.setActive(!isEq);
  (isEq ? it.ref('iconEquip') : it.ref('iconProp')).setImage(IMG + 'icon/' + c.icon + '.png');
  it.ref('labCnt').setString(s.count > 1 ? 'x' + s.count : '');
  it.ref('intensify').setActive(!!s.ench); it.ref('intensify').setString('+' + s.ench);
  lab.setString(c.name); lab.setColor(QCOLOR[q]);
  if (isEq && s.nonsuch) { lab.setString(c.name); lab.el.style.textShadow = '0 0 4px #D96324'; }
  if (opts.click !== false) it.on(function(){ (opts.click || stuffTip)(s, opts); });
  return it;
}
function stuffTip(s, opts){ var c = stuffCfg(s); if (c.type == 2) tipEquip(s, opts); else tipProps(s); }

// ---------- tipEquip ----------
var PART_NAME = PARTS;
function tipEquip(s, opts){
  var p = popup('tipEquip'), c = stuffCfg(s), equipped = opts && opts.slot;
  closeBtn(p, p.ref('btnClose'));
  p.ref('labName').setString(c.name + (s.ench ? ' +' + s.ench : '')); p.ref('labName').setColor(QCOLOR[s.q]);
  var holder = p.ref('item'); holder.addChild(makeStuff(s, {click: false}));
  var cp = Math.ceil((s.attr.hp + s.attr.mp) * 0.1 + ((s.attr.maxzs + s.attr.minzs + s.attr.maxfs + s.attr.minfs + s.attr.maxds + s.attr.minds) / 2) * 12 + ((s.attr.maxac + s.attr.minac) / 2) * 12);
  p.ref('labPower').setString('战斗力：' + cp);
  p.ref('labType').setString(PART_NAME[c.stdmode] || '装备');
  var r = G.role; p.ref('labClaim').setString(c.needlevel + '级'); p.ref('labClaim').setColor(r.level >= c.needlevel ? '#32C63D' : '#d62f2f');
  p.ref('labProfession').setString(c.profession ? PROF_NAME[c.profession] : '通用');
  p.ref('labQuality').setString(QNAME[s.q]); p.ref('labQuality').setColor(QCOLOR[s.q]);
  p.ref('labNonsuch').setString(s.nonsuch ? '+' + s.nonsuch : '无'); p.ref('labNonsuch').setColor(s.nonsuch ? '#D96324' : '#DCD3C7');
  var root = p.ref('attrRoot'), tpl = p.ref('itemAttr'), e = s.attr, lines = [];
  if (e.hp) lines.push('生命：+' + e.hp); if (e.mp) lines.push('魔法：+' + e.mp);
  [['zs', '攻击'], ['fs', '魔法'], ['ds', '道术'], ['ac', '防御']].forEach(function(k){ if (e['max' + k[0]]) lines.push(k[1] + '：' + e['min' + k[0]] + '-' + e['max' + k[0]]); });
  lines.forEach(function(t){ var n = new CC.Node(tpl.d, null); n.active = true; n.setString(t); root.addChild(n); });
  if (c.descr) { var d = p.ref('equipDesc'); d.setString(c.descr); if (d.parent) d.parent.setActive(true); }
  p.ref('btnLock').setActive(false);
  var canRemake = sys('equip') && s.q >= 2;
  p.ref('btnRemake').setActive(!!canRemake);
  if (canRemake) p.ref('btnRemake').on(function(){ closePopup(p); tipRemake(s); });
  if (sys('equip')) sys('equip').affixes(s.uid).forEach(function(a){ var n = new CC.Node(tpl.d, null); n.active = true; n.setString(a.text); n.setColor(QCOLOR[a.quality] || '#2E8DD6'); root.addChild(n); });
  p.ref('btnWear').setActive(!equipped); p.ref('btnUnfix').setActive(!!equipped);
  p.ref('btnWear').on(function(){ closePopup(p); msg(equipItem(s.uid) === 'OK' ? 'OK:装备成功' : equipItem(s.uid)); });
  p.ref('btnUnfix').on(function(){ closePopup(p); unequip(equipped); msg('OK:已卸下'); });
  if (!equipped) { // 原版有回收(铁匠/回收NPC); 这里在穿戴旁提供出售
    var sell = p.ref('btnLock'); sell.setActive(true); sell.find('label').setString('出售'); sell.find('label').setString(sys('fenjie') ? '回收' : '出售'); sell.on(function(){ closePopup(p); if (sys('fenjie')) msg(sys('fenjie').recycle(s.uid)); else { sellItem(s.uid); msg('OK:出售获得 ' + (c.sellprice || 0) + ' 金币'); } });
  }
}
// ---------- tipProps ----------
function tipProps(s){
  var p = popup('tipProps'), c = stuffCfg(s);
  closeBtn(p, p.ref('btnClose'));
  p.ref('item').addChild(makeStuff(s, {click: false}));
  p.ref('desc').setString(c.name + '\n' + (c.descr || ''));
  p.ref('desc').setColor(QCOLOR[c.quality || 1]);
  p.ref('count').setString(String(s.count));
  var use = p.ref('btnUsed'); use.on(function(){ closePopup(p); msg(useItem(s.uid)); });
  var dec = p.ref('btnDecompound'), fuse = p.ref('btnFuse');
  var decompose = sys('fenjie') && function(uid){ return sys('fenjie').decompose(uid, 1); }; dec.find('label').setString(decompose ? '分解' : '出售');
  dec.on(function(){ closePopup(p); if (decompose) { msg(decompose(s.uid) || 'OK'); } else { sellItem(s.uid); msg('OK:已出售'); } });
  var fuseFn = sys('fuse') && function(){ tipFuse(stuffCfg(s).stdmode == 0 ? 2 : 1); }; fuse.setDisabled(!fuseFn); if (!fuseFn) fuse.el.style.filter = 'grayscale(1)';
  fuse.on(function(){ closePopup(p); fuseFn(s); refreshAll(); });
}

// ---------- Main (main.prefab) ----------
var NAV = [['btnFight', 'battle', 'fight'], ['btnRole', 'role', 'main_role'], ['btnSkill', 'skill', 'role_skill'], ['btnStory', 'lilian', 'main_story'], ['btnMap', 'map', 'main_map'], ['btnFuli', 'fuli', 'main_fuli']];
function buildMain(){
  var m = UI.main = inst('main'); CC.mount(m, UI.layerMain);
  m.ref('lockNode').setActive(false); m.ref('sign').setActive(false);
  m.ref('imgRecharge').setActive(false);
  NAV.forEach(function(n){ m.ref(n[0]).on(function(){ showPage(n[2]); }); });
  UI.fight = inst('main_fight'); m.ref('fightRoot').addChild(UI.fight);
  initFight();
  showPage('fight');
}
function showPage(key){
  var m = UI.main; UI.pageKey = key;
  NAV.forEach(function(n){ var b = m.ref(n[0]), on = n[2] === key; b.find('select').setActive(on); b.find('icon').setImage(IMG + 'main/btn_op_' + n[1] + '_' + (on ? 0 : 1) + '.png'); });
  var fr = m.ref('fightRoot'), sr = m.ref('showRoot');
  if (UI.page) { UI.page.destroy(); UI.page = null; }
  fr.setActive(key === 'fight'); sr.setActive(key !== 'fight');
  if (key !== 'fight') { UI.page = inst(key); sr.addChild(UI.page); (PAGES[key] || function(){})(UI.page); }
  refreshAll();
}
function refreshTop(){
  var m = UI.main, r = G.role, a = calcAttr();
  m.ref('labName').setString(r.name); m.ref('labLevel').setString(r.level + '级');
  m.ref('labCombat').setString('战力：' + combatPower(a));
  m.ref('labCoin').setString(fmtNum(r.gold)); m.ref('labYuanbao').setString(fmtNum(r.yuanbao));
  var need = expNeed(r.level); m.ref('labExp').setString(Math.floor(r.exp) + '/' + need); m.ref('expbar').setProgress(r.exp / need);
  m.ref('hpBar').setFill(r.hp / a.maxhp); m.ref('mpBar').setFill(r.mp / a.maxmp);
}

// ---------- main_fight ----------
var LINK_PARTS;
function initFight(){
  var f = UI.fight;
  f.ref('btnGM').setActive(false);
  f.ref('btnMap').on(function(){ showPage('main_map'); });
  f.ref('btnMapDesc').on(function(){ tipMapDesc(mapCfg()); });
  f.ref('btnSetup').on(function(){ G.settings.autoDrug = !G.settings.autoDrug; save(); toast('自动吃药：' + (G.settings.autoDrug ? '开启' : '关闭')); });
  f.ref('btnBoss').on(function(){ var b = f.ref('bossNode'); b.setActive(!b.active); if (b.active) fillBoss(); });
  f.ref('btnCloseBoss').on(function(){ f.ref('bossNode').setActive(false); });
  // the 9 itemMap cells live under mapNode/mapLayout in the prefab
  UI.mapCells = f.findDeep('mapLayout').children;
  UI.mapCells.forEach(function(cell, i){ cell.find('root').on(function(){ var id = mapCfg().jiugongge[i]; if (id > 1) { var t = cfg('map', id); if (combatPower() < (t.limitpower || 0)) return toast('战力不足 ' + t.limitpower); enterMap(id); } }); });
  UI.battleHolder = new CC.Node({n: 'battleHolder', x: 0, y: 0, w: 750, h: 731, ax: .5, ay: .5}, null);
  f.ref('showRoot').addChild(UI.battleHolder);
}
function updateSmallMap(){
  var m = mapCfg(), u = m.jiugongge, f = UI.fight;
  UI.mapCells.forEach(function(cell, i){
    var id = u[i], root = cell.find('root'), lab = root.find('labDesc');
    if (!id) { root.setActive(false); return; }
    root.setActive(true);
    var t = id === 1 ? m : cfg('map', id); lab.setString(t ? t.name : '');
    lab.setFontSize(id === 1 ? 27 : 23); root.setImage(IMG + 'basics/' + (id === 1 ? 'img_map_select' : 'img_map_normal') + '.png');
  });
  var H = f.ref('line_horizontal'), V = f.ref('line_vertical');
  H.children.concat(V.children).forEach(function(c){ c.setActive(false); });
  function on(p, n){ p.find(n).setActive(true); }
  if (u[0]) { on(H, 'img_link1_1'); on(H, 'img_link1_1_1'); if (u[1]) on(H, 'img_link1'); }
  if (u[1]) { on(V, 'img_link1'); if (u[2]) on(H, 'img_link2'); }
  if (u[2]) { on(H, 'img_link1_2'); on(H, 'img_link1_2_1'); }
  if (u[3]) on(H, 'img_link3'); if (u[5]) on(H, 'img_link4');
  if (u[6]) { on(H, 'img_link1_1'); on(H, 'img_link1_1_2'); if (u[7]) on(H, 'img_link5'); }
  if (u[7]) { on(V, 'img_link2'); if (u[8]) on(H, 'img_link6'); }
  if (u[8]) { on(H, 'img_link1_2'); on(H, 'img_link1_2_2'); }
}
function tipMapDesc(m){
  var p = popup('tipMapDesc'), info = CFG.map_info.list.filter(function(x){ return x.mapid == m.id; })[0];
  p.ref('labName').setString(m.name); p.ref('labLv').setString(m.level || (info && info.level) || '-');
  p.ref('labCombat').setString(String(m.limitpower || 0));
  var names = []; (m.monster || []).forEach(function(id){ var c = cfg('monster', id); if (c && names.indexOf(c.name) < 0) names.push(c.name); });
  p.ref('labMonsters').setString(m.type == 2 ? names.join('、') : '无');
  p.ref('labDrops').setString([m.dropdesc1, m.dropdesc2, m.dropdesc3].filter(Boolean).join('\n') || '无');
}
function fillBoss(){
  var content = UI.fight.findDeep('bossInfo').find('view/content'); content.removeAllChildren();
  CFG.map.list.filter(function(m){ return m.boss > 1000; }).forEach(function(m){
    var b = inst('bossInfo'), c = cfg('monster', m.boss); if (!c) return;
    var t = G.role.stat['boss_' + m.boss] || 0, ready = Date.now() >= t;
    b.ref('labName').setString(c.name); b.ref('labMap').setString(m.name);
    b.ref('labRefresh').setString(ready ? '已刷新' : Math.ceil((t - Date.now()) / 60000) + '分钟'); b.ref('labRefresh').setColor(ready ? '#32C63D' : '#d62f2f');
    b.ref('labPower').setString(String(m.limitpower || 0));
    b.ref('btnConvey').on(function(){ if (combatPower() < (m.limitpower || 0)) return toast('战力不足'); UI.fight.ref('bossNode').setActive(false); enterMap(m.id); });
    content.addChild(b);
  });
}
// sysMsg list (MainFight.sysMsgNode)
function refreshLog(){
  var view = UI.fight.findDeep('sysMsg').find('view'), content = view.find('content');
  if (UI.logShown === G.logs.length && UI.logLast === G.logs[G.logs.length - 1]) return;
  content.removeAllChildren();
  G.logs.slice(-30).forEach(function(s){ var it = inst('sysMsg'), lab = it.ref('labMsg'); lab.lbW = 700; lab.el.style.whiteSpace = 'normal'; lab.el.style.fontSize = '22px'; lab.el.style.lineHeight = '28px'; lab.el.innerHTML = s; lab.place(); content.addChild(it); });
  UI.logShown = G.logs.length; UI.logLast = G.logs[G.logs.length - 1];
  view.el.scrollTop = 1e6;
}

// ---------- map scene (map_battle / map_neutrally) ----------
var MON_CELLS = [1, 3, 5, 8, 10, 13, 15, 17, 20, 22, 7, 11];
var ROLE_CELL = 26;
function buildScene(){
  var m = mapCfg(); UI.battleHolder.removeAllChildren(); UI.sceneMap = m.id; UI.cells = null;
  updateSmallMap();
  if (m.type == 2) {
    var b = UI.battle = inst('map_battle'); UI.battleHolder.addChild(b);
    b.ref('mapName').setString(m.name.split('').join('\n'));
    b.ref('mapName').el.style.whiteSpace = 'pre'; b.ref('mapName').lbW = null;
    var grid = b.ref('battleNode'); UI.cells = [];
    for (var i = 0; i < 30; i++) { var cell = new CC.Node({n: 'grid' + i, x: 0, y: 0, w: 120, h: 125, ax: .5, ay: .5}, null); grid.addChild(cell, true); UI.cells.push(cell); }
    grid.layout();
    UI.roleItem = inst('itemRole'); UI.roleItem.ref('monsterRoot').setActive(false); UI.cells[G.battle && G.battle.roleIdx != null ? G.battle.roleIdx : ROLE_CELL].addChild(UI.roleItem); UI.roleItem._cell = G.battle && G.battle.roleIdx;
    UI.roleItem.ref('roleSign').setImage(IMG + 'role_create/icon_avatar_' + G.role.prof + '_0.png');
    UI.roleItem.ref('roleSign').el.style.backgroundSize = 'contain';
    UI.monItems = [];
    UI.petItems = [];
    if (typeof FX !== 'undefined') FX.attach(UI.battleHolder);
    b.ref('labBossMapName').setString('[' + m.name + ']');
    b.ref('bossInfo').setActive(m.boss > 1000);
    b.ref('labRelive').setActive(false);
  } else {
    UI.battle = null;
    var n = inst('map_neutrally'); UI.battleHolder.addChild(n);
    n.ref('mapName').setString(m.name); n.ref('mapIntroduce').setString(m.introduce || '');
    var roles = n.ref('roleNode');
    (m.monster || []).forEach(function(id){
      var c = cfg('monster', id); if (!c) return;
      var it = inst('itemNpc');
      var icon = /药/.test(c.name) ? 'img_main_drugstore' : /铁/.test(c.name) ? 'img_main_blacksmith' : /书/.test(c.name) ? 'img_main_bookstore' : 'img_main_reclaim';
      it.ref('icon').setImage(IMG + 'main/' + icon + '.png'); it.ref('labName').setString(c.name);
      it.ref('icon').on(function(){ if (icon === 'img_main_blacksmith' && sys('smith')) tipBlacksmith(); else openStore(id, icon); });
      roles.addChild(it);
    });
  }
}
function refreshScene(){
  if (UI.sceneMap !== G.role.mapId || (mapCfg().type == 2) !== !!UI.battle) buildScene();
  if (!UI.battle || !G.battle) return;
  var r = G.role, a = calcAttr(), ri = UI.roleItem;
  ri.ref('roleName').setString(r.name); ri.ref('roleLevel').setString('Lv.' + r.level);
  ri.ref('roleHpBar').setProgress(r.hp / a.maxhp); ri.ref('roleTipHp').setString(Math.floor(r.hp) + '/' + a.maxhp);
  ri.ref('roleMpBar').setProgress(r.mp / a.maxmp); ri.ref('roleTipMp').setString(Math.floor(r.mp) + '/' + a.maxmp);
  var mons = G.battle.mons;
  mons.forEach(function(x, i){
    var it = UI.monItems[i];
    if (!it || it._mon !== x.cfg.id + ':' + x.q + ':' + (x.boss ? 1 : 0)) {
      if (it) it.destroy();
      it = UI.monItems[i] = inst('itemRole'); it._mon = x.cfg.id + ':' + x.q + ':' + (x.boss ? 1 : 0);
      it.ref('roleRoot').setActive(false); it.ref('monsterRoot').setActive(true);
      it.ref('monsterBg').setImage(IMG + 'main/img_quality_' + x.q + '.png');
      it.ref('monsterIcon').setImage(IMG + 'monster/' + x.cfg.model + '.png'); it.ref('monsterIcon_normal').setActive(false);
      var mn = it.ref('monsterRoot').find('name'); mn.setString((x.boss ? '[BOSS]' : '') + x.cfg.name); mn.setColor(QCOLOR[x.q]); mn.el.classList.add('fx-mon-name');
      it.ref('monsterLevel').setString('Lv.' + x.cfg.lvl);
      UI.cells[x.idx != null ? x.idx : MON_CELLS[i % MON_CELLS.length]].addChild(it); it._cell = x.idx;
    }
    it.setActive(!x.dead);
    it.ref('monsterHpBar').setProgress(x.hp / x.maxhp); it.ref('monsterTipHp').setString(Math.max(0, Math.ceil(x.hp)) + '/' + x.maxhp);
  });
  drawPets(); syncPositions();
  for (var j = mons.length; j < UI.monItems.length; j++) if (UI.monItems[j]) { UI.monItems[j].destroy(); UI.monItems[j] = null; }
  var boss = mons.filter(function(x){ return x.boss; })[0], bi = UI.battle.ref('bossInfo');
  if (bi.active) { var hp = UI.battle.ref('bossHP'); if (boss) { hp.setProgress(boss.hp / boss.maxhp); } else { var t = (r.stat['boss_' + mapCfg().boss] || 0) - Date.now(); hp.setProgress(0); var lt = hp.find('labtime'); if (lt) lt.setString(t > 0 ? Math.ceil(t / 1000) + '秒后刷新' : ''); } }
}

// ---------- 走位: cards follow MOVE indices with a 0.2s tween (ActionTool.MoveBy .2) ----------
function moveCard(it, idx){
  if (!it || idx == null || !UI.cells || !UI.cells[idx] || it._cell === idx) return;
  var from = it.el.getBoundingClientRect(); UI.cells[idx].addChild(it, true); it._cell = idx;
  var to = it.el.getBoundingClientRect(), k = 750 / (UI.stage && UI.stage.el ? UI.stage.el.getBoundingClientRect().width || 750 : 750);
  if (from.width && to.width && it.el.animate) it.el.animate([{translate: ((from.left - to.left) * k) + 'px ' + ((from.top - to.top) * k) + 'px'}, {translate: '0px 0px'}], {duration: 200, easing: 'ease-out'});
}
function syncPositions(){
  var b = G.battle; if (!UI.battle || !b || typeof MOVE === 'undefined') return;
  MOVE.ensure(b); moveCard(UI.roleItem, b.roleIdx);
  b.mons.forEach(function(x, i){ if (!x.dead) moveCard(UI.monItems[i], x.idx); });
  (UI.petItems || []).forEach(function(it){ if (it._pet && it._pet.hp > 0) moveCard(it, it._pet.idx); });
}
function drawPets(){
  var b = G.battle, pets = ((b && b._pets) || []).filter(function(p){ return p.hp > 0; }); UI.petItems = UI.petItems || [];
  UI.petItems = UI.petItems.filter(function(it){ if (pets.indexOf(it._pet) < 0) { it.destroy(); return false; } return true; });
  pets.forEach(function(p){
    var it = UI.petItems.filter(function(x){ return x._pet === p; })[0];
    if (!it) { if (typeof MOVE !== 'undefined') MOVE.ensure(b); if (p.idx == null || !UI.cells) return;
      it = inst('itemRole'); it._pet = p; UI.petItems.push(it);
      it.ref('roleRoot').setActive(false); it.ref('monsterRoot').setActive(true);
      it.ref('monsterBg').setImage(IMG + 'main/img_quality_role.png');
      it.ref('monsterIcon').setImage(IMG + 'monster/' + p.cfg.model + '.png'); it.ref('monsterIcon_normal').setActive(false);
      var mn = it.ref('monsterRoot').find('name'); mn.setString(p.name); mn.setColor('#5BE36B'); mn.el.classList.add('fx-mon-name');
      it.ref('monsterLevel').setString('宝宝'); UI.cells[p.idx].addChild(it); it._cell = p.idx; }
    it.ref('monsterHpBar').setProgress(p.hp / p.maxhp); it.ref('monsterTipHp').setString(Math.ceil(p.hp) + '/' + p.maxhp);
  });
}
setInterval(function(){ if (UI.pageKey === 'fight') { try { drawPets(); syncPositions(); } catch (e) {} } }, 100);

// ---------- tipStore (NPC shop) ----------
function openStore(nid, icon){
  var p = popup('tipStore'), c = cfg('monster', nid), rows = CFG.shop.list.filter(function(x){ return x.id == nid && x.items; });
  closeBtn(p, 'img_close');
  p.ref('icon').setImage(IMG + 'main/' + icon + '.png');
  var isShop = rows.length > 0;
  p.ref('drugs').setActive(isShop); p.ref('reclaims').setActive(!isShop);
  if (isShop) {
    p.ref('tipDesc').setString(c.name + '：补给品和药品种类繁多，价格公道。');
    var t = p.ref('drugs').find('txt_drugstore'); if (t && /书/.test(c.name)) t.setImage(IMG + 'main/txt_drugstore.png');
    var content = p.ref('waresNode').find('view/content');
    rows.forEach(function(row){
      var it = inst('itemDrug'), ic = cfg('item', row.items); if (!ic) return;
      it.ref('labName').setString(row.name); it.ref('labName').setColor(QCOLOR[ic.quality || 1]);
      it.ref('labMoney').setString(String(Math.abs(row.price)));
      if (row.currencytype == 2) it.find('coin/icon').setImage(IMG + 'basics/icon_yb.png');
      it.find('btnOption').on(function(){ buyDialog(row); });
      content.addChild(it);
    });
  } else {
    p.ref('tipDesc').setString(c.name + '：回收背包中的装备，换取金币。');
    var tg = p.ref('nontoggle'), keep = true; tg.on(function(){ keep = !keep; tg.find('checkmark').setActive(!keep); });
    var box = p.ref('reclaimNode'), btn = inst('itemDrug');
    btn.ref('labName').setString('一键回收'); btn.ref('labMoney').setString('白/绿/蓝'); btn.ref('labDesc').setString('回收');
    btn.find('btnOption').on(function(){ if (sys('fenjie')) { var out = []; [1, 2, 3].forEach(function(q){ out.push(sys('fenjie').recycleByQuality(q, !keep)); }); return msg(out.filter(function(x){ return x.indexOf('OK') === 0; }).map(function(x){ return x.slice(3); }).join(' ') ? 'OK:' + out.filter(function(x){ return x.indexOf('OK') === 0; }).map(function(x){ return x.slice(3); }).join(' ') : out[0]); } var n = 0, g = 0; G.role.bag.slice().forEach(function(s){ if (isEquip(s) && s.q <= 3 && (keep ? !s.nonsuch : true)) { g += stuffCfg(s).sellprice || 0; sellItem(s.uid); n++; } }); msg('OK:回收 ' + n + ' 件, 获得 ' + g + ' 金币'); });
    box.addChild(btn);
  }
}
function buyDialog(row){
  var p = popup('tipStoreBuy'), ic = cfg('item', row.items), n = 1;
  closeBtn(p, 'img_close');
  p.ref('stuff').addChild(makeStuff(createStuff(row.items, 1, ic.type == 2 ? 1 : undefined), {click: false}));
  p.ref('labLv').setString(String(ic.needlevel || 1));
  p.ref('labDesc').setString(ic.descr || ''); p.ref('itemUse').setActive(false);
  var eb = p.findDeep('editNumber'), btnLab = p.ref('btnBuy').find('label'); btnLab.setString('购买');
  function upd(){ if (eb.input) eb.input.value = n; p.findDeep('labPrice').find('label').setString(String(Math.abs(row.price) * n)); }
  setTimeout(function(){ if (eb.input) { eb.input.type = 'number'; eb.input.oninput = function(){ n = Math.max(1, Math.min(row.oncenum || 999, parseInt(eb.input.value) || 1)); upd(); }; } upd(); }, 0);
  if (row.currencytype == 2) p.findDeep('labPrice').find('img_icon_coin').setImage(IMG + 'basics/icon_yb.png');
  p.findDeep('btn_addition').on(function(){ n = Math.min(row.oncenum || 999, n + 1); upd(); });
  p.findDeep('btn_reduce').on(function(){ n = Math.max(1, n - 1); upd(); });
  p.findDeep('btn_addmax').on(function(){ var cur = row.currencytype == 2 ? G.role.yuanbao : G.role.gold; n = Math.max(1, Math.min(row.oncenum || 999, Math.floor(cur / Math.abs(row.price)))); upd(); });
  p.ref('btnBuy').on(function(){ closePopup(p); msg(buy(row, n)); });
}

// ---------- pages ----------
var PAGES = {};
var EQUIP_ART = {5: 'weapon', 10: 'clothes', 15: 'helmet', 20: 'neckless', 22: 'ring', 23: 'ring', 24: 'bracelet', 25: 'bracelet', 62: 'shoes', 64: 'belt'};
var ROLE_SLOTS = [5, 10, 15, 20, 22, 23, 24, 25, 62, 64];
PAGES.main_role = function(p){
  UI.roleTab = UI.roleTab || 'bag';
  p.ref('avatarNode').setImage(IMG + 'role_create/icon_avatar_' + G.role.prof + '_1.png');
  p.ref('avatarNode').el.firstChild.style.backgroundSize = 'contain'; p.ref('avatarNode').el.firstChild.style.backgroundPosition = 'center bottom';
  var tabs = {bag: 'btnBag', yyshop: 'btnBusinessman', intensify: 'btnIntensify'};
  Object.keys(tabs).forEach(function(k){ p.ref(tabs[k]).on(function(){ UI.roleTab = k; drawRoleTab(p); }); });
  drawRole(p); drawRoleTab(p);
};
function drawRole(p){
  var r = G.role, a = calcAttr(), w = p.ref('weaponNode'); w.removeAllChildren();
  ROLE_SLOTS.forEach(function(sl){ var s = r.equip[sl]; w.addChild(s ? makeStuff(s, {slot: sl}) : makeStuff(null, {part: EQUIP_ART[sl], label: PARTS[sl]})); });
  var base = p.ref('baseNode'), tAttr = p.ref('itemAttr'), tTitle = p.ref('itemTitle'); base.removeAllChildren();
  function title(t){ var n = new CC.Node(tTitle.d, null); n.active = true; n.find('value').setString(t); base.addChild(n); }
  function attr(k, v){ var n = new CC.Node(tAttr.d, null); n.active = true; n.setString(k); n.find('value').setString(String(v)); n.find('name').setActive(false); base.addChild(n); }
  title('基础信息');
  attr('职业', PROF_NAME[r.prof]); attr('等级', r.level); attr('战力', combatPower(a));
  attr('生命', Math.floor(r.hp) + '/' + a.maxhp); attr('魔法', Math.floor(r.mp) + '/' + a.maxmp);
  title('战斗属性');
  attr('攻击', a.atkmin + '-' + a.atkmax); attr('防御', a.minac + '-' + a.maxac); attr('攻速', a.atkspeed + '秒');
  attr('命中', a.hit); attr('闪避', a.evade); attr('暴击', a.critical + '%'); attr('幸运', a.lucky);
}
function drawRoleTab(p){
  var tabs = {bag: 'btnBag', yyshop: 'btnBusinessman', intensify: 'btnIntensify'};
  Object.keys(tabs).forEach(function(k){ p.ref(tabs[k]).setImage(IMG + 'basics/img_btn_' + (UI.roleTab === k ? 1 : 0) + '.png'); });
  var down = p.ref('downNode'); down.removeAllChildren();
  if (UI.roleTab === 'bag') { var b = inst('role_bag'); down.addChild(b); drawBag(b); }
  else if (UI.roleTab === 'intensify') { var it = inst('role_intensify'); down.addChild(it); drawIntensify(it); }
  else { var ys = sys('openYyShop') || sys('yyshop'); if (ys) { ys(down); } else { var st = inst('role_bag'); down.addChild(st); drawBag(st); openStore(3001, 'img_main_reclaim'); UI.roleTab = 'bag'; } }
}
function drawBag(b){
  UI.bagTab = UI.bagTab || 'all';
  var map = {all: ['btnShowAll', 'bagInfo_showall', 1], equip: ['btnEquip', 'bagInfo_equip', 2], prop: ['btnProps', 'bagInfo_prop', 2]};
  Object.keys(map).forEach(function(k){
    var on = UI.bagTab === k, btn = b.ref(map[k][0]);
    btn.setImage(IMG + 'basics/img_tag_' + map[k][2] + '_' + (on ? 1 : 0) + '.png');
    b.ref(map[k][1]).setActive(on);
    btn.on(function(){ UI.bagTab = k; drawBag(b); });
  });
  var BG = sys('bag');
  if (BG) { b.ref('btnSort').on(function(){ msg(BG.sort() || 'OK'); }); b.ref('btnAdd').on(function(){ msg(BG.expandByAd()); }); }
  else b.ref('btnSort').on(function(){ G.role.bag.sort(function(x, y){ var a = stuffCfg(x), c = stuffCfg(y); return (c.type - a.type) || (y.q - x.q) || (a.id - c.id); }); drawBag(b); });
  b.ref('btnAdd').setActive(!!BG);
  var r = G.role; b.ref('lab_bag').setString(r.bag.length + '/' + (BG ? BG.capacity() : Math.max(80, r.bag.length)));
  var view = b.ref(map[UI.bagTab][1]), content = view.find('view/content'); content.removeAllChildren();
  r.bag.filter(function(s){ var e = isEquip(s); return UI.bagTab === 'all' || (UI.bagTab === 'equip' ? e : !e); }).slice(0, 200).forEach(function(s){
    var it = makeStuff(s); it.d.ly = null; content.addChild(it, true);
  });
  if (!content.d.ly || !content.d.ly.t) content.d.ly = {t: 3, rs: 1, sx: 30, sy: 30, pl: 20, pr: 0, pt: 20, pb: 20};
  content.layout(); view.find('view').el.style.overflowY = 'auto';
}
function drawIntensify(p){
  var r = G.role; UI.intSlot = UI.intSlot || 5;
  var s = r.equip[UI.intSlot], holder = p.findDeep('weapon');
  holder.removeAllChildren(); holder.addChild(s ? makeStuff(s, {click: false}) : makeStuff(null, {part: EQUIP_ART[UI.intSlot], label: PARTS[UI.intSlot]}));
  var c = s ? cfg('equip_qianghua', s.ench) : null;
  p.ref('lab_precent').setString(c ? c.gailv + '%' : '-');
  p.ref('lab_cost1').setString(c ? String(c.cost) : '-');
  var pp = CFG.equip_qianghua_parts.list.filter(function(x){ return x.id == UI.intSlot; })[0] || {};
  var isAtk = pp.maxatk != null; var lab = isAtk ? '攻击' : '防御', mn = isAtk ? pp.minatk : pp.minac, mx = isAtk ? pp.maxatk : pp.maxac, e = s ? s.ench : 0;
  p.ref('lab_change').setString(lab + '：' + (mn * e) + '-' + (mx * e)); p.ref('lab_change1').setString((mn * (e + 1)) + '-' + (mx * (e + 1)));
  var me = minEnch(), tip = p.findDeep('labTip'); if (tip) tip.setString('全身强化+' + me + '\n点击切换部位');
  p.findDeep('img_intensify_icon').on(function(){ var i = ROLE_SLOTS.indexOf(UI.intSlot); UI.intSlot = ROLE_SLOTS[(i + 1) % ROLE_SLOTS.length]; drawIntensify(p); });
  holder.on(function(){ var i = ROLE_SLOTS.indexOf(UI.intSlot); UI.intSlot = ROLE_SLOTS[(i + 1) % ROLE_SLOTS.length]; drawIntensify(p); });
  var tipI = p.ref('tipIntensify'); tipI.setActive(false);
  p.ref('btnIntensify').on(function(){
    var res = enhance(UI.intSlot); var ok = res.indexOf('OK') === 0;
    if (res === '强化失败' || ok) { tipI.setImage(IMG + 'basics/img_' + (ok ? 'success' : 'failed') + '.png'); tipI.setActive(true); setTimeout(function(){ tipI.setActive(false); }, 900); save(); refreshTop(); drawIntensify(p); }
    else toast(res);
  });
}
PAGES.role_skill = function(p){
  var r = G.role, content = p.ref('skillNode').content || p.ref('skillNode').find('view/content');
  content.removeAllChildren();
  (profCfg().skillid || []).forEach(function(base){
    var st = r.skills[base], lv = st ? st.lv : 0, sc = skillRow(base, Math.max(1, lv)), nx = skillRow(base, lv + 1); if (!sc) return;
    var it = inst('itemSkill');
    it.ref('icon').setImage(IMG + 'icon/' + (sc.icon || ('ic_sk_' + base)) + '.png');
    it.ref('labName').setString(sc.name); it.ref('labLevel').setString(lv ? 'Lv.' + lv : '未学习');
    it.ref('labDesc').setString(sc.describe || '');
    it.ref('labCost').setString('法力消耗：' + (sc.spell || 0)); it.ref('labCD').setString('冷却时间：' + (sc.basecd || 0));
    it.ref('labExp').setString('经验：' + (st ? (st.exp || 0) : 0) + '/' + (sc.exp || 0));
    it.ref('btnPreview').setActive(false); it.ref('previewNode').setActive(false);
    it.ref('tipStatus').setImage(IMG + 'basics/img_skill_sign' + (lv ? 1 : 2) + '.png'); it.ref('tipStatus').setActive(!nx);
    var btn = it.ref('btnUpgrade'); btn.setActive(!!nx); btn.find('name').setString(lv ? '升级' : '学习');
    if (nx) {
      var book = nx.booknum ? nx.booknum[0] : 0, ok = r.level >= nx.slevel && countItem(book) >= ((nx.booknum || [])[1] || 1);
      btn.setImage(IMG + 'basics/btn_item2_' + (ok ? 1 : 2) + '.png');
      btn.on(function(){ var res = learnFromBook(book); msg(res); });
    }
    content.addChild(it);
  });
  p.ref('skillNode').find('view').el.style.overflowY = 'auto';
};
PAGES.main_story = function(p){
  if (storyPage(p)) return;
  var r = G.role, content = p.ref('storylist').find('view/content'); content.removeAllChildren();
  var undone = CFG.task.list.filter(function(t){ return !r.tasksDone[t.id]; });
  var ch = undone.length ? Math.floor(undone[0].id / 1000) : Math.floor(CFG.task.list[CFG.task.list.length - 1].id / 1000);
  CFG.task.list.filter(function(t){ return Math.floor(t.id / 1000) == ch; }).forEach(function(t){
    var it = inst('itemTask'), pr = taskProgress(t), done = !!r.tasksDone[t.id];
    var sp = sys('taskProgress'); if (!pr && sp) pr = sp(t);
    it.ref('lab_taskdesc').setString(t.name);
    it.ref('lab_schedule').setString(t.describe + '  ');
    it.ref('lab_scheduleCnt').setString(pr ? '(' + Math.min(pr[0], pr[1]) + '/' + pr[1] + ')' : '(未实现)');
    it.ref('lab_scheduleCnt').setColor(pr && pr[0] >= pr[1] ? '#32C63D' : '#d62f2f');
    var ic = cfg('item', t.reward[0]); if (ic) { var s = createStuff(t.reward[0], t.reward[1]); var st = makeStuff(s); st.d.sx = st.d.sy = .8; st.tf = 'scale(.8)'; it.ref('item').addChild(st); }
    it.ref('tipReceived').setActive(done);
    var can = !done && pr && pr[0] >= pr[1]; it.ref('btnOption').setActive(can);
    it.ref('btnOption').on(function(){ msg(claimTask(t.id)); });
    content.addChild(it);
  });
  p.ref('storylist').find('view').el.style.overflowY = 'auto';
};
PAGES.main_map = function(p){
  var list = p.ref('maplist'), view = list.find('view'), content = view.find('content'), tpl = p.ref('itemNode'), bg = p.ref('mapBg');
  tpl.setActive(false);
  view.removeChild(bg); content.addChild(bg, true); bg.place(); bg.children.forEach(function(c){ c.place(); });
  var vec = p.d.mapVec || (UI.mapVec);
  CFG.map_info.list.forEach(function(info){
    var v = vec[info.point - 1]; if (!v) return;
    var it = new CC.Node(tpl.d, null); it.active = true; it.x = v[0]; it.y = v[1] + 250;
    it.find('labLv').setString(info.name); it.find('labName').setString(info.level);
    var ok = combatPower() >= info.limitpower; if (!ok) it.el.style.filter = 'grayscale(.8)';
    it.on(function(){ if (!ok) return toast('需要战力 ' + info.limitpower); enterMap(info.mapid); showPage('fight'); });
    content.addChild(it, true); it.place();
  });
  view.el.style.overflowY = 'auto';
  setTimeout(function(){ view.el.scrollTop = view.el.scrollHeight; }, 0);
};
PAGES.main_fuli = function(p){
  var tabs = [['btnCoin', 'fuliCoin'], ['btnYuanbao', 'fuliRecharge'], ['btnFuli', 'fuliSign'], ['btnExchange', 'fuliExchange']];
  var root = p.ref('uiRoot');
  function open(i){
    tabs.forEach(function(t, j){ p.ref(t[0]).setImage(IMG + 'basics/img_btn_' + (i === j ? 1 : 0) + '.png'); });
    root.removeAllChildren();
    var fn = {fuliSign: fuliSign, fuliExchange: fuliExchange, fuliCoin: fuliPay, fuliRecharge: fuliPay}[tabs[i][1]];
    var pf = {fuliCoin: 'fuli_coin', fuliRecharge: 'fuli_recharge', fuliSign: 'fuli_sign', fuliExchange: 'fuli_exchange'}[tabs[i][1]];
    var node = inst(pf); root.addChild(node);
    if (typeof fn === 'function') { try { fn(node); } catch (e) { console.warn(e); } }
    else toast('该福利功能尚未实现');
  }
  tabs.forEach(function(t, i){ p.ref(t[0]).on(function(){ open(i); }); });
  open(2);
};

// ---------- role create (role_create.prefab) ----------
function showCreate(){
  var p = inst('role_create'); CC.mount(p, UI.layerMain); UI.create = p;
  p.ref('btnBack').setActive(false);
  var sel = 1, btns = p.ref('professionBtn'), view = p.ref('professionView');
  var items = [], roles = [];
  [1, 2, 3].forEach(function(k, i){
    var it = inst('itemProfession'); items.push(it); btns.addChild(it);
    var rr = inst('itemProfessionRole'); roles.push(rr); view.addChild(rr); rr.setPos((i - 1) * 210, -157);
    it.on(function(){ sel = k; upd(); });
  });
  btns.d.ly.sx = btns.d.ly.sx || 60; btns.layout();
  function upd(){
    items.forEach(function(it, i){ var e = i + 1, on = e === sel;
      it.ref('bg').setImage(on ? IMG + 'role_create/bg_select_' + e + '.png' : '');
      if (!on) it.ref('bg').setFrame(null);
      it.ref('icon').setActive(on); it.ref('icon').setImage(IMG + 'role_create/icon_' + e + '.png');
      it.ref('icon_normal').setActive(!on); it.ref('icon_normal').setImage(IMG + 'role_create/icon_normal_' + e + '.png');
      it.ref('txt_profession').setImage(IMG + 'role_create/txt_profession_' + e + '.png'); it.ref('labProfess').setActive(false);
    });
    roles.forEach(function(rr, i){ var e = i + 1; rr.ref('icon').setImage(IMG + 'role_create/icon_avatar_' + e + '_' + (e === sel ? 1 : 0) + '.png'); rr.ref('icon').el.firstChild.style.backgroundSize = 'contain'; rr.ref('icon').el.firstChild.style.backgroundPosition = 'center bottom'; rr.el.style.opacity = e === sel ? 1 : .55; });
    var lab = p.findDeep('introduce2').find('view/content/item'); lab.setString(CFG.profession.raw[PROF_KEY[sel]].describe || '');
    lab.el.style.whiteSpace = 'normal'; lab.lbW = 475; lab.place();
  }
  function rn(){ var x = CFG.randomname.list[Math.floor(Math.random() * CFG.randomname.list.length)] || {}; return (x.surname && x.man) ? x.surname + x.man : '勇士' + rnd(100, 999); }
  var eb = p.ref('labName');
  setTimeout(function(){ if (eb.input) eb.input.value = rn(); }, 0);
  p.ref('btnRandom').on(function(){ if (eb.input) eb.input.value = rn(); });
  p.ref('btnComfirm').on(function(){ var n = (eb.input && eb.input.value.trim()) || rn(); p.destroy(); UI.create = null; newRole(n, sel); log('欢迎来到传奇之旅, ' + esc(n) + '! 背包中有新手礼包。'); enterMap(G.role.mapId); save(); startMain(); });
  upd();
}

// ---------- death / offline ----------
var _roleDie = roleDie;
roleDie = function(){ _roleDie(); if (!UI.main) return; var p = popup('role_die'); p.findDeep('btnVideo').setActive(false); p.findDeep('btnLocal').setActive(false);
  p.findDeep('btnCity').on(function(){ closePopup(p); }); p.findDeep('layout').layout(); };
function showOffline(off){
  var p = popup('tipOffline');
  p.ref('labTime').setString(('0' + Math.floor(off.sec / 3600)).slice(-2) + '小时' + ('0' + Math.floor(off.sec / 60) % 60).slice(-2) + '分钟');
  p.ref('labHour').setString('8小时'); p.ref('labExp').setString(fmtNum(off.exp)); p.ref('labCoin').setString(fmtNum(off.gold));
  p.findDeep('btnVideo').setActive(false); p.findDeep('btnMulti').setActive(false); p.findDeep('btnNode').layout();
  p.findDeep('btnFree').on(function(){ closePopup(p); }); closeBtn(p, 'img_close');
}

// ---------- loop ----------
function refreshAll(){
  if (!UI.main || !G.role) return;
  refreshTop();
  if (UI.pageKey === 'fight') { refreshScene(); refreshLog(); }
  else if (UI.page && UI.pageKey === 'main_role') { drawRole(UI.page); if (UI.roleTab === 'bag') { var b = UI.page.ref('downNode').children[0]; if (b) drawBag(b); } }
  else if (UI.page && PAGES[UI.pageKey] && UI.pageKey !== 'main_map' && UI.pageKey !== 'main_fuli') { var sc = UI.page.findDeep('view'); var top = sc ? sc.el.scrollTop : 0; PAGES[UI.pageKey](UI.page); if (sc) sc.el.scrollTop = top; }
}
function render(){ refreshAll(); }
function startMain(){ buildMain(); }
(function boot(){
  if (typeof FX !== 'undefined') { FX.preload(); FX.hookLog(); }
  var host = document.getElementById('stage');
  UI.stage = CC.initStage(host);
  ['layerMain', 'layerPop', 'layerTop'].forEach(function(k){ var d = document.createElement('div'); d.className = 'layer'; host.appendChild(d); UI[k] = d; });
  var ld = inst('loading'); CC.mount(ld, UI.layerMain);
  ld.ref('voiceoff').setActive(false); ld.ref('btnStart').setActive(false); ld.findDeep('label').setActive(false);
  var bar = ld.ref('loadBar'); bar.setProgress(0.1); ld.ref('labPercent').setString('10.00%');
  var t0 = Date.now();
  loadConfigs().then(function(){
    bar.setProgress(1); ld.ref('labPercent').setString('100.00%');
    ld.ref('loadNode').setActive(false); ld.ref('btnStart').setActive(true); ld.findDeep('label').setActive(true);
    function go(){
      ld.destroy();
      if (load()) { var off = offlineReward(); enterMap(G.role.mapId); startMain(); if (off) showOffline(off); }
      else showCreate();
      var last = performance.now(), lastSave = 0, lastUi = 0;
      setInterval(function(){ if (!G.role || !UI.main) return; var now = performance.now(), dt = (now - last) / 1000; last = now; tick(Math.min(dt, 2));
        if (now - lastUi > 300 && UI.pageKey === 'fight') { lastUi = now; refreshAll(); } else if (now - lastUi > 1000) { lastUi = now; refreshTop(); }
        if (now - lastSave > 5000) { lastSave = now; save(); } }, 250);
    }
    ld.ref('btnStart').on(go); ld.findDeep('label').on(go);
    // dev/screenshot hooks: ?seed=<prof>  ?autostart  ?page=<prefab>  ?tip=equip|props|store|offline|die  ?map=<id>
    var q = {}; location.search.slice(1).split('&').forEach(function(kv){ var a = kv.split('='); if (a[0]) q[a[0]] = decodeURIComponent(a[1] || '1'); });
    if (q.seed && !load()) { newRole('赫连天七', +q.seed || 1); G.role.bag.slice().forEach(function(s){ if (stuffCfg(s).stdmode == 99) useItem(s.uid); }); G.role.bag.slice().forEach(function(s){ if (stuffCfg(s).stdmode == 99) useItem(s.uid); }); G.role.bag.slice().forEach(function(s){ if (isEquip(s)) equipItem(s.uid); }); G.role.mapId = +(q.map || 1002); save(); }
    if (q.autostart || q.seed) { go();
      if (q.map && G.role) enterMap(+q.map);
      setTimeout(function(){
        if (q.page) showPage(q.page);
        var b = G.role && G.role.bag;
        if (q.tip === 'equip') { var e = b.filter(isEquip)[0]; if (e) tipEquip(e); }
        if (q.tip === 'props') { var pr = b.filter(function(s){ return !isEquip(s); })[0]; if (pr) tipProps(pr); }
        if (q.tip === 'store') openStore(3002, 'img_main_drugstore');
        if (q.tip === 'offline') showOffline({sec: 3700, exp: 12345, gold: 678});
        if (q.tip === 'die') roleDie();
        if (q.fx && typeof FX !== 'undefined') { // ?fx=leidianshu,huoqiu  or  ?fx=all  (demo casts for screenshots)
          var list = q.fx === 'all' ? Object.keys(FX.SKILL_DIR).map(function(k){ return FX.SKILL_DIR[k]; }) : q.fx.split(',');
          if (q.nosheet) Object.keys(FX._sheets).forEach(function(k){ FX._sheets[k].ok = false; });
          var di = 0; setInterval(function(){ FX.demo(list[di++ % list.length]); }, +(q.fxint || 700));
        }
        if (q.tip === 'buy') buyDialog(CFG.shop.list.filter(function(x){ return x.items; })[0]);
        if (q.tip === 'mapdesc') tipMapDesc(mapCfg());
        if (q.tip === 'remake') { var eq = b.filter(isEquip)[0] || G.role.equip[5]; if (eq) { if (eq.q < 2) eq.q = 3; tipRemake(eq); } }
        if (q.tip === 'smith') tipBlacksmith();
        if (q.tip === 'fuse') tipFuse(1);
        if (q.tip === 'week') { UI.fuliMode = 'week'; showPage('main_fuli'); }
        if (q.tip === 'exchange') { showPage('main_fuli'); UI.page.ref('btnExchange').el.click(); }
        if (q.tip === 'boss') { UI.fight.ref('bossNode').setActive(true); fillBoss(); }
      }, +(q.wait || 1500));
    }
  }).catch(function(e){ console.error(e); ld.ref('tips').setString('加载配置失败: ' + e); });
})();
