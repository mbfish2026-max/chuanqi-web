// [offline] 原版 TipOffline：时长上限 6/12h（特权），免费×1 / 广告×2 / 元宝×5；关闭也按×1 领取
// 收益按 levelup.txt 的 addexp/addgold/costyuanbao 按分钟比例，不在计算时直接发放
(function(S){
  var MIN_MINUTES = 5; // 原版 Main.onGameEventBack: ceil(分钟) >= 5

  function lvCfg(level){
    return cfg('levelup', level) || { addexp: 0, addgold: 0, costyuanbao: 0, exp: 0 };
  }

  function limitHour(){
    return (S.prerogative && S.prerogative.offlineHours) ? S.prerogative.offlineHours() : 6;
  }

  // 计算离线收益快照（不发放）
  function calc(fromMs){
    var r = G.role; if(!r) return null;
    var now = Date.now();
    var base = fromMs != null ? fromMs : (r.lastSave || now);
    var ms = Math.max(0, now - base);
    var minute = Math.ceil(ms / 1000 / 60);
    if(minute < MIN_MINUTES) return null;
    var limH = limitHour();
    var maxlimit = 60 * limH;
    if(minute > maxlimit){ minute = maxlimit; ms = maxlimit * 60000; }
    var lc = lvCfg(r.level);
    var exp = Math.ceil((lc.addexp || 0) / maxlimit * minute);
    var gold = Math.ceil((lc.addgold || 0) / maxlimit * minute);
    var costYuanbao = Math.ceil((lc.costyuanbao || 0) / maxlimit * minute);
    return {
      sec: Math.floor(ms / 1000),
      ms: ms,
      minute: minute,
      limitHour: limH,
      exp: exp,
      gold: gold,
      costYuanbao: costYuanbao,
      pending: true
    };
  }

  function claim(off, mult){
    var r = G.role; if(!r || !off) return '无离线收益';
    mult = Math.max(1, +mult || 1);
    if(off._claimed) return '已领取';
    addExp(Math.floor(off.exp * mult));
    r.gold = (r.gold || 0) + Math.floor(off.gold * mult);
    off._claimed = true;
    r.lastSave = Date.now();
    save();
    var tip = '离线收益 ×' + mult + '：经验 ' + Math.floor(off.exp * mult) + ' 金币 ' + Math.floor(off.gold * mult);
    log('<b style="color:#8f8">' + tip + '</b>');
    return S.ok(tip);
  }

  function claimYuanbao(off){
    var r = G.role; if(!r || !off) return '无离线收益';
    var cost = off.costYuanbao || 0;
    if((r.yuanbao || 0) < cost) return '元宝不足';
    r.yuanbao -= cost;
    return claim(off, 5);
  }

  // 替换全局 offlineReward：仅计算，不发放（发放交给 UI 按钮）
  offlineReward = function(){
    var off = calc();
    if(off) G._offlinePending = off;
    return off;
  };

  S.offline = {
    MIN_MINUTES: MIN_MINUTES,
    calc: calc, claim: claim, claimYuanbao: claimYuanbao, limitHour: limitHour, lvCfg: lvCfg
  };
})(Systems);
