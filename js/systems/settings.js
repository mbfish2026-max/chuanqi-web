// [settings] 原版 RoleSetup.setupValue + BattleTool.verifySettings / calculateAutoPickup
// 持久化 role.settings；role.ver >= 3；与 lootCfg / G.settings 双向同步，不重复造回收规则
(function(S){
  var VER = 3;
  var LIFE_IDS   = [100010,100011,100012,100013,100014,100015];
  var MAGIC_IDS  = [100020,100021,100022,100023,100024,100025];
  var SPECIAL_IDS= [100030,100031,100032];

  function defaults(){
    return {
      // —— 原版 setupValue ——
      recycle: {
        noProfession: false,
        nonsuch: false,       // true = 极品也自动回收
        white: false, green: false, blue: false, purple: false,
        keepSet: true, keepUnique: true  // 网页扩展（原版无暗金/套装概念）
      },
      drug: {
        life:    { on: true,  id: 100010, pct: 65 },
        magic:   { on: false, id: 100020, pct: 50 },
        special: { on: false, id: 100030, pct: 65 }
      },
      sound: true,
      // —— 网页增补（原版无独立面板；接真实逻辑）——
      afk: {
        autoCombat: true,
        autoSkill: true,
        autoMove: true,
        autoPick: true,       // false 时跳过自动回收（仍入包）
        stopBagFull: false
      },
      game: {
        dmgNumbers: true,
        screenShake: true,
        fxQuality: 1          // 0 低 1 高（低＝跳过部分粒子）
      },
      skills: {},             // baseId -> false 禁用自动施放；缺省 true
      heroSkills: {}
    };
  }

  function deepMerge(dst, src){
    if(!src) return dst;
    for(var k in src){
      if(src[k] && typeof src[k]==='object' && !Array.isArray(src[k])){
        dst[k] = dst[k] && typeof dst[k]==='object' ? dst[k] : {};
        deepMerge(dst[k], src[k]);
      } else if(src[k] !== undefined) dst[k] = src[k];
    }
    return dst;
  }

  function get(){
    var r = G.role; if(!r) return defaults();
    if(!r.settings) r.settings = defaults();
    return r.settings;
  }

  // 把 settings.recycle 同步到 lootCfg，供 Systems.loot.shouldAuto 使用
  function syncLootCfg(r){
    r = r || G.role; if(!r || !r.settings) return;
    var s = r.settings.recycle, L = r.lootCfg = r.lootCfg || {};
    L.auto = L.auto || {};
    L.auto[1] = !!s.white; L.auto[2] = !!s.green; L.auto[3] = !!s.blue; L.auto[4] = !!s.purple;
    L.offProf = !!s.noProfession;
    L.keepNonsuch = !s.nonsuch;          // 原版勾选「极品」= 分解极品
    L.keepSet = s.keepSet !== false;
    L.keepUnique = s.keepUnique !== false;
  }

  // 从旧 lootCfg / G.settings / 隐式默认 迁移
  function migrateFromLegacy(r){
    var st = deepMerge(defaults(), r.settings || {});
    var L = r.lootCfg;
    if(L && L.auto){
      st.recycle.white = !!L.auto[1]; st.recycle.green = !!L.auto[2];
      st.recycle.blue = !!L.auto[3]; st.recycle.purple = !!L.auto[4];
      if(L.offProf != null) st.recycle.noProfession = !!L.offProf;
      if(L.keepNonsuch != null) st.recycle.nonsuch = !L.keepNonsuch;
      if(L.keepSet != null) st.recycle.keepSet = !!L.keepSet;
      if(L.keepUnique != null) st.recycle.keepUnique = !!L.keepUnique;
    }
    var g = G.settings || {};
    if(g.autoDrug != null) st.drug.life.on = !!g.autoDrug;
    if(g.sound != null) st.sound = !!g.sound;
    if(g.voice != null) st.sound = !!g.voice;
    r.settings = st;
  }

  function applyLegacyMirrors(r){
    r = r || G.role; if(!r || !r.settings) return;
    syncLootCfg(r);
    G.settings = G.settings || {};
    G.settings.autoDrug = !!r.settings.drug.life.on; // 兼容旧读法
    G.settings.sound = !!r.settings.sound;
    G.settings.voice = !!r.settings.sound;
  }

  function ensure(r){
    r = r || G.role; if(!r) return null;
    if(!r.settings) migrateFromLegacy(r);
    else r.settings = deepMerge(defaults(), r.settings);
    applyLegacyMirrors(r);
    if((r.ver || 1) < VER) r.ver = VER;
    return r.settings;
  }

  function set(path, value){
    var st = ensure(); if(!st) return '无角色';
    var parts = path.split('.'), cur = st;
    for(var i=0;i<parts.length-1;i++){ cur[parts[i]] = cur[parts[i]] || {}; cur = cur[parts[i]]; }
    cur[parts[parts.length-1]] = value;
    applyLegacyMirrors(G.role);
    return S.ok();
  }

  function adjustPct(kind, delta){
    var d = ensure().drug[kind]; if(!d) return;
    d.pct = Math.max(0, Math.min(100, (d.pct || 0) + delta));
    return d.pct;
  }

  function setDrugId(kind, id){
    var ids = kind==='life'?LIFE_IDS: kind==='magic'?MAGIC_IDS: SPECIAL_IDS;
    if(ids.indexOf(+id) < 0) return '无效药品';
    var c = cfg('item', id); if(!c) return '药品不存在';
    if(G.role.level < (c.needlevel||0)) return '需要等级 '+c.needlevel;
    ensure().drug[kind].id = +id; return S.ok();
  }

  function skillEnabled(baseId, hero){
    var st = get();
    var map = hero ? st.heroSkills : st.skills;
    if(map && map[baseId] === false) return false;
    return true;
  }

  function setSkillEnabled(baseId, on, hero){
    var st = ensure();
    var map = hero ? (st.heroSkills = st.heroSkills || {}) : (st.skills = st.skills || {});
    if(on) delete map[baseId]; else map[baseId] = false;
    return S.ok();
  }

  // ---------- 行为钩子 ----------
  function findBagDrug(id){
    var best = null; G.role.bag.forEach(function(s){ if(s.id==id) best = s; }); return best;
  }
  function useById(id){
    var s = findBagDrug(id); if(!s) return false;
    if(typeof useDrug === 'function') useDrug(s); else { var c=stuffCfg(s); removeItem(s.uid,1); }
    return true;
  }

  // 替换 game.js autoDrug：对齐原版 verifySettings（生命/魔法/特殊 + 阈值）
  function installAutoDrug(){
    if(typeof autoDrug !== 'function') return;
    autoDrug = function(a){
      var r = G.role, st = ensure(); if(!r || !st) return;
      var hpPct = a.maxhp > 0 ? (r.hp / a.maxhp) * 100 : 100;
      var mpPct = a.maxmp > 0 ? (r.mp / a.maxmp) * 100 : 100;
      var d = st.drug;
      if(d.life.on && d.life.pct > hpPct && DRUG.hp <= 0) useById(d.life.id);
      if(d.magic.on && d.magic.pct > mpPct && DRUG.mp <= 0) useById(d.magic.id);
      if(d.special.on && d.special.pct > hpPct && DRUG.hp <= 0 && DRUG.mp <= 0) useById(d.special.id);
    };
  }

  // 技能自动施放：关「自动技能」或单技能禁用时过滤
  S.on('skillCands', function(cands){
    var st = get();
    if(!st.afk.autoSkill) return [];
    return (cands || []).filter(function(pair){
      var sc = pair[0]; var base = Math.floor(sc.id / 10);
      return skillEnabled(base, false);
    });
  });

  // 背包满停止挂机
  var _bagPaused = false;
  S.on('tick', function(dt, b, a, m){
    var st = get(); if(!st || !b) return;
    if(st.afk.stopBagFull && S.bag && S.bag.free() <= 0){
      if(!_bagPaused){ _bagPaused = true; if(typeof log==='function') log('<span style="color:#f77">背包已满，挂机已暂停</span>'); if(typeof toast==='function') toast('背包已满，挂机暂停'); }
    } else _bagPaused = false;
  });

  function combatAllowed(){
    var st = get();
    if(!st.afk.autoCombat) return false;
    if(st.afk.stopBagFull && _bagPaused) return false;
    return true;
  }

  function installCombatMove(){
    if(typeof roleAttack === 'function'){
      var _ra = roleAttack;
      roleAttack = function(b, a){ if(!combatAllowed()) return; return _ra.apply(this, arguments); };
    }
    if(typeof MOVE !== 'undefined' && MOVE.update){
      var _mu = MOVE.update;
      MOVE.update = function(b, dt){
        var st = get();
        if(st && !st.afk.autoMove) return;
        if(st && st.afk.stopBagFull && _bagPaused) return;
        return _mu.apply(this, arguments);
      };
    }
  }

  // 自动回收：受 afk.autoPick 约束（关 = 只入包不回收）
  function installSalvageGate(){
    if(!S.loot || !S.loot.shouldAuto) return;
    var _sa = S.loot.shouldAuto;
    S.loot.shouldAuto = function(s){
      var st = get();
      if(st && st.afk && st.afk.autoPick === false) return false;
      return _sa.apply(this, arguments);
    };
  }


  function fxAllows(kind){
    var g = get().game || {};
    if(kind==='dmg') return g.dmgNumbers !== false;
    if(kind==='shake') return g.screenShake !== false;
    if(kind==='fx') return (g.fxQuality == null ? 1 : g.fxQuality) > 0;
    return true;
  }

  function rebindFx(){
    window.CQ_FX_FLAGS = {
      dmg: function(){ return fxAllows('dmg'); },
      shake: function(){ return fxAllows('shake'); },
      low: function(){ var g=get().game||{}; return g.fxQuality===0; }
    };
  }

  S.on('loaded', function(r){ ensure(r); });
  var _newRole = typeof newRole === 'function' ? newRole : null;
  if(_newRole){
    newRole = function(){ var r = _newRole.apply(this, arguments); ensure(r); return r; };
  }

  var _booted=false;
  function boot(){
    if(_booted){ rebindFx(); if(G.role) ensure(G.role); return; }
    _booted=true;
    ensure(G.role);
    installAutoDrug();
    installCombatMove();
    installSalvageGate();
    rebindFx();
  }
  // data/game 已加载；FX/MOVE 可能稍后
  if(typeof setTimeout === 'function') setTimeout(boot, 0);
  S.on('configsLoaded', function(){ boot(); });

  S.settings = {
    VER: VER,
    LIFE_IDS: LIFE_IDS, MAGIC_IDS: MAGIC_IDS, SPECIAL_IDS: SPECIAL_IDS,
    defaults: defaults, get: get, ensure: ensure, set: set,
    adjustPct: adjustPct, setDrugId: setDrugId,
    skillEnabled: skillEnabled, setSkillEnabled: setSkillEnabled,
    syncLootCfg: syncLootCfg, applyLegacyMirrors: applyLegacyMirrors,
    combatAllowed: combatAllowed, fxAllows: fxAllows, rebindFx: rebindFx,
    drugName: function(kind){
      var d = get().drug[kind]; var c = cfg('item', d && d.id); return (c && c.name) || '';
    },
    drugCount: function(kind){
      var d = get().drug[kind]; return d ? countItem(d.id) : 0;
    }
  };
})(Systems);
