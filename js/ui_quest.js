// [quest] 任务面板 (主线/每日/成就) + 战场右下角 "任务" 按钮 & 红点. 不改 ui.js: 包装 refreshScene
(function(){
  if (typeof refreshScene !== 'function') return;
  var QS = function(){ return window.Systems && Systems.quest; };
  function el(tag, css, html){ var d = document.createElement(tag); if (css) d.style.cssText = css; if (html != null) d.innerHTML = html; return d; }
  var BTN = 'background:url(' + IMG + 'basics/img_btn_0.png) center/100% 100% no-repeat;color:#f3e3b5;font:bold 22px "PingFang SC",sans-serif;text-align:center;cursor:pointer;text-shadow:0 1px 2px #000;';
  var DOT = 'position:absolute;right:2px;top:2px;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ff8a7a,#e01b0b 60%,#8a0800);box-shadow:0 0 4px #f00;';
  function rwText(list){ return list.map(function(x){ var n = Systems.itemName(x[0]); return '<span style="color:#ffd76a">' + n + '</span>x' + x[1]; }).join(' '); }

  function buildBtn(){
    if (!UI.battle || !QS()) return; var host = UI.battle.el, old = host.querySelector('.quest-btn'); if (old) old.remove();
    var b = el('div', BTN + 'position:absolute;right:14px;bottom:64px;z-index:30;width:92px;height:52px;line-height:52px;pointer-events:auto;', '任务'); b.className = 'quest-btn';
    var d = el('div', DOT); b.appendChild(d); b.onclick = function(){ questPanel(); }; host.appendChild(b); UI.questBtn = {btn: b, dot: d};
  }
  function refreshBtn(){ if (!UI.battle || !QS() || !G.role) return; if (!UI.questBtn || !UI.questBtn.btn.isConnected) buildBtn(); if (UI.questBtn) UI.questBtn.dot.style.display = QS().red().any ? '' : 'none'; }
  var _rs = refreshScene; refreshScene = function(){ var r = _rs.apply(this, arguments); try { refreshBtn(); } catch (e) {} return r; };

  function questPanel(tab){
    var Q = QS(); if (!Q) return; tab = tab || UI.questTab || 'main';
    var p = popup('tipMapDesc'), root = p.find('uiRoot');
    root.children.forEach(function(c){ var n = c.n || (c.d && c.d.n) || ''; if (!/img_tip_3_bg|labName/.test(n)) c.setActive(false); });
    p.findDeep('labName').setString('任 务');
    var close = el('div', 'position:absolute;right:6px;top:4px;width:56px;height:56px;background:url(' + IMG + 'basics/img_close.png) center/contain no-repeat;cursor:pointer;z-index:2'); close.onclick = function(){ closePopup(p); }; root.el.appendChild(close);
    var tabs = el('div', 'position:absolute;left:40px;top:66px;width:530px;display:flex;gap:8px;'); root.el.appendChild(tabs);
    var box = el('div', 'position:absolute;left:40px;top:122px;width:530px;height:390px;color:#dcd3c7;font:19px/28px "PingFang SC",sans-serif;overflow:auto;'); root.el.appendChild(box);
    function row(name, desc, pr, reward, state, fn){
      var r = el('div', 'position:relative;margin:0 0 8px;padding:8px 128px 8px 12px;min-height:76px;background:url(' + IMG + 'basics/img_bg_desc.png) center/100% 100% no-repeat;');
      var pct = Math.min(1, pr[0] / pr[1]);
      r.innerHTML = '<b style="color:#fff3c4;font-size:20px">' + name + '</b> <span style="color:#9fe28a;font-size:17px">(' + pr[0] + '/' + pr[1] + ')</span><br><span style="font-size:16px;color:#c9bfae">' + desc + '</span>' +
        '<div style="height:6px;margin:4px 0;background:rgba(0,0,0,.5);border-radius:3px"><div style="height:100%;width:' + (pct * 100) + '%;background:linear-gradient(#ffe27a,#d08a10);border-radius:3px"></div></div><span style="font-size:15px">奖励: ' + rwText(reward) + '</span>';
      var b = el('div', BTN + 'position:absolute;right:8px;top:50%;margin-top:-23px;width:106px;height:46px;line-height:46px;font-size:19px;', state === 'done' ? '已领取' : state === 'can' ? '领取' : '进行中');
      if (state !== 'can') b.style.filter = 'grayscale(1) brightness(.8)'; else { b.style.filter = 'drop-shadow(0 0 6px #ffd76a)'; b.appendChild(el('div', DOT)); }
      b.onclick = function(){ if (state !== 'can') return; msg(fn()); draw(); }; r.appendChild(b); box.appendChild(r);
    }
    function draw(){
      var red = Q.red(); tabs.innerHTML = ''; box.innerHTML = '';
      [['main', '主线任务'], ['daily', '每日任务'], ['ach', '成 就']].forEach(function(t){
        var b = el('div', BTN + 'position:relative;width:150px;height:48px;line-height:48px;font-size:20px;' + (t[0] === tab ? 'background-image:url(' + IMG + 'basics/img_btn_1.png);color:#fff;' : 'filter:brightness(.8);'), t[1]);
        if (red[t[0]]) b.appendChild(el('div', DOT)); b.onclick = function(){ tab = UI.questTab = t[0]; draw(); }; tabs.appendChild(b); });
      if (tab === 'main') { var l = Q.main(); if (!l.length) box.appendChild(el('div', 'text-align:center;margin-top:120px', '主线任务已全部完成'));
        l.forEach(function(t){ row(t.name, t.desc || '', t.progress, t.reward, t.canClaim ? 'can' : 'doing', function(){ return Q.claimMain(t.id); }); }); }
      if (tab === 'daily') {
        var a = Q.activity(), cb = el('div', 'position:relative;height:96px;margin:0 6px 10px;');
        cb.innerHTML = '<div style="font-size:17px">今日活跃度 <b style="color:#ffd76a">' + a + '</b>/100 <span style="color:#998;font-size:15px">(每日 0 点重置)</span></div>' +
          '<div style="position:absolute;left:0;right:30px;top:52px;height:10px;background:rgba(0,0,0,.55);border-radius:5px"><div style="height:100%;width:' + Math.min(100, a) + '%;background:linear-gradient(#9fff7a,#2f9a10);border-radius:5px"></div></div>';
        Q.chests().forEach(function(c){ var ch = el('div', 'position:absolute;top:28px;left:calc(' + c.need + '% - 52px);width:56px;height:56px;cursor:pointer;text-align:center;');
          ch.innerHTML = '<img src="' + IMG + 'basics/icon_kuang.png" style="position:absolute;inset:0;width:56px;height:56px"><div style="position:absolute;inset:6px;font-size:28px;line-height:44px;' + (c.opened ? 'filter:grayscale(1);opacity:.6' : '') + '">🎁</div><div style="position:absolute;top:56px;width:56px;font-size:14px;line-height:16px">' + c.need + '</div>';
          if (c.canOpen) { ch.style.animation = 'heroPulse 1s infinite'; ch.appendChild(el('div', DOT)); }
          ch.title = rwText(c.reward).replace(/<[^>]+>/g, ''); ch.onclick = function(){ msg(c.canOpen ? Q.openChest(c.id) : (c.opened ? '已领取' : '活跃度达到 ' + c.need + ' 可领取: ' + ch.title)); draw(); }; cb.appendChild(ch); });
        box.appendChild(cb);
        Q.daily().forEach(function(t){ row(t.name + ' <span style="color:#7fd7ff;font-size:15px">活跃+' + t.act + '</span>', t.desc, t.progress, t.reward, t.done ? 'done' : t.canClaim ? 'can' : 'doing', function(){ return Q.claimDaily(t.id); }); });
      }
      if (tab === 'ach') Q.achievements().sort(function(x, y){ return (y.canClaim - x.canClaim) || (x.done - y.done); }).forEach(function(t){ row(t.name, t.desc, t.progress, t.reward, t.done ? 'done' : t.canClaim ? 'can' : 'doing', function(){ return Q.claimAch(t.id); }); });
    }
    draw(); return p;
  }
  window.questPanel = questPanel;
  var st = document.createElement('style'); st.textContent = '@keyframes heroPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}'; document.head.appendChild(st);
  // dev/screenshot: ?quest=main|daily|ach  (&qdemo=1 造一些进度)
  var q = {}; location.search.slice(1).split('&').forEach(function(kv){ var a = kv.split('='); if (a[0]) q[a[0]] = decodeURIComponent(a[1] || '1'); });
  if (!q.quest) return;
  setTimeout(function(){ var Q = QS(); if (!Q || !G.role) return; if (q.qdemo) { Q.emit('kill', 120); Q.emit('elite', 4); Q.emit('enhance', 3); Q.claimDaily('d_kill'); Q.claimDaily('d_enh'); G.role.level = Math.max(G.role.level, 12); }
    if (q.quest !== '0') questPanel(q.quest === '1' ? 'main' : q.quest); }, +(q.questwait || 2500));
})();
