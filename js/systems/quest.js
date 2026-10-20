// [systems] 任务系统 (Systems.quest): 主线 = 原版 task.txt 任务链 (ItemTask/eTaskType, 复用 currentTasks/claimTask);
// 每日任务 + 活跃度宝箱 + 成就 = 原版没有, 按传奇手游惯例设计。进度来自事件: kill / levelUp / enhance / equip / sign / taskClaim
// 存档: G.role.quest = {ver, cnt:{累计}, daily:{date, cnt:{}, done:{}, chest:{}}, ach:{}}, 迁移由 quest.ver 控制
(function(S){
  var VER = 1;
  var DAILY = [
    {id:'d_kill',   name:'清剿怪物', desc:'击败任意怪物 100 只', ev:'kill',    n:100, act:20, reward:[[S.ITEM_GOLD,5000]]},
    {id:'d_elite',  name:'精英猎手', desc:'击败精英以上怪物 10 只', ev:'elite', n:10,  act:20, reward:[[S.ITEM_GOLD,8000]]},
    {id:'d_boss',   name:'讨伐首领', desc:'击败 BOSS 1 次',      ev:'boss',    n:1,   act:20, reward:[[S.ITEM_YUANBAO,20]]},
    {id:'d_enh',    name:'精益求精', desc:'进行装备强化 3 次',    ev:'enhance', n:3,   act:20, reward:[[S.ITEM_STONE,5]]},
    {id:'d_sign',   name:'每日签到', desc:'完成福利月签到 1 次',  ev:'sign',    n:1,   act:10, reward:[[S.ITEM_GOLD,3000]]},
    {id:'d_task',   name:'历练之路', desc:'领取主线/历练任务奖励 1 次', ev:'taskClaim', n:1, act:10, reward:[[S.ITEM_YUANBAO,10]]}
  ];
  var CHEST = [
    {id:1, need:20,  reward:[[S.ITEM_GOLD,10000]]},
    {id:2, need:50,  reward:[[S.ITEM_STONE,10]]},
    {id:3, need:80,  reward:[[S.ITEM_YUANBAO,50]]},
    {id:4, need:100, reward:[[S.ITEM_YUANBAO,100],[S.ITEM_SKILLDAN,2]]}
  ];
  var ACH = [];
  function ach(key, name, ev, list, rw){ list.forEach(function(n,i){ ACH.push({id:key+'_'+n, name:name+(['I','II','III','IV','V'][i]||''), ev:ev, n:n, reward:rw(n,i)}); }); }
  ach('kill','杀戮之王','kill',[100,1000,10000],function(n,i){ return [[S.ITEM_GOLD,10000*(i+1)*(i+1)],[S.ITEM_YUANBAO,20*(i+1)]]; });
  ach('lv','声名鹊起','level',[10,20,30,40],function(n,i){ return [[S.ITEM_YUANBAO,50*(i+1)]]; });
  ach('boss','屠魔勇士','boss',[1,10,50],function(n,i){ return [[S.ITEM_YUANBAO,30*(i+1)],[S.ITEM_STONE,5*(i+1)]]; });
  ach('enh','强化大师','enhance',[10,50,200],function(n,i){ return [[S.ITEM_STONE,10*(i+1)]]; });
  ach('equip','全副武装','equip',[1,10],function(n,i){ return [[S.ITEM_GOLD,5000*(i+1)]]; });

  function st(){
    var r=S.ensure(); if(!r) return null;
    var q=r.quest;
    if(!q || !q.ver){ q=r.quest={ver:0, cnt:{}, daily:null, ach:{}}; }
    if(q.ver<1){ // v0 -> v1: 用已有存档数据回填累计进度
      var k=0; for(var id in (r.kills||{})) k+=r.kills[id]; q.cnt.kill=Math.max(q.cnt.kill||0,k);
      q.cnt.equip=q.cnt.equip||Object.keys(r.equip||{}).length; q.ver=1;
    }
    if(!r.ver || r.ver<1) r.ver=1;
    var t=S.today(S.now());
    if(!q.daily || q.daily.date!=t) q.daily={date:t, cnt:{}, done:{}, chest:{}};   // 本地 0 点重置
    return q;
  }
  function emit(ev, n){ var q=st(); if(!q) return; n=n||1; q.cnt[ev]=(q.cnt[ev]||0)+n; q.daily.cnt[ev]=(q.daily.cnt[ev]||0)+n; }
  function give(list){ var got=[]; list.forEach(function(x){ var s=createStuff(x[0],x[1]); if(s){ addItem(s); got.push(S.itemName(x[0])+' x'+x[1]); } }); return got.join(', '); }
  function val(a){ var q=st(); return a.ev=='level' ? G.role.level : (q.cnt[a.ev]||0); }

  S.quest = {
    VER:VER, emit:emit, state:st,
    main: function(){ return currentTasks().map(function(t){ var p=taskProgress(t)||[0,1];
      return {id:t.id, name:t.name, desc:t.describe, progress:p, reward:[[t.reward[0],t.reward[1]]], canClaim:p[0]>=p[1]}; }); },
    claimMain: function(id){ if(Math.floor(id/1000)+1000>1003) return '该章节未开放'; var res=claimTask(id); if(res.indexOf('OK')===0){ emit('taskClaim'); save(); } return res; },
    daily: function(){ var q=st(); return DAILY.map(function(d){ var c=Math.min(d.n,q.daily.cnt[d.ev]||0);
      return {id:d.id, name:d.name, desc:d.desc, act:d.act, reward:d.reward, progress:[c,d.n], done:!!q.daily.done[d.id], canClaim:c>=d.n && !q.daily.done[d.id]}; }); },
    activity: function(){ var q=st(), a=0; DAILY.forEach(function(d){ if(q.daily.done[d.id]) a+=d.act; }); return a; },
    chests: function(){ var q=st(), a=S.quest.activity(); return CHEST.map(function(c){ return {id:c.id, need:c.need, reward:c.reward, opened:!!q.daily.chest[c.id], canOpen:a>=c.need && !q.daily.chest[c.id]}; }); },
    claimDaily: function(id){ var q=st(), d=DAILY.filter(function(x){return x.id==id;})[0]; if(!d) return '任务不存在';
      if(q.daily.done[id]) return '已领取'; if((q.daily.cnt[d.ev]||0)<d.n) return '未完成';
      q.daily.done[id]=1; var g=give(d.reward); save(); return S.ok('活跃度 +'+d.act+', 获得 '+g); },
    openChest: function(id){ var q=st(), c=CHEST.filter(function(x){return x.id==id;})[0]; if(!c) return '宝箱不存在';
      if(q.daily.chest[id]) return '已领取'; if(S.quest.activity()<c.need) return '活跃度不足 '+c.need;
      q.daily.chest[id]=1; var g=give(c.reward); save(); return S.ok('宝箱开启: '+g); },
    achievements: function(){ var q=st(); return ACH.map(function(a){ var v=val(a);
      return {id:a.id, name:a.name, desc:{kill:'累计击败怪物',level:'角色等级达到',boss:'累计击败BOSS',enhance:'累计强化装备',equip:'累计穿戴装备'}[a.ev]+' '+a.n+(a.ev=='enhance'?' 次':a.ev=='level'?' 级':a.ev=='equip'?' 次':' 只'),
        reward:a.reward, progress:[Math.min(v,a.n),a.n], done:!!q.ach[a.id], canClaim:v>=a.n && !q.ach[a.id]}; }); },
    claimAch: function(id){ var q=st(), a=ACH.filter(function(x){return x.id==id;})[0]; if(!a) return '成就不存在';
      if(q.ach[id]) return '已领取'; if(val(a)<a.n) return '未达成'; q.ach[id]=1; var g=give(a.reward); save(); return S.ok('成就达成 '+a.name+': '+g); },
    red: function(){ if(!G.role) return {main:false,daily:false,ach:false,any:false};
      var m=S.quest.main().some(function(x){return x.canClaim;}) , d=S.quest.daily().some(function(x){return x.canClaim;})||S.quest.chests().some(function(x){return x.canOpen;}),
        a=S.quest.achievements().some(function(x){return x.canClaim;}); return {main:m,daily:d,ach:a,any:m||d||a}; }
  };

  // ---- 事件钩子 ----
  S.on('kill', function(v, m){ emit('kill'); if(m.q>=2) emit('elite'); if(m.boss) emit('boss'); });
  S.on('loaded', function(){ st(); });
  // 包装全局函数 (不改 game.js / equip 系统 / fuli): 升级、强化、穿戴、签到、历练领取
  var g=(typeof window!=='undefined'?window:globalThis);
  function wrap(name, after){ var f=g[name]; if(typeof f!=='function' || f._q) return; var w=function(){ var res=f.apply(this,arguments); try{ after(res, arguments); }catch(e){} return res; }; w._q=1; g[name]=w; }
  wrap('enhance', function(res){ if(res==='强化失败'||(res&&res.indexOf('OK')===0)) emit('enhance'); });
  wrap('equipItem', function(res){ if(res&&res.indexOf('OK')===0) emit('equip'); });
  wrap('newRole', function(){ st(); });
  if(S.fuli){ var sg=S.fuli.sign; S.fuli.sign=function(){ var r=sg.apply(this,arguments); if(r&&r.indexOf('OK')===0) emit('sign'); return r; }; }
  if(S.lilian){ var lc=S.lilian.claim; S.lilian.claim=function(){ var r=lc.apply(this,arguments); if(r&&r.indexOf('OK')===0) emit('taskClaim'); return r; }; }
})(Systems);
