// [prerogative UI] tipPrerogative / tipPrerogativeTip；福利充值页特权页签（元宝购买）
(function(){
  if(!window.Systems || !Systems.prerogative) return;
  var P = Systems.prerogative;

  function openTip(kind){
    P.ensure();
    var p = popup('tipPrerogativeTip');
    var wxts = p.findDeep('uiWxts'), zs = p.findDeep('uiZstq'), hs = p.findDeep('uiHstq');
    if(wxts) wxts.setActive(kind === 'wxts');
    if(zs) zs.setActive(kind === 'zstq');
    if(hs) hs.setActive(kind === 'hstq');

    function setLab(node, text){ if(node && node.setString) node.setString(text); }

    function wireClaim(root, k){
      if(!root) return;
      var sy = root.findDeep(k === 'zs' ? 'labZsSy' : 'labHsSy');
      var active = P.isActive(k);
      if(sy){ setLab(sy, P.fmtRemain(k) || ''); sy.setActive(!!active); }
      var btnGo = root.findDeep('btn_qwjh');
      var btnLq = root.findDeep('btn_lingqu');
      if(active){
        if(btnGo) btnGo.setActive(false);
        if(btnLq){
          btnLq.setActive(true);
          var pr = P.get();
          var can = k === 'zs' ? !!pr._zhanshen100 : !!pr._huishou100;
          (function walk(n){
            if(!n) return;
            if(n.d && n.d.lb){
              var s = (n.d.lb.s || '');
              if(/领取|已领取/.test(s)) n.setString(can ? '领取' : '已领取');
            }
            (n.children || []).forEach(walk);
          })(btnLq);
          btnLq.on(function(){
            var res = P.claimYuanbao(k);
            if(res && res.indexOf('OK') === 0){ toast(res.slice(3)); closePopup(p); if(typeof refreshAll==='function') refreshAll(); }
            else toast(res || '');
          });
        }
      } else {
        if(btnLq) btnLq.setActive(false);
        if(btnGo){
          btnGo.setActive(true);
          btnGo.on(function(){ closePopup(p); openShop(k === 'zs' ? 2 : 1); });
        }
      }
    }
    if(kind === 'zstq') wireClaim(zs, 'zs');
    if(kind === 'hstq') wireClaim(hs, 'hs');
    if(kind === 'wxts'){
      var go = wxts && wxts.findDeep('btn_qwjh');
      if(go) go.on(function(){ closePopup(p); openShop(2); });
    }
    var cls = p.findDeep('img_x') || p.findDeep('img_close');
    if(cls) cls.on(function(){ closePopup(p); });
    else if(p.findDeep('mask')) p.findDeep('mask').on(function(){ closePopup(p); });
  }

  function openShop(type2){
    P.ensure();
    var p = popup('tipPrerogative');
    var cls = p.findDeep('img_x') || p.findDeep('img_close');
    if(cls) cls.on(function(){ closePopup(p); });
    var list = p.findDeep('prerogative');
    var content = list && list.find('view/content');
    if(!content){ toast('特权列表缺失'); return; }
    content.removeAllChildren();
    content.d.ly = {t:2, rs:1, sy:8, pt:8, pb:8, pl:0, pr:0, sx:0};
    var rows = P.shopList(type2);
    if(!rows.length){
      rows = type2 == 1
        ? [{type2:1,name:'回收特权',rmb:30,describe:'回收满额、离线12小时等（30天）'},
           {type2:1,name:'回收特权',rmb:68,describe:'回收满额、离线12小时等（90天）'},
           {type2:1,name:'回收+战神',rmb:128,describe:'两项特权各 90 天'}]
        : [{type2:2,name:'战神特权',rmb:30,describe:'经验+10%、BOSS刷新减半等（30天）'},
           {type2:2,name:'战神特权',rmb:68,describe:'经验+10%、BOSS刷新减半等（90天）'},
           {type2:2,name:'回收+战神',rmb:128,describe:'两项特权各 90 天'}];
    }
    rows.forEach(function(row){
      var it = inst('itemPrerogativeTip');
      var title = it.ref('labTitle');
      var typ = it.ref('labTitleType');
      var desc = it.ref('labDesc');
      var tip = it.ref('labTip');
      var card = row.rmb >= 128 ? '（季卡·双特权）' : (row.rmb >= 68 ? '（季卡）' : '（月卡）');
      if(title) title.setString(row.name || '');
      if(typ) typ.setString(card);
      if(desc) desc.setString(row.describe || '');
      var cost = P.ybCost(row.rmb);
      if(tip) tip.setString(cost + ' 元宝购买');
      var buy = it.findDeep('btn_buy');
      if(buy){
        buy.on(function(){
          var res = P.buy(row.rmb, row.rmb === 128 ? 'both' : row.type2);
          if(res && res.indexOf('OK') === 0){ toast(res.slice(3)); closePopup(p); if(typeof refreshAll==='function') refreshAll(); }
          else toast(res || '');
        });
      }
      content.addChild(it, true);
    });
    if(content.layout) content.layout();
    var view = list.find('view'); if(view) view.el.style.overflowY = 'auto';
  }

  function fillPreroPanel(fr){
    P.ensure();
    ['uiChongzhi','uiLibao','uiPrerogative'].forEach(function(k){
      var n = fr.ref(k); if(n) n.setActive(k === 'uiPrerogative');
    });
    var list = fr.ref('prerogativelist'); if(!list) return;
    var content = list.find('view/content'); if(!content) return;
    content.removeAllChildren();
    content.d.ly = {t:2, rs:1, sy:10, pt:8, pb:8, pl:0, pr:0, sx:0};
    [{type2:1, key:'hs'}, {type2:2, key:'zs'}].forEach(function(row){
      var it = inst('itemPrerogative');
      var hs = it.findDeep('uiHuiS'), zs = it.findDeep('uiZhanS');
      if(hs) hs.setActive(row.type2 === 1);
      if(zs) zs.setActive(row.type2 === 2);
      var root = row.type2 === 1 ? hs : zs;
      var sy = root && root.findDeep(row.type2 === 1 ? 'labHsShengyu' : 'labZsShengyu');
      var active = P.isActive(row.key);
      if(sy){ sy.setString(active ? P.fmtRemain(row.key) : '未激活'); sy.setActive(true); }
      var buy = root && root.findDeep('btn_buy');
      if(buy){
        buy.setActive(true);
        var lab = buy.findDeep('labtip'); if(lab) lab.setString(active ? '续费' : '购买特权');
        buy.on(function(){ openShop(row.type2); });
      }
      // 详情 tip
      var tipImg = root && (root.findDeep('img_tip') || root.findDeep('img_tq'));
      if(tipImg) tipImg.on(function(){ openTip(row.key === 'zs' ? 'zstq' : 'hstq'); });
      content.addChild(it, true);
    });
    if(content.layout) content.layout();
    var view = list.find('view'); if(view) view.el.style.overflowY = 'auto';
  }

  // 充值页：特权可用；现金充值仍拒绝
  window.fuliRecharge = function(node){
    P.ensure();
    function show(tab){ // 0 充值 1 礼包 2 特权
      ['uiChongzhi','uiLibao','uiPrerogative'].forEach(function(k, i){
        var n = node.ref(k); if(n) n.setActive(i === tab);
      });
      [['btnChongzhi',0],['btnLibao',1],['btnPrerogative',2]].forEach(function(pair){
        var b = node.ref(pair[0]); if(!b) return;
        b.setImage && b.setImage(IMG + 'basics/img_btn_' + (pair[1] === tab ? 1 : 0) + '.png');
      });
      if(tab === 2) fillPreroPanel(node);
      if(tab === 0 || tab === 1) toast('离线复刻版不提供现金充值，请用元宝购买特权');
    }
    var b0 = node.ref('btnChongzhi'), b1 = node.ref('btnLibao'), b2 = node.ref('btnPrerogative');
    if(b0) b0.on(function(){ show(0); });
    if(b1) b1.on(function(){ show(1); });
    if(b2) b2.on(function(){ show(2); });
    show(2);
  };

  // 接到 main_fuli
  if(typeof PAGES !== 'undefined'){
    var _mf = PAGES.main_fuli;
    PAGES.main_fuli = function(p){
      var tabs = [['btnCoin', 'fuliCoin'], ['btnYuanbao', 'fuliRecharge'], ['btnFuli', 'fuliSign'], ['btnExchange', 'fuliExchange']];
      var root = p.ref('uiRoot');
      function open(i){
        tabs.forEach(function(t, j){ p.ref(t[0]).setImage(IMG + 'basics/img_btn_' + (i === j ? 1 : 0) + '.png'); });
        root.removeAllChildren();
        var fn = {fuliSign: fuliSign, fuliExchange: fuliExchange, fuliCoin: fuliPay, fuliRecharge: fuliRecharge}[tabs[i][1]];
        var pf = {fuliCoin: 'fuli_coin', fuliRecharge: 'fuli_recharge', fuliSign: 'fuli_sign', fuliExchange: 'fuli_exchange'}[tabs[i][1]];
        var node = inst(pf); root.addChild(node);
        if(typeof fn === 'function'){ try{ fn(node); }catch(e){ console.warn(e); } }
        else toast('该福利功能尚未实现');
      }
      tabs.forEach(function(t, i){ p.ref(t[0]).on(function(){ open(i); }); });
      open(UI.fuliTab === 'recharge' ? 1 : 2);
    };
  }

  window.openPrerogativeTip = openTip;
  window.openPrerogativeShop = openShop;

  var q = {};
  try{ location.search.slice(1).split('&').forEach(function(kv){ var a=kv.split('='); if(a[0]) q[a[0]]=decodeURIComponent(a[1]||'1'); }); }catch(e){}
  if(q.tip === 'prero' || q.tip === 'prerogative'){
    setTimeout(function(){ openTip(q.kind === 'zs' ? 'zstq' : 'hstq'); }, +(q.wait || 1600));
  }
  if(q.tip === 'preroshop'){
    setTimeout(function(){ openShop(+(q.type2 || 1)); }, +(q.wait || 1600));
  }
})();
