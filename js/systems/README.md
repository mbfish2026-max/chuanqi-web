# js/systems — 游戏系统逻辑 (无 UI)

在 data.js/game.js 之后加载 (index.html 末尾 `[systems] BEGIN/END` 块)。所有动作都返回字符串: `'OK:提示'` 表示成功，否则是错误提示，可以直接传给 ui.js 的 `msg()`。

钩子: data.js 定义了 `H(name, value, ...)`，game.js 在这些位置调用它: createStuff, addItem, attr, roleDamage, kill, monsterAttack, roleHurt, tick, skillHandled, skillCands, taskProgress, useLibao, configsLoaded。

| API | 说明 |
|---|---|
| Systems.fuli.monthList() / sign() | 月签到 (qiandao_m)，只能在 当月日期 == id 的那天签 |
| Systems.fuli.weekList() / canSignWeek() / signWeek() | 七日签到 (qiandao_w)，每天一档 |
| Systems.fuli.redeem(code) | 兑换码 (duihunma)，每个码每个角色只能用一次 |
| Systems.equip.affixes(uid) / affixText(x) / combat(uid) | 词缀列表 [{text,quality,raw}] |
| Systems.equip.remakeCost(uid, locks) / remake(uid, locks) / pendingRemake(uid) / saveRemake(uid) / cancelRemake(uid) | 洗练，最多锁 2 条 |
| Systems.smith.goods() / buy(i) / refreshYuanbao() / refreshAd() / adLeft() | 铁匠 NPC |
| Systems.fuse.list(type 1技能书/2药品, prof?) / maxCount(id) / fuse(id, n) | 合成 |
| Systems.fenjie.preview(uid) / decompose(uid, n) / recycle(uid) / recycleByQuality(q, includeNonsuch) | 分解 / 回收 |
| Systems.skill.useDan(baseSkillId, n) | 技能丹，每个 +100 熟练度 |
| Systems.lilian.chapters() / current() / claim(taskId) | 历练章节 + 任务 |
| Systems.bag.capacity() / used() / free() / expandByAd() / sort() / toggleLock(uid) | 背包 (50 格，每次 +3，上限 300) |
| Systems.buff.list() | 当前角色 Buff [{id,name,icon,left,shield}] |
| Systems.pets.list() | 当前召唤兽 [{name,hp,maxhp,atk,ac}] |

测试: `node tools/test_systems.js`

## 英雄 + 合击 (js/systems/hero.js, UI: js/ui_hero.js)
原版传奇之旅的源码和配置里都没有英雄或合击 (grep hero/heji/合击/英雄 只找到地图介绍文字), 所以按热血传奇 1.80 英雄版的经典规则设计。
- 解锁: 主角 Lv22 起, `Systems.hero.unlock(prof 1战/2法/3道, name?)`; 每个角色只能有一个英雄; 英雄起始等级 = 主角等级-10; 之后共享击杀经验, 等级不超过主角
- 属性: profession 表成长 (生命 ×0.8) + 10 个装备位 (主角背包装备 → 英雄, 复用强化外的装备/词缀数据); 技能: 本职业 1 级主动技能 (slevel ≤ 英雄等级)
- 战场: 英雄单位 `{isHero:true}` 放进 `G.battle._pets`, move.js 负责走位, ui.js 的宝宝卡片负责绘制 (ui_hero.js 换成英雄头像); 战士英雄近战 (距离 1), 法/道英雄距离 4; 阵亡后 30 秒复活
- 模式: attack 攻击 / follow 跟随 (在场但不出手) / rest 休息 (离开战场, 不得经验也不涨怒气)
- 怒气 0~100: 主角每次攻击 +2, 英雄每次攻击 +3, 主角受击 +1, 英雄受击 +2。满怒气时施放合击, 冷却 30 秒, 怒气清零; `setAuto(true)` 开启自动合击
- 合击伤害 = (主角攻击上限 + 英雄攻击上限) × 倍率 × (1 + 主角等级/50) × 随机 0.9~1.1, 再减去目标防御

| 主角+英雄 | 合击 | FX 目录 | 倍率 | 效果 |
|---|---|---|---|---|
| 战+战 | 破魂斩 | heji_pohunzhan | 3.0 | 群体 |
| 战+法 | 劈星斩 | heji_pixingzhan | 4.5 | 单体, 无视 50% 防御 |
| 战+道 | 雷霆一击 | heji_leitingyiji | 3.2 | 群体 + 眩晕 2 秒 |
| 法+法 | 火龙气焰 | heji_huolongqiyan | 3.6 | 群体 |
| 法+道 | 噬魂沼泽 | heji_shihunzhaoze | 2.6 | 群体 + 5 秒每秒追加 20% 伤害 |
| 道+道 | 末日审判 | heji_morishenpan | 2.8 | 群体 + 主角/英雄回复 20% 生命 |

