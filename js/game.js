// 核心玩法逻辑 —— 依据原版 Role.js / Monster.js / DamageTool.js / DropTool.js / Stuff.js / BattleTool.js 重写
var Q = {white:1,green:2,bule:3,purple:4,orange:5};
var QNAME = ['','普通','优秀','精良','稀有','传说'];
var PARTS = {5:'武器',10:'衣服',15:'头盔',20:'项链',22:'戒指',23:'戒指',24:'手镯',25:'手镯',62:'鞋子',64:'腰带'};
var SLOT_ORDER = [5,10,15,20,22,23,24,25,62,64];
var PROF_KEY = {1:'1001',2:'1002',3:'1003'};
var ATK = {1:'zs',2:'fs',3:'ds'};
var SAVE_KEY = 'cq_web_save_v1';
var G = { role:null, battle:null, logs:[], settings:{autoDrug:true,autoSell:0} };

function rnd(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function randomIndex(w){ var s=0,i; for(i=0;i<w.length;i++) s+=(w[i]||0); if(s<=0) return 0; var r=Math.random()*s; for(i=0;i<w.length;i++){ r-=(w[i]||0); if(r<0) return i; } return w.length-1; }
function newUid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

// ---------- 物品 ----------
function createStuff(id, count, quality){
  var c = cfg('item', id); if(!c) return null;
  var s = {uid:newUid(), id:id, count:count||1, q:c.quality||1, ench:0, attr:null, nonsuch:0};
  if(c.type==2){
    s.q = quality || 1;
    s.attr = {hp:c.hp||0,mp:c.mp||0,minzs:c.minzs||0,maxzs:c.maxzs||0,minac:c.minac||0,maxac:c.maxac||0,minfs:c.minfs||0,maxfs:c.maxfs||0,minds:c.minds||0,maxds:c.maxds||0};
    // Stuff.setNonsuch: 按品质概率出极品属性, 极品点 30%~100% points
    var g = c.bestgailv;
    if(g && Math.random()*100 <= g[s.q-1] && c.points){
      var p = Math.min(c.points, Math.ceil((c.points*0.7)*Math.random()+0.3*c.points));
      s.nonsuch = p;
      var keys = ['maxzs','maxfs','maxds','maxac'];
      while(p-->0){ s.attr[keys[Math.floor(Math.random()*4)]]++; }
    }
  }
  H('createStuff', s, c); // [systems] 词缀
  return s;
}
function stuffCfg(s){ return cfg('item', s.id); }
function isEquip(s){ var c=stuffCfg(s); return c && c.type==2; }
function addItem(s){
  var r=G.role, c=stuffCfg(s); if(!c) return;
  if(H('addItem', false, s, c)) return false; // [systems] 金币/元宝道具折算、背包上限
  if(c.stdmode==98){ var n=parseInt(c.name)||1; r.yuanbao+=n*s.count; return; }
  if(c.type!=2){ for(var i=0;i<r.bag.length;i++){ if(r.bag[i].id==s.id){ r.bag[i].count+=s.count; return; } } }
  if(c.type==2 && s.q>=4){ r.stat['equipq'+s.q]=(r.stat['equipq'+s.q]||0)+1; }
  r.bag.push(s);
}
function removeItem(uid, n){
  var r=G.role; for(var i=0;i<r.bag.length;i++) if(r.bag[i].uid==uid){ r.bag[i].count-=(n||r.bag[i].count); if(r.bag[i].count<=0) r.bag.splice(i,1); return; }
}
function countItem(id){ var n=0; G.role.bag.forEach(function(s){ if(s.id==id) n+=s.count; }); return n; }
function consumeItem(id,n){ var r=G.role; for(var i=r.bag.length-1;i>=0&&n>0;i--){ var s=r.bag[i]; if(s.id==id){ var k=Math.min(n,s.count); s.count-=k; n-=k; if(s.count<=0) r.bag.splice(i,1);} } }

// ---------- 角色 ----------
function newRole(name, prof){
  var pc = cfg('profession', 0) ; pc = CFG.profession.raw[PROF_KEY[prof]];
  var r = {name:name, prof:prof, level:1, exp:0, gold:0, yuanbao:0, hp:1, mp:1, mapId:pc.mapid,
    bag:[], equip:{}, skills:{}, kills:{}, stat:{}, tasksDone:{}, created:Date.now(), lastSave:Date.now()};
  G.role = r;
  (pc.items||[]).forEach(function(id){ var s=createStuff(id,1); if(s) addItem(s); });
  var a = calcAttr(); r.hp=a.maxhp; r.mp=a.maxmp;
  return r;
}
function profCfg(){ return CFG.profession.raw[PROF_KEY[G.role.prof]]; }
// Role.js: base + level*g_x ; 再叠加装备、强化、技能
function calcAttr(){
  var r=G.role, p=profCfg(), L=r.level, a={};
  a.maxhp=Math.ceil(p.hp+L*p.g_hp); a.maxmp=Math.ceil(p.mp+L*p.g_mp);
  ['minzs','maxzs','minfs','maxfs','minds','maxds','minac','maxac'].forEach(function(k){ a[k]=Math.ceil(p[k]+L*p['g_'+k]); });
  a.hit=0; a.evade=0; a.critical=0; a.lucky=0; a.fixeddamage=0; a.fixedac=0; a.atkspeed=p.atkspeed;
  var atk=ATK[r.prof];
  SLOT_ORDER.forEach(function(sl){ var s=r.equip[sl]; if(!s) return; var e=s.attr;
    a.maxhp+=e.hp; a.maxmp+=e.mp; ['minzs','maxzs','minfs','maxfs','minds','maxds','minac','maxac'].forEach(function(k){a[k]+=e[k];});
    // 强化 equip_qianghua_parts: 每级加 min/max 攻击或防御
    if(s.ench>0){ var pp=CFG.equip_qianghua_parts.list.filter(function(x){return x.id==sl;})[0];
      if(pp){ if(pp.maxatk!=null){ a['min'+atk]+=pp.minatk*s.ench; a['max'+atk]+=pp.maxatk*s.ench; }
              if(pp.maxac!=null){ a.minac+=pp.minac*s.ench; a.maxac+=pp.maxac*s.ench; }
              if(pp.maxhp!=null){ a.maxhp+=(pp.maxhp||0)*s.ench; } } }
  });
  // 被动技能 (如 基本剑法: 攻击+N, 精神战力法: 攻击/道术+N)
  eachSkill(function(sc){ if(sc.triggertype===0 && !sc.gailv){ var m=/(\d+)点/.exec(sc.describe||''); if(m){ a['min'+atk]+=+m[1]; a['max'+atk]+=+m[1]; } } });
  H('attr', a, r); // [systems] 词缀/Buff
  a.atkmin=a['min'+atk]; a.atkmax=Math.max(a['max'+atk],a.atkmin);
  return a;
}
function combatPower(a){ a=a||calcAttr(); return Math.ceil(a.maxhp*0.1+a.maxmp*0.1+((a.atkmax+a.atkmin)/2)*12+((a.maxac+a.minac)/2)*12); }
function expNeed(L){ var c=cfg('levelup',L); return c? c.exp : Infinity; }
function addExp(n){
  var r=G.role; r.exp+=n;
  while(r.exp>=expNeed(r.level)){ r.exp-=expNeed(r.level); r.level++; var a=calcAttr(); r.hp=a.maxhp; r.mp=a.maxmp; log('<b style="color:#ffd76a">恭喜升级! 当前等级 '+r.level+'</b>'); toast('升级到 '+r.level+' 级'); }
}

// ---------- 技能 ----------
function skillRow(base, lv){ return CFG.skill.list.filter(function(x){ return Math.floor(x.id/10)==base && x.level==lv; })[0]; }
function eachSkill(fn){ var r=G.role; if(!r) return; Object.keys(r.skills).forEach(function(b){ var sc=skillRow(+b, r.skills[b].lv); if(sc) fn(sc, r.skills[b], +b); }); }
function learnFromBook(itemId){
  var r=G.role, row=CFG.skill.list.filter(function(x){ return x.booknum && x.booknum[0]==itemId; })[0];
  if(!row) return '无法学习';
  var base=Math.floor(row.id/10);
  if(row.job!=r.prof) return '职业不符';
  var cur = r.skills[base] ? r.skills[base].lv : 0;
  var next = skillRow(base, cur+1); if(!next) return '技能已满级';
  if(r.level < next.slevel) return '需要等级 '+next.slevel;
  if(cur>0 && r.skills[base].exp < skillRow(base,cur).exp) return '技能熟练度不足 ('+r.skills[base].exp+'/'+skillRow(base,cur).exp+')';
  var need = next.booknum ? next.booknum[1] : 1; if(countItem(itemId) < need) return '需要技能书 x'+need;
  consumeItem(itemId, need);
  r.skills[base] = {lv:cur+1, exp:0, cd:0};
  r.stat.skillLearned=(r.stat.skillLearned||0)+1;
  return 'OK:'+next.name+' 提升到 '+(cur+1)+' 级';
}

// ---------- 地图 / 战斗 ----------
function mapCfg(id){ return cfg('map', id||G.role.mapId); }
function enterMap(id){
  var m=cfg('map',id); if(!m) return;
  G.role.mapId=id; G.battle=null; log('进入 <b>'+m.name+'</b>');
  if(m.type==2) startBattle(m);
  save();
}
function spawnMonster(m, mid, isBoss){
  var c=cfg('monster', mid); if(!c) return null;
  var q = isBoss ? Q.orange : (randomIndex(m.quality||[1])+1);
  var k=[0,1,6,9,12,1][q], ac=[0,1,1.1,1.3,1.5,1][q], zs=[0,1,1.1,1.3,1.5,1][q], zs2=[0,1,1.3,1.6,1.5,1][q], ex=[0,1,2,3,5,1][q];
  return {cfg:c, q:q, boss:!!isBoss, hp:Math.ceil(c.hp*k), maxhp:Math.ceil(c.hp*k), ac:c.ac*ac, zs:c.zs*zs, zsmax:c.zs2*zs2, exp:Math.ceil(c.exp*ex), atkT:c.attack_spd||2.5, dead:false, respawn:0};
}
function startBattle(m){
  var b={map:m, mons:[], t:0, roleT:0, bossNext:0};
  var n=m.maxmonsters||4;
  for(var i=0;i<n;i++) b.mons.push(spawnMonster(m, m.monster[i%m.monster.length]));
  if(m.boss && m.boss>1000){ var bossAt=(G.role.stat['boss_'+m.boss]||0); if(Date.now()>=bossAt) b.mons.unshift(spawnMonster(m,m.boss,true)); }
  G.battle=b;
}
// DamageTool: 命中 = 90 + hit - evade ; 幸运 = 5*lucky% 取最大攻击 ; 暴击 x1.5
function roleAttack(b, a){
  var r=G.role, target=(typeof MOVE!=='undefined')? MOVE.roleTarget(b) : b.mons.filter(function(x){return !x.dead;})[0]; if(!target) return;
  if(Math.random()*100 >= 90+a.hit-(target.cfg.evade||0)){ log('你的攻击被 '+target.cfg.name+' 闪避'); FXE('miss',{target:target}); return; }
  var lucky = Math.random()*100 < 5*a.lucky;
  var dmg = lucky ? a.atkmax : rnd(a.atkmin, a.atkmax);
  var used=null, usedSc=[];
  // 主动技能: 按优先级挑选可用 (cd 就绪 & 蓝够)
  var cands=[]; eachSkill(function(sc,st,base){ if(sc.triggertype==1 && sc.power2 && (st.cd||0)<=0 && r.mp>=(sc.spell||0)) cands.push([sc,st]); });
  cands.sort(function(x,y){ return (y[0].priority||0)-(x[0].priority||0); });
  cands = H('skillCands', cands);
  if(cands.length){ var sc=cands[0][0], st=cands[0][1]; dmg = dmg*sc.power2/100 + (sc.atktype==2?0:(sc.power||0)); r.mp-=(sc.spell||0); st.cd=sc.basecd||0; st.exp=(st.exp||0)+1; used=sc.name; usedSc.push(sc); }
  // 被动概率技能 (攻杀剑法等)
  eachSkill(function(sc,st){ if(sc.triggertype===0 && sc.gailv && sc.power2 && Math.random()*100<sc.gailv){ dmg=dmg*sc.power2/100+(sc.power||0); st.exp=(st.exp||0)+1; used=(used?used+'+':'')+sc.name; usedSc.push(sc); } });
  var crit = Math.random()*100 < a.critical; if(crit) dmg*=1.5;
  dmg = Math.ceil(dmg - target.ac); var fx=Math.max(0,a.fixeddamage-(target.cfg.fixedac||0)); dmg+=fx; if(dmg<=0) dmg=1;
  dmg = H('roleDamage', dmg, target, a, usedSc, crit); // [systems] Buff/词缀
  target.hp-=dmg;
  log((used?'['+used+'] ':'')+'你对 <span class="q'+target.q+'">'+target.cfg.name+'</span> 造成 '+dmg+' 伤害'+(crit?' (暴击)':''));
  FXE('attack',{target:target,dmg:dmg,crit:crit,skills:usedSc});
  if(target.hp<=0 && !target.dead) killMonster(b,target);
}
function killMonster(b, m){
  FXE('kill',{m:m}); var r=G.role; m.dead=true; m.hp=0; m.respawn = (m.boss? 0 : (m.cfg.rebirth||3));
  r.kills[m.cfg.id]=(r.kills[m.cfg.id]||0)+1;
  log('击败 <span class="q'+m.q+'">'+QNAME[m.q]+' '+m.cfg.name+'</span>, 获得经验 '+m.exp);
  addExp(m.exp);
  var drop = rollDrop(m); if(drop.gold){ r.gold+=drop.gold; log('获得金币 '+drop.gold); }
  drop.item.forEach(function(s){ var c=stuffCfg(s);
    if(c.type==2 && G.settings.autoSell && s.q<=G.settings.autoSell && !s.nonsuch){ r.gold+=c.sellprice||0; log('自动出售 '+c.name); return; }
    addItem(s); log('获得 <span class="q'+s.q+'">'+(c.type==2?'['+QNAME[s.q]+']':'')+c.name+(s.count>1?' x'+s.count:'')+(s.nonsuch?' (极品+'+s.nonsuch+')':'')+'</span>'); });
  H('kill', m, b);
  if(m.boss){ r.stat['boss_'+m.cfg.id]=Date.now()+60000*(m.cfg.rebirth||3); b.mons.splice(b.mons.indexOf(m),1); }
}
// DropTool.setDropInfo
function rollDrop(m){
  var res={item:[],gold:0}, ids=[];
  if(m.q==1) ids=m.cfg.dorp1; else if(m.q==2) ids=m.cfg.dorp2; else if(m.q==3) ids=m.cfg.dorp3; else ids=m.cfg.dorp4;
  (ids||[]).forEach(function(did){ var c=cfg('drop',did); if(!c) return;
    for(var p=0;p<(c.picks||1);p++){
      var no=c.nodrop||0, pr=c.prob||0;
      if(Math.floor(Math.random()*(no+pr))>no){ var h=Math.floor(.2*Math.random()*c.gold); res.gold=Math.random()>.5?c.gold-h:c.gold+h; }
      var idx=randomIndex([no,c.prob1,c.prob2,c.prob3,c.prob4,c.prob5]);
      if(idx>0){ var list=c['item'+idx]; if(!list||!list.length) continue;
        var id=list[Math.floor(Math.random()*list.length)], ic=cfg('item',id); if(!ic) continue;
        var q = ic.type==2 ? (m.q==5 && idx<=2 ? 5 : (c['gailv'+idx] ? randomIndex(c['gailv'+idx])+1 : 1)) : ic.quality;
        q=H('dropQuality', q, ic, m, c, idx); // [loot] 品质判定公式
        var s=createStuff(id,1,q); if(!s) continue; H('dropItem', s, ic, m); // [loot] 暗金/套装
        var ex=res.item.filter(function(x){return x.id==id && ic.type!=2;})[0]; if(ex) ex.count++; else res.item.push(s);
      }
    }
  });
  return res;
}
function monsterAttack(b, m, a){
  var r=G.role;
  if(H('monsterAttack', false, b, m, a)) return; // [systems] 眩晕/冰冻/召唤兽承伤
  if(Math.random()*100 >= 90+(m.cfg.hit||0)-a.evade){ log(m.cfg.name+' 的攻击被你闪避'); FXE('dodge',{m:m}); return; }
  var d=rnd(Math.floor(m.zs), Math.max(Math.floor(m.zs),Math.floor(m.zsmax)-1));
  if(Math.random()*100 < (m.cfg.critical||0)) d=Math.ceil(d*1.5);
  d -= rnd(a.minac, Math.max(a.minac,a.maxac)); d+=Math.max(0,(m.cfg.fixeddamage||0)-a.fixedac); d=Math.ceil(d); if(d<=0) d=1;
  d = H('roleHurt', d, m, a); // [systems] 护盾/免伤
  r.hp-=d; FXE('hurt',{m:m,d:d}); FXE('matk',{m:m}); log('<span style="color:#e77">'+m.cfg.name+' 对你造成 '+d+' 伤害</span>');
  if(r.hp<=0) roleDie();
}
function roleDie(){
  var r=G.role, m=mapCfg(); r.hp=0; log('<b style="color:#f55">你被击败了! 回到 '+(cfg('map',m.rebornmap)||{}).name+'</b>');
  toast('你已死亡, 复活于安全区'); var a=calcAttr(); r.hp=a.maxhp; r.mp=a.maxmp; enterMap(m.rebornmap||1001);
}
var DRUG={hp:0,mp:0};
function useDrug(s){
  var c=stuffCfg(s); if(c.hp) DRUG.hp+=c.hp; if(c.mp) DRUG.mp+=c.mp; removeItem(s.uid,1);
}
function autoDrug(a){
  var r=G.role; if(!G.settings.autoDrug) return;
  function pick(key){ var best=null; r.bag.forEach(function(s){ var c=stuffCfg(s); if(c.stdmode==0 && c[key]>0 && c.needlevel<=r.level && (!best||c[key]>stuffCfg(best)[key])) best=s; }); return best; }
  if(r.hp < a.maxhp*0.5 && DRUG.hp<=0){ var s=pick('hp'); if(s) useDrug(s); }
  if(r.mp < a.maxmp*0.3 && DRUG.mp<=0){ var s2=pick('mp'); if(s2) useDrug(s2); }
}
var lastTick=0;
function tick(dt){
  var r=G.role; if(!r) return; var a=calcAttr();
  // 药品: 5 秒内持续回复
  if(DRUG.hp>0){ var h=Math.min(DRUG.hp, Math.ceil(dt*Math.max(16,DRUG.hp/5))); DRUG.hp-=h; r.hp=Math.min(a.maxhp,r.hp+h); }
  if(DRUG.mp>0){ var mm=Math.min(DRUG.mp, Math.ceil(dt*Math.max(16,DRUG.mp/5))); DRUG.mp-=mm; r.mp=Math.min(a.maxmp,r.mp+mm); }
  eachSkill(function(sc,st){ if(st.cd>0) st.cd-=dt; });
  var b=G.battle, m=mapCfg();
  if(!b || m.type!=2){ r.hp=Math.min(a.maxhp, r.hp+a.maxhp*0.05*dt); r.mp=Math.min(a.maxmp, r.mp+a.maxmp*0.05*dt); return; }
  r.mp=Math.min(a.maxmp, r.mp+a.maxmp*0.005*dt);
  autoDrug(a);
  // 道士治疗术
  eachSkill(function(sc,st,base){ if(sc.triggertype==2 && !H('skillHandled',false,sc,base) && (st.cd||0)<=0 && r.hp<a.maxhp*(sc.parameter1||85)/100 && r.mp>=(sc.spell||0)){ var heal=Math.ceil(a.maxhp*(sc.power2||5)/100+a.atkmax); r.hp=Math.min(a.maxhp,r.hp+heal); r.mp-=sc.spell||0; st.cd=sc.basecd||10; st.exp=(st.exp||0)+1; log('['+sc.name+'] 回复生命 '+heal); FXE('heal',{amount:heal,sc:sc}); } });
  H('tick', dt, b, a, m); // [systems] Buff/召唤兽
  if(G.battle!==b) return;
  if(typeof MOVE!=='undefined') MOVE.update(b,dt); // [move] 走位
  b.roleT-=dt; if(b.roleT<=0){ b.roleT=a.atkspeed; roleAttack(b,a); }
  b.mons.forEach(function(x){
    if(x.dead){ x.respawn-=dt; if(x.respawn<=0){ var n=spawnMonster(m, m.monster[Math.floor(Math.random()*m.monster.length)]); for(var k in n) x[k]=n[k]; } return; }
    x.atkT-=dt; if(x.atkT<=0 && G.battle===b && (typeof MOVE==='undefined' || MOVE.monCanAttack(b,x))){ x.atkT=x.cfg.attack_spd||2.5; monsterAttack(b,x,a); }
  });
  if(m.boss>1000 && !b.mons.some(function(x){return x.boss;}) && Date.now()>=(r.stat['boss_'+m.boss]||0)){ var bs=spawnMonster(m,m.boss,true); if(bs){ b.mons.unshift(bs); log('<b class="q5">BOSS '+bs.cfg.name+' 出现了!</b>'); } }
}

// ---------- 装备 / 强化 ----------
function equipItem(uid){
  var r=G.role, s=r.bag.filter(function(x){return x.uid==uid;})[0]; if(!s) return '物品不存在';
  var c=stuffCfg(s); if(c.type!=2) return '不可装备';
  if(c.needlevel>r.level) return '需要等级 '+c.needlevel;
  if(c.profession && c.profession!=r.prof) return '职业不符';
  var sl=c.stdmode; if(sl==22||sl==23) sl = !r.equip[22]?22:(!r.equip[23]?23:22); if(sl==24||sl==25) sl=!r.equip[24]?24:(!r.equip[25]?25:24);
  removeItem(uid); if(r.equip[sl]) r.bag.push(r.equip[sl]); r.equip[sl]=s; return 'OK';
}
function unequip(sl){ var r=G.role; if(r.equip[sl]){ r.bag.push(r.equip[sl]); delete r.equip[sl]; } }
function enhance(sl){
  var r=G.role, s=r.equip[sl]; if(!s) return '该部位没有装备';
  var c=cfg('equip_qianghua', s.ench); if(!c || !cfg('equip_qianghua', s.ench+1)) return '已满级';
  if(r.gold<c.cost) return '金币不足 (需要 '+c.cost+')';
  r.gold-=c.cost; if(Math.random()*100<c.gailv){ s.ench++; minEnch(); return 'OK:强化成功 +'+s.ench; } return '强化失败';
}
function minEnch(){ var r=G.role, m=Infinity; SLOT_ORDER.forEach(function(sl){ m=Math.min(m, r.equip[sl]?r.equip[sl].ench:0); }); r.stat.minEnch=m; return m; }

// ---------- 背包使用 ----------
function useItem(uid){
  var r=G.role, s=r.bag.filter(function(x){return x.uid==uid;})[0]; if(!s) return '';
  var c=stuffCfg(s);
  if(c.type==2) return equipItem(uid);
  if(c.needlevel>r.level) return '需要等级 '+c.needlevel;
  if(c.stdmode==0){ useDrug(s); return 'OK:使用 '+c.name; }
  if(c.stdmode==4) return learnFromBook(s.id);
  if(c.stdmode==99){ var lb=cfg('libao', s.id); if(!lb) return '礼包配置缺失';
    if(r.level<(lb.lev||1)) return '需要等级 '+lb.lev;
    var chk=H('useLibao', null, lb, s); if(chk) return chk; // [systems] 背包空位检查
    removeItem(uid,1); r.gold+=lb.gold||0; r.yuanbao+=lb.yuanbao||0;
    for(var i=1;i<=8;i++){ if(lb['item'+i]){ var it=createStuff(lb['item'+i], lb['num'+i]||1); if(it){ if(stuffCfg(it).type==2){ it.count=1; } addItem(it);} } }
    return 'OK:打开 '+lb.name; }
  if(c.stdmode==3 && /回城/.test(c.name)){ removeItem(uid,1); enterMap(mapCfg().rebornmap||1004); return 'OK:回城'; }
  if(c.stdmode==2 && /随机/.test(c.name) && mapCfg().type==2){ removeItem(uid,1); startBattle(mapCfg()); return 'OK:随机传送, 刷新怪物'; }
  return '该物品暂不能直接使用';
}
function sellItem(uid){ var s=G.role.bag.filter(function(x){return x.uid==uid;})[0]; if(!s) return; var c=stuffCfg(s); G.role.gold+=(c.sellprice||0)*s.count; removeItem(uid); }
function buy(row, n){
  var r=G.role, price=Math.abs(row.price)*n, cur=row.currencytype==2?'yuanbao':'gold';
  if(r[cur]<price) return (cur=='gold'?'金币':'元宝')+'不足';
  r[cur]-=price; var c=cfg('item',row.items);
  if(c.type==2){ for(var i=0;i<n;i++) addItem(createStuff(row.items,1,1)); } else addItem(createStuff(row.items,n));
  return 'OK:购买 '+row.name+' x'+n;
}

// ---------- 任务 ----------
function taskProgress(t){
  var r=G.role, a=calcAttr();
  switch(t.type){
    case 1: return [r.level, t.parameter1];
    case 2: return [r.kills[t.parameter1]||0, t.parameter2];
    case 4: return [r.stat['equipq'+t.parameter1]||0, t.parameter2||1];
    case 5: return [combatPower(a), t.parameter1];
    case 7: return [minEnch(), t.parameter1];
    case 8: return [r.stat.skillLearned||0, t.parameter1];
    case 10: var ch=Math.floor(t.id/1000), all=CFG.task.list.filter(function(x){return Math.floor(x.id/1000)==ch && x.type!=10;}); return [all.filter(function(x){return r.tasksDone[x.id];}).length, all.length];
    default: return H('taskProgress', null, t);
  }
}
function currentTasks(){ var r=G.role; var undone=CFG.task.list.filter(function(t){return !r.tasksDone[t.id];}); if(!undone.length) return []; var ch=Math.floor(undone[0].id/1000); return undone.filter(function(t){return Math.floor(t.id/1000)==ch;}); }
function claimTask(id){ var t=cfg('task',id), p=taskProgress(t); if(!p||p[0]<p[1]) return '未完成'; G.role.tasksDone[id]=1; var s=createStuff(t.reward[0], t.reward[1]); if(s) addItem(s); return 'OK:领取 '+(cfg('item',t.reward[0])||{}).name+' x'+t.reward[1]; }

// ---------- 存档 ----------
function save(){ if(!G.role) return; G.role.lastSave=Date.now(); try{ localStorage.setItem(SAVE_KEY, JSON.stringify({role:G.role, settings:G.settings})); }catch(e){} }
function load(){ try{ var d=JSON.parse(localStorage.getItem(SAVE_KEY)); if(d&&d.role){ G.role=d.role; G.settings=d.settings||G.settings; H('loaded', G.role); return true; } }catch(e){} return false; }
function resetSave(){ localStorage.removeItem(SAVE_KEY); location.reload(); }
// 离线收益 (TipOffline 简化: 离线时长 * 当前地图怪物平均经验)
function offlineReward(){
  var r=G.role, sec=Math.min(8*3600,(Date.now()-r.lastSave)/1000); if(sec<120) return null;
  var m=mapCfg(); if(m.type!=2) return null;
  var avg=0; m.monster.forEach(function(id){ avg+=(cfg('monster',id)||{exp:0}).exp; }); avg/=m.monster.length;
  var kills=Math.floor(sec/6), exp=Math.floor(kills*avg*0.5), gold=kills*2; addExp(exp); r.gold+=gold;
  return {sec:Math.floor(sec), exp:exp, gold:gold};
}
function FXE(t,o){ if(typeof FX!=='undefined'&&FX.emit) try{ FX.emit(t,o); }catch(e){} }
function log(s){ G.logs.push(s); if(G.logs.length>80) G.logs.shift(); }
