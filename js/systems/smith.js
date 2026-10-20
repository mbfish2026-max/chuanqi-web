// [systems] 铁匠 (TipBlackSmith), 合成 (TipFuse / TipFuseItem + fuse.txt), 分解/回收 (ItemTool.onPropsDecompound, BagTool.getMoneyByEquip)
(function(S){
  // ---------- 铁匠 ----------
  function genSmith(){
    var r=G.role, lvl=10*Math.floor(r.level/10)+10, level=lvl/10, id=30000+lvl, items=[], tries=0;
    while(!cfg('drop', id) && id>30010) id-=10;                       // drop 30010~30070
    while(items.length<3 && tries++<200){ rollDrop({q:1, cfg:{dorp1:[id]}}).item.forEach(function(s){ if(items.length<3 && stuffCfg(s).type==2) items.push(s); }); }
    r.blacksmith = {item:items, buildList:[], level:level};
    return r.blacksmith;
  }
  function smithCost(s, level){ return (stuffCfg(s).price||0) * level * s.q; }   // TipBlackSmith.updateSelect
  S.smith = {
    goods: function(){ var r=S.ensure(), b=r.blacksmith || genSmith();
      return b.item.map(function(s, i){ var c=stuffCfg(s); return {index:i, stuff:s, name:c.name, quality:s.q, needlevel:c.needlevel, cost:smithCost(s, b.level), bought:b.buildList.indexOf(i)!=-1, affix:(s.affix||[]).map(S.equip.affixText)}; }); },
    buy: function(i){ var r=S.ensure(), b=r.blacksmith || genSmith(), s=b.item[i]; if(!s) return '商品不存在';
      if(b.buildList.indexOf(i)!=-1) return '已打造';
      var cost=smithCost(s, b.level); if(!(r.gold > cost)) return '金币不足 (需要 '+cost+')';
      if(S.bag.free()<1) return '背包已满';
      r.gold -= cost; b.buildList.push(i); var n=JSON.parse(JSON.stringify(s)); n.uid=newUid(); addItem(n); save();
      return S.ok('打造成功: '+stuffCfg(s).name); },
    // 元宝刷新: 25 元宝 (onBtnYBRefreshClick)
    refreshYuanbao: function(){ var r=S.ensure(); if(r.yuanbao < 25) return '元宝不足'; r.yuanbao -= 25; genSmith(); save(); return S.ok('已刷新'); },
    // 广告刷新: 每日 5 次 (videoDaliy.videoBuild); Web 版无广告, 直接计次
    refreshAd: function(){ var r=S.ensure(); if(r.daily.videoBuild >= S.DAILY_VIDEO_MAX) return '今日免费刷新次数已用完'; r.daily.videoBuild++; genSmith(); save(); return S.ok('已刷新 ('+r.daily.videoBuild+'/'+S.DAILY_VIDEO_MAX+')'); },
    adLeft: function(){ var r=S.ensure(); return S.DAILY_VIDEO_MAX - r.daily.videoBuild; }
  };

  // ---------- 合成 ----------
  // type 1 = 技能书 (title2 = 职业), type 2 = 药品
  S.fuse = {
    list: function(type, prof){ prof = prof || G.role.prof;
      return (CFG.fuse||{list:[]}).list.filter(function(x){ return x && x.type==type && (type!=1 || Number(x.title2)==prof); })
        .map(function(x){ return {id:x.id, title:x.title, itemId:x.itemid, name:S.itemName(x.itemid), costgold:x.costgold, need:x.needitem1, needName:S.itemName(x.needitem1[0]), have:countItem(x.needitem1[0]), max:S.fuse.maxCount(x.id)}; }); },
    maxCount: function(id){ var x=cfg('fuse', id); if(!x) return 0; var n=Math.floor(countItem(x.needitem1[0])/x.needitem1[1]);
      if(x.costgold>0) n=Math.min(n, Math.floor(G.role.gold/x.costgold)); return n; },
    fuse: function(id, n){ n=Math.max(1, Math.floor(n||1)); var x=cfg('fuse', id); if(!x) return '配方不存在';
      if(countItem(x.needitem1[0]) < x.needitem1[1]*n) return S.itemName(x.needitem1[0])+' 不足';
      if(G.role.gold < x.costgold*n) return '金币不足';
      if(!S.bag.canAdd(x.itemid)) return '背包已满';
      consumeItem(x.needitem1[0], x.needitem1[1]*n); G.role.gold -= x.costgold*n; addItem(createStuff(x.itemid, n)); save();
      return S.ok('合成 '+S.itemName(x.itemid)+' x'+n); }
  };

  // ---------- 分解 / 回收 ----------
  S.fenjie = {
    // 道具分解: 每次 1 个, 获得 sellprice 金币 + sellyunabao 元宝 + decompose 道具
    preview: function(uid){ var f=S.findStuff(uid); if(!f) return null; var c=stuffCfg(f.s);
      if(c.type==2) return {gold:(c.sellprice||0)*f.s.q};
      return {gold:c.sellprice||0, yuanbao:c.sellyunabao||0, item:c.decompose?{id:c.decompose[0], name:S.itemName(c.decompose[0]), count:c.decompose[1]}:null}; },
    decompose: function(uid, n){ var f=S.findStuff(uid); if(!f || f.where!='bag') return '物品不存在'; var s=f.s, c=stuffCfg(s);
      if(c.type==2) return S.fenjie.recycle(uid);
      if(s.lock) return '物品已锁定';
      n=Math.min(s.count, Math.max(1, Math.floor(n||1))); var r=G.role, got=[];
      for(var i=0;i<n;i++){ removeItem(uid,1); if(c.sellprice>0){ r.gold+=c.sellprice; } if(c.sellyunabao>0) r.yuanbao+=c.sellyunabao;
        if(c.decompose && c.decompose.length) addItem(createStuff(c.decompose[0], c.decompose[1])); }
      if(c.sellprice>0) got.push('金币 '+c.sellprice*n); if(c.sellyunabao>0) got.push('元宝 '+c.sellyunabao*n);
      if(c.decompose && c.decompose.length) got.push(S.itemName(c.decompose[0])+' x'+c.decompose[1]*n);
      save(); return S.ok('分解获得: '+(got.join(', ')||'无')); },
    // 装备回收: sellprice * 品质
    recycle: function(uid){ var f=S.findStuff(uid); if(!f || f.where!='bag') return '物品不存在'; var s=f.s, c=stuffCfg(s);
      if(c.type!=2) return '不是装备'; if(s.lock) return '装备已锁定';
      var g=(c.sellprice||0)*s.q; G.role.gold+=g; removeItem(uid); save(); return S.ok('回收获得金币 '+g); },
    // 一键回收 (BagTool.getBagEquipByQuality): 指定品质, 跳过锁定; includeNonsuch=false 时跳过极品
    recycleByQuality: function(q, includeNonsuch){ var r=G.role, list=r.bag.filter(function(s){ return stuffCfg(s).type==2 && s.q==q && !s.lock && (includeNonsuch || !s.nonsuch); });
      var g=0; list.forEach(function(s){ g+=(stuffCfg(s).sellprice||0)*s.q; removeItem(s.uid); }); r.gold+=g; save();
      return S.ok('回收 '+list.length+' 件, 获得金币 '+g); }
  };

  // ---------- 技能丹: 每个 +100 技能熟练度 (ItemTool itemid_103033) ----------
  S.skill = {
    useDan: function(base, n){ n=Math.max(1,Math.floor(n||1)); var st=G.role.skills[base]; if(!st) return '未学习该技能';
      if(countItem(S.ITEM_SKILLDAN) < n) return '技能丹不足'; consumeItem(S.ITEM_SKILLDAN, n); st.exp=(st.exp||0)+100*n; save(); return S.ok('技能熟练度 +'+100*n); }
  };
})(Systems);
