// [die] 原版 RoleDie：死亡不立刻回城，弹出三选一（回城 / 看广告原地 / 20 元宝原地）
(function(S){
  var YB_LOCAL = 20;

  function recoverFull(){
    var r = G.role; if(!r) return;
    var a = calcAttr();
    r.hp = a.maxhp; r.mp = a.maxmp;
  }

  function clearDead(){
    G.dead = false; G.paused = false; G._autoRevive = null;
  }

  // 回城复活：进 rebornmap 并回满（对齐 MainFight.setMapCfg recover）
  function reviveCity(){
    var r = G.role; if(!r) return '无角色';
    var m = mapCfg(), mid = (m && m.rebornmap) || 1001;
    var name = (cfg('map', mid) || {}).name || mid;
    clearDead();
    recoverFull();
    enterMap(mid);
    log('<b style="color:#8f8">回城复活于 ' + name + '</b>');
    toast('已回城复活');
    save();
    return S.ok('回城复活');
  }

  // 原地复活
  function reviveLocal(byVideo){
    var r = G.role; if(!r) return '无角色';
    if(!byVideo){
      if((r.yuanbao || 0) < YB_LOCAL) return '元宝不足';
      r.yuanbao -= YB_LOCAL;
    }
    clearDead();
    recoverFull();
    // 若仍在战斗图，保持战斗；否则重新进图刷怪
    var m = mapCfg();
    if(m && m.type == 2 && !G.battle) startBattle(m);
    log(byVideo
      ? '<b style="color:#8f8">广告原地复活</b>'
      : '<b style="color:#8f8">花费 ' + YB_LOCAL + ' 元宝原地复活</b>');
    toast(byVideo ? '原地复活成功' : '原地复活 (−' + YB_LOCAL + ' 元宝)');
    save();
    return S.ok('原地复活');
  }

  // ---------- 挂机自动复活 (S2) ----------
  // 字段: role.settings.afk.autoRevive (默认 true) / afk.autoBuyDrug (默认 true) / afk.autoRetreat (默认 true)
  var AUTO_DELAY = 3;          // 阵亡后 3 秒 (游戏时间) 自动回城复活并返回挂机图
  var RETREAT_N = 3, RETREAT_WIN = 600;   // 同一张图 600 秒内阵亡 3 次 -> 退回上一张战斗图
  function afk(){ var st = S.settings && S.settings.get ? S.settings.get() : null; return (st && st.afk) || {}; }
  function autoOn(){ return afk().autoRevive !== false; }
  function gameT(){ var r = G.role; return (r && r.stat && r.stat.afkT) || 0; }
  // 上一张战斗图: 地图表顺序中排在 mid 前面、type==2 的最近一张
  function prevFightMap(mid){
    var list = (CFG.map && CFG.map.list || []).filter(function(m){ return m && m.type == 2; });
    for(var i=0;i<list.length;i++) if(list[i].id == mid) return i > 0 ? list[i-1].id : null;
    return null;
  }
  function recordDeath(mid){
    var r = G.role; r.stat.deaths = r.stat.deaths || {};
    var now = gameT(), arr = (r.stat.deaths[mid] || []).filter(function(t){ return now - t < RETREAT_WIN; });
    arr.push(now); r.stat.deaths[mid] = arr;
    return arr.length;
  }
  // 计算复活后要回的挂机图 (含反复阵亡退图)
  function afkTarget(mid){
    var m = cfg('map', mid); if(!m || m.type != 2) return null;
    var n = recordDeath(mid);
    if(afk().autoRetreat !== false && n >= RETREAT_N){
      var prev = prevFightMap(mid);
      if(prev){
        G.role.stat.deaths[mid] = [];
        log('<b style="color:#fa0">' + RETREAT_WIN/60 + ' 分钟内在 ' + m.name + ' 阵亡 ' + n + ' 次, 自动退回 ' + cfg('map', prev).name + '</b>');
        toast('反复阵亡, 已退回 ' + cfg('map', prev).name);
        return prev;
      }
    }
    return mid;
  }
  function autoRevive(){
    var r = G.role; if(!r || !G.dead) return;
    var mid = G._dieMap || r.mapId; G._autoRevive = null; G._dieMap = null;
    var target = afkTarget(mid);
    if(typeof UI !== 'undefined' && UI._diePopup){ try{ closePopup(UI._diePopup); }catch(e){ try{ UI._diePopup.destroy(); }catch(e2){} } UI._diePopup = null; }
    reviveCity();
    if(S.settings && S.settings.autoBuyDrug) S.settings.autoBuyDrug(true);
    if(target && target != r.mapId) enterMap(target);
    log('<b style="color:#8f8">自动复活, 继续挂机</b>');
    return target;
  }

  // 替换 game.roleDie：只标记死亡 + 暂停，不回城
  function onDie(){
    var r = G.role; if(!r) return;
    if(G.dead) return; // 已在死亡 UI 中
    r.hp = 0;
    G.dead = true;
    G.paused = true;
    var m = mapCfg();
    G._dieMap = r.mapId;
    r.stat.deathCnt = (r.stat.deathCnt || 0) + 1;
    if(autoOn()){
      G._autoRevive = AUTO_DELAY;
      log('<b style="color:#f55">你被击败了!</b> ' + AUTO_DELAY + ' 秒后自动回城复活并返回挂机');
      toast('你已阵亡, ' + AUTO_DELAY + ' 秒后自动复活');
      return;
    }
    G._autoRevive = null;
    log('<b style="color:#f55">你被击败了!</b> 选择回城或原地复活');
    toast('你已阵亡');
    if(typeof window.showRoleDie === 'function') window.showRoleDie(m);
    else {
      // UI 未就绪时兜底回城
      reviveCity();
    }
  }

  var _roleDie = typeof roleDie === 'function' ? roleDie : null;
  roleDie = function(){ onDie(); };

  // tick / 战斗在死亡时暂停
  var _tick = typeof tick === 'function' ? tick : null;
  if(_tick){
    tick = function(dt){
      var r = G.role;
      if(r && r.stat && !G.dead) r.stat.afkT = (r.stat.afkT || 0) + (dt || 0);
      if(G.dead && G._autoRevive != null){
        G._autoRevive -= (dt || 0);
        if(G._autoRevive <= 0) autoRevive();
        return;
      }
      if(G.dead || G.paused) return;
      return _tick.apply(this, arguments);
    };
  }

  S.die = {
    YB_LOCAL: YB_LOCAL,
    onDie: onDie, recoverFull: recoverFull, clearDead: clearDead,
    reviveCity: reviveCity, reviveLocal: reviveLocal,
    AUTO_DELAY: AUTO_DELAY, RETREAT_N: RETREAT_N, RETREAT_WIN: RETREAT_WIN,
    autoRevive: autoRevive, prevFightMap: prevFightMap
  };
})(Systems);
