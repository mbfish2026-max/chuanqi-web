// UI panels for window.Systems (js/systems/*), using the original prefabs: fuli_sign / fuli_exchange / tipRemake / tipBlacksmith / tipFuse / tipFuseItem / itemStory
var S_ = function(){ return window.Systems || {}; };
function cloneTpl(tpl, str){ var n = new CC.Node(tpl.d, null); n.active = true; if (str != null) { if (n.lb) n.setString(str); else { var v = n.find('value') || (function f(x){ for (var i = 0; i < x.children.length; i++) { if (x.children[i].lb) return x.children[i]; var r = f(x.children[i]); if (r) return r; } return null; })(n); if (v) { v.setString(str); n.colorTarget = v; (function g(x){ x.children.forEach(function(c){ if (c.lb && c !== v) c.setString(''); g(c); }); })(n); } } } return n; }
function stuffIcon(id, count){ var s = createStuff(id, count || 1); return s ? makeStuff(s, {click: false}) : null; }

// ---- 福利: 签到 / 七日 / 兑换码 ----
function fuliSign(node){
  var F = S_().fuli; if (!F) return;
  var mode = UI.fuliMode || 'month';
  var bS = node.ref('btnSign'), b7 = node.ref('btnSign7'); node.ref('btnDouble').setActive(false);
  bS.setImage(IMG + 'basics/img_tag_1_' + (mode === 'month' ? 1 : 0) + '.png'); b7.setImage(IMG + 'basics/img_tag_2_' + (mode === 'week' ? 1 : 0) + '.png');
  bS.on(function(){ UI.fuliMode = 'month'; redraw(); }); b7.on(function(){ UI.fuliMode = 'week'; redraw(); });
  function redraw(){ var root = node.parent; node.destroy(); var n = inst('fuli_sign'); root.addChild(n); fuliSign(n); }
  var ml = node.ref('monthlist'), sl = node.ref('signlist');
  ml.setActive(mode === 'month'); sl.setActive(mode === 'week');
  if (mode === 'month') {
    var content = ml.find('view/content'); content.d.ly = {t: 3, rs: 1, sx: 15, sy: 15, pl: 10, pr: 0, pt: 10, pb: 10};
    var today = new Date().getDate();
    F.monthList().forEach(function(c){
      var it = inst('itemSign'), m = it.ref('monthNode'); it.ref('sevenNode').setActive(false); m.setActive(true);
      it.w = 132; it.h = 160; it.d.ly = null; it.place();
      m.find('lab_day').setString('第' + c.id + '日');
      var st = stuffIcon(c.item, c.count); if (st) m.find('items').addChild(st);
      m.find('received').setActive(!!c.signed);
      if (c.id === today && !c.signed) m.find('img_bg').el.style.filter = 'drop-shadow(0 0 6px #ffd76a)';
      m.find('btnOption').on(function(){ if (c.id !== today) return toast('只能在第' + c.id + '日签到'); msg(F.sign()); redraw(); });
      content.addChild(it, true);
    });
    content.layout(); ml.find('view').el.style.overflowY = 'auto';
  } else {
    var c2 = sl.find('view/content'); c2.d.ly = c2.d.ly && c2.d.ly.t ? c2.d.ly : {t: 2, rs: 1, sy: 10, pt: 10, pb: 10, pl: 0, pr: 0, sx: 0};
    F.weekList().forEach(function(c){
      var it = inst('itemSign'), sv = it.ref('sevenNode'); it.ref('monthNode').setActive(false);
      it.ref('labSevenDay').setString('第' + c.id + '日');
      var box = sv.findDeep('items'); (c.items || []).forEach(function(x){ var id = x.id || x[0], n = x.count || x[1]; var st = stuffIcon(id, n); if (st) box.addChild(st); });
      sv.findDeep('received').setActive(!!c.signed);
      var btn = sv.findDeep('btn_option'); btn.setActive(!c.signed); sv.findDeep('label').setActive(!c.signed); sv.findDeep('label').setString(c.canSign ? '签到' : '未到');
      if (!c.canSign) btn.el.style.filter = 'grayscale(1)';
      btn.on(function(){ if (!c.canSign) return toast('还未到签到日'); msg(F.signWeek()); redraw(); });
      c2.addChild(it, true);
    });
    c2.layout(); sl.find('view').el.style.overflowY = 'auto';
  }
}
function fuliExchange(node){
  var F = S_().fuli, eb = node.ref('labName');
  node.findDeep('btnLibao').on(function(){ var code = eb.input ? eb.input.value.trim() : ''; if (!code) return toast('请输入礼包码'); msg(F ? F.redeem(code) : '兑换未实现'); });
}
function fuliPay(node){ toast('离线复刻版不提供充值'); }

