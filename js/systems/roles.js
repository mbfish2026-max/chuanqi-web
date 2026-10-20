// [roles] 原版 RoleList：最多 3 角色；localStorage 多槽；迁移单角色 cq_web_save_v1
// 持久化 key: cq_web_roles_v1；仍同步写 cq_web_save_v1（当前角色，兼容旧逻辑/测试）
(function(S){
  var ROLES_KEY = 'cq_web_roles_v1';
  var LEGACY_KEY = (typeof SAVE_KEY !== 'undefined') ? SAVE_KEY : 'cq_web_save_v1';
  var MAX = 3;
  var VER = 5; // role.ver：多角色/引导/运营店字段

  function emptyStore(){ return { selectId: -1, slots: [null, null, null] }; }

  function readStore(){
    try{
      var raw = localStorage.getItem(ROLES_KEY);
      if(raw){
        var d = JSON.parse(raw);
        if(d && Array.isArray(d.slots)){
          while(d.slots.length < MAX) d.slots.push(null);
          d.slots = d.slots.slice(0, MAX);
          if(d.selectId == null) d.selectId = -1;
          return d;
        }
      }
    }catch(e){}
    return emptyStore();
  }

  function writeStore(st){
    try{ localStorage.setItem(ROLES_KEY, JSON.stringify(st)); }catch(e){}
  }

  function slotMeta(role){
    if(!role) return null;
    return { name: role.name, prof: role.prof, level: role.level||1, mapId: role.mapId, lastSave: role.lastSave||Date.now() };
  }

  // 单角色存档 → 多槽
  function migrate(){
    var st = readStore();
    var has = st.slots.some(function(x){ return !!x; });
    if(has) return st;
    try{
      var legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if(legacy && legacy.role){
        var role = legacy.role;
        ensureRoleFields(role);
        st.slots[0] = { role: role, settings: legacy.settings || {} };
        st.selectId = 0;
        writeStore(st);
      }
    }catch(e){}
    return st;
  }

  function ensureRoleFields(r){
    if(!r) return;
    if(r.guideStage == null) r.guideStage = 0;
    if(r.percentYy == null) r.percentYy = 0;
    if(r.yyReclaim == null) r.yyReclaim = 200;
    if(r.refreshYy == null) r.refreshYy = 0;
    if(r.roleId == null) r.roleId = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    if((r.ver || 1) < VER) r.ver = VER;
  }

  function list(){
    var st = migrate();
    return st.slots.map(function(sl, i){
      if(!sl || !sl.role) return { index: i, empty: true };
      return { index: i, empty: false, meta: slotMeta(sl.role), role: sl.role };
    });
  }

  function count(){ return list().filter(function(x){ return !x.empty; }).length; }

  function freeIndex(){
    var st = migrate();
    for(var i=0;i<MAX;i++) if(!st.slots[i]) return i;
    return -1;
  }

  function selectId(){ return migrate().selectId; }

  // 把当前 G.role 写入选中槽 + legacy key
  function persistCurrent(){
    if(!G.role) return;
    ensureRoleFields(G.role);
    G.role.lastSave = Date.now();
    var st = migrate();
    var idx = st.selectId;
    if(idx < 0 || idx >= MAX){
      idx = freeIndex();
      if(idx < 0) idx = 0;
      st.selectId = idx;
    }
    st.slots[idx] = { role: G.role, settings: G.settings || {} };
    writeStore(st);
    try{
      localStorage.setItem(LEGACY_KEY, JSON.stringify({ role: G.role, settings: G.settings }));
    }catch(e){}
  }

  function loadSlot(index){
    var st = migrate();
    var sl = st.slots[index];
    if(!sl || !sl.role) return false;
    st.selectId = index;
    writeStore(st);
    G.role = sl.role;
    G.settings = sl.settings || G.settings || {};
    ensureRoleFields(G.role);
    try{ localStorage.setItem(LEGACY_KEY, JSON.stringify({ role: G.role, settings: G.settings })); }catch(e){}
    H('loaded', G.role);
    return true;
  }

  function deleteSlot(index){
    var st = migrate();
    if(index < 0 || index >= MAX) return '无效槽位';
    if(!st.slots[index]) return '空槽';
    st.slots[index] = null;
    if(st.selectId === index){
      st.selectId = -1;
      for(var i=0;i<MAX;i++) if(st.slots[i]){ st.selectId = i; break; }
      if(st.selectId >= 0){
        G.role = st.slots[st.selectId].role;
        G.settings = st.slots[st.selectId].settings || {};
      } else {
        G.role = null;
        try{ localStorage.removeItem(LEGACY_KEY); }catch(e){}
      }
    }
    writeStore(st);
    if(G.role) persistCurrent();
    return S.ok('已删除');
  }

  function createInSlot(name, prof, index){
    var st = migrate();
    if(index == null) index = freeIndex();
    if(index < 0) return '角色位已满（最多'+MAX+'个）';
    if(st.slots[index]) return '该槽已有角色';
    // 调用底层 newRole（已被其它系统包装）
    var r = _rawNewRole(name, prof);
    ensureRoleFields(r);
    st.slots[index] = { role: r, settings: G.settings || {} };
    st.selectId = index;
    writeStore(st);
    persistCurrent();
    return S.ok('创建成功');
  }

  // ---------- wrap save / load / newRole / resetSave ----------
  var _rawNewRole = typeof newRole === 'function' ? newRole : null;
  var _save = typeof save === 'function' ? save : null;
  var _load = typeof load === 'function' ? load : null;
  var _reset = typeof resetSave === 'function' ? resetSave : null;

  if(_save){
    save = function(){
      if(!G.role) return;
      ensureRoleFields(G.role);
      if(_save) _save.apply(this, arguments);
      persistCurrent();
    };
  }
  if(_load){
    load = function(){
      migrate();
      var st = readStore();
      if(st.selectId >= 0 && st.slots[st.selectId] && st.slots[st.selectId].role){
        return loadSlot(st.selectId);
      }
      // 兼容：无多槽时走旧 load
      var ok = _load.apply(this, arguments);
      if(ok){ ensureRoleFields(G.role); persistCurrent(); }
      return ok;
    };
  }
  if(_rawNewRole){
    newRole = function(name, prof){
      var r = _rawNewRole.apply(this, arguments);
      ensureRoleFields(r);
      // 若当前在创建流程且有空槽，登记
      var st = migrate();
      var idx = freeIndex();
      if(idx >= 0){
        st.slots[idx] = { role: r, settings: G.settings || {} };
        st.selectId = idx;
        writeStore(st);
      }
      return r;
    };
  }
  if(_reset){
    resetSave = function(){
      try{ localStorage.removeItem(ROLES_KEY); }catch(e){}
      return _reset.apply(this, arguments);
    };
  }

  S.roles = {
    MAX: MAX, VER: VER, ROLES_KEY: ROLES_KEY,
    migrate: migrate, list: list, count: count, freeIndex: freeIndex,
    selectId: selectId, loadSlot: loadSlot, deleteSlot: deleteSlot,
    createInSlot: createInSlot, persistCurrent: persistCurrent,
    ensureRoleFields: ensureRoleFields, slotMeta: slotMeta
  };
})(Systems);
