// [prerogative] 原版 Role.prerogative + PrerogativeTool
// 回收满额(_zdhsup)、离线 12h(_lixianup)、击杀经验+10%(_killexpup)、BOSS 刷新减半(_timereduce) 等
// 持久化 role.prerogative；role.ver >= 4
(function(S){
  var VER = 4;
  var DAY_MS = 864e5;
  // 原版按 rmb 天数: 30→30天, 68/128→90天
  function daysForRmb(rmb){ return rmb >= 68 ? 90 : 30; }
  // 网页无真实充值：元宝价 = rmb × 10
  function ybCost(rmb){ return Math.max(1, (+rmb || 0) * 10); }

  function defaults(){
    return {
      _huishoutime: 0, _huishou100: false,
      _lixianup: false, _yyshopup: false, _yyshop_priceup: false, _zdhsup: false,
      _zhanshentime: 0, _zhanshen100: false,
      _killexpup: false, _sendmap: false, _timereduce: false, _bossdrop: false
    };
  }

  function get(r){
    r = r || G.role; if(!r) return defaults();
    if(!r.prerogative) r.prerogative = defaults();
    return r.prerogative;
  }

  // 按到期时间刷新运行时开关（对齐 PrerogativeTool.setHuiShou/setZhanShen）
  function refresh(r){
    r = r || G.role; if(!r) return null;
    var p = get(r), now = Date.now();
    if(now > (p._huishoutime || 0)){
      p._huishou100 = false; p._lixianup = false; p._yyshopup = false;
      p._yyshop_priceup = false; p._zdhsup = false;
    } else {
      p._lixianup = true; p._yyshopup = true; p._yyshop_priceup = true; p._zdhsup = true;
      if(r.yyReclaim == null || r.yyReclaim < 400) r.yyReclaim = 400;
    }
    if(now > (p._zhanshentime || 0)){
      p._zhanshen100 = false; p._killexpup = false; p._sendmap = false;
      p._timereduce = false; p._bossdrop = false;
    } else {
      p._killexpup = true; p._sendmap = true; p._timereduce = true; p._bossdrop = true;
    }
    return p;
  }

  function ensure(r){
    r = r || G.role; if(!r) return null;
    var p = get(r), d = defaults();
    for(var k in d) if(p[k] == null) p[k] = d[k];
    refresh(r);
    // 对齐 StoargeTool 跨天：特权仍有效则重置每日 100 元宝可领
    var day = S.today ? S.today(S.now()) : '';
    if(day && r._preroDay !== day){
      r._preroDay = day;
      if(Date.now() <= (p._huishoutime || 0)) p._huishou100 = true;
      if(Date.now() <= (p._zhanshentime || 0)) p._zhanshen100 = true;
    }
    if((r.ver || 1) < VER) r.ver = VER;
    return p;
  }

  function remainMs(kind){
    var p = get(), t = kind === 'zs' ? p._zhanshentime : p._huishoutime;
    return Math.max(0, (t || 0) - Date.now());
  }
  function isActive(kind){ return remainMs(kind) > 0; }

  function fmtRemain(kind){
    var ms = remainMs(kind); if(ms <= 0) return '';
    if(ms > DAY_MS) return '剩余：' + Math.ceil(ms / DAY_MS) + '天';
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return '剩余：' + h + '小时' + m + '分';
  }

  // 购买：type2=1 回收 / 2 战神；rmb=128 时两者都开
  function buy(rmb, type2){
    var r = S.ensure(); if(!r) return '无角色';
    ensure(r);
    rmb = +rmb; var cost = ybCost(rmb);
    if((r.yuanbao || 0) < cost) return '元宝不足 (需要 ' + cost + ')';
    r.yuanbao -= cost;
    var p = get(r), now = Date.now(), add = daysForRmb(rmb) * DAY_MS;
    var both = rmb === 128 || type2 === 'both';
    if(both || type2 === 1 || type2 === 'hs'){
      p._huishoutime = Math.max(p._huishoutime || 0, now) + add;
      p._huishou100 = true;
    }
    if(both || type2 === 2 || type2 === 'zs'){
      p._zhanshentime = Math.max(p._zhanshentime || 0, now) + add;
      p._zhanshen100 = true;
    }
    refresh(r); save();
    return S.ok('特权已激活 ' + daysForRmb(rmb) + ' 天 (−' + cost + ' 元宝)');
  }

  // 每日领取 100 元宝（_huishou100 / _zhanshen100 为可领标记，领后置 false；跨天由 Storage 重置逻辑近似：到期 refresh 清掉）
  function claimYuanbao(kind){
    var r = S.ensure(); if(!r) return '无角色';
    ensure(r); var p = get(r);
    if(kind === 'zs'){
      if(!isActive('zs')) return '战神特权未激活';
      if(!p._zhanshen100) return '今日已领取';
      p._zhanshen100 = false; r.yuanbao = (r.yuanbao || 0) + 100;
    } else {
      if(!isActive('hs')) return '回收特权未激活';
      if(!p._huishou100) return '今日已领取';
      p._huishou100 = false; r.yuanbao = (r.yuanbao || 0) + 100;
    }
    save(); return S.ok('领取元宝 100');
  }

  // —— 效果查询 ——
  function recycleRate(){ ensure(); return get()._zdhsup ? 1 : 0.5; }       // 自动回收金币倍率
  function offlineHours(){ ensure(); return get()._lixianup ? 12 : 6; }
  function killExpPct(){ ensure(); return get()._killexpup ? 10 : 0; }       // 额外 +N% 击杀经验
  function bossTimerFactor(){ ensure(); return get()._timereduce ? 0.5 : 1; }
  function hasBossDrop(){ ensure(); return !!get()._bossdrop; }
  function canSendBossMap(){ ensure(); return !!get()._sendmap; }

  // 包装铁匠回收：应用 50%/100%
  function installRecycleRate(){
    if(!S.fenjie) return;
    var _rec = S.fenjie.recycle, _rq = S.fenjie.recycleByQuality;
    if(_rec && !_rec._prero){
      S.fenjie.recycle = function(uid){
        var f = S.findStuff(uid); if(!f || f.where !== 'bag') return '物品不存在';
        var s = f.s, c = stuffCfg(s); if(c.type !== 2) return '不是装备'; if(s.lock) return '装备已锁定';
        var rate = recycleRate();
        var g = Math.ceil((c.sellprice || 0) * s.q * rate);
        G.role.gold += g; removeItem(uid); save();
        return S.ok('回收获得金币 ' + g + (rate < 1 ? ' (50%)' : ' (满额)'));
      };
      S.fenjie.recycle._prero = 1;
    }
    if(_rq && !_rq._prero){
      S.fenjie.recycleByQuality = function(q, includeNonsuch){
        var r = G.role, rate = recycleRate();
        var list = r.bag.filter(function(s){
          return stuffCfg(s).type == 2 && s.q == q && !s.lock && (includeNonsuch || !s.nonsuch);
        });
        var g = 0;
        list.forEach(function(s){ g += Math.ceil((stuffCfg(s).sellprice || 0) * s.q * rate); removeItem(s.uid); });
        r.gold += g; save();
        return S.ok('回收 ' + list.length + ' 件, 获得金币 ' + g + (rate < 1 ? ' (50%)' : ''));
      };
      S.fenjie.recycleByQuality._prero = 1;
    }
  }

  // 击杀经验 +10%（对齐 BattleTool._killexpup）
  S.on('kill', function(m){
    var pct = killExpPct(); if(!pct || !m) return;
    var bonus = Math.ceil(m.exp * pct / 100);
    if(bonus > 0){ addExp(bonus); log('特权经验 +' + bonus); }
  });

  // BOSS 刷新时间减半
  S.on('kill', function(m){
    if(!m || !m.boss) return;
    var f = bossTimerFactor(); if(f >= 1) return;
    var key = 'boss_' + m.cfg.id;
    var until = G.role.stat[key]; if(!until) return;
    var now = Date.now(), left = until - now;
    if(left > 0) G.role.stat[key] = now + Math.ceil(left * f);
  });

  // BOSS 额外掉落一件本职业史诗(橙)装备（_bossdrop）
  S.on('kill', function(m){
    if(!m || !m.boss || !hasBossDrop()) return;
    var r = G.role;
    var cands = (CFG.item && CFG.item.list || []).filter(function(c){
      return c && c.type == 2 && c.quality >= 4 && (!c.profession || c.profession == r.prof) && (c.needlevel || 1) <= r.level + 5;
    });
    if(!cands.length) return;
    var pick = cands[Math.floor(Math.random() * Math.min(cands.length, 40))];
    var s = createStuff(pick.id, 1, 5); if(!s) return;
    addItem(s);
    log('<b class="q5">特权掉落 [' + ((typeof QNAME !== 'undefined' && QNAME[5]) || '史诗') + '] ' + pick.name + '</b>');
  });

  function shopList(type2){
    var list = (CFG.chongzhi && CFG.chongzhi.list) || [];
    return list.filter(function(x){ return x && x.type == 3 && x.type2 == type2; });
  }

  S.on('loaded', function(r){ ensure(r); });
  var _nr = typeof newRole === 'function' ? newRole : null;
  if(_nr){
    newRole = function(){ var r = _nr.apply(this, arguments); ensure(r); return r; };
  }
  if(typeof setTimeout === 'function') setTimeout(function(){ installRecycleRate(); if(G.role) ensure(G.role); }, 0);
  S.on('configsLoaded', function(){ installRecycleRate(); });

  // chongzhi 表需进 TABLES（若不在则从 raw 兜底）
  S.on('configsLoaded', function(){
    if(!CFG.chongzhi && typeof loadOne === 'function') return;
  });

  S.prerogative = {
    VER: VER, defaults: defaults, get: get, ensure: ensure, refresh: refresh,
    buy: buy, claimYuanbao: claimYuanbao, ybCost: ybCost, daysForRmb: daysForRmb,
    isActive: isActive, remainMs: remainMs, fmtRemain: fmtRemain,
    recycleRate: recycleRate, offlineHours: offlineHours, killExpPct: killExpPct,
    bossTimerFactor: bossTimerFactor, hasBossDrop: hasBossDrop, canSendBossMap: canSendBossMap,
    shopList: shopList
  };
})(Systems);