// ---- 洗练 tipRemake ----
function tipRemake(s){
  var E = S_().equip; if (!E) return;
  var p = popup('tipRemake'); p.find('mask').el.style.background = 'rgba(0,0,0,.55)';
  p.findDeep('img_close').on(function(){ E.cancelRemake(s.uid); closePopup(p); refreshAll(); });
  p.findDeep('btn_help').setActive(false);
  p.ref('itemNode').addChild(makeStuff(s, {click: false}));
  function draw(){
    var L = p.ref('leftNode'), R = p.ref('rightNode'), tpl = p.ref('itemAttr');
    L.removeAllChildren(); R.removeAllChildren();
    function line(box, a){ var n = cloneTpl(tpl, a.text); n.setColor(QCOLOR[a.quality] || '#DCD3C7'); var lk = n.find('btnlock'); if (lk) lk.setActive(false); box.addChild(n); }
    var cur = E.affixes(s.uid), pend = E.pendingRemake(s.uid);
    if (!cur.length) L.addChild(cloneTpl(tpl, '无洗练属性')); cur.forEach(function(a){ line(L, a); });
    pend.forEach(function(a){ line(R, a); });
    var cost = E.remakeCost(s.uid, []);
    p.ref('costCoinNode').setString(cost ? String(cost.gold) : '-'); p.ref('costStoneNode').setString(cost ? String(cost.stone) : '-');
    p.ref('labCurCombat').setString('战力：' + E.combat(s.uid)); p.ref('labCombat').setString(pend.length ? '新属性' : '');
  }
  p.findDeep('btnRemake').on(function(){ var r = E.remake(s.uid, []); if (r.indexOf('OK') !== 0) toast(r); draw(); refreshTop(); });
  p.findDeep('btnSave').on(function(){ msg(E.saveRemake(s.uid)); draw(); });
  draw();
}

