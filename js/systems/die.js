// [die] 原版 RoleDie：死亡不立刻回城，弹出三选一（回城 / 看广告原地 / 20 元宝原地）
(function(S){
  var YB_LOCAL = 20;

  function recoverFull(){
    var r = G.role; if(!r) return;
    var a = calcAttr();
    r.hp = a.maxhp; r.mp = a.maxmp;
  }

  function clearDead(){
    G.dead = false; G.paused = false;
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

  // 替换 game.roleDie：只标记死亡 + 暂停，不回城
  function onDie(){
    var r = G.role; if(!r) return;
    if(G.dead) return; // 已在死亡 UI 中
    r.hp = 0;
    G.dead = true;
    G.paused = true;
    var m = mapCfg();
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
      if(G.dead || G.paused) return;
      return _tick.apply(this, arguments);
    };
  }

  S.die = {
    YB_LOCAL: YB_LOCAL,
    onDie: onDie, recoverFull: recoverFull, clearDead: clearDead,
    reviveCity: reviveCity, reviveLocal: reviveLocal
  };
})(Systems);
