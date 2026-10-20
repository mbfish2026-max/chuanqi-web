// [loot] 套装数据表 (独立数据文件, js/systems/loot.js 通过 Systems.lootData 读取; 须先于 loot.js 加载). 只放数据, 调数值不用动逻辑.
(function(S){ var D = S.lootData = S.lootData || {};
  // ---------- 套装 (按 item id; 戒指/手镯两件同 id 算 2 件) ----------
  var SETS = {
    zhanshen:{name:'战神', ids:[110007,120016,124016,122017,162006], bonus:{2:{maxac:4,maxhp:120}, 3:{maxzs:6,lucky:1}, 5:{adddamage:8,critical:5}}},
    mozhen:  {name:'魔神', ids:[110008,120017,124017,122018], bonus:{2:{maxac:3,maxhp:100}, 3:{maxfs:6,lucky:1}}},
    youling: {name:'幽灵', ids:[110009,120018,124018,122019], bonus:{2:{maxac:3,maxhp:110}, 3:{maxds:6,lucky:1}}},
    shengzhan:{name:'圣战', ids:[110013,115011,120019,122020,124019,164006], bonus:{2:{maxac:6,maxhp:200}, 3:{maxzs:10,lucky:1}, 5:{adddamage:10,critical:6,maxhp:300}}},
    fashen:  {name:'法神', ids:[110014,115012,120020,122021,124020,162007,164007], bonus:{2:{maxac:5,maxhp:160}, 3:{maxfs:10,lucky:1}, 5:{adddamage:10,critical:6,maxmp:300}}},
    tianzun: {name:'天尊', ids:[110015,115013,120021,122022,124021,162008,164008], bonus:{2:{maxac:5,maxhp:180}, 3:{maxds:10,lucky:1}, 5:{adddamage:10,critical:6,maxhp:250}}},
    leiting: {name:'雷霆', ids:[110016,115014,120022,122023,124022,162009,164009], bonus:{2:{maxac:8,maxhp:300}, 3:{maxzs:15,lucky:2}, 5:{adddamage:15,critical:8,crtdamage:20}}},
    lieyan:  {name:'烈焰', ids:[110017,115015,120023,122024,124023,162010,164010], bonus:{2:{maxac:7,maxhp:240}, 3:{maxfs:15,lucky:2}, 5:{adddamage:15,critical:8,crtdamage:20}}},
    guangmang:{name:'光芒', ids:[110018,115016,120024,122025,124024,162011,164011], bonus:{2:{maxac:7,maxhp:260}, 3:{maxds:15,lucky:2}, 5:{adddamage:15,critical:8,crtdamage:20}}}
  };
  var ANAME = {maxhp:'生命',maxmp:'魔法',maxac:'防御',maxzs:'攻击',maxfs:'魔法攻击',maxds:'道术',lucky:'幸运',adddamage:'伤害增幅%',critical:'暴击',crtdamage:'暴击伤害%'};
  D.SETS = SETS;
  D.ANAME = ANAME;
})(Systems);
