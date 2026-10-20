# 传奇之旅文字传奇 — 纯 HTML/JS 复刻

无引擎、无构建。运行: `python3 -m http.server 8081` 后访问 http://<host>:8081/ (竖屏, 设计分辨率 750×1334 等比缩放)。
原工程 `../src` 只读未改动。

## 结构
- `tools/convert_prefabs.py` — 解析原 Cocos Creator 2.4 的 `Start.fire` 和 64 个 `*.prefab` (JSON)：节点树、位置/锚点/尺寸/缩放/旋转、
  cc.Sprite (spriteFrame uuid → .meta → PNG，按 trim/rotated 裁切，含九宫格 border)、cc.Label (文字/字号/行高/颜色/对齐/溢出)、
  LabelOutline、RichText、Button、Layout、Widget、Mask、ScrollView、ProgressBar、Toggle、EditBox，以及原脚本组件的属性→节点引用。
  输出 `ui/prefabs.js` 与 `assets/ui/*.png`。
- `js/cc.js` — 迷你渲染器：把 prefab 树转成绝对定位 DOM (Cocos 坐标 → CSS)，实现 Widget 对齐、Layout(横/竖/网格, 容器自适应)、
  Sprite SIMPLE/SLICED/TILED/FILLED、进度条、滚动视图、按钮、输入框；`node.ref('labCoin')` 按原脚本属性名取节点。
- `js/data.js` / `js/game.js` — 配置表加载与核心玩法；`js/systems/*` — 扩展系统 (window.Systems)。
- `js/ui.js` / `js/ui_systems.js` — 用原 prefab 搭界面并挂接逻辑 (节点名与 Main.js / MainFight.js / MapBattle.js / MainRole.js / RoleBag.js 等一致)。
- `tools/shots.sh` + `tools/cdp.js` — 无头 Chrome 截图 (输出 ../shots/*.png)。调试参数: `?seed=<职业>&map=<id>&page=<prefab>&tip=<equip|props|store|...>`。

## 已实现
- 界面 (原 prefab): 加载页、创建角色、主界面 (顶栏/底部 6 个导航/血蓝球/经验条)、战斗页 (6×5 格子战场 itemRole、九宫格小地图与连线、系统消息、BOSS 列表)、
  安全区 NPC (map_neutrally/itemNpc)、角色页 (装备格/属性/背包/强化)、技能页、历练、世界地图 (mapVec 坐标)、福利 (签到/七日/兑换码)、
  tipEquip / tipProps / tipStore / tipStoreBuy / tipMapDesc / tipOffline / role_die / tipToast / tipRemake / tipBlacksmith / tipFuse / tipFuseItem
- 玩法: 三职业、属性成长、战力、九宫格与大地图移动、自动挂机战斗 (品质怪、命中/幸运/暴击/固伤)、BOSS 刷新、drop.txt 掉落、装备 10 部位/品质/极品/强化、
  药品与自动吃药、礼包、技能书学习/升级、升级、商店、任务/历练、存档 (localStorage)、离线收益
- 扩展系统 (js/systems): 签到/七日/兑换码、词缀与洗练、铁匠锻造、合成、分解/回收、背包容量 (50 格, 可扩)、Buff、召唤兽

## 未实现 / 与原版差异
- QuickSDK/XGSdk/登录/充值/广告/HTTP (cpgc.phonecoolgame.com)，特权；福利页“金币/元宝”(充值) 页签仅显示原界面
- 战场格子中的 A* 走位、攻击方向动画 (.anim)、技能特效、飘字、音效；怪物位置固定在格子上
- 新手引导 (guide.txt)、商人 (role_yyshop) 页签 (改为打开回收)
- Widget 在非 750×1334 比例下按“等比缩放+留黑边”处理，未做原版 fitWidth 的高度拉伸
- 位图字体 (pingfang/simli .fnt) 用系统字体替代

## 已知问题
- 伤害/回复数值为对原逻辑的近似 (技能效果按配置字段简化解析)
- 新手礼包原配置给 9999999 金币/元宝；现在加载时被替换为 0 金币 / 0 元宝 + 一个 8级礼包
- 离线收益为简化公式，非原版 TipOffline 算法
- 部分弹窗内文字对齐与原版有像素级偏差 (Label 溢出模式近似)
