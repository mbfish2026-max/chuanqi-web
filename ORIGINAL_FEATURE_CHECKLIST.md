# 传奇之旅 · 原版功能与细节清单（网页复刻对照）

来源：`/workspace/chuanqi/src`（Cocos prefab + scripts + config txt）。网页版：`/workspace/chuanqi/web-replica`。  
标注：✅ 已有 / 🔶 半成品 / ❌ 缺失。优先级：P0 核心可玩 / P1 体验完整 / P2 增强 / P3 可延后。

> 说明：原版**没有独立「挂机设置 / 技能设置 / 游戏设置」面板**；设置集中在战斗界面 `btnSetup` → `role_setup`（回收 + 回复 + 音效）。网页版在复刻原版三项之外，按传奇手游惯例补挂机/技能/游戏页，并接真实逻辑。

---

## 1. 登录 / 加载 / 创建角色

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| 启动加载 Loading / Preloading | 有 | ✅ 加载配置后进主界面 | P0 |
| 角色列表 RoleList | 有（多角色存档） | ✅ 最多3槽；迁移 cq_web_save_v1 | P2 |
| 创建角色 RoleCreate（战/法/道 + 随机名） | 有 | ✅ | P0 |
| 职业初始地图/礼包 profession.txt | 有 | ✅（新手礼包已经济修正） | P0 |
| 登录/选角 BGM | bgsound_login/create | ✅ Systems.audio + assets/audio | P2 |
| 引导 Guide | guide.prefab + guide.txt | ✅ 轻量遮罩；?noguide=1 跳过 | P2 |

## 2. 主界面（Main 五页）

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| 底部页签：战斗 / 角色 / 地图 / 历练 / 福利 | main_* | ✅ | P0 |
| 顶栏：名/等级/战力/金币/元宝/经验/HP/MP | Main | ✅ | P0 |
| 战斗页 main_fight：九宫格小地图、BOSS 列表、日志、设置钮 | MainFight | ✅（设置钮曾只切 autoDrug） | P0 |
| 角色页：属性 / 背包 / 技能 / 强化 | MainRole + role_* | ✅ | P0 |
| 地图页 main_map | MainMap | ✅ | P0 |
| 历练页 main_story | MainStory + lilian.txt | ✅ 进度文案/领取未完成态/一键领/章节图 | P1 |
| 福利页 main_fuli | MainFuli | 🔶 签到/兑换有；充值占位 | P1 |

## 3. 战斗 / 走位 / 伤害

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| 进战斗地图刷怪、击杀经验/掉落 | BattleTool / DropTool | ✅ + loot TC/暗金/套装 | P0 |
| 角色普攻 + 主动技能（priority 排序） | SkillTool / CombatTool | ✅ | P0 |
| 被动触发技（烈火等 gailv） | skill.txt | ✅ | P0 |
| 治疗类 triggertype=2（治愈术） | BattleTool | ✅ | P0 |
| 怪物 AI 攻击、闪避、暴击、死亡重生 | Monster / DamageTool | ✅ | P0 |
| 走位 A* 6×5 格 | AStar + BattleTool | ✅ move.js | P0 |
| 召唤兽（道士）走位/攻击 | Partner | ✅ pets in buff.js | P0 |
| 死亡回城 RoleDie | 有 | ✅ 三选一（回城/广告原地/20元宝原地） | P1 |
| 离线收益 TipOffline（时长上限 6/12h，免费/广告×2/元宝×5） | TipOffline | ✅ 按 levelup 比例；6/12h；×1/×2/×5 | P1 |
| 系统击杀消息 / 自动回收进账文案 | SystemMsg / GameUtils | ✅ 汇总行：击杀了/经验/掉落/自动回收了…获得了金币 | P2 |
| 屏幕震屏 / 飘字 / 技能 sheet | EffectTool | ✅ fx.js（可由设置关闭） | P1 |

## 4. 技能

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| 技能列表 role_skill、熟练度、升级/激活 TipSkill | RoleSkill / TipSkill | ✅ | P0 |
| 技能书学习 / 技能丹 +100 熟练 | ItemTool | ✅ Systems.skill.useDan | P0 |
| 技能自动施放按 priority | SkillTool.sort | ✅；设置可禁用单技能 | P1 |
| 合击（英雄） | **原版无** | ✅ 网页自研 hero.js | P1 |

## 5. 装备 / 背包 / 强化洗练

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| 十部位穿戴、职业/等级限制 | RoleBag | ✅ | P0 |
| 品质白绿蓝紫橙、极品点 | Stuff / Quality | ✅ + 暗金/套装扩展 | P0 |
| 词缀 cizhui / equip_cizhui | TipEquip | ✅ equip.js | P0 |
| 强化 equip_qianghua | RoleIntensify | ✅ | P0 |
| 洗练 TipRemake（锁词条） | TipRemake | ✅ | P0 |
| 加锁 / 整理 / 对比 | 部分 | ✅ loot.js | P0 |
| 背包容量 50→广告+3→300 | RoleBag | ✅ | P0 |
| 掉落光柱 | 有表现 | ✅ | P1 |

