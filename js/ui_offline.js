// [offline UI] 原版 tipOffline：直接领取 / 双倍(广告) / 五倍(元宝)；关闭=×1
(function(){
  if(!window.Systems || !Systems.offline) return;
  var OFF = Systems.offline;

  function fmtTime(sec){
    var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60;
    return ('0' + h).slice(-2) + '小时' + ('0' + m).slice(-2) + '分钟';
  }

  function bindOffline(p, off){
    var labTime = p.ref('labTime') || p.findDeep('labtime');
    var labHour = p.ref('labHour') || p.findDeep('labhour');
    var labExp = p.ref('labExp');
    var labCoin = p.ref('labCoin');
    var labYb = p.ref('labYuanBao');
    if(labTime) labTime.setString(fmtTime(off.sec));
    if(labHour) labHour.setString(off.limitHour >= 12 ? '12小时(原6小时)' : '6小时');
    if(labExp) labExp.setString(String(off.exp));
    if(labCoin) labCoin.setString(String(off.gold));
    if(labYb) labYb.setString(String(off.costYuanbao));
    // 也更新 btnMulti 下的 labdesc
    var multi = p.findDeep('btnMulti');
    if(multi){
      var desc = multi.findDeep('labdesc');
      if(desc) desc.setString(String(off.costYuanbao));
      multi.setActive(true);
    }
    var btnVideo = p.findDeep('btnVideo'); if(btnVideo) btnVideo.setActive(true);
    var btnFree = p.findDeep('btnFree');
    var btnNode = p.findDeep('btnNode'); if(btnNode && btnNode.layout) btnNode.layout();

    var closed = false;
    function take(fn){
      if(closed || off._claimed) return;
      var res = fn();
      if(res && res.indexOf('OK') === 0){
        closed = true; closePopup(p); toast(res.slice(3));
        if(typeof refreshAll === 'function') refreshAll();
      } else if(res) toast(res);
    }
    if(btnFree) btnFree.on(function(){ take(function(){ return OFF.claim(off, 1); }); });
    if(btnVideo) btnVideo.on(function(){
      // 网页无广告：直接 ×2
      take(function(){ return OFF.claim(off, 2); });
    });
    if(multi) multi.on(function(){ take(function(){ return OFF.claimYuanbao(off); }); });
    // 关闭 = 免费 ×1（原版 onBtnCloseClick）
    var cls = p.findDeep('img_close');
    if(cls) cls.on(function(){ take(function(){ return OFF.claim(off, 1); }); });
  }

  window._showOfflineImpl = window.showOffline = function(off){
    if(!off) return;
    // 兼容旧调用 {sec,exp,gold}：补全字段，且若已发放过则只展示
    if(off.limitHour == null){
      off.limitHour = OFF.limitHour();
      off.costYuanbao = off.costYuanbao || 0;
      off.pending = !!off.pending;
    }
    var p = popup('tipOffline');
    bindOffline(p, off);
  };

  // ?tip=offline 用真实算法生成示例
  var q = {};
  try{ location.search.slice(1).split('&').forEach(function(kv){ var a=kv.split('='); if(a[0]) q[a[0]]=decodeURIComponent(a[1]||'1'); }); }catch(e){}
  if(q.tip === 'offline'){
    setTimeout(function(){
      if(!G.role) return;
      // 伪造 2h 离线
      var off = OFF.calc(Date.now() - 2 * 3600 * 1000);
      if(!off){ off = {sec:7200, exp:100, gold:100, costYuanbao:20, limitHour:OFF.limitHour(), pending:true}; }
      showOffline(off);
    }, +(q.wait || 1600));
  }
})();
