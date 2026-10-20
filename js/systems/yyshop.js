// [yyshop] 原版 RoleYyShop：云游商人 — 按品质回收（percentYy%）+ 药店购买；古玩 103038 刷新比例
// 数据：shop.txt id=3002 药店；role.percentYy / yyReclaim / refreshYy；特权 _yyshop_priceup 回收翻倍
(function(S){
  var ITEM_GUWAN = 103038;
  var MAX_RECLAIM = 200;
  var COST_REFRESH = 1;
  var REFRESH_MS = 1800000; // 30min
  var VER = 5;

  function ensure(r){
    r = r || G.role; if(!r) return null;
    if(r.percentYy == null) r.percentYy = 0;
    if(r.yyReclaim == null) r.yyReclaim = MAX_RECLAIM;
    if(r.refreshYy == null) r.refreshYy = 0;
    if((r.ver||1) < VER) r.ver = VER;
    // 特权抬高回收次数上限
    var p = r.prerogative;
    if(p && p._yyshopup && r.yyReclaim < 400) { /* 特权侧已设 400 */ }
    return r;
  }

  function maxReclaim(r){
    r = ensure(r);
    var p = r && r.prerogative;
    return (p && (p._yyshopup || (p._huishoutime && Date.now() <= p._huishoutime))) ? 400 : MAX_RECLAIM;
  }

  function percent(r){
    r = ensure(r);
    if(!r.percentYy) r.percentYy = Math.floor(150 * Math.random() + 50); // 50~199
    return r.percentYy;
  }

  function refreshPercent(r){
    r = ensure(r);
    r.percentYy = Math.floor(150 * Math.random() + 50);
    return r.percentYy;
  }

  function tickTimer(r){
    r = ensure(r);
    var now = Date.now();
    if(!r.refreshYy || r.refreshYy <= now){
      refreshPercent(r);
      r.refreshYy = now + REFRESH_MS;
    }
    return Math.max(0, r.refreshYy - now);
  }

  function guwanCount(){ return typeof countItem === 'function' ? countItem(ITEM_GUWAN) : 0; }

  function useGuwanRefresh(){
    var r = ensure(); if(!r) return '无角色';
    if(guwanCount() < COST_REFRESH) return '古玩不足';
    if(typeof consumeItem === 'function') consumeItem(ITEM_GUWAN, COST_REFRESH);
    refreshPercent(r);
    if(typeof save === 'function') save();
    return S.ok('回收比例刷新为 '+r.percentYy+'%');
  }

  function drugList(){
    var list = (CFG.shop && CFG.shop.list) || [];
    return list.filter(function(x){ return x && x.id === 3002 && x.items; });
  }

  function buyDrug(shopRow, n){
    var r = ensure(); if(!r) return '无角色';
    if(!shopRow || !shopRow.items) return '无效商品';
    n = Math.max(1, Math.min(shopRow.oncenum || 99, Math.floor(n || 1)));
    var price = Math.abs(shopRow.price || 0) * n;
    var cType = shopRow.currencytype || 1; // 1 金币
    if(cType === 1){
      if(r.gold < price) return '金币不足';
      r.gold -= price;
    } else {
      if(r.yuanbao < price) return '元宝不足';
      r.yuanbao -= price;
    }
    addItem(createStuff(shopRow.items, n));
    if(typeof save === 'function') save();
    var name = (cfg('item', shopRow.items)||{}).name || shopRow.name || shopRow.items;
    return S.ok('购买 '+name+' x'+n+' (−'+price+(cType===1?'金币':'元宝')+')');
  }

  // 按品质回收：bet = percentYy/100；channel=2 扣 yyReclaim
  function reclaimByQuality(q, includeNonsuch){
    var r = ensure(); if(!r) return '无角色';
    var bet = percent(r) / 100;
    var list = r.bag.filter(function(s){
      return isEquip(s) && s.q === q && !s.lock && (includeNonsuch || !s.nonsuch);
    });
    if(!list.length) return '没有可回收的装备';
    if(r.yyReclaim <= 0) return '今日回收次数已用完';
    var take = list.slice(0, r.yyReclaim);
    var gold = 0;
    take.forEach(function(s){
      gold += Math.ceil((stuffCfg(s).sellprice || 0) * s.q * bet);
      removeItem(s.uid);
    });
    // 特权回收翻倍
    var p = r.prerogative;
    if(p && p._yyshop_priceup) gold *= 2;
    r.gold += gold;
    r.yyReclaim = Math.max(0, r.yyReclaim - take.length);
    if(typeof save === 'function') save();
    return S.ok('回收 '+take.length+' 件, 获得金币 '+gold+' ('+percent(r)+'%)');
  }

  function previewQuality(q, includeNonsuch){
    var r = ensure(); if(!r) return { count:0, gold:0 };
    var bet = percent(r) / 100;
    var list = r.bag.filter(function(s){
      return isEquip(s) && s.q === q && !s.lock && (includeNonsuch || !s.nonsuch);
    });
    var gold = 0;
    list.forEach(function(s){ gold += Math.ceil((stuffCfg(s).sellprice || 0) * s.q * bet); });
    var p = r.prerogative;
    if(p && p._yyshop_priceup) gold *= 2;
    return { count: list.length, gold: gold, bet: percent(r) };
  }

  function resetReclaimByAd(){
    var r = ensure(); if(!r) return '无角色';
    r.yyReclaim = maxReclaim(r);
    if(typeof save === 'function') save();
    return S.ok('回收次数已重置');
  }

  function delayRefreshByAd(){
    var r = ensure(); if(!r) return '无角色';
    r.refreshYy = (r.refreshYy || Date.now()) + REFRESH_MS;
    if(typeof save === 'function') save();
    return S.ok('刷新计时延长 30 分钟');
  }

  function info(){
    var r = ensure(); if(!r) return null;
    var left = tickTimer(r);
    return {
      percent: percent(r),
      yyReclaim: r.yyReclaim,
      maxReclaim: maxReclaim(r),
      guwan: guwanCount(),
      refreshLeft: left,
      drugs: drugList()
    };
  }

  S.on('loaded', function(r){ if(r) ensure(r); });

  // UI 入口：Systems.openYyShop(downNode) —— ui.js drawRoleTab 已挂钩
  function openYyShop(down){
    if(typeof window._openYyShopUI === 'function') return window._openYyShopUI(down);
    return null;
  }

  S.yyshop = {
    ITEM_GUWAN: ITEM_GUWAN, MAX_RECLAIM: MAX_RECLAIM, VER: VER,
    ensure: ensure, percent: percent, refreshPercent: refreshPercent,
    tickTimer: tickTimer, useGuwanRefresh: useGuwanRefresh,
    drugList: drugList, buyDrug: buyDrug,
    reclaimByQuality: reclaimByQuality, previewQuality: previewQuality,
    resetReclaimByAd: resetReclaimByAd, delayRefreshByAd: delayRefreshByAd,
    maxReclaim: maxReclaim, info: info, guwanCount: guwanCount
  };
  S.openYyShop = openYyShop;
})(Systems);