// ---- 铁匠 tipBlacksmith ----
function tipBlacksmith(){
  var SM = S_().smith; if (!SM) return openStore(3003, 'img_main_blacksmith');
  var p = popup('tipBlacksmith'), sel = 0; p.find('mask').el.style.background = 'rgba(0,0,0,.55)';
  p.findDeep('img_close').on(function(){ closePopup(p); });
  p.findDeep('tipDesc').setString('铁匠：可锻造随机属性的装备，每日刷新。');
  p.findDeep('img_refresh1').setActive(SM.adLeft() > 0); p.findDeep('layout').layout();
  function draw(){
    var goods = SM.goods();
    [1, 2, 3].forEach(function(i){ var holder = p.findDeep('stuff' + i); holder.removeAllChildren(); var g = goods[i - 1]; if (g) { var it = makeStuff(g.stuff, {click: false}); if (g.bought) it.el.style.opacity = .4; holder.addChild(it); }
      p.findDeep('btnStuff' + i).on(function(){ sel = i - 1; draw(); }); });
    var selN = p.ref('selectNode'); selN.setPos(-150 + sel * 150, 170);
    var g = goods[sel]; if (!g) return;
    var info = p.findDeep('stuffInfo'); var sh = info.find('stuff'); sh.removeAllChildren(); sh.addChild(makeStuff(g.stuff, {click: false}));
    var c = stuffCfg(g.stuff);
    p.ref('labPart').setString(PARTS[c.stdmode] || '装备'); p.ref('labLevel').setString(c.needlevel + '级');
    p.ref('labProfession').setString(c.profession ? PROF_NAME[c.profession] : '通用'); p.ref('labQuality').setString(QNAME[g.quality]); p.ref('labQuality').setColor(QCOLOR[g.quality]);
    var attrs = p.ref('equipAttr'), tpl = p.ref('itemAttr'); attrs.removeAllChildren();
    var e = g.stuff.attr || {}; [['zs', '攻击'], ['fs', '魔法'], ['ds', '道术'], ['ac', '防御']].forEach(function(k){ if (e['max' + k[0]]) attrs.addChild(cloneTpl(tpl, k[1] + '：' + e['min' + k[0]] + '-' + e['max' + k[0]])); });
    (g.affix || []).forEach(function(t){ var n = cloneTpl(tpl, t); (n.colorTarget || n).setColor('#2E8DD6'); attrs.addChild(n); });
    p.ref('labCost').setString(fmtNum(G.role.gold) + '/' + (g.cost && g.cost.gold != null ? g.cost.gold : g.cost));
    p.ref('btnBuild').find('label').setString(g.bought ? '已锻造' : '锻造');
  }
  p.ref('btnBuild').on(function(){ msg(SM.buy(sel)); draw(); });
  p.findDeep('img_refresh1').on(function(){ msg(SM.refreshAd()); draw(); });
  p.findDeep('img_refresh2').on(function(){ msg(SM.refreshYuanbao()); draw(); });
  draw();
}

// ---- 合成 tipFuse / tipFuseItem ----
function tipFuse(type){
  var FU = S_().fuse; if (!FU) return;
  var p = popup('tipFuse'); type = type || 1;
  p.findDeep('img_close').on(function(){ closePopup(p); });
  var left = p.ref('leftList').find('view/content'); left.d.ly = {t: 2, rs: 1, sy: 12, pt: 10, pb: 10, pl: 0, pr: 0, sx: 0};
  [[1, '技能书'], [2, '药品']].forEach(function(t){
    var b = new CC.Node({n: 'tab', x: 0, y: 0, w: 147, h: 50, ax: .5, ay: .5, ch: [{n: 'name', x: 0, y: 0, w: 100, h: 24, ax: .5, ay: .5, lb: {s: t[1], fs: 24, lh: 24, ha: 1, va: 1, ov: 0}}]}, null);
    b.setImage(IMG + 'basics/img_btn_' + (t[0] === type ? 1 : 0) + '.png'); b.on(function(){ closePopup(p); tipFuse(t[0]); });
    left.addChild(b);
  });
  var right = p.ref('rightList').find('view/content'); right.d.ly = {t: 2, rs: 1, sy: 10, pt: 10, pb: 10, pl: 0, pr: 0, sx: 0};
  FU.list(type).forEach(function(x){
    var it = inst('itemDrug'); it.d.sx = it.d.sy = 0.8; it.tf = 'scale(.8)'; it.x = 0; it.ref('labName').setString(x.name);
    it.ref('labMoney').setString(x.needName + ' ' + x.have + '/' + x.need[1]);
    it.find('coin/icon').setActive(false); it.ref('labDesc').setString('合成');
    if (!x.max) it.find('btnOption').el.style.filter = 'grayscale(1)';
    it.find('btnOption').on(function(){ fuseItem(x, function(){ closePopup(p); tipFuse(type); }); });
    right.addChild(it);
  });
  p.ref('rightList').find('view').el.style.overflowY = 'auto';
}
function fuseItem(x, done){
  var FU = S_().fuse, p = popup('tipFuseItem'), n = 1;
  p.findDeep('img_close').on(function(){ closePopup(p); });
  p.ref('stuff').addChild(stuffIcon(x.itemId, 1));
  var eb = p.ref('labCount');
  function upd(){ if (eb.input) eb.input.value = n; p.ref('labDesc').setString(x.needName); p.ref('labDescCnt').setString('x' + x.need[1] * n); p.ref('labPrice').setString(String((x.costgold || 0) * n)); p.findDeep('labNode').layout(); }
  setTimeout(upd, 0);
  p.findDeep('btn_addition').on(function(){ n = Math.min(Math.max(1, x.max), n + 1); upd(); });
  p.findDeep('btn_reduce').on(function(){ n = Math.max(1, n - 1); upd(); });
  p.findDeep('btn_addmax').on(function(){ n = Math.max(1, x.max); upd(); });
  p.ref('btnFuse').on(function(){ closePopup(p); msg(FU.fuse(x.id, n)); if (done) done(); });
}

