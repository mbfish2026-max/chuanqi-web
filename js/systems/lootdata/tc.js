// [loot] 掉落数据表: 品质判定 ItemRatio / 怪物品质系数 / 每怪 TC / 分解精华 (独立数据文件, js/systems/loot.js 通过 Systems.lootData 读取; 须先于 loot.js 加载). 只放数据, 调数值不用动逻辑.
(function(S){ var D = S.lootData = S.lootData || {};
  // q1-5 = 白/绿/蓝/紫/橙 ; 对应文档 普通/魔法/稀有/套装/暗金. ItemRatio (文档 §1 表, 来自 D2 ItemRatio.txt)
  var RATIO = {5:{base:110,div:4,min:6400,F:250}, 4:{base:44,div:4,min:2560,F:500}, 3:{base:20,div:4,min:1024,F:600}, 2:{base:7,div:6,min:384,F:0}};  // 2026-10-21 调整: 原 {400/1,160/2,100/2,34/3} 普通怪≈95%白, 普通怪约 白79 绿13 蓝5 紫2 橙1, BOSS 白21 绿45 蓝20 紫10 橙4
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
