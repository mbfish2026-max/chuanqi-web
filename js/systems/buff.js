// [systems] Buff 系统 (BuffTool.calculateRole / calculateMonster, buff.txt) + 召唤兽 (Partner.js, BattleTool.spawnPartner)
// 运行时状态不进存档 (原版 Buff 也不离线保存: offline=false)
(function(S){
  var ATK = {1:'zs', 2:'fs', 3:'ds'};
  function roleAtk(a, type, mode){ var k=ATK[type]||ATK[G.role.prof]; var lo=a['min'+k]||0, hi=Math.max(lo, a['max'+k]||0);
    return mode==4 ? (hi-lo)/2+lo : Math.floor(Math.random()*(hi-lo)+lo); }          // Role.getAttack(3|4)
  var B = S.buff = { role:[], list:function(){ return B.role.map(function(x){ return {id:x.cfg.id, name:x.cfg.name, icon:x.cfg.icon, left:Math.max(0,Math.ceil(x.left)), shield:x.shield||0}; }); } };
  function bcfg(id){ return cfg('buff', id); }
  function addRoleBuff(c, a){
    for(var i=B.role.length-1;i>=0;i--) if(B.role[i].cfg.name==c.name || Math.floor(B.role[i].cfg.id/100)==Math.floor(c.id/100)) B.role.splice(i,1);   // 不叠加
    var x={cfg:c, left:c.duration||9999, tick:c.interval||1};
    if(c.shiled>0){ var sp=c.special&&c.special[0]==2?c.special[1]:0; x.shield=c.shiled+Math.ceil(roleAtk(a,2,3)*sp/100); }   // 魔法盾
    B.role.push(x);
  }
  function addMonBuff(m, c, a){
    m._buffs = m._buffs || [];
    for(var i=m._buffs.length-1;i>=0;i--) if(m._buffs[i].cfg.name==c.name) m._buffs.splice(i,1);
    var x={cfg:c, left:c.duration||0, tick:c.interval||1};
    if(c.probability){ if(Math.random()*100 <= c.probability) x.vertigo=true; else return; }        // 眩晕几率
    if(c.state==1) x.frozen=true;                                                                   // 冰冻
    if(c.special) x.dot = Math.ceil(roleAtk(a, c.special[0], 3)*c.special[1]/100);                  // 每跳 攻击% 伤害
    if(x.left>0 || c.ac2) m._buffs.push(x);
  }
  function apply(sc, a, target){
    (sc.abilityIds||[]).forEach(function(id){ var c=bcfg(id); if(!c) return;
      if(c.bufftype==2){ if(target) addMonBuff(target, c, a); }
      else if(c.duration || c.shiled || c.hp || c.hppercent) addRoleBuff(c, a);    // 无持续时间的被动加成由 game.js 处理
    });
  }
  B.apply = apply;
  // 角色属性: 防御/生命上限/伤害提升
  S.on('attr', function(a){
    B.role.forEach(function(x){ var c=x.cfg;
      if(c.ac>0){ a.minac+=c.ac; a.maxac+=c.ac; }
      if(c.special && c.special[0]==4){ a.minac=Math.ceil(a.minac*(1+c.special[1]/100)); a.maxac=Math.ceil(a.maxac*(1+c.special[1]/100)); }   // 真气护体 5%
      if(c.special && c.special[0]==3 && c.ac>0){ var v=Math.ceil(((a.minds||0)+(a.maxds||0))/2*c.special[1]/100); a.minac+=v; a.maxac+=v; }  // 神圣战甲术 道术%
      if(c.maxhp2) a.maxhp=Math.ceil(a.maxhp*(1+c.maxhp2/100));
      if(c.zs2) a.buffDamageUp=(a.buffDamageUp||0)+c.zs2;      // 无极真气: 伤害提高 %
    });
  });
  S.on('roleDamage', function(d, target, a, used){
    var ac2=0; (target._buffs||[]).forEach(function(x){ if(x.cfg.ac2) ac2+=x.cfg.ac2; });
    used.forEach(function(sc){ (sc.abilityIds||[]).forEach(function(id){ var c=bcfg(id); if(c && c.ac2) ac2+=c.ac2; }); });
    if(ac2<0) d += Math.ceil((target.ac||0)*Math.abs(ac2)/100);                 // 雷电术: 无视目标 10% 防御
    if(a.buffDamageUp) d = Math.ceil(d*(1+a.buffDamageUp/100));
    used.forEach(function(sc){ apply(sc, a, target); });
    return d;
  });
  S.on('roleHurt', function(d){
    B.role.forEach(function(x){ var c=x.cfg; var inj=c.Injuryfree||c.injuryfree; if(inj) d=Math.ceil(d*(1-inj/100)); });
    B.role.forEach(function(x){ if(x.shield>0){ var take=Math.min(x.shield, Math.ceil(d*((x.cfg.special&&x.cfg.special[1])||50)/100)); x.shield-=take; d-=take; if(x.shield<=0){ x.left=0; log('魔法盾被打破'); } } });
    return Math.max(1,d);
  });
  // 怪物: 眩晕/冰冻不能攻击; 有召唤兽时一半概率攻击召唤兽
  S.on('monsterAttack', function(v, b, m){
    if((m._buffs||[]).some(function(x){ return (x.vertigo||x.frozen) && x.left>0; })) return true;
    var pets=(b._pets||[]).filter(function(p){return p.hp>0;});
    if(pets.length && Math.random()<0.5){ var p=pets[Math.floor(Math.random()*pets.length)];
      var d=Math.max(1, rnd(Math.floor(m.zs), Math.max(Math.floor(m.zs),Math.floor(m.zsmax)-1)) - p.ac); p.hp-=d;
      if(p.hp<=0) log(p.name+' 被 '+m.cfg.name+' 击杀'); return true; }
  });
  // 技能: 真气护体 / 隐身术 由 Buff 系统接管 (不再走 game.js 的治疗分支)
  S.on('skillHandled', function(v, sc){ if(sc.triggertype==2 && sc.abilityIds && !/治/.test(sc.name)) return true; });

  function selfCast(sc, st, a){ var r=G.role; if((st.cd||0)>0 || r.mp<(sc.spell||0)) return false; r.mp-=sc.spell||0; st.cd=sc.basecd||10; st.exp=(st.exp||0)+1; return true; }
  function spawnPets(sc, a, b){
    var c=cfg('monster', sc.petid); if(!c) return; var base=roleAtk(a, 3, 4), add=sc.petaddition||[];
    b._pets=[]; for(var i=0;i<(sc.petnum||1);i++){
      var p={name:c.name, cfg:c, maxhp:c.hp, hp:c.hp, minzs:c.zs, maxzs:c.zs2, ac:c.ac, fixeddamage:c.fixeddamage||0, hit:c.hit||0, critical:c.critical||0, atkT:c.attack_spd||1.5};
      if(add[0]>0){ p.maxhp+=Math.ceil(base*add[0]/100); p.hp=p.maxhp; } if(add[1]>0) p.ac+=Math.ceil(base*add[1]/100);    // Partner.setAttrByRole
      if(add[2]>0) p.minzs+=Math.ceil(base*add[2]/100); if(add[3]>0) p.maxzs+=Math.ceil(base*add[3]/100);
      if(add[4]>0) p.fixeddamage+=Math.ceil(base*add[4]/100);
      b._pets.push(p); }
    log('['+sc.name+'] 召唤了 '+b._pets.length+' 个 '+c.name);
  }
  S.pets = { list:function(){ var b=G.battle; return ((b&&b._pets)||[]).filter(function(p){return p.hp>0;}).map(function(p){ return {name:p.name, hp:Math.max(0,p.hp), maxhp:p.maxhp, atk:p.minzs+'-'+p.maxzs, ac:p.ac}; }); } };

  S.on('tick', function(dt, b, a, map){
    var r=G.role;
    // 角色 Buff 计时/回血
    for(var i=B.role.length-1;i>=0;i--){ var x=B.role[i]; x.left-=dt;
      if(x.cfg.hppercent || (x.cfg.hp>0)){ x.tick-=dt; if(x.tick<=0){ x.tick+=x.cfg.interval||1;
        var h=x.cfg.hppercent ? Math.ceil(a.maxhp*x.cfg.hppercent/100) : x.cfg.hp + Math.ceil(roleAtk(a,3,3)*((x.cfg.special&&x.cfg.special[1])||0)/100);
        r.hp=Math.min(a.maxhp, r.hp+h); } }
      if(x.left<=0) B.role.splice(i,1); }
    // 怪物 Buff: 持续伤害
    b.mons.forEach(function(m){ if(m.dead || !m._buffs) return;
      for(var j=m._buffs.length-1;j>=0;j--){ var y=m._buffs[j]; y.left-=dt;
        if(y.cfg.hp<0 || y.dot){ y.tick-=dt; if(y.tick<=0 && y.left>-dt){ y.tick+=y.cfg.interval||1; var d=Math.max(1, -(y.cfg.hp||0)+(y.dot||0)); m.hp-=d;
          log('['+y.cfg.name+'] '+m.cfg.name+' 受到 '+d+' 伤害'); if(m.hp<=0 && !m.dead){ m._buffs=[]; killMonster(b,m); return; } } }
        if(y.left<=0 && !y.cfg.ac2) m._buffs.splice(j,1); } });
    if(G.battle!==b) return;
    var alive=b.mons.filter(function(m){return !m.dead;});
    // 主动/触发型技能中 game.js 未处理的部分
    eachSkill(function(sc, st){
      if(sc.triggertype==5){   // 召唤术: 没有召唤兽时召唤 (SkillTool.checkTrigger summontrigger)
        if(!(b._pets||[]).some(function(p){return p.hp>0;}) && alive.length && selfCast(sc, st, a)) spawnPets(sc, a, b);
      } else if(sc.triggertype==2 && sc.abilityIds && !/治/.test(sc.name)){   // 真气护体 / 隐身术: 生命低于 parameter1%
        if(r.hp <= a.maxhp*(sc.parameter1||50)/100 && selfCast(sc, st, a)){ apply(sc, a, null); log('['+sc.name+'] 生效'); }
      } else if(sc.triggertype==4){   // 魔法盾: 护盾不存在时施放
        if(!B.role.some(function(x){return x.cfg.shiled>0;}) && alive.length && selfCast(sc, st, a)){ apply(sc, a, null); log('['+sc.name+'] 护盾 '+B.role[B.role.length-1].shield); }
      } else if(sc.triggertype==1 && !sc.power2 && sc.abilityIds && alive.length){   // 施毒术 / 神圣战甲术 / 无极真气
        var self = sc.targetside==2 || sc.targetside==0;
        if(self && B.role.some(function(x){ return sc.abilityIds.indexOf(x.cfg.id)!=-1; })) return;
        if(selfCast(sc, st, a)){ apply(sc, a, self?null:alive[0]); log('['+sc.name+'] '+(self?'生效':'命中 '+alive[0].cfg.name)); }
      }
    });
    // 召唤兽攻击 (DamageTool.getPartnerDamage)
    (b._pets||[]).forEach(function(p){ if(p.hp<=0) return; p.atkT-=dt; if(p.atkT>0) return; p.atkT=p.cfg.attack_spd||1.5;
      var t=b.mons.filter(function(m){return !m.dead;})[0]; if(!t) return;
      if(Math.random()*100 >= 90+p.hit-(t.cfg.evade||0)) return;
      var d=Math.floor(Math.random()*Math.abs(p.maxzs-p.minzs)+p.minzs); if(Math.random()*100<p.critical) d*=1.5;
      if(a.buffDamageUp) d*=1+a.buffDamageUp/100;
      d=Math.max(1, Math.ceil(d - t.ac + Math.max(0,p.fixeddamage-(t.cfg.fixedac||0)))); t.hp-=d;
      log(p.name+' 对 '+t.cfg.name+' 造成 '+d+' 伤害'); if(t.hp<=0 && !t.dead) killMonster(b,t); });
    if(b._pets) b._pets=b._pets.filter(function(p){return p.hp>0;});
  });
  // 换地图/死亡时清除角色 Buff
  B.clear = function(){ B.role=[]; };
})(Systems);