// ---- 历练 main_story (itemStory chapters + itemTask) ----
function storyPage(p){
  var L = S_().lilian; if (!L) return false;
  var content = p.ref('storylist').find('view/content'); content.removeAllChildren();
  content.d.ly = content.d.ly && content.d.ly.t ? content.d.ly : {t: 2, rs: 1, sy: 10, pt: 0, pb: 10, pl: 0, pr: 0, sx: 0};
  var cur = L.current();
  L.chapters().forEach(function(c){
    var it = inst('itemStory'), open = cur && cur.id === c.id && UI.storyOpen !== false;
    it.ref('uiRoot').setActive(true); it.ref('lilianlock').setActive(!!c.locked);
    it.ref('labStage').setString(c.headline || ''); it.ref('labTitle').setString(c.title || '');
    var d = it.ref('desc'); d.setString(c.describe || ''); d.el.style.whiteSpace = 'normal';
    it.ref('labrecommond').setString('推荐等级：' + (c.lvl || '') + '   进度 ' + c.done + '/' + c.total);
    var go = it.findDeep('img_go'); go.setImage(IMG + 'basics/img_btn_0.png');
    var tl = it.ref('previewNode'); tl.setActive(!!open);
    if (open) {
      var tc = tl.find('view/content'); tc.d.ly = {t: 2, rs: 1, sy: 8, pt: 8, pb: 8, pl: 0, pr: 0, sx: 0};
      c.tasks.forEach(function(t){
        var ti = inst('itemTask'); ti.ref('lab_taskdesc').setString(t.name); ti.ref('lab_schedule').setString(t.describe + '  ');
        var pr = t.progress; ti.ref('lab_scheduleCnt').setString(pr ? '(' + Math.min(pr[0], pr[1]) + '/' + pr[1] + ')' : ''); ti.ref('lab_scheduleCnt').setColor(pr && pr[0] >= pr[1] ? '#32C63D' : '#d62f2f');
        if (t.reward) { var st = stuffIcon(t.reward[0], t.reward[1]); if (st) { st.tf = 'scale(.8)'; ti.ref('item').addChild(st); } }
        ti.ref('tipReceived').setActive(t.done); ti.ref('btnOption').setActive(t.canClaim);
        ti.ref('btnOption').on(function(){ msg(L.claim(t.id)); });
        tc.addChild(ti, true);
      });
      tc.layout(); tl.h = Math.min(600, tc.h); tl.find('view').h = tl.h; tl.refresh();
      it.h = 230 + tl.h; it.place(); it.children.forEach(function(ch){ ch.y += tl.h / 2; ch.place(); });
    }
    go.on(function(){ if (c.locked) return toast('章节未解锁'); if (cur && c.id === cur.id) { UI.storyOpen = !open; } refreshAll(); });
    content.addChild(it, true);
  });
  content.layout(); p.ref('storylist').find('view').el.style.overflowY = 'auto';
  return true;
}
