// [systems] 英雄 + 合击 (原版传奇之旅没有英雄/合击配置, 按热血传奇 1.80 英雄版经典规则设计)
// - Lv22 解锁, 选择职业 (战/法/道), 英雄有独立等级/经验/属性/10 个装备位/技能, 作为战场单位与玩家并肩作战
// - 怒气 (0~100): 玩家/英雄造成伤害与受到伤害都会增加; 满怒气可施放合击 (手动或自动), 冷却 30 秒
// 战场单位: 英雄放在 G.battle._pets 中 (isHero=true), move.js / ui.js 像宝宝一样负责走位和绘制
(function(S){
  var UNLOCK_LEVEL = 22, RAGE_MAX = 100, HEJI_CD = 30, REVIVE_SEC = 30;
  var PNAME = {1:'战士', 2:'法师', 3:'道士'}, ATKK = {1:'zs', 2:'fs', 3:'ds'};
  // 经典合击对照 (玩家职业+英雄职业, 与顺序无关)
  var COMBO = {
    '1+1': {name:'破魂斩',   fx:'heji_pohunzhan',   mult:3.0, aoe:true,  desc:'战+战: 双刀破魂, 对所有敌人造成巨大物理伤害'},
    '1+2': {name:'劈星斩',   fx:'heji_pixingzhan',  mult:4.5, aoe:false, desc:'战+法: 单体极高伤害, 无视 50% 防御', pierce:.5},
    '1+3': {name:'雷霆一击', fx:'heji_leitingyiji', mult:3.2, aoe:true,  desc:'战+道: 雷霆贯地, 群体伤害并眩晕 2 秒', stun:2},
    '2+2': {name:'火龙气焰', fx:'heji_huolongqiyan',mult:3.6, aoe:true,  desc:'法+法: 火龙席卷全场, 群体魔法伤害'},
    '2+3': {name:'噬魂沼泽', fx:'heji_shihunzhaoze',mult:2.6, aoe:true,  desc:'法+道: 群体伤害, 之后 5 秒每秒追加 20% 伤害', dot:.2},
    '3+3': {name:'末日审判', fx:'heji_morishenpan', mult:2.8, aoe:true,  desc:'道+道: 群体伤害并为玩家和英雄回复 20% 生命', heal:.2}
  };
  function comboKey(a, b){ return Math.min(a,b)+'+'+Math.max(a,b); }
  function hero(){ var r=G.role; return r && r.hero; }
  function emit(type, o){ if(typeof FXE==='function') FXE(type, o); }

  // ---------- 属性 (profession 表 + 成长, 英雄为玩家同职业的 80% 生命) ----------
  function heroAttr(h){
    h = h || hero(); var p=CFG.profession.raw[PROF_KEY[h.prof]], L=h.level, a={};
    a.maxhp=Math.ceil((p.hp+L*p.g_hp)*0.8); a.maxmp=Math.ceil(p.mp+L*p.g_mp);
    ['minzs','maxzs','minfs','maxfs','minds','maxds','minac','maxac'].forEach(function(k){ a[k]=Math.ceil(p[k]+L*p['g_'+k]); });
    a.hit=0; a.evade=0; a.critical=0; a.lucky=0; a.fixeddamage=0; a.fixedac=0; a.atkspeed=p.atkspeed||1.5;
    SLOT_ORDER.forEach(function(sl){ var s=h.equip[sl]; if(!s||!s.attr) return; var e=s.attr; a.maxhp+=e.hp||0; a.maxmp+=e.mp||0;
      ['minzs','maxzs','minfs','maxfs','minds','maxds','minac','maxac'].forEach(function(k){ a[k]+=e[k]||0; }); });
    if(S.equip && S.equip.applyAffixes) S.equip.applyAffixes(a, h.equip);
    var k=ATKK[h.prof]; a.atkmin=a['min'+k]; a.atkmax=Math.max(a['max'+k], a.atkmin);
    return a;
  }
  // 英雄技能: 本职业主动技能 (skill 表 1 级行, slevel <= 英雄等级)
  function heroSkills(h){ h=h||hero(); return CFG.skill.list.filter(function(x){ return x.job==h.prof && x.level==1 && x.triggertype==1 && x.power2 && (x.slevel||1)<=h.level; })
    .sort(function(a,b){ return (b.priority||0)-(a.priority||0); }); }

  // ---------- 战场单位 ----------
  function unitOf(b){ return (b._heroUnit && b._heroUnit.hp>0) ? b._heroUnit : null; }
  function makeUnit(b){
    var h=hero(), a=heroAttr(h), avatar='icon_avatar_'+h.prof+'_0';
    if(h.hp==null || h.hp>a.maxhp) h.hp=a.maxhp;
    var u = {isHero:true, name:h.name, prof:h.prof, hp:h.hp, maxhp:a.maxhp, minzs:a.atkmin, maxzs:a.atkmax, ac:Math.ceil((a.minac+a.maxac)/2),
      hit:a.hit, critical:a.critical, fixeddamage:a.fixeddamage, atkT:1e9, heroT:1, cfg:{name:h.name, model:avatar, attack_spd:a.atkspeed, hero:true, avatar:'role_create/'+avatar}};
    b._heroUnit = u; return u;
  }
  function inBattle(b){ return b._pets && b._heroUnit && b._pets.indexOf(b._heroUnit)!=-1; }
  function detach(b){ if(b._pets){ var i=b._pets.indexOf(b._heroUnit); if(i!=-1) b._pets.splice(i,1); } }
  function attach(b){ var u=b._heroUnit; if(!u || u.hp<=0) return; b._pets=b._pets||[]; if(b._pets.indexOf(u)==-1) b._pets.push(u); }

  function addRage(n){ var h=hero(); if(!h || h.mode=='rest') return; h.rage=Math.min(RAGE_MAX, (h.rage||0)+n); }
  function heroAddExp(n){ var h=hero(); if(!h) return; h.exp+=n;
    while(h.level < G.role.level && h.exp>=expNeed(h.level)){ h.exp-=expNeed(h.level); h.level++; var a=heroAttr(h); h.hp=a.maxhp; log('<b style="color:#7fd7ff">英雄 '+h.name+' 升到 '+h.level+' 级</b>'); }
    if(h.level>=G.role.level) h.exp=Math.min(h.exp, expNeed(h.level)-1); }   // 英雄等级不超过主角

  // 合击伤害: (玩家攻击上限 + 英雄攻击上限) * 倍率 * (1 + 主角等级/50)
  function hejiDamage(cb, a, ha, m){
    var base=(a.atkmax+ha.atkmax)*cb.mult*(1+G.role.level/50);
    var d=base*(0.9+Math.random()*0.2) - (m.ac||0)*(1-(cb.pierce||0));
    return Math.max(1, Math.ceil(d));
  }
  function doHeji(b, manual){
    var h=hero(), u=b && unitOf(b); if(!h) return '尚未拥有英雄';
    if(!b || mapCfg().type!=2) return '只能在战斗地图使用合击';
    if(!u || !inBattle(b)) return '英雄不在战斗中';
    if((h.rage||0) < RAGE_MAX) return '怒气不足 ('+Math.floor(h.rage||0)+'/'+RAGE_MAX+')';
    if((h.hejiCd||0) > 0) return '合击冷却中 ('+Math.ceil(h.hejiCd)+'秒)';
    var alive=b.mons.filter(function(m){ return !m.dead; }); if(!alive.length) return '没有目标';
    var cb=COMBO[comboKey(G.role.prof, h.prof)], a=calcAttr(), ha=heroAttr(h);
    var targets=cb.aoe ? alive : [alive[0]], total=0, hits=[];
    h.rage=0; h.hejiCd=HEJI_CD; h.hejiCount=(h.hejiCount||0)+1;
    targets.forEach(function(m){ var d=hejiDamage(cb, a, ha, m); m.hp-=d; total+=d; hits.push({m:m, d:d});
      if(cb.stun){ m._buffs=m._buffs||[]; m._buffs.push({cfg:{name:cb.name+'-眩晕', id:0}, left:cb.stun, vertigo:true}); }
      if(cb.dot){ m._buffs=m._buffs||[]; m._buffs.push({cfg:{name:cb.name, id:0, hp:-Math.ceil(d*cb.dot), interval:1}, left:5, tick:1}); } });
    if(cb.heal){ G.role.hp=Math.min(a.maxhp, G.role.hp+Math.ceil(a.maxhp*cb.heal)); u.hp=Math.min(u.maxhp, u.hp+Math.ceil(u.maxhp*cb.heal)); }
    log('<b style="color:#ffb000">【合击·'+cb.name+'】</b> 你与英雄 '+h.name+' 联手, 对 '+targets.length+' 个目标共造成 '+total+' 伤害');
    emit('heji', {name:cb.name, fx:cb.fx, key:comboKey(G.role.prof, h.prof), hits:hits, total:total, manual:!!manual});
    hits.forEach(function(x){ if(x.m.hp<=0 && !x.m.dead) killMonster(b, x.m); });
    save(); return S.ok(cb.name+' 造成 '+total+' 伤害');
  }

  function heroAct(b, dt){
    var h=hero(), u=unitOf(b); if(!u) return; var ha=heroAttr(h);
    u.atkT=1e9;                                                     // 关掉 buff.js 的宝宝普攻, 英雄由这里驱动
    u.maxhp=ha.maxhp; u.minzs=ha.atkmin; u.maxzs=ha.atkmax; u.ac=Math.ceil((ha.minac+ha.maxac)/2);
    u.hp=Math.min(u.maxhp, u.hp+u.maxhp*0.005*dt); h.hp=u.hp;
    if(h.mode!='attack') return;
    u.heroT-=dt; if(u.heroT>0) return; u.heroT=ha.atkspeed;
    var alive=b.mons.filter(function(m){ return !m.dead; }); if(!alive.length) return;
    var t=alive[0], range=h.prof==1?1:4;
    if(typeof MOVE!=='undefined' && u.idx!=null){ alive.sort(function(x,y){ return MOVE.cheb(u.idx,x.idx)-MOVE.cheb(u.idx,y.idx); }); t=alive[0]; if(MOVE.cheb(u.idx,t.idx)>range) return; }
    if(Math.random()*100 >= 90+ha.hit-(t.cfg.evade||0)) return;
    var d=rnd(ha.atkmin, ha.atkmax), used=null;
    h.cds=h.cds||{};
    var sk=heroSkills(h).filter(function(x){ return (h.cds[x.id]||0)<=0; })[0];
    if(sk){ d=d*sk.power2/100+(sk.power||0); h.cds[sk.id]=sk.basecd||3; used=sk.name; }
    var crit=Math.random()*100<ha.critical; if(crit) d*=1.5;
    d=Math.max(1, Math.ceil(d-(t.ac||0)+Math.max(0,ha.fixeddamage-(t.cfg.fixedac||0))));
    t.hp-=d; addRage(3);
    log('英雄'+(used?'['+used+']':'')+' '+h.name+' 对 '+t.cfg.name+' 造成 '+d+' 伤害');
    emit('heroatk', {unit:u, target:t, dmg:d, crit:crit, skill:used});
    if(t.hp<=0 && !t.dead) killMonster(b, t);
  }

  // ---------- 钩子 ----------
  // tick 前: 把英雄移出 _pets, 让 buff.js 的召唤术 / 宝宝逻辑看不到英雄
  function pre(dt, b){ if(hero() && b._heroUnit){ var u=b._heroUnit; if(u.hp<(u._lastHp||u.hp)) addRage(2); detach(b); } }
  function post(dt, b, a){
    var h=hero(); if(!h || G.battle!==b) return;
    var now=Date.now();
    if(h.hejiCd>0) h.hejiCd=Math.max(0, h.hejiCd-dt);
    if(h.cds) for(var k in h.cds) h.cds[k]-=dt;
    if(b._heroUnit && b._heroUnit.hp<=0 && !h.deadUntil){ h.deadUntil=now+REVIVE_SEC*1000; h.hp=0; log('<span style="color:#f77">英雄 '+h.name+' 阵亡, '+REVIVE_SEC+' 秒后复活</span>'); emit('herodie',{}); }
    if(h.deadUntil && now>=h.deadUntil){ h.deadUntil=0; h.hp=heroAttr(h).maxhp; b._heroUnit=null; }
    if(h.mode=='rest' || h.deadUntil) return;
    if(!b._heroUnit) makeUnit(b);
    attach(b); heroAct(b, dt);
    if(b._heroUnit) b._heroUnit._lastHp=b._heroUnit.hp;
    if(h.autoHeji && h.rage>=RAGE_MAX && !(h.hejiCd>0)) doHeji(b, false);
  }
  S.hooks.tick = S.hooks.tick || []; S.hooks.tick.unshift(function(dt, b){ pre(dt, b); });   // 必须在 buff.js 之前
  S.on('tick', post);
  S.on('roleDamage', function(d){ if(hero()) addRage(2); });
  S.on('roleHurt', function(d){ if(hero()) addRage(1); });
  S.on('kill', function(m){ var h=hero(); if(h && h.mode!='rest' && !h.deadUntil) heroAddExp(m.exp); });

  // ---------- API ----------
  S.hero = {
    UNLOCK_LEVEL:UNLOCK_LEVEL, RAGE_MAX:RAGE_MAX, COMBO:COMBO,
    has: function(){ return !!hero(); },
    canUnlock: function(){ return !hero() && G.role && G.role.level>=UNLOCK_LEVEL; },
    unlock: function(prof, name){
      var r=G.role; if(hero()) return '已经拥有英雄'; if(r.level<UNLOCK_LEVEL) return '需要等级 '+UNLOCK_LEVEL;
      prof=+prof; if(!PNAME[prof]) return '请选择职业 (1战士 2法师 3道士)';
      r.hero={name:(name||'').trim()||('英雄·'+PNAME[prof]), prof:prof, level:1, exp:0, equip:{}, hp:null, mode:'attack', rage:0, hejiCd:0, loyalty:100, autoHeji:false, created:Date.now()};
      // 英雄起始等级 = 主角等级 - 10 (至少 1)
      r.hero.level=Math.max(1, r.level-10); r.hero.hp=heroAttr(r.hero).maxhp;
      if(G.battle) G.battle._heroUnit=null; save();
      return S.ok('召唤英雄 '+r.hero.name+' ('+PNAME[prof]+'), 合击: '+COMBO[comboKey(r.prof,prof)].name);
    },
    info: function(){ var h=hero(); if(!h) return null; var a=heroAttr(h), cb=COMBO[comboKey(G.role.prof,h.prof)];
      return {name:h.name, prof:h.prof, profName:PNAME[h.prof], level:h.level, exp:h.exp, expNeed:expNeed(h.level), hp:Math.ceil(h.hp==null?a.maxhp:h.hp), attr:a,
        power:combatPower(a), mode:h.mode, rage:Math.floor(h.rage||0), rageMax:RAGE_MAX, hejiCd:Math.ceil(h.hejiCd||0), autoHeji:!!h.autoHeji, loyalty:h.loyalty,
        dead:!!h.deadUntil, reviveIn:h.deadUntil?Math.max(0,Math.ceil((h.deadUntil-Date.now())/1000)):0, equip:h.equip,
        skills:heroSkills(h).map(function(x){ return x.name; }), combo:{name:cb.name, desc:cb.desc, fx:cb.fx}}; },
    attr: function(){ return hero() ? heroAttr() : null; },
    // 从主角背包给英雄穿装备 (复用装备/词缀数据, 10 个部位)
    equip: function(uid){
      var h=hero(), r=G.role; if(!h) return '尚未拥有英雄';
      var s=r.bag.filter(function(x){ return x.uid==uid; })[0]; if(!s) return '物品不存在'; var c=stuffCfg(s);
      if(c.type!=2) return '不可装备'; if(c.needlevel>h.level) return '英雄需要等级 '+c.needlevel;
      if(c.profession && c.profession!=h.prof) return '英雄职业不符';
      var sl=c.stdmode; if(sl==22||sl==23) sl=!h.equip[22]?22:(!h.equip[23]?23:22); if(sl==24||sl==25) sl=!h.equip[24]?24:(!h.equip[25]?25:24);
      removeItem(uid); if(h.equip[sl]) r.bag.push(h.equip[sl]); h.equip[sl]=s; save(); return S.ok('英雄装备 '+c.name); },
    unequip: function(slot){ var h=hero(); if(!h||!h.equip[slot]) return '该部位没有装备'; if(S.bag.free()<1) return '背包已满';
      G.role.bag.push(h.equip[slot]); delete h.equip[slot]; save(); return S.ok('已卸下'); },
    setMode: function(mode){ var h=hero(); if(!h) return '尚未拥有英雄'; if(['attack','follow','rest'].indexOf(mode)==-1) return '模式: attack/follow/rest';
      h.mode=mode; if(mode=='rest' && G.battle){ detach(G.battle); } save(); return S.ok({attack:'攻击',follow:'跟随',rest:'休息'}[mode]+'模式'); },
    setAuto: function(on){ var h=hero(); if(!h) return '尚未拥有英雄'; h.autoHeji=!!on; save(); return S.ok('自动合击 '+(on?'开启':'关闭')); },
    heji: function(){ var r=doHeji(G.battle, true); return r; },
    rage: function(){ var h=hero(); return h ? {rage:Math.floor(h.rage||0), max:RAGE_MAX, ready:(h.rage||0)>=RAGE_MAX && !(h.hejiCd>0), cd:Math.ceil(h.hejiCd||0)} : null; },
    unit: function(){ return G.battle ? unitOf(G.battle) : null; },
    comboFor: function(p1, p2){ return COMBO[comboKey(p1, p2)]; },
    _addRage: addRage
  };
})(Systems);