## 6. 回收 / 分解

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| **role_setup 回收设置**：非本职业 / 极品 / 白绿蓝紫自动回收（击杀掉落时直接换钱，收益默认 50%，特权可满） | RoleSetup + BattleTool.calculateAutoPickup | ✅ 自动回收→金币(50%/特权满额)；手动分解仍→精华；设置脚注说明 | P0 |
| 铁匠/回收 NPC 一键回收金币 | TipBlackSmith / fenjie | ✅ Systems.fenjie | P0 |
| 分解道具→书页等 | ItemTool.onPropsDecompound | ✅ | P1 |
| 精华兑换洗练石 | （网页扩展） | ✅ | P1 |

## 7. 设置（role_setup）— 原版完整项

入口：`MainFight.btnSetup` → prefab `role_setup`。

### 7.1 回收设置
| 项 | 默认 | 网页目标 |
|---|---|---|
| 非本职业装备 noProfession | false | ✅ 进自动回收规则 |
| 极品装备 nonsuch | false | ✅（勾选=也回收极品） |
| 普通/优秀/精良/稀有 eWhite/eGreen/eBule/ePurple | false | ✅ → lootCfg.auto[1..4]（回收→金币） |
| （网页保留）套装/暗金不回收、锁定不回收；手动分解→精华 | — | ✅ keepSet/keepUnique/lock |

### 7.2 回复设置（verifySettings）
| 项 | 默认 | 说明 |
|---|---|---|
| 生命回复 lifeRevert | true | HP% &lt; lifePercent 用 lifeId |
| lifePercent | 65 | ±5，0~100 |
| lifeId | 100010 微型金创药 | tipSetup 从 100010–100015 选 |
| 魔法回复 magicRevert | false | MP% &lt; magicPercent 用 magicId |
| magicPercent | 50 | 100020–100025 |
| 特殊药品 specialRevert | false | **按生命%** 触发，太阳水 100030–100032 |
| specialPercent | 65 | |

### 7.3 音效设置
| 项 | 默认 | 说明 |
|---|---|---|
| 游戏音效 soundSwitch | true | AudioTool.setVoice；网页：总开关（暂无曲库则控 FX 音效占位 + 存档） |

### 7.4 原版没有、网页增补（可玩）
| 分类 | 项 | 行为 |
|---|---|---|
| 挂机 | 自动战斗 / 自动技能 / 自动走位 / 背包满停止 | 钩 tick / skillCands / MOVE |
| 挂机 | 自动回收（复用回收设置→金币） | ✅ shouldAuto + afk.autoPick |
| 技能 | 每技能是否参与自动施放 | skillCands 过滤 |
| 游戏 | 伤害数字 / 震屏 / 特效质量 | FX 开关 |

## 8. 任务 / 历练 / 福利

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| 主线 task.txt | ItemTask | ✅ quest + game tasks | P0 |
| 每日/成就 | 原版无 | ✅ 网页设计 | P2 |
| 历练 lilian.txt 章节领取 | MainStory | ✅ | P1 |
| 月签/七日签 qiandao_* | FuliSign | ✅ | P0 |
| 兑换码 duihunma | FuliExchange | ✅ | P0 |
| 充值/元宝商店 | FuliRecharge / TipStore | 🔶 商店有，充值拒绝 | P2 |
| 特权 TipPrerogative（回收满额、离线 12h 等） | 有 | ✅ 元宝购买；回收满额/离线12h/经验+10%/BOSS减半 | P1 |
| 运营商店 RoleYyShop | 有 | ✅ 回收比例/药店/古玩刷新 | P3 |

## 9. 英雄 / 宠物召唤

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| 英雄 + 合击 | **无** | ✅ | P1 |
| 道士召唤兽 | Partner + skill | ✅ | P0 |
| Buff（盾/毒/冰等） | BuffTool | ✅ | P0 |

## 10. 商店 / NPC

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| 杂货/药品 TipStore | shop.txt | ✅ | P0 |
| 铁匠随机货 | TipBlackSmith | ✅ | P0 |
| 合成 TipFuse | fuse.txt | ✅ | P0 |
| 地图传送/介绍 tipMapInfo/Desc | 有 | ✅ | P1 |

## 11. 音效 / 存档

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| UI/技能/怪物/BGM 音效资源 | resources/audio | ✅ 已拷贝 assets/audio；API+设置静音 | P2 |
| 音效总开关 | Storage.voice + setupValue | ✅ 进 role.settings | P0 |
| 存档 localStorage | StoargeTool | ✅ cq_web_save_v1 + cq_web_roles_v1 | P0 |
| role.ver 迁移 | — | ✅ v2 装备；v3 设置；v4 特权；**v5 多角色/引导/云游** | P0 |

## 12. 其它

| 功能 | 原版 | 网页现状 | 优先级 |
|---|---|---|---|
| GM 面板 | GMTool | ❌（btnGM 隐藏） | P3 |
| 广告/视频激励 | Platform.showVideo | 🔶 部分直接给奖励 | P2 |
| 红点 | 多处 | ✅ 任务钮 + 主页历练/福利 + 签到/历练可领按钮 | P2 |

---

## 复刻批次建议

1. **本批（设置）**：完整接线 role_setup 原版全部项 + 挂机/技能/游戏可玩增补；真实钩战斗/分解/FX；测试与截图。  
2. **本批（P1）**：死亡 UI、离线收益对齐、历练表现、特权 — ✅。  
3. **本批（P2）**：音频接入、多角色、引导、运营商店 — ✅。  
4. **再批**：广告真接入、GM（跳过）；红点 ✅；自动回收金币/SystemMsg ✅。

