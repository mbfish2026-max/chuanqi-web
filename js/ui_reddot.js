// [reddot] 主界面页签 / 福利签到 / 历练可领 / 任务入口红点（原版 img_red）
(function(){
  if(typeof refreshAll !== 'function') return;
  var DOT_CSS = 'position:absolute;right:4px;top:4px;width:18px;height:18px;z-index:6;pointer-events:none;' +
    'background:url(' + (typeof IMG!=='undefined'?IMG:'assets/images/') + 'basics/img_red.png) center/contain no-repeat;';
  var CSS_FALLBACK = 'position:absolute;right:4px;top:4px;width:14px;height:14px;border-radius:50%;z-index:6;pointer-events:none;' +
    'background:radial-gradient(circle at 35% 35%,#ff8a7a,#e01b0b 60%,#8a0800);box-shadow:0 0 4px #f00;';

  function elDot(){
    var d = document.createElement('div');
    d.className = 'cq-reddot';
    d.style.cssText = DOT_CSS;
    d.onerror = null;
    // 若图未加载成功，refresh 时仍可见；用 CSS 兜底也可以叠一张
    return d;
  }
  function ensure(host, key){
    if(!host || !host.el) return null;
    var box = host.el;
    if(getComputedStyle(box).position === 'static') box.style.position = 'relative';
    var d = box.querySelector('.cq-reddot[data-k="'+key+'"]');
    if(!d){ d = elDot(); d.setAttribute('data-k', key); box.appendChild(d); }
    return d;
  }
  function setDot(host, key, on){
    var d = ensure(host, key); if(!d) return;
    d.style.display = on ? '' : 'none';
  }
  function setElDot(dom, key, on){
    if(!dom) return;
    if(getComputedStyle(dom).position === 'static') dom.style.position = 'relative';
    var d = dom.querySelector('.cq-reddot[data-k="'+key+'"]');
    if(!d){ d = elDot(); d.setAttribute('data-k', key); dom.appendChild(d); }
    d.style.display = on ? '' : 'none';
  }

  function fuliRed(){
    var F = window.Systems && Systems.fuli; if(!F || !G.role) return {any:false, sign:false, week:false, prero:false};
    var sign = !!F.canSign();
    var week = !!F.canSignWeek();
    var prero = false;
    var P = Systems.prerogative;
    if(P && P.ensure){
      try {
        var p = P.get();
        if(P.isActive('hs') && p._huishou100) prero = true;
        if(P.isActive('zs') && p._zhanshen100) prero = true;
      } catch(e){}
    }
    return {any: sign||week||prero, sign:sign, week:week, prero:prero};
  }
  function storyRed(){
    var L = window.Systems && Systems.lilian; if(!L || !G.role) return false;
    try { return L.chapters().some(function(c){ return !c.locked && c.claimable > 0; }); } catch(e){ return false; }
  }
  function questRed(){
    var Q = window.Systems && Systems.quest; if(!Q || !G.role) return false;
    try { return !!Q.red().any; } catch(e){ return false; }
  }

  function bagFull(){
    var S = window.Systems; if(!S || !S.bag || !G.role) return false;
    try { return !!S.bag.isFull(); } catch(e){ return false; }
  }

  function styleFull(host){
    if(!host || !host.el) return;
    var d = host.el.querySelector('.cq-reddot[data-k="bagfull"]'); if(!d || d._full) return;
    var disp = d.style.display;
    d._full = 1;
    d.textContent = '满';
    d.style.cssText = 'position:absolute;right:-6px;top:-6px;width:36px;height:36px;line-height:36px;border-radius:50%;z-index:7;pointer-events:none;' +
      'text-align:center;font-size:22px;font-weight:bold;color:#fff;background:radial-gradient(circle at 35% 35%,#ff8a7a,#e01b0b 60%,#8a0800);box-shadow:0 0 6px #f00;';
    d.style.display = disp;
  }

  function refreshNav(){
    if(!UI.main || !G.role) return;
    var fr = fuliRed();
    setDot(UI.main.ref('btnStory'), 'story', storyRed());
    setDot(UI.main.ref('btnRole'), 'bagfull', bagFull());   // G8 背包满红点（带「满」字，常驻到有空格）
    styleFull(UI.main.ref('btnRole'));
    if(UI.page && UI.pageKey === 'main_role'){ try{ setDot(UI.page.findDeep('btnBag'), 'bagfull', bagFull()); }catch(e){} }
    setDot(UI.main.ref('btnFuli'), 'fuli', fr.any);
    // 战斗页任务钮已有红点；这里再刷一次以防遗漏
    if(UI.questBtn && UI.questBtn.dot) UI.questBtn.dot.style.display = questRed() ? '' : 'none';
  }

  function refreshFuliPage(){
    if(!UI.page || UI.pageKey !== 'main_fuli') return;
    var fr = fuliRed();
    var p = UI.page;
    try {
      setDot(p.ref('btnFuli'), 'sign', fr.sign || fr.week);
      setDot(p.ref('btnYuanbao'), 'prero', fr.prero);
    } catch(e){}
  }

  function refreshStoryPage(){
    if(!UI.page || UI.pageKey !== 'main_story') return;
    // 可领任务按钮已在 ui_systems 文案区分；给章项 labrecommond 旁补红点较难，
    // 页签红点已足够。若展开章有一键领取 bar，给 bar 加红点。
    try {
      var bars = UI.page.el.querySelectorAll('.cc');
      bars.forEach(function(bar){
        if(bar.textContent && /一键领取/.test(bar.textContent)){
          setElDot(bar, 'claimall', true);
        }
      });
    } catch(e){}
  }

  function refresh(){
    try { refreshNav(); refreshFuliPage(); refreshStoryPage(); } catch(e){}
  }

  var _ra = refreshAll;
  refreshAll = function(){ var r = _ra.apply(this, arguments); try { refresh(); } catch(e){} return r; };

  // 导出供测试
  window.CQ_REDDOT = {refresh:refresh, bagFull:bagFull, fuliRed:fuliRed, storyRed:storyRed, questRed:questRed};
})();