API: `Systems.hero.has() / canUnlock() / unlock(prof,name) / info() / attr() / equip(uid) / unequip(slot) / setMode('attack'|'follow'|'rest') / setAuto(bool) / heji() / rage() → {rage,max,ready,cd} / unit() / comboFor(p1,p2) / COMBO`
事件: `FXE('heji', {name, fx, key, hits:[{m,d}], total, manual})`, `FXE('heroatk', {unit, target, dmg, crit, skill})`, `FXE('herodie')`。fx.js 会先找 `assets/fx/<fx>/sheet.png`, 找不到就用程序生成的特效; `FX.registerHeji(dir, fn(s, h, targets))` 可以替换某个合击的程序特效。
截图参数: `?seed=1&map=1003&hero=<prof|0>[&panel=1][&heji=1][&rage=1]`

## 任务系统 (js/systems/quest.js, UI: js/ui_quest.js)
- 主线: 原版 task.txt 任务链 (ItemTask eTaskType 1~11, 按章节 id/1000), 复用 game.js currentTasks/claimTask; 第 4 章起未开放 (同历练)
- 每日任务 (原版无, 设计): 6 条, 本地 0 点重置; 完成领取得活跃度, 活跃度 20/50/80/100 宝箱
- 成就 (原版无, 设计): 击杀/等级/BOSS/强化/穿戴 分阶
- 事件: kill 钩子 + 包装全局 enhance / equipItem / Systems.fuli.sign / Systems.lilian.claim; `Systems.quest.emit(ev,n)` 可供其他系统上报
- 存档: role.quest {ver:1,...}; v0→v1 迁移用 role.kills 回填累计击杀; role.ver 至少为 1
- API: main()/claimMain(id), daily()/claimDaily(id), activity()/chests()/openChest(id), achievements()/claimAch(id), red()
- 截图: `?quest=main|daily|ach&qdemo=1`

## 装备系统改造 (js/systems/loot.js, UI: js/ui_loot.js, 测试: tools/test_loot.js)
- 数据表 (独立文件, 先于 loot.js 加载, 写入 Systems.lootData): js/systems/lootdata/tc.js (ItemRatio/怪物品质系数/每怪 TC/等级窗口/分解精华), uniques.js (暗金/专属), sets.js (套装 2/3/5 件加成); 调数值只改这三个文件
- 掉率模拟: `node tools/sim_loot.js [seed] [kills]` (mulberry32 固定种子, 默认 20261021×20000 杀/行); TC 基底池 = 原版 drop.txt 装备 ∪ 暗金 ∪ 套装件; 图标缺失时 ui_loot.js 用部位剪影兜底
- 部位: 已对照 GameKeys.eWeaponPart + item.txt 核实 5武器 10衣服 15头盔 20项链 22/23戒指 24/25手镯 62鞋 64腰带 (文档对戒指/手镯的猜测是反的)
- 品质: c=floor((base-floor((ilvl-qlvl)/div))*128) → MF 递减 MF*F/(MF+F) (F 250/500/600) → 下限 min → 怪物品质系数 c*f/1024; 判定 橙→紫→蓝→绿, floor(rnd*c)<128. 替换掉落表里的 gailv (BOSS 前两档必橙保留)
- 每怪 TC: 按怪 q1-5 的 picks/nodrop/equip 权重, 装备基底取 needlevel∈[lvl-12,lvl+3] 的可穿部位; 掉落写入 s.il (ilvl)
- 词缀: 同 code 不重复 (洗练也排除锁定词条的 code); alvl 门槛限制词缀等级档
- 暗金 (q5 + 固定词条 s.uq): 屠龙/裁决之杖/骨玉权杖/龙纹剑/嗜魂法杖/倚天剑/井中月/血饮/无极棍/怒斩/开天/镇天/玄天/至尊屠龙; 倚天剑 GM 行在运行时修正为 50 级底子
- 套装 (q4 + s.set): 战神/魔神/幽灵/圣战/法神/天尊/雷霆/烈焰/光芒, 2/3/5 件加成, 走 attr 钩子
- 分解得精华 (白1 绿3 蓝6 紫6 套装12 暗金15), 5 精华换 1 洗练石; 自动分解规则 role.lootCfg (原版 role_setup 回收设置面板); 锁定阻止分解/出售/回收
- 整理: 道具在前, 装备按 品质→暗金/套装→部位→等级→名称; 对比: Systems.loot.compare(uid) (背包格升级箭头 + tipEquip 对比块)
- 光柱: FXE('drop',{m,q,name,uq,set}) → fx.js dropBeam
- 存档: role.ver=2 (key 仍为 cq_web_save_v1), 迁移 MIG[1] 补字段并标记旧存档里的暗金/套装
- 截图: `?seed=1&map=1003&eq=tip|set|salvage|beam`, `?seed=1&page=main_role&eq=bag`
