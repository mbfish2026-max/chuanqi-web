// [guide] 原版 Guide + guide.txt：新手引导阶段；?noguide=1 跳过
(function(S){
  var STAGE = {
    introduce: 1001, jumpbag: 1002,
    equip_weapon: 1003, equip_info: 1004,
    equip_clothes: 1005, clothes_info: 1006,
    skill_info: 1007, skill_learn: 1008,
    jumpbattle: 1009, jumpbattlemap: 1010,
    finish: 1011
  };
  var ORDER = [1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011];
  var VER = 5;

  function disabledByQuery(){
    try{
      var q = (typeof location !== 'undefined' && location.search) || '';
      return /(?:^|[?&])noguide=1(?:&|$)/.test(q) || /(?:^|[?&])seed=/.test(q) || /(?:^|[?&])autostart=/.test(q);
    }catch(e){ return false; }
  }

  function textOf(stage){
    var g = CFG && CFG.guide;
    if(!g) return '';
    // guide.txt keys "1".."10" map to id 1001..1010
    var list = g.list || [];
    for(var i=0;i<list.length;i++) if(list[i] && list[i].id === stage) return list[i].name || '';
    if(g.byId && g.byId[stage]) return g.byId[stage].name || '';
    if(g.raw){
      for(var k in g.raw){ if(g.raw[k] && g.raw[k].id === stage) return g.raw[k].name || ''; }
    }
    return '';
  }

  function getStage(r){
    r = r || G.role; if(!r) return STAGE.finish;
    if(r.guideStage == null) r.guideStage = 0;
    return r.guideStage;
  }

  function setStage(n){
    var r = G.role; if(!r) return;
    r.guideStage = n;
    if((r.ver||1) < VER) r.ver = VER;
    if(typeof save === 'function') save();
  }

  function active(){
    if(disabledByQuery()) return false;
    var s = getStage();
    if(s === 0) return true;          // 未开始 → 将进入 introduce
    return s > 0 && s < STAGE.finish;
  }

  function ensureStart(){
    var r = G.role; if(!r) return null;
    if(disabledByQuery()){
      if(!r.guideStage || r.guideStage < STAGE.finish) r.guideStage = STAGE.finish;
      return null;
    }
    var s = getStage();
    if(s === 0){ setStage(STAGE.introduce); return STAGE.introduce; }
    if(s >= STAGE.finish) return null;
    return s;
  }

  function advance(){
    var s = getStage();
    if(s <= 0) s = STAGE.introduce;
    var i = ORDER.indexOf(s);
    var next = (i < 0 || i >= ORDER.length-1) ? STAGE.finish : ORDER[i+1];
    setStage(next);
    return next;
  }

  function skipAll(){ setStage(STAGE.finish); return S.ok('已跳过引导'); }

  function currentInfo(){
    var s = ensureStart();
    if(!s) return null;
    return { stage: s, text: textOf(s), key: Object.keys(STAGE).filter(function(k){ return STAGE[k]===s; })[0] || '' };
  }

  // 引导完成动作：切换页/穿装备等（UI 层调用）
  function onStepAction(stage){
    if(!G.role) return;
    switch(stage){
      case STAGE.jumpbag:
        if(typeof showPage === 'function') showPage('main_role');
        break;
      case STAGE.jumpbattle:
        if(typeof showPage === 'function') showPage('main_fight');
        break;
      case STAGE.jumpbattlemap:
        if(typeof enterMap === 'function') enterMap(1002);
        if(typeof showPage === 'function') showPage('main_fight');
        break;
      case STAGE.equip_info:
      case STAGE.clothes_info:
        // 尝试穿上对应装备（若仍在包中）
        tryEquip(stage === STAGE.clothes_info ? 205002 : 205001);
        break;
      case STAGE.skill_learn:
        tryLearnSkillBook();
        break;
    }
  }

  function tryEquip(itemId){
    if(typeof equipItem !== 'function') return;
    var bag = G.role.bag || [];
    for(var i=0;i<bag.length;i++){
      if(bag[i].id === itemId){ equipItem(bag[i].uid); return; }
    }
  }
  function tryLearnSkillBook(){
    if(typeof useItem !== 'function') return;
    var books = {1:104003, 2:104001, 3:104012};
    var id = books[G.role.prof]; if(!id) return;
    var bag = G.role.bag || [];
    for(var i=0;i<bag.length;i++){
      if(bag[i].id === id){ useItem(bag[i].uid); return; }
    }
  }

  S.on('loaded', function(r){
    if(!r) return;
    if(r.guideStage == null) r.guideStage = 0;
    if(disabledByQuery() && r.guideStage < STAGE.finish) r.guideStage = STAGE.finish;
    if((r.ver||1) < VER) r.ver = VER;
  });

  S.guide = {
    STAGE: STAGE, ORDER: ORDER, VER: VER,
    textOf: textOf, getStage: getStage, setStage: setStage,
    active: active, ensureStart: ensureStart, advance: advance,
    skipAll: skipAll, currentInfo: currentInfo, onStepAction: onStepAction,
    disabledByQuery: disabledByQuery
  };
})(Systems);
