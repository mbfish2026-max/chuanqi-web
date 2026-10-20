# 传奇之旅文字传奇 — 纯 HTML/JS 复刻

无引擎、无构建。运行: `python3 -m http.server 8081` 后访问 http://<host>:8081/ (竖屏手机布局)。
原工程 `../src` 只读未改动；配置表 (`assets/resources/config/*.txt`, JSON) 与 PNG 美术已复制到 `assets/`。

文件: `index.html` `style.css` `js/data.js`(加载配置表) `js/game.js`(玩法逻辑) `js/ui.js`(界面)。

## 已实现 (按原版脚本/数据重写)
- 创建角色: 战士/法师/道士 (profession.txt)，随机名 (randomname.txt)，初始物品
- 属性: 基础值 + 等级×成长 (Role.js)，装备/强化/被动技能加成，战力 (CombatTool + cizhui.txt 系数)
- 地图: map.txt 九宫格移动 + map_info 大地图传送 (战力限制)；安全区/野外
- 自动挂机战斗: 怪物品质随机 (map.quality) 及品质倍率 (Monster.js)，命中/幸运/暴击/固定伤害 (DamageTool)，攻速、怪物攻速、刷新；BOSS 定时刷新
- 掉落: drop.txt 完整规则 (DropTool: nodrop/prob/picks/gailv 品质)，金币
- 装备: 10 个部位穿戴/卸下，品质，极品属性 (bestgailv/points)，强化 (equip_qianghua + parts)
- 背包: 使用/出售/一键出售/自动出售，药品 (5 秒持续回复, 自动吃药)，礼包 (libao.txt)，元宝道具，回城卷
- 技能: 技能书学习/升级 (booknum、slevel、熟练度)，被动加攻、概率技能 (攻杀)、主动技能 (cd/耗蓝)、治疗术
- 升级: levelup.txt 经验表；死亡后回到复活地图
- 商店: shop.txt 药店/书店/金币/元宝商店
- 任务: task.txt 章节任务 (等级/击杀/品质装备/战力/强化/学技能/章节完成) 与奖励
- 存档: localStorage 每 5 秒自动保存；简化离线收益

## 未实现
- QuickSDK/XGSdk/登录/充值/广告/HTTP (cpgc.phonecoolgame.com)，特权 (Prerogative)
- 福利: 签到、兑换码、充值福利 (FuliSign/FuliExchange/FuliRecharge/FuliCoin)
- 装备词缀与洗练 (equip_cizhui, TipRemake)、合成 (fuse.txt)、分解、铁匠
- 历练 (lilian.txt)、剧情 (MainStory)、新手引导 (guide.txt)、宠物/召唤 (Partner)、Buff 系统 (buff.txt)
- 格子地图 A* 走位与技能特效动画 (.anim)、音效
- 任务类型 9/11 (幸运、洗练) 显示"未实现"

## 已知问题
- 伤害/回复数值为对原逻辑的近似 (技能效果按配置字段简化解析)
- 背包无容量上限
- 原版新手礼包数据给予 9999999 金币/元宝 (原配置如此，未修改)
- 离线收益为简化公式，非原版 TipOffline 算法
