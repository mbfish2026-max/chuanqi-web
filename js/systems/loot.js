// [loot] 装备系统改造 (EQUIP_SYSTEM_from_idle_arpg.md): 品质判定公式 / 每怪掉落 TC / 暗金(橙)唯一 / 套装 2-3-5 件 /
// 手动分解→精华；自动回收→金币(50%/特权满额) / 锁定 / 自动整理 / 对比 / 掉落光柱 / 存档迁移 role.ver
//
// 部位校验 (stdmode -> 部位), 已对照原版 GameKeys.eWeaponPart 与 item.txt 全表确认:
//   5 武器 | 10 衣服 | 15 头盔 | 20 项链 | 22/23 戒指(左/右) | 24/25 手镯(左/右) | 62 鞋子 | 64 腰带
//   文档猜测 "22/23 手镯, 24/25 戒指" 是反的; item.txt 中 stdmode 23/25 不出现(只用作第二个槽位);
//   数据怪癖: 124029 神秘腰带 stdmode=24 (按手镯穿); stdmode 30(勋章)/53(宝石)/58(幸运之锤) 是 type 2 但不可穿, 不进 TC.
(function(S){
  var VER = 2;                                        // role.ver: 1(隐式, 无字段) -> 2 本次
  var WEAR = [5,10,15,20,22,24,62,64];
  // 数据表在 js/systems/lootdata/{tc,uniques,sets}.js (须先于本文件加载)
  var D = S.lootData || {}; if (!D.TC || !D.UNIQUES || !D.SETS) throw new Error('[loot] 缺少 js/systems/lootdata/*.js');
  var RATIO = D.RATIO, MFACT = D.MFACT, TC = D.TC, ESS = D.ESS, ESS_SET = D.ESS_SET, ESS_UQ = D.ESS_UQ, LVL_WIN = D.LVL_WIN, UNIQUES = D.UNIQUES, SETS = D.SETS, ANAME = D.ANAME;

  // 倚天剑 105036 在 item.txt 是 GM 测试行 (needlevel 1, 攻防 32000); 运行时修正为 50 级正常底子 (同 2001 新手礼包修正)
  S.on('configsLoaded', function(){ var c=cfg('item',105036); if(c && c.maxzs>=32000){ c.needlevel=50; c.minac=c.maxac=0; c.minzs=28; c.maxzs=70; c.minfs=c.maxfs=c.minds=c.maxds=0; c.price=80000; c.sellprice=80; } });

  var SET_OF = {}; for(var k in SETS) SETS[k].ids.forEach(function(id){ SET_OF[id]=k; });

  function mkFixed(fx){ return fx.map(function(f){ var z=cfg('cizhui',f[0])||{vtype:1}; return {id:0, code:f[0], minValue:f.length>2?f[1]:f[1], maxValue:f.length>2?f[2]:f[1], isPer:z.vtype, fixed:1}; }); }
  function makeUnique(s){ var u=UNIQUES[s.id]; if(!u) return false; s.q=5; s.uq=s.id; s.affix=mkFixed(u.fx); return true; }

  // ---------- 品质判定 (文档 §1) ----------
  function mfEff(mf, F){ return F ? Math.floor(mf*F/(mf+F)) : mf; }
  function chance(q, ilvl, qlvl, mf, mq){ var R=RATIO[q];
    var c = Math.floor((R.base - Math.floor((ilvl-qlvl)/R.div)) * 128);
    c = Math.floor(c*100/(100+mfEff(mf, R.F)));        // MF 递减: MF*F/(MF+F)
    c = Math.max(c, R.min);                              // 下限 (最佳概率 128/min)
    c = c - Math.floor(c*(MFACT[mq]||0)/1024);           // 怪物品质系数
    return Math.max(c, 128); }
  // 依次判定 橙→紫→蓝→绿, 成功条件 floor(rnd*c) < 128; rnd 可注入 (测试)
  function rollQuality(ilvl, qlvl, mf, mq, rnd){ rnd=rnd||Math.random;
    for(var q=5;q>=2;q--){ var c=chance(q, ilvl, qlvl, mf, mq); if(Math.floor(rnd()*c) < 128) return q; }
    return 1; }

  S.on('dropQuality', function(q, ic, m){ if(!ic || ic.type!=2) return q;
    S.loot._ilvl = (m && m.cfg && m.cfg.lvl) || 1;
    if(m && m.q==5 && q==5) return 5;                  // 保留原版 BOSS 前两档必橙
    return rollQuality(S.loot._ilvl, ic.needlevel||1, curMF(), (m&&m.q)||1); });
  S.on('dropItem', function(s, ic){ if(ic.type==2) finalize(s); S.loot._ilvl=0; });
  // createStuff 先于 equip.js 词缀生成: 写入 ilvl 供 alvl 门槛
  (S.hooks.createStuff = S.hooks.createStuff || []).unshift(function(s, c){ if(c.type==2 && S.loot._ilvl) s.il = S.loot._ilvl; });
  function finalize(s){ if(s.q==5) makeUnique(s); else if(s.q==4 && SET_OF[s.id]) s.set = SET_OF[s.id]; return s; }
  function curMF(){ try { return (calcAttr().dropbest||0); } catch(e){ return 0; } }

  // ---------- 每怪掉落 TC ----------
  var basesCache = null;
  // 基底池 = 原版 drop.txt 出现过的装备 ∪ 暗金 ∪ 套装件 (item.txt 里还有 55 件原版不掉落、也没有图标的底子, 如 凌风/破魂/祈福项链, 不进 TC)
  function origPool(){ var ids={}; ((CFG.drop&&CFG.drop.list)||[]).forEach(function(t){ for(var k in t) if(/^item\d+$/.test(k) && Array.isArray(t[k])) t[k].forEach(function(id){ ids[id]=1; }); });
    for(var u in UNIQUES) ids[u]=1; for(var z in SET_OF) ids[z]=1; return ids; }
  function bases(){ if(basesCache) return basesCache; var pool=origPool(); basesCache = CFG.item.list.filter(function(c){ return c.type==2 && WEAR.indexOf(c.stdmode)!=-1 && c.needlevel>0 && c.price>0 && c.id<200000 && pool[c.id]; }); return basesCache; }
  function tcPick(m, rnd){ rnd=rnd||Math.random; var t=TC[m.q]||TC[1], L=(m.cfg&&m.cfg.lvl)||1, out=[];
    for(var p=0;p<t.picks;p++){ if(Math.floor(rnd()*(t.nd+t.eq)) < t.nd) continue;
      var list=bases().filter(function(c){ return c.needlevel<=L+LVL_WIN[1] && c.needlevel>=L+LVL_WIN[0]; }); if(!list.length) continue;
      var ic=list[Math.floor(rnd()*list.length)]; S.loot._ilvl=L;
      var q=rollQuality(L, ic.needlevel, curMF(), m.q||1, rnd), s=createStuff(ic.id,1,q); S.loot._ilvl=0; if(s) out.push(finalize(s)); }
    return out; }
  S.on('kill', function(m){ if(!G.role || S.loot.tcOff) return; tcPick(m).forEach(function(s){ var c=stuffCfg(s);
    if(addItem(s)!==false){
      if(S.loot._batch) S.loot._batch.kept.push({name:c.name, q:s.q, count:s.count||1, label:label(s)});
      else log('获得 <span class="q'+s.q+'">['+label(s)+']'+c.name+'</span>');
    } }); });

  // ---------- 掉落光柱 + 自动回收→金币 (原版 calculateAutoPickup；手动分解仍→精华) ----------
  function escLite(s){ return String(s==null?'':s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
  function equipGold(s, c){ return (c.sellprice||0) * (s.q||1); }
  function recycleRate(){ return (S.prerogative && S.prerogative.recycleRate) ? S.prerogative.recycleRate() : 0.5; }
  function beginKill(m){
    S.loot._killing = m;
    S.loot._batch = {reclaim:[], fullGold:0, kept:[], dropGold:0, addExpBonus:0};
    return S.loot._batch;
  }
  function endKill(m, batch){
    batch = batch || S.loot._batch;
    try {
      if(!batch || !m || !G.role) return;
      var rate = recycleRate();
      var rg = Math.ceil(batch.fullGold * rate);
      if(rg > 0) G.role.gold += rg;
      var parts = [];
      parts.push('<span style="color:#00fff0">'+escLite(G.role.name)+'</span> 击杀了 <span class="q'+m.q+'">【'+escLite(m.cfg.name)+'】</span>');
      var totExp = (m.exp||0) + (batch.addExpBonus||0);
      parts.push('经验 +'+totExp+(batch.addExpBonus ? '(+'+batch.addExpBonus+')' : ''));
      if(batch.dropGold) parts.push('金币 +'+batch.dropGold);
      if(batch.kept.length){
        parts.push('掉落了'+batch.kept.map(function(it){
          return '<span class="q'+it.q+'">【'+escLite(it.label||it.name)+'】</span>x'+(it.count||1);
        }).join('<span style="color:#fff">,</span>'));
      }
      if(batch.reclaim.length){
        parts.push('自动回收了：'+batch.reclaim.map(function(it){
          return '<span class="q'+it.q+'">【'+escLite(it.name)+'】</span>x'+(it.count||1);
        }).join('<span style="color:#fff">,</span>')+' 获得了金币：'+rg);
      }
      log(parts[0]+' ,  '+parts.slice(1).join(' ,  '));
    } finally {
      S.loot._batch = null; S.loot._killing = null;
    }
  }
  var _kill = killMonster; killMonster = function(b, m){
    var batch = beginKill(m);
    try { return _kill.apply(this, arguments); }
    finally { if(S.loot._batch) endKill(m, batch); }
  };
  (S.hooks.addItem = S.hooks.addItem || []).unshift(function(v, s, c){ if(v || !c || c.type!=2 || !G.role) return;
    var m = S.loot._killing; if(m && (s.q>=3 || s.uq || s.set)) FXE('drop', {m:m, q:s.q, name:c.name, uq:!!s.uq, set:!!s.set});
    if(m && shouldAuto(s)){
      var full = equipGold(s, c);
      var batch = S.loot._batch;
      if(batch){ batch.reclaim.push({name:c.name, q:s.q, count:s.count||1}); batch.fullGold += full; }
      else {
        var g = Math.ceil(full * recycleRate());
        G.role.gold += g;
        log('自动回收了：<span class="q'+s.q+'">【'+escLite(c.name)+'】</span>x'+(s.count||1)+' 获得了金币：'+g);
      }
      return true;
    } });
  function cfgL(){ var r=G.role; r.lootCfg = r.lootCfg || {auto:{1:false,2:false,3:false,4:false,5:false}, keepNonsuch:true, keepSet:true, keepUnique:true, autoSort:false}; return r.lootCfg; }
  function shouldAuto(s){ var L=cfgL(); if(s.lock || (L.keepSet && s.set) || (L.keepUnique && s.uq)) return false; if(L.offProf){ var oc=stuffCfg(s); if(oc.profession && oc.profession!=G.role.prof && !(L.keepNonsuch && s.nonsuch)) return true; } if(!L.auto[s.q]) return false;
    if(L.keepNonsuch && s.nonsuch) return false; if(L.keepSet && s.set) return false; if(L.keepUnique && s.uq) return false; return true; }
  function essOf(s){ return s.uq ? ESS_UQ : s.set ? ESS_SET : (ESS[s.q]||1); }
  function label(s){ return s.uq ? '暗金' : s.set ? SETS[s.set].name+'套装' : QNAME[s.q]; }

  // ---------- 套装加成 ----------
  function setCounts(equip){ var n={}; for(var sl in equip){ var s=equip[sl]; if(!s) continue; var k=SET_OF[s.id]; if(k) n[k]=(n[k]||0)+1; } return n; }
  function setBonus(equip){ var n=setCounts(equip), tot={}, act=[];
    for(var k in n){ var b=SETS[k].bonus; [2,3,5].forEach(function(p){ if(n[k]>=p && b[p]){ act.push(k+':'+p); for(var a in b[p]) tot[a]=(tot[a]||0)+b[p][a]; } }); }
    return {count:n, total:tot, active:act}; }
  S.on('attr', function(a, r){ var t=setBonus(r.equip||{}).total; for(var k in t){ a[k]=(a[k]||0)+t[k]; if(k=='maxzs'||k=='maxfs'||k=='maxds') a['min'+k.slice(3)]=(a['min'+k.slice(3)]||0)+Math.floor(t[k]/2); } });

  // ---------- 卖出/回收尊重锁定 ----------
  var _sell = sellItem; sellItem = function(uid){ var f=S.findStuff(uid); if(f && f.s.lock) return '物品已锁定'; return _sell.apply(this, arguments); };

  // ---------- 自动整理: 道具在前; 装备按 品质→类型(部位)→等级→名称; 锁定状态保留 ----------
  var SORDER = {}; [5,15,10,20,24,25,22,23,64,62].forEach(function(sm,i){ SORDER[sm]=i; });
  S.bag.sort = function(){ var r=G.role, p=[], e=[]; r.bag.forEach(function(s){ (stuffCfg(s).type==2?e:p).push(s); });
    p.sort(function(a,b){ return (b.q-a.q) || (a.id-b.id); });
    e.sort(function(a,b){ var ca=stuffCfg(a), cb=stuffCfg(b);
      return (b.q-a.q) || ((b.uq?1:0)-(a.uq?1:0)) || ((b.set?1:0)-(a.set?1:0)) || ((SORDER[ca.stdmode]||0)-(SORDER[cb.stdmode]||0)) || (cb.needlevel-ca.needlevel) || (ca.name<cb.name?-1:ca.name>cb.name?1:0); });
    r.bag = p.concat(e); return S.ok('整理完成'); };

  // ---------- 对比: 穿上 bag 中 uid 后属性变化 ----------
  var CMP = [['maxhp','生命'],['maxmp','魔法'],['atkmin','攻击下限'],['atkmax','攻击上限'],['minac','防御下限'],['maxac','防御上限'],['lucky','幸运'],['critical','暴击'],['hit','命中'],['adddamage','伤害增幅'],['crtdamage','暴伤']];
  function slotFor(c){ var sl=c.stdmode, eq=G.role.equip; if(sl==22||sl==24){ if(eq[sl] && !eq[sl+1]) sl=sl+1; } return sl; }
  function compare(uid){ var r=G.role, s=r.bag.filter(function(x){return x.uid==uid;})[0]; if(!s) return null; var c=stuffCfg(s); if(c.type!=2) return null;
    var sl=slotFor(c), old=r.equip[sl], before=calcAttr(), p0=combatPower(before);
    r.equip[sl]=s; var after=calcAttr(), p1=combatPower(after); if(old) r.equip[sl]=old; else delete r.equip[sl];
    var rows=CMP.map(function(x){ var o=before[x[0]]||0, n=after[x[0]]||0; return {key:x[0], label:x[1], old:o, new:n, delta:n-o}; }).filter(function(x){ return x.old||x.new; });
    return {slot:sl, equipped:old||null, item:s, rows:rows, power:{old:p0,new:p1,delta:p1-p0}}; }

  // ---------- 分解成精华 ----------
  function salvage(uid){ var f=S.findStuff(uid); if(!f || f.where!='bag') return '物品不存在'; var s=f.s, c=stuffCfg(s);
    if(c.type!=2) return '不是装备'; if(s.lock) return '装备已锁定'; var e=essOf(s); removeItem(uid); G.role.essence=(G.role.essence||0)+e; save(); return S.ok('分解获得精华 '+e); }
  function salvageAll(){ var r=G.role, n=0, e=0; r.bag.filter(function(s){ return stuffCfg(s).type==2 && shouldAuto(s); }).forEach(function(s){ e+=essOf(s); n++; removeItem(s.uid); });
    r.essence=(r.essence||0)+e; save(); return S.ok('分解 '+n+' 件, 获得精华 '+e); }
  function exchangeStone(n){ n=Math.max(1,Math.floor(n||1)); var r=G.role, cost=5*n; if((r.essence||0)<cost) return '精华不足 (需要 '+cost+')';
    r.essence-=cost; addItem(createStuff(S.ITEM_STONE, n)); save(); return S.ok('兑换洗练石 x'+n); }

  // ---------- 存档迁移 (step-wise, role.ver) ----------
  var MIG = {
    1: function(r){ // v1 -> v2: 装备补 affix/il/lock 字段, 旧橙色唯一底子转暗金, 旧紫色套装件打标, 新增 essence/lootCfg
      eachEquip(r, function(s){ var c=cfg('item',s.id); if(!c||c.type!=2) return; if(!s.affix) s.affix=[]; if(s.il==null) s.il=c.needlevel||1; s.lock=!!s.lock;
        if(s.q==5 && UNIQUES[s.id] && !s.uq) makeUnique(s); if(s.q==4 && SET_OF[s.id]) s.set=SET_OF[s.id]; });
      r.essence = r.essence||0; cfgLFor(r); }
  };
  function cfgLFor(r){ var g=G.role; G.role=r; cfgL(); G.role=g; }
  function eachEquip(r, fn){ (r.bag||[]).forEach(fn); for(var k in (r.equip||{})) if(r.equip[k]) fn(r.equip[k]); if(r.hero && r.hero.equip) for(var h in r.hero.equip) if(r.hero.equip[h]) fn(r.hero.equip[h]); }
  function migrate(r){ if(!r) return r; var v=r.ver||1; while(v<VER){ if(MIG[v]) MIG[v](r); v++; } r.ver=VER; return r; }
  S.on('loaded', function(r){ migrate(r); });
  var _newRole = newRole; newRole = function(){ var r=_newRole.apply(this, arguments); r.ver=VER; r.essence=0; return r; };

  S.loot = {
    VER:VER, DATA_FILE:'js/systems/lootdata/{tc,uniques,sets}.js', UNIQUES:UNIQUES, SETS:SETS, SET_OF:SET_OF, TC:TC, RATIO:RATIO, ANAME:ANAME, _ilvl:0, _killing:null, tcOff:false,
    chance:chance, rollQuality:rollQuality, bases:bases, mfEff:mfEff, tcPick:tcPick, finalize:finalize, makeUnique:makeUnique, label:label,
    setCounts:setCounts, setBonus:setBonus, compare:compare, salvage:salvage, salvageAll:salvageAll, essOf:essOf, exchangeStone:exchangeStone,
    beginKill:beginKill, endKill:endKill, equipGold:equipGold,
    cfg:cfgL, shouldAuto:shouldAuto, migrate:migrate,
    setAuto:function(q, on){ cfgL().auto[q]=!!on; save(); return S.ok(); },
    setFlag:function(k, on){ cfgL()[k]=!!on; save(); return S.ok(); }
  };
})(Systems);
