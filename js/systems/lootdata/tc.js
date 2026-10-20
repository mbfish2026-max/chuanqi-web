// [loot] 掉落数据表: 品质判定 ItemRatio / 怪物品质系数 / 每怪 TC / 分解精华 (独立数据文件, js/systems/loot.js 通过 Systems.lootData 读取; 须先于 loot.js 加载). 只放数据, 调数值不用动逻辑.
(function(S){ var D = S.lootData = S.lootData || {};
  // q1-5 = 白/绿/蓝/紫/橙 ; 对应文档 普通/魔法/稀有/套装/暗金. ItemRatio (文档 §1 表, 来自 D2 ItemRatio.txt)
  var RATIO = {5:{base:400,div:1,min:6400,F:250}, 4:{base:160,div:2,min:5600,F:500}, 3:{base:100,div:2,min:3200,F:600}, 2:{base:34,div:3,min:192,F:0}};
  var MFACT = {1:0, 2:150, 3:300, 4:500, 5:800};      // 怪物品质系数 (/1024 折减), 怪 q = 普通..BOSS
  // 每怪掉落 TC (按怪品质): picks 次, 每次 nodrop:equip 权重; 装备基底按 needlevel ∈ [lvl-12, lvl+3]
  var TC = {1:{picks:1,nd:94,eq:6}, 2:{picks:1,nd:85,eq:15}, 3:{picks:1,nd:70,eq:30}, 4:{picks:2,nd:55,eq:45}, 5:{picks:3,nd:15,eq:85}};
  var ESS = {1:1, 2:3, 3:6, 4:6, 5:10}, ESS_SET = 12, ESS_UQ = 15;   // 文档 essOf 映射 (套装 12 / 暗金 15)
  var LVL_WIN = [-12, 3];                             // TC 基底 needlevel 窗口: [怪等级-12, 怪等级+3]
  D.RATIO = RATIO;
  D.MFACT = MFACT;
  D.TC = TC;
  D.ESS = ESS;
  D.ESS_SET = ESS_SET;
  D.ESS_UQ = ESS_UQ;
  D.LVL_WIN = LVL_WIN;
})(Systems);
