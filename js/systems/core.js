// [systems] 公共: 钩子注册、存档字段初始化、货币道具、背包上限、经济修正
// 依据原版 Role.js (bagCnt=50, maxBagCnt=300, RoleBag._bagUpper=3), ExchangeTool.checkUsed, ItemSign.onGetItemVO
(function(S){
  S.hooks = S.hooks || {};
  S.on = function(name, fn){ (S.hooks[name] = S.hooks[name] || []).push(fn); };
  S.ok = function(msg){ return 'OK:' + (msg||''); };
  S.today = function(d){ d = d || new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  S.now = function(){ return S._fakeNow ? new Date(S._fakeNow) : new Date(); };  // 测试可设置 Systems._fakeNow
  S.ITEM_GOLD = 103035; S.ITEM_YUANBAO = 103037; S.ITEM_STONE = 103034; S.ITEM_SKILLDAN = 103033;
  S.BAG_BASE = 50; S.BAG_MAX = 300; S.BAG_UPPER = 3; S.DAILY_VIDEO_MAX = 5;

  // 存档字段 (挂在 G.role 上, 随 save() 一起持久化)
  S.ensure = function(){
    var r = G.role; if(!r) return null;
    if(r.bagCnt == null) r.bagCnt = S.BAG_BASE;
    r.signInfo = r.signInfo || {already:[], month:'', cur_sign:'', already_week:[]};
    r.exchanges = r.exchanges || [];
    r.stat = r.stat || {};
    if(r.stat.remake == null) r.stat.remake = 0;
    if(r.stat.all_coin == null) r.stat.all_coin = 0;
    var t = S.today(S.now());
    if(!r.daily || r.daily.date != t) r.daily = {date:t, videoBuild:0, videoBag:0};  // StoargeTool.updateDaily
    return r;
  };
  S.findStuff = function(uid){
    var r = G.role; for(var i=0;i<r.bag.length;i++) if(r.bag[i].uid==uid) return {s:r.bag[i], where:'bag'};
    for(var sl in r.equip) if(r.equip[sl] && r.equip[sl].uid==uid) return {s:r.equip[sl], where:'equip', slot:+sl};
    return null;
  };
  S.itemName = function(id){ return (cfg('item', id)||{}).name || id; };

  // ---------- 背包 ----------
  S.bag = {
    used: function(){ return G.role.bag.length; },
    capacity: function(){ S.ensure(); return G.role.bagCnt; },
    free: function(){ return S.bag.capacity() - S.bag.used(); },
    // 能否放入: 非装备可叠加到已有格子 (m_maxcount 足够大时) 不占新格子
    canAdd: function(id){ var c=cfg('item',id); if(c && c.type!=2 && G.role.bag.some(function(x){return x.id==id;})) return true; return S.bag.free() > 0; },
    // 原版 RoleBag: 看广告每次 +3 格, 上限 300; 每日 5 次 (videoDaliy.videoBag)
    expandByAd: function(){
      var r=S.ensure(); if(r.bagCnt >= S.BAG_MAX) return '背包已达上限';
      if(r.daily.videoBag >= S.DAILY_VIDEO_MAX) return '今日次数已用完';
      r.daily.videoBag++; r.bagCnt = Math.min(S.BAG_MAX, r.bagCnt + S.BAG_UPPER); return S.ok('背包扩充至 '+r.bagCnt+' 格');
    },
    // BagTool.sortBagItems: 道具在前, 装备在后, 各按品质降序
    sort: function(){ var r=G.role, p=[], e=[]; r.bag.forEach(function(s){ (stuffCfg(s).type==2?e:p).push(s); });
      p.sort(function(a,b){return b.q-a.q;}); e.sort(function(a,b){return b.q-a.q;}); r.bag = p.concat(e); return S.ok('整理完成'); },
    toggleLock: function(uid){ var f=S.findStuff(uid); if(!f) return '物品不存在'; f.s.lock=!f.s.lock; return S.ok(f.s.lock?'已锁定':'已解锁'); }
  };

  S.on('addItem', function(v, s, c){
    var r = S.ensure();
    if(s.id == S.ITEM_GOLD){ r.gold += s.count; r.stat.all_coin += s.count; return true; }      // Role.addCoin
    if(s.id == S.ITEM_YUANBAO){ r.yuanbao += s.count; return true; }
    if(c.stdmode == 98) return;   // game.js 自身处理 (元宝礼包)
    if(c.type != 2 && r.bag.some(function(x){ return x.id==s.id; })) return;  // 叠加
    if(r.bag.length >= r.bagCnt){ log('<span style="color:#f77">背包已满, '+c.name+' 丢失</span>'); return true; }
  });
  // ExchangeTool.checkUsed: 打开礼包需要 >=5 个空格
  S.on('useLibao', function(v, lb){ if(S.bag.free() < 5) return '背包空间不足 (至少需要 5 格)'; });

  // ---------- 经济修正 ----------
  // libao.txt 中 2001「1级新手礼包」: gold/yuanbao=9999999、x99 材料、并且 item5 又给自己 (无限开) ——
  // 该行缩进错乱、存在重复键, 属于 GM/测试改动, 原版仓库中没有其它版本可还原。
  // 参照礼包链 (2002 8级礼包=5000 金币 + 下一级礼包) 的设计, 这里改为: 0 金币 0 元宝, 只给下一阶「8级礼包」。
  S.ECONOMY_PATCH = {libao2001:{id:2001, name:'1级新手礼包', lev:1, gold:0, yuanbao:0, item1:2002, num1:1}};
  S.on('configsLoaded', function(){
    if(CFG.libao){
      var fix = S.ECONOMY_PATCH.libao2001; CFG.libao.byId[2001] = fix;
      var b = CFG.libao.byId[2002]; if(b){ delete b.item6; }          // 原版 exchangeLibao 只读 item1~item5
      CFG.libao.list.forEach(function(x){ if(x) for(var i=6;i<=8;i++) delete x['item'+i]; });
      for(var k in CFG.libao.raw) if(CFG.libao.raw[k].id==2001) CFG.libao.raw[k]=fix;
    }
  });
})(Systems);
