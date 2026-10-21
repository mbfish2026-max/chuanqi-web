// [die UI] 原版 role_die：回城 / 看广告原地复活 / 20 元宝原地复活
(function(){
  if(!window.Systems || !Systems.die) return;
  var D = Systems.die;

  // M3: 看广告原地复活每日次数上限（网页无广告 SDK，避免无限免费复活）
  var AD_REVIVE_MAX = 3;
  function adDaily(){
    var r = G.role; if(!r) return null;
    if(Systems.ensure) Systems.ensure();
    var t = Systems.today ? Systems.today(Systems.now ? Systems.now() : new Date()) : new Date().toDateString();
    if(!r.daily || r.daily.date != t) r.daily = {date:t, videoBuild:0, videoBag:0};
    if(r.daily.videoRevive == null) r.daily.videoRevive = 0;
    return r.daily;
  }
  function adLeft(){ var d = adDaily(); return d ? Math.max(0, AD_REVIVE_MAX - d.videoRevive) : 0; }
  function adRevive(){
    var d = adDaily(); if(!d) return '无角色';
    if(d.videoRevive >= AD_REVIVE_MAX) return '今日广告复活次数已用完 ('+AD_REVIVE_MAX+'/'+AD_REVIVE_MAX+')';
    var res = D.reviveLocal(true);
    if(res && res.indexOf('OK') === 0){ d.videoRevive++; if(typeof save === 'function') save(); }
    return res;
  }
  window.CQ_DIE_AD = {MAX: AD_REVIVE_MAX, left: adLeft, revive: adRevive};

  function bindDiePopup(p){
    p.findDeep('layout') && p.findDeep('layout').layout && p.findDeep('layout').layout();
    var btnCity = p.findDeep('btnCity');
    var btnVideo = p.findDeep('btnVideo');
    var btnLocal = p.findDeep('btnLocal');
    if(btnCity) btnCity.setActive(true);
    if(btnVideo) btnVideo.setActive(true);
    if(btnLocal) btnLocal.setActive(true);
    // 元宝价签
    if(btnLocal){
      var labs = [];
      (function walk(n){ if(!n) return; if(n.d && n.d.lb) labs.push(n); (n.children||[]).forEach(walk); })(btnLocal);
      labs.forEach(function(lb){ if(/^\d+$/.test((lb.d.lb.s||'').trim())) lb.setString(String(D.YB_LOCAL)); });
    }
    function finish(res){
      if(res && res.indexOf('OK') === 0){ closePopup(p); if(typeof refreshAll === 'function') refreshAll(); }
      else if(res) toast(res);
    }
    if(btnCity) btnCity.on(function(){ finish(D.reviveCity()); });
    function paintVideo(){
      if(!btnVideo) return;
      var left = adLeft();
      var lbs = [];
      (function walk(n){ if(!n) return; if(n.d && n.d.lb) lbs.push(n); (n.children||[]).forEach(walk); })(btnVideo);
      var tag = btnVideo.el.querySelector('.die-ad-left');
      if(!tag){ tag = document.createElement('div'); tag.className = 'die-ad-left';
        tag.style.cssText = 'position:absolute;left:-20px;right:-20px;top:-30px;text-align:center;font-size:20px;line-height:24px;color:#ffd76a;pointer-events:none;white-space:nowrap;';
        if(getComputedStyle(btnVideo.el).position === 'static') btnVideo.el.style.position = 'relative';
        btnVideo.el.appendChild(tag); }
      tag.textContent = '今日剩余 ' + left + '/' + AD_REVIVE_MAX;
      btnVideo.el.style.filter = left > 0 ? '' : 'grayscale(1) brightness(.7)';
      btnVideo.disabled = false; // 仍可点，点了提示次数用完
    }
    paintVideo();
    if(btnVideo) btnVideo.on(function(){
      // 网页无广告 SDK：视为成功，但受每日次数限制
      var res = adRevive();
      paintVideo();
      finish(res);
    });
    if(btnLocal) btnLocal.on(function(){ finish(D.reviveLocal(false)); });
  }

  window.showRoleDie = function(map){
    if(!UI.main) return;
    // 避免叠多个死亡窗
    if(UI._diePopup && UI._diePopup.el && UI._diePopup.el.parentNode){
      try{ UI._diePopup.destroy(); }catch(e){}
    }
    var p = popup('role_die');
    UI._diePopup = p;
    bindDiePopup(p);
  };

  // 覆盖 ui.js 里「先 warp 再弹窗」的旧包装
  roleDie = function(){ D.onDie(); };

  // ?tip=die 开发钩子
  var q = {};
  try{ location.search.slice(1).split('&').forEach(function(kv){ var a=kv.split('='); if(a[0]) q[a[0]]=decodeURIComponent(a[1]||'1'); }); }catch(e){}
  if(q.tip === 'die'){
    setTimeout(function(){
      if(!G.role) return;
      G.role.hp = 0; G.dead = true; G.paused = true;
      showRoleDie(mapCfg());
    }, +(q.wait || 1600));
  }
})();
