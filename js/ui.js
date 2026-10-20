// 界面 (竖屏, 对应原版 Main / MainFight / MainMap / MainRole / RoleBag / RoleSkill / MainStory)
var IMG='assets/images/';
var PAGE='fight', $=function(id){return document.getElementById(id);};
function esc(s){ return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
function toast(s){ var t=$('toast'); t.textContent=s; t.style.display='block'; clearTimeout(t._h); t._h=setTimeout(function(){t.style.display='none';},1500); }
function msg(res){ if(!res) return; toast(res.indexOf('OK')==0 ? (res.slice(3)||'成功') : res); save(); render(); }
function modal(html){ $('modalBox').innerHTML=html+'<div style="text-align:center;margin-top:8px"><button class="b" onclick="closeModal()">关闭</button></div>'; $('modal').classList.remove('hide'); }
function closeModal(){ $('modal').classList.add('hide'); }
function icon(s){ var c=stuffCfg(s); return '<div class="it q'+s.q+'" onclick="itemTip(\''+s.uid+'\')"><img src="'+IMG+'icon/'+c.icon+'.png" onerror="this.style.visibility=\'hidden\'">'+(s.count>1?'<span>'+s.count+'</span>':'')+(s.ench?'<em>+'+s.ench+'</em>':'')+'</div>'; }
function attrLines(s){ var e=s.attr, out=[]; [['hp','生命'],['mp','魔法']].forEach(function(k){ if(e[k[0]]) out.push(k[1]+' +'+e[k[0]]); });
  [['zs','攻击'],['fs','魔法'],['ds','道术'],['ac','防御']].forEach(function(k){ if(e['max'+k[0]]) out.push(k[1]+' '+e['min'+k[0]]+'-'+e['max'+k[0]]); }); return out.join('<br>'); }
function findStuff(uid){ var r=G.role, s=r.bag.filter(function(x){return x.uid==uid;})[0]; if(s) return {s:s}; for(var sl in r.equip) if(r.equip[sl].uid==uid) return {s:r.equip[sl], slot:sl}; return null; }
function itemTip(uid){
  var f=findStuff(uid); if(!f) return; var s=f.s, c=stuffCfg(s);
  var h='<div class="q'+s.q+'" style="font-size:16px"><b>'+(c.type==2?'['+QNAME[s.q]+'] ':'')+c.name+(s.ench?' +'+s.ench:'')+'</b></div>';
  if(c.type==2) h+='<small>'+(PARTS[c.stdmode]||'')+' 需要等级 '+c.needlevel+(c.profession?' 职业:'+['','战士','法师','道士'][c.profession]:'')+'</small><div>'+attrLines(s)+(s.nonsuch?'<br><span class="q5">极品属性 +'+s.nonsuch+'</span>':'')+'</div>';
  h+='<p><small>'+esc(c.descr||'')+'</small></p><p><small>售价 '+(c.sellprice||0)+' 金币</small></p><div>';
  if(f.slot){ h+='<button class="b" onclick="unequip('+f.slot+');closeModal();msg(\'OK:已卸下\')">卸下</button><button class="b" onclick="msg(enhance('+f.slot+'));itemTip(\''+uid+'\')">强化 ('+((cfg('equip_qianghua',s.ench)||{}).cost||'-')+'金 '+((cfg('equip_qianghua',s.ench)||{}).gailv||0)+'%)</button>'; }
  else { h+='<button class="b" onclick="closeModal();msg(useItem(\''+uid+'\'))">'+(c.type==2?'装备':'使用')+'</button><button class="b" onclick="sellItem(\''+uid+'\');closeModal();msg(\'OK:已出售\')">出售</button>'; }
  modal(h+'</div>');
}
function renderTop(){
  var r=G.role, a=calcAttr(), m=mapCfg();
  $('top').innerHTML='<div class="row" style="border:0"><span><img src="'+IMG+'role_create/icon_avatar_'+r.prof+'_0.png" style="width:24px;vertical-align:middle"> <b>'+esc(r.name)+'</b> Lv.'+r.level+' '+['','战士','法师','道士'][r.prof]+'</span><span>战力 '+combatPower(a)+'</span></div>'+
   '<div class="row" style="border:0"><span><img src="'+IMG+'basics/icon_coin.png" style="width:16px;vertical-align:middle"> '+r.gold+' <img src="'+IMG+'basics/icon_yb.png" style="width:16px;vertical-align:middle"> '+r.yuanbao+'</span><span>📍'+m.name+'</span></div>'+
   bar(r.hp,a.maxhp,'#d62f2f','HP')+bar(r.mp,a.maxmp,'#2E8DD6','MP')+bar(r.exp,expNeed(r.level),'#d9b53a','EXP');
}
function bar(v,max,col,l){ var p=Math.max(0,Math.min(100,v/max*100)); return '<div style="font-size:11px">'+l+' '+Math.floor(v)+'/'+max+'</div><div class="bar"><i style="width:'+p+'%;background:'+col+'"></i></div>'; }
var P={};
P.fight=function(){
  var m=mapCfg(), b=G.battle, h='';
  if(m.type!=2){
    h+='<div class="card"><b>'+m.name+'</b> (安全区)<p><small>'+esc(m.introduce||'')+'</small></p></div><div class="card"><b>NPC</b><br>';
    (m.monster||[]).forEach(function(nid){ var n=cfg('monster',nid); var rows=CFG.shop.list.filter(function(x){return x.id==nid && x.items;}); if(n) h+='<button class="b" onclick="openShop('+nid+')">'+n.name+(rows.length?'':'')+'</button>'; });
    h+='<p><small>前往"地图"页选择野外地图开始挂机战斗</small></p></div>';
  } else {
    h+='<div class="card"><b>'+m.name+'</b> <small>'+(m.level||'')+'</small><div class="mons">';
    b.mons.forEach(function(x){ h+='<div class="mon'+(x.dead?' dead':'')+'"><img src="'+IMG+'monster/'+x.cfg.model+'.png" onerror="this.src=\''+IMG+'monster/mdl_mst_1001.png\'"><div class="q'+x.q+'">'+(x.boss?'[BOSS]':'')+x.cfg.name+' Lv'+x.cfg.lvl+'</div><div class="hpb"><i style="width:'+(x.hp/x.maxhp*100)+'%"></i></div></div>'; });
    h+='</div></div>';
  }
  h+='<div id="log">'+G.logs.slice().reverse().join('<br>')+'</div>';
  h+='<div style="margin-top:6px"><label><input type="checkbox" '+(G.settings.autoDrug?'checked':'')+' onchange="G.settings.autoDrug=this.checked;save()"> 自动吃药</label></div>';
  return h;
};
function openShop(nid){
  var rows=CFG.shop.list.filter(function(x){return x.id==nid && x.items;}), n=cfg('monster',nid);
  var h='<b>'+n.name+'</b>'; if(!rows.length) h+='<p><small>该 NPC 暂无商品 (原版为铁匠/装备功能)</small></p>';
  rows.forEach(function(r,i){ var c=cfg('item',r.items); if(!c) return; h+='<div class="row"><span>'+r.name+' <small>'+Math.abs(r.price)+(r.currencytype==2?'元宝':'金币')+'</small></span><span><button class="b" onclick="msg(buy(CFG.shop.list.filter(function(x){return x.id=='+nid+'&&x.items;})['+i+'],1))">x1</button><button class="b" onclick="msg(buy(CFG.shop.list.filter(function(x){return x.id=='+nid+'&&x.items;})['+i+'],10))">x10</button></span></div>'; });
  modal(h);
}
P.map=function(){
  var m=mapCfg(), h='<div class="card"><b>当前: '+m.name+'</b> <small>'+(m.level||'')+'</small><p><small>'+esc(m.introduce||'')+'</small></p><div class="grid9">';
  m.jiugongge.forEach(function(id,i){ var t=id>1?cfg('map',id):null;
    if(i==4) h+='<div class="cur">'+m.name+'</div>'; else if(t) h+='<div class="go" onclick="enterMap('+id+');PAGE=\'fight\';render()">'+t.name+'<br><small>'+(t.level||'')+'</small></div>'; else h+='<div></div>'; });
  h+='</div></div><div class="card"><b>大地图传送</b> (map_info)<br>';
  CFG.map_info.list.forEach(function(x){ var ok=combatPower()>=x.limitpower; h+='<div class="row"><span>'+x.name+' <small>'+x.level+' 战力≥'+x.limitpower+'</small></span><button class="b" '+(ok?'':'disabled')+' onclick="enterMap('+x.mapid+');PAGE=\'fight\';render()">前往</button></div>'; });
  return h+'</div>';
};
P.role=function(){
  var r=G.role, a=calcAttr(), h='<div class="card"><div class="slots">';
  SLOT_ORDER.forEach(function(sl){ var s=r.equip[sl]; h+= s? icon(s) : '<div class="it" title="'+PARTS[sl]+'"><img src="'+IMG+'main/img_equip_'+({5:'weapon',10:'clothes',15:'helmet',20:'neckless',22:'ring',23:'ring',24:'bracelet',25:'bracelet',62:'shoes',64:'belt'})[sl]+'.png" style="opacity:.5"></div>'; });
  h+='</div></div><div class="card">';
  [['生命',a.maxhp],['魔法',a.maxmp],['攻击',a.atkmin+'-'+a.atkmax],['防御',a.minac+'-'+a.maxac],['攻速',a.atkspeed+'s'],['命中/闪避',a.hit+'/'+a.evade],['暴击',a.critical+'%'],['幸运',a.lucky],['战力',combatPower(a)]].forEach(function(x){ h+='<div class="row"><span>'+x[0]+'</span><span>'+x[1]+'</span></div>'; });
  return h+'</div><small>点击装备可卸下/强化</small>';
};
P.bag=function(){
  var r=G.role, h='<div class="card"><div class="row"><span>背包 '+r.bag.length+' 件</span><span><button class="b" onclick="sellWhite()">一键出售白/绿装</button></span></div><div class="items">';
  r.bag.slice().sort(function(x,y){ var a=stuffCfg(x),b=stuffCfg(y); return (b.type-a.type)||(y.q-x.q)||(a.id-b.id); }).forEach(function(s){ h+=icon(s); });
  return h+'</div></div><label>自动出售品质≤ <select onchange="G.settings.autoSell=+this.value;save()">'+[0,1,2,3].map(function(v){return '<option value="'+v+'" '+(G.settings.autoSell==v?'selected':'')+'>'+(v?QNAME[v]:'不出售')+'</option>';}).join('')+'</select> (极品除外)</label>';
};
function sellWhite(){ G.role.bag.slice().forEach(function(s){ if(isEquip(s)&&s.q<=2&&!s.nonsuch) sellItem(s.uid); }); msg('OK:已出售'); }
P.skill=function(){
  var r=G.role, p=profCfg(), h='<div class="card"><small>使用背包中的技能书学习/升级技能 (需等级与熟练度)</small></div>';
  (p.skillid||[]).forEach(function(base){ var st=r.skills[base], lv=st?st.lv:0, sc=skillRow(base, Math.max(1,lv)), nx=skillRow(base,lv+1); if(!sc) return;
    h+='<div class="card"><div class="row"><span><img src="'+IMG+'icon/'+(sc.icon||'')+'.png" style="width:36px;vertical-align:middle" onerror="this.style.display=\'none\'"> <b>'+sc.name+'</b> '+(lv?'Lv.'+lv:'<small>未学习</small>')+'</span><span>'+(lv?'熟练 '+(st.exp||0)+'/'+sc.exp:'')+'</span></div><small>'+esc(sc.describe||'')+(nx?'<br>下一级: 需要等级 '+nx.slevel+' 技能书 '+((cfg('item',(nx.booknum||[])[0])||{}).name||'')+' x'+((nx.booknum||[])[1]||1):'')+'</small></div>'; });
  return h;
};
P.task=function(){
  var h='', ts=currentTasks(); if(!ts.length) return '<div class="card">所有任务已完成</div>';
  ts.forEach(function(t){ var p=taskProgress(t); h+='<div class="card"><div class="row"><b>'+t.name+'</b><span>'+(p?Math.min(p[0],p[1])+'/'+p[1]:'<small>未实现</small>')+'</span></div><small>'+t.describe+' 奖励: '+((cfg('item',t.reward[0])||{}).name||'')+' x'+t.reward[1]+'</small><br><button class="b" '+(p&&p[0]>=p[1]?'':'disabled')+' onclick="msg(claimTask('+t.id+'))">领取</button></div>'; });
  return h;
};
P.sys=function(){ return '<div class="card"><p>存档保存在浏览器 localStorage, 每 5 秒自动保存。</p><button class="b" onclick="save();toast(\'已保存\')">立即保存</button> <button class="b" onclick="if(confirm(\'确定删除存档重新开始?\'))resetSave()">删除存档</button></div><div class="card"><small>传奇之旅文字传奇 · HTML/JS 复刻版<br>美术与配置表来自原 Cocos Creator 2.4 工程</small></div>'; };
function render(){
  if(!G.role) return;
  renderTop(); var pg=$('page'), keep=PAGE=='fight'?0:pg.scrollTop; pg.innerHTML=P[PAGE](); if(PAGE!='fight') pg.scrollTop=keep;
  [].forEach.call(document.querySelectorAll('#nav button'),function(b){ b.classList.toggle('on', b.dataset.p==PAGE); });
}
function renderLight(){ if(!G.role) return; renderTop(); if(PAGE=='fight') $('page').innerHTML=P.fight(); }
document.querySelectorAll('#nav button').forEach(function(b){ b.onclick=function(){ PAGE=b.dataset.p; render(); $('page').scrollTop=0; }; });
// 创建角色 (RoleCreate)
var selProf=1;
function showCreate(){
  $('nav').classList.add('hide'); $('top').innerHTML='<b>创建角色</b>';
  var names=CFG.randomname.list; function rn(){ var x=names[Math.floor(Math.random()*names.length)]||{}; return (x.surname&&x.man)? x.surname+x.man : ('勇士'+rnd(100,999)); }
  var h='<div class="prof">'; [1,2,3].forEach(function(p){ var c=CFG.profession.raw[PROF_KEY[p]]; h+='<div class="'+(p==selProf?'on':'')+'" onclick="selProf='+p+';showCreate()"><img src="'+IMG+'role_create/icon_normal_'+p+'.png"><b>'+c.name+'</b><br><small>'+c.tips+'</small></div>'; });
  h+='</div><div class="card" style="margin-top:8px"><small>'+esc(CFG.profession.raw[PROF_KEY[selProf]].describe||'')+'</small></div><div class="card">名字: <input id="nm" value="'+rn()+'" style="width:60%"> <button class="b" onclick="document.getElementById(\'nm\').value=\''+rn()+'\'">随机</button></div><button class="b" style="width:100%;padding:10px" onclick="doCreate()">进入游戏</button>';
  $('page').innerHTML=h;
}
function doCreate(){ var n=$('nm').value.trim()||'勇士'; newRole(n, selProf); $('nav').classList.remove('hide'); log('欢迎来到传奇之旅, '+esc(n)+'! 背包中有新手礼包。'); enterMap(G.role.mapId); render(); save(); }
loadConfigs().then(function(){
  if(load()){ var off=offlineReward(); enterMap(G.role.mapId); if(off) modal('<b>离线收益</b><p>离线 '+Math.floor(off.sec/60)+' 分钟<br>经验 +'+off.exp+'<br>金币 +'+off.gold+'</p>'); render(); }
  else showCreate();
  var last=performance.now(), lastSave=0;
  setInterval(function(){ if(!G.role||$('nav').classList.contains('hide')) return; var now=performance.now(), dt=(now-last)/1000; last=now; tick(Math.min(dt,2)); renderLight(); if(now-lastSave>5000){ lastSave=now; save(); } }, 250);
}).catch(function(e){ document.body.innerHTML='加载配置失败: '+e; });
