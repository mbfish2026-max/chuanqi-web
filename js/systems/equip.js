// [systems] 装备词缀 (Stuff.setAffixCnt / setAffixData / getAffixPool, equip_cizhui + cizhui) 与 洗练 (TipRemake)
(function(S){
  var AFFIX_CNT = {1:0, 2:1, 3:2, 4:3, 5:4};               // Stuff.setAffixCnt
  var ATKCODE = {3:'zs', 4:'fs', 5:'ds', 6:'ac'};
  var FLAT = {7:'atkspeedAdd', 8:'lucky', 9:'fixeddamage', 10:'fixedac', 11:'hit', 12:'evade', 13:'critical', 14:'tenacity', 15:'absorbhp', 16:'absorbmp',
              17:'maxhprate', 18:'maxmprate', 19:'addlevel', 20:'addexp', 21:'addgold', 22:'dropbest', 23:'adddrop', 24:'adddamage', 25:'addac', 26:'crtdamage', 27:'skillall'};
  // TipRemake.costCfg (按 needlevel/10 分档; quality = [绿,蓝,紫,橙] 洗练石数量)
  var REMAKE_COST = [{lv:1,quality:[1,1,4,4],cost:200},{lv:2,quality:[1,1,4,4],cost:200},{lv:3,quality:[2,2,8,8],cost:500},{lv:4,quality:[2,2,8,8],cost:500},
    {lv:5,quality:[4,4,16,16],cost:1500},{lv:6,quality:[4,4,16,16],cost:1500},{lv:7,quality:[8,8,20,20],cost:3000},{lv:8,quality:[8,8,20,20],cost:3000},{lv:9,quality:[16,16,40,40],cost:5000}];
  var MAX_LOCK = 2;   // TipRemake.affixAttr: 已锁 2 条时其余不可再锁

  function affixPool(c){
    var lvl = 10*Math.floor(c.needlevel/10)+10; if(c.needlevel%10==0) lvl -= 10;   // Stuff.setAffixData
    return (CFG.equip_cizhui||{list:[]}).list.filter(function(x){ return x.lvl==lvl && (!x.position || !x.position.length || x.position.indexOf(c.stdmode)!=-1); });
  }
  function rollAffix(pool){
    var e = pool[randomIndex(pool.map(function(x){return x.gailv;}))], z = cfg('cizhui', e.code) || {vtype:e.vtype||1}, lo, hi;
    if(z.vtype==1){
      if(ATKCODE[e.code]){ hi=Math.ceil(Math.random()*e.maxvalue); lo=Math.floor(Math.random()*hi); }
      else { lo=hi=Math.ceil(Math.random()*e.maxvalue); if(lo==0) lo=hi=1; }
    } else lo=hi=Math.ceil(Math.random()*e.maxvalue*100)/100;
    return {id:e.id, code:e.code, minValue:lo, maxValue:hi, isPer:z.vtype};
  }
  function genAffix(s, c){ var pool=affixPool(c), out=[]; if(!pool.length) return out; for(var i=0;i<(AFFIX_CNT[s.q]||0);i++) out.push(rollAffix(pool)); return out; }

  S.on('createStuff', function(s, c){ if(c.type==2 && !s.affix) s.affix = genAffix(s, c); });

  // 把穿戴装备的词缀加到属性 (Role.equipAddition / additionBaseAttr)
  S.on('attr', function(a, r){
    var sum = {};
    for(var sl in r.equip){ var s=r.equip[sl]; if(!s || !s.affix) continue;
      s.affix.forEach(function(x){
        if(x.code==1) a.maxhp += x.minValue; else if(x.code==2) a.maxmp += x.minValue;
        else if(ATKCODE[x.code]){ a['min'+ATKCODE[x.code]] += x.minValue; a['max'+ATKCODE[x.code]] += x.maxValue; }
        else if(FLAT[x.code]) sum[FLAT[x.code]] = (sum[FLAT[x.code]]||0) + x.minValue;
      }); }
    for(var k in sum) a[k] = (a[k]||0) + sum[k];
    if(a.maxhprate) a.maxhp = Math.ceil(a.maxhp*(1+a.maxhprate/100));
    if(a.maxmprate) a.maxmp = Math.ceil(a.maxmp*(1+a.maxmprate/100));
  });
  // 伤害增幅 / 暴击伤害 / 吸血
  S.on('roleDamage', function(d, t, a, used, crit){
    if(a.adddamage) d *= 1 + a.adddamage/100;
    if(crit && a.crtdamage) d *= 1 + a.crtdamage/100;
    d = Math.ceil(d);
    if(a.absorbhp) G.role.hp = Math.min(a.maxhp, G.role.hp + Math.ceil(a.absorbhp));
    if(a.absorbmp) G.role.mp = Math.min(a.maxmp, G.role.mp + Math.ceil(a.absorbmp));
    return d;
  });
  S.on('roleHurt', function(d, m, a){ if(a.addac) d = Math.max(1, Math.ceil(d*(1-a.addac/100))); return d; });
  // 经验/金币加成
  S.on('kill', function(m){ var a=calcAttr(), r=G.role;
    if(a.addexp){ var e=Math.floor(m.exp*a.addexp/100); if(e>0){ addExp(e); log('词缀经验加成 +'+e); } }
    if(a.addgold){ var g=Math.floor(((m.cfg.gold)||0)*a.addgold/100); if(g>0) r.gold+=g; }
  });

  function affixText(x){ var z=cfg('cizhui',x.code)||{name:x.code}, v;
    if(ATKCODE[x.code]) v=Math.ceil(x.minValue)+'-'+Math.ceil(x.maxValue); else if(x.isPer==2) v=(x.minValue||0.01).toFixed(2)+'%'; else v=Math.ceil(x.minValue);
    return z.name+' +'+v; }
  // TipRemake.getAffixColor -> 品质 1~5
  function affixQuality(x){ var e=cfg('equip_cizhui',x.id); if(!e) return 1; var v=x.minValue, n=e.maxvalue;
    if(ATKCODE[x.code]){ v=Math.ceil(x.minValue)+Math.ceil(x.maxValue); n*=2; } else v=Math.ceil(v);
    var p=v/n; return p>=1?5:p>=.8?4:p>.5?3:p>.3?2:1; }

  var pending = {};   // uid -> {affix, locks}
  S.equip = {
    affixes: function(uid){ var f=S.findStuff(uid); if(!f||!f.s.affix) return []; return f.s.affix.map(function(x){ return {text:affixText(x), quality:affixQuality(x), raw:x}; }); },
    affixText: affixText,
    remakeCost: function(uid, locks){ var f=S.findStuff(uid); if(!f) return null; var s=f.s, c=stuffCfg(s); if(c.type!=2 || s.q<2) return null;
      var lv=Math.max(1, Math.floor(c.needlevel/10)), row=REMAKE_COST.filter(function(x){return x.lv==lv;})[0] || REMAKE_COST[REMAKE_COST.length-1];
      var n=(locks||[]).length; n = n==0 ? 1 : n*2;
      return {gold:row.cost, stone:row.quality[s.q-2]*n}; },
    // 洗练: 扣费 -> 生成新词缀 (锁定的保持不变) -> 需调用 saveRemake 才生效
    remake: function(uid, locks){
      locks = (locks||[]).map(Number).filter(function(i,k,arr){ return arr.indexOf(i)==k; });
      var f=S.findStuff(uid); if(!f) return '装备不存在'; var s=f.s, c=stuffCfg(s);
      if(c.type!=2) return '只能洗练装备'; if(s.q<2 || !s.affix || !s.affix.length) return '绿色以上品质的装备才能洗练';
      if(locks.length > MAX_LOCK) return '最多锁定 '+MAX_LOCK+' 条属性';
      if(locks.length >= s.affix.length) return '不能锁定全部属性';
      var cost=S.equip.remakeCost(uid, locks), r=S.ensure();
      if(r.gold < cost.gold) return '金币不足';
      if(countItem(S.ITEM_STONE) < cost.stone) return '洗练石不足 (需要 '+cost.stone+')';
      r.gold -= cost.gold; consumeItem(S.ITEM_STONE, cost.stone); r.stat.remake++;
      var na = genAffix(s, c); locks.forEach(function(i){ if(s.affix[i]) na[i]=s.affix[i]; });
      pending[uid] = na; save();
      return S.ok('洗练完成, 新属性: '+na.map(affixText).join(' / '));
    },
    pendingRemake: function(uid){ return (pending[uid]||[]).map(function(x){ return {text:affixText(x), quality:affixQuality(x), raw:x}; }); },
    saveRemake: function(uid){ var f=S.findStuff(uid); if(!f || !pending[uid]) return '没有可保存的洗练结果'; f.s.affix=pending[uid]; delete pending[uid]; save(); return S.ok('已替换为新属性'); },
    cancelRemake: function(uid){ delete pending[uid]; return S.ok('已保留原属性'); },
    // 装备战力 (CombatTool: 基础 + 词缀 vcombat)
    combat: function(uid){ var f=S.findStuff(uid); if(!f) return 0; var s=f.s, e=s.attr||{}, v=0;
      v += (e.hp||0)*0.1 + (e.mp||0)*0.1 + ((e.minzs||0)+(e.maxzs||0)+(e.minfs||0)+(e.maxfs||0)+(e.minds||0)+(e.maxds||0)+(e.minac||0)+(e.maxac||0))/2*12;
      (s.affix||[]).forEach(function(x){ var z=cfg('cizhui',x.code)||{}; v += (ATKCODE[x.code]?(x.minValue+x.maxValue)/2:x.minValue)*(z.vcombat||0); });
      return Math.ceil(v); }
  };
})(Systems);
