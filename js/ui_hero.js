// [hero] 英雄面板 + 合击按钮/怒气条 (战场左下角). 不改 ui.js: 包装 buildScene / refreshScene / drawPets
(function(){
  if (typeof buildScene !== 'function') return;
  var HS = function(){ return window.Systems && Systems.hero; };
  var PN = {1: '战士', 2: '法师', 3: '道士'};
  function el(tag, css, html){ var d = document.createElement(tag); if (css) d.style.cssText = css; if (html != null) d.innerHTML = html; return d; }
  var BTN = 'background:url(' + IMG + 'basics/img_btn_0.png) center/100% 100% no-repeat;color:#f3e3b5;font:bold 22px "PingFang SC",sans-serif;text-align:center;cursor:pointer;text-shadow:0 1px 2px #000;';

  function buildBar(){
    if (!UI.battle || !HS()) return; var host = UI.battle.el, old = host.querySelector('.hero-bar'); if (old) old.remove();
    var bar = el('div', 'position:absolute;left:14px;bottom:10px;z-index:30;display:flex;align-items:center;gap:8px;pointer-events:auto;'); bar.className = 'hero-bar';
    var hb = el('div', BTN + 'width:92px;height:52px;line-height:52px;', '英雄'); hb.onclick = heroPanel;
    // rage bar: 2x textures shown at 1x; 9-slice insets in image px = 2 x design px
    var A = 'assets/ui/';
    var rw = el('div', 'position:relative;width:220px;height:24px;box-sizing:border-box;border-style:solid;border-width:0 12px;border-image:url(' + A + 'hero_rage_bg.png) 0 24 0 24 fill stretch;');
    var rf = el('div', 'position:absolute;left:-9px;top:3px;height:18px;width:0;box-sizing:border-box;border-style:solid;border-width:0 8px;border-image:url(' + A + 'hero_rage_fill.png) 0 16 0 16 fill stretch;transition:width .2s;');
    var rl = el('div', 'position:absolute;left:-12px;right:-12px;top:0;font:bold 15px/24px "PingFang SC",sans-serif;color:#fff;text-align:center;text-shadow:0 1px 2px #000,0 0 3px #000;white-space:nowrap;', '怒气');
    rw.appendChild(rf); rw.appendChild(rl);
    // 合击 button: 104x104 image; name, ready pulse and cooldown sweep drawn by code on top
    var hj = el('div', 'position:relative;width:104px;height:104px;background:url(' + A + 'btn_heji.png) center/100% 100% no-repeat;cursor:pointer;');
    var hjCd = el('div', 'position:absolute;inset:8px;border-radius:50%;pointer-events:none;display:none;');
    var hjT = el('div', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:bold 24px "PingFang SC",sans-serif;color:#fff3c4;text-shadow:0 0 3px #000,0 2px 3px #000,0 0 8px rgba(255,120,0,.8);pointer-events:none;text-align:center;line-height:26px;', '合击');
    var hjS = el('div', 'position:absolute;left:0;right:0;bottom:14px;font:bold 15px "PingFang SC",sans-serif;color:#fff;text-align:center;text-shadow:0 1px 2px #000;pointer-events:none;', '');
    hj.appendChild(hjCd); hj.appendChild(hjT); hj.appendChild(hjS); hj.onclick = function(){ msg(HS().heji()); };
    bar.appendChild(hb); bar.appendChild(rw); bar.appendChild(hj); host.appendChild(bar);
    UI.heroBar = {bar: bar, fill: rf, lab: rl, btn: hj, btnText: hjT, btnSub: hjS, btnCd: hjCd, head: hb};
  }
  function refreshBar(){
    var H = HS(); if (!UI.battle) return; if (!UI.heroBar || !UI.heroBar.bar.isConnected) buildBar(); var hb = UI.heroBar; if (!hb) return;
    var info = H.info();
    hb.head.textContent = info ? (info.dead ? '复活' + info.reviveIn : '英雄') : (H.canUnlock() ? '召唤英雄' : '英雄');
    if (!info) { hb.fill.style.width = '0'; hb.fill.style.display = 'none'; hb.lab.textContent = '英雄 Lv' + H.UNLOCK_LEVEL + ' 开启'; hb.btn.style.filter = 'grayscale(1)'; return; }
    var r = H.rage(), pct = r.rage / r.max; hb.fill.style.display = pct > 0 ? '' : 'none'; hb.fill.style.width = Math.max(16, 214 * pct) + 'px';
    hb.lab.textContent = (r.cd > 0 ? '冷却 ' + r.cd + 's  ' : '') + '怒气 ' + r.rage + '/' + r.max;
    var nm = info.combo.name; hb.btnText.innerHTML = nm.length <= 3 ? nm : nm.slice(0, Math.ceil(nm.length / 2)) + '<br>' + nm.slice(Math.ceil(nm.length / 2));
    hb.btnSub.textContent = r.cd > 0 ? r.cd + 's' : (r.ready ? '' : Math.floor(pct * 100) + '%');
    if (r.cd > 0) { var f = Math.min(1, r.cd / 30); hb.btnCd.style.display = ''; hb.btnCd.style.background = 'conic-gradient(rgba(0,0,0,.55) ' + (f * 360) + 'deg, transparent 0)'; } else hb.btnCd.style.display = 'none';
    hb.btn.style.filter = r.ready ? 'drop-shadow(0 0 10px #ffcc33)' : (r.cd > 0 ? 'saturate(.5)' : 'saturate(.75)');
    hb.btn.style.animation = r.ready ? 'heroPulse 1s infinite' : '';
  }
  function heroPanel(){
    var H = HS(); if (!H) return;
    var p = popup('tipMapDesc'), root = p.find('uiRoot');
    root.children.forEach(function(c){ var n = c.n || (c.d && c.d.n) || ''; if (!/img_tip_3_bg|labName/.test(n)) c.setActive(false); });
    p.findDeep('labName').setString('英 雄');
    var box = el('div', 'position:absolute;left:40px;top:70px;width:530px;height:440px;color:#dcd3c7;font:20px/30px "PingFang SC",sans-serif;overflow:auto;');
    root.el.appendChild(box);
    var close = el('div', 'position:absolute;right:6px;top:4px;width:56px;height:56px;background:url(' + IMG + 'basics/img_close.png) center/contain no-repeat;cursor:pointer;'); close.onclick = function(){ closePopup(p); }; root.el.appendChild(close);
    function b(txt, fn, on){ var d = el('span', BTN + 'display:inline-block;width:110px;height:46px;line-height:46px;font-size:20px;margin:4px 6px 4px 0;' + (on ? 'filter:drop-shadow(0 0 6px #ffd76a);' : ''), txt); d.onclick = function(){ var res = fn(); if (res) msg(res); draw(); }; return d; }
    function draw(){
      box.innerHTML = ''; var info = H.info();
      if (!info) {
        box.appendChild(el('div', '', H.canUnlock() ? '选择英雄职业 (合击技能由 主角+英雄 职业决定):' : '主角达到 <b style="color:#ffd76a">' + H.UNLOCK_LEVEL + ' 级</b> 后可召唤英雄。'));
        [1, 2, 3].forEach(function(pf){ var cb = H.comboFor(G.role.prof, pf); var row = el('div', 'margin:6px 0;');
          row.appendChild(b(PN[pf], function(){ return H.unlock(pf); })); row.appendChild(el('span', 'color:#beaa5c;font-size:18px', '合击 <b style="color:#ffb000">' + cb.name + '</b>: ' + cb.desc.split(': ')[1])); box.appendChild(row); });
        return;
      }
      var a = info.attr, k = {1: 'zs', 2: 'fs', 3: 'ds'}[info.prof];
      box.appendChild(el('div', 'display:flex;gap:14px;align-items:center', '<img src="' + IMG + 'role_create/icon_avatar_' + info.prof + '_0.png" style="width:96px;height:96px;object-fit:contain;background:url(' + IMG + 'basics/icon_kuang.png) center/100%">' +
        '<div><b style="color:#7fd7ff;font-size:24px">' + esc(info.name) + '</b> Lv.' + info.level + ' ' + info.profName + '<br>经验 ' + info.exp + '/' + info.expNeed + '<br>战力 ' + info.power + (info.dead ? ' <span style="color:#f77">(阵亡 ' + info.reviveIn + 's)</span>' : '') + '</div>'));
      box.appendChild(el('div', 'margin-top:6px;color:#beaa5c', '生命 <span style="color:#ddd">' + info.hp + '/' + a.maxhp + '</span>　攻击 <span style="color:#ddd">' + a['min' + k] + '-' + a['max' + k] + '</span>　防御 <span style="color:#ddd">' + a.minac + '-' + a.maxac + '</span>'));
      box.appendChild(el('div', 'color:#beaa5c', '技能 <span style="color:#ddd">' + (info.skills.join('、') || '无') + '</span>'));
      box.appendChild(el('div', 'color:#beaa5c', '合击 <b style="color:#ffb000">' + info.combo.name + '</b> <span style="font-size:17px">' + info.combo.desc + '</span>'));
      var modes = el('div', 'margin-top:4px'); [['attack', '攻击'], ['follow', '跟随'], ['rest', '休息']].forEach(function(m){ modes.appendChild(b(m[1], function(){ return H.setMode(m[0]); }, info.mode === m[0])); });
      modes.appendChild(b(info.autoHeji ? '自动合击√' : '自动合击', function(){ return H.setAuto(!info.autoHeji); }, info.autoHeji)); box.appendChild(modes);
      // 10 个装备位 (点击卸下), 下方列出背包里英雄可穿的装备
      var eq = el('div', 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px');
      SLOT_ORDER.forEach(function(sl){ var s = info.equip[sl], c = s && stuffCfg(s);
        var d = el('div', 'width:94px;height:44px;border:1px solid #6b5a3a;background:#1c1710;font-size:15px;line-height:20px;text-align:center;cursor:pointer;overflow:hidden', '<small style="color:#887">' + PARTS[sl] + '</small><br>' + (c ? '<span class="q' + s.q + '" style="color:' + (QCOLOR[s.q] || '#ddd') + '">' + c.name + '</span>' : '-'));
        if (s) d.onclick = function(){ msg(H.unequip(sl)); draw(); }; eq.appendChild(d); });
      box.appendChild(eq);
      var can = G.role.bag.filter(function(s){ var c = stuffCfg(s); return c.type == 2 && c.needlevel <= info.level && (!c.profession || c.profession == info.prof); }).slice(0, 12);
      if (can.length) { var cl = el('div', 'margin-top:6px;font-size:17px;color:#beaa5c', '背包可穿: '); can.forEach(function(s){ var c = stuffCfg(s), x = el('span', 'display:inline-block;margin:2px 8px 2px 0;cursor:pointer;text-decoration:underline;color:' + (QCOLOR[s.q] || '#ddd'), c.name); x.onclick = function(){ msg(H.equip(s.uid)); draw(); }; cl.appendChild(x); }); box.appendChild(cl); }
    }
    draw();
  }
  window.heroPanel = heroPanel;
  var _build = buildScene; buildScene = function(){ _build.apply(this, arguments); UI.heroBar = null; buildBar(); };
  var _refresh = refreshScene; refreshScene = function(){ _refresh.apply(this, arguments); refreshBar(); };
  // 英雄卡片: 宝宝绘制基础上换成英雄头像 / 蓝色名字 / "英雄" 标签
  var _pets = drawPets; drawPets = function(){ _pets.apply(this, arguments);
    (UI.petItems || []).forEach(function(it){ var p = it._pet; if (!p || !p.isHero || it._heroStyled) return; it._heroStyled = true;
      var src = IMG + 'role_create/icon_avatar_' + p.prof + '_0.png';
      it.ref('monsterIcon').setImage(src); it.ref('monsterIcon').el.style.backgroundSize = 'contain';
      if (typeof POP !== 'undefined') POP.attach(it, it.ref('monsterIcon'), 'icon_avatar_' + p.prof + '_0', src, {rise: 2.1});
      var mn = it.ref('monsterRoot').find('name'); mn.setString(p.name); mn.setColor('#7fd7ff'); it.ref('monsterLevel').setString('英雄 Lv.' + G.role.hero.level); }); };
  // popups/top layers must stack above the battlefield's pop-out cards and FX canvas
  ['layerMain', 'layerPop', 'layerTop'].forEach(function(k, i){ if (UI[k]) UI[k].style.zIndex = String(1 + i * 100); });
  var st = document.createElement('style'); st.textContent = '@keyframes heroPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}'; document.head.appendChild(st);
})();
// dev/screenshot: ?seed=1&hero=2[&rage=1][&heji=1][&panel=1]
(function(){ var q = {}; location.search.slice(1).split('&').forEach(function(kv){ var a = kv.split('='); if (a[0]) q[a[0]] = decodeURIComponent(a[1] || '1'); });
  if (!q.hero) return;
  var tries = 0; setTimeout(function run(){ var H = window.Systems && Systems.hero; if (!H || !G.role || !UI.main) { if (tries++ < 40) setTimeout(run, 250); return; } if (G.role.level < H.UNLOCK_LEVEL) G.role.level = 30;
    if (!H.has() && q.hero !== '0') H.unlock(+q.hero || 2); if (H.has() && (q.rage || q.heji)) { G.role.hero.rage = 100; G.role.hero.hejiCd = 0; }
    if (q.panel) heroPanel(); if (q.heji) setTimeout(function(){ msg(H.heji()); }, +(q.hejiwait || 1500)); }, +(q.herowait || 2500)); })();
