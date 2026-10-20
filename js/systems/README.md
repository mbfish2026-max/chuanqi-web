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
