// [settings UI] 原版 role_setup（回收/回复/音效）完整接线 + 挂机/技能/游戏增补面板
// 入口: 战斗页 btnSetup、背包「分」、?settings=recycle|afk|skill|game
(function(){
  if(!window.Systems || !Systems.settings) return;
  var ST = Systems.settings;
  function cloneNode(n, parent){ return new CC.Node(JSON.parse(JSON.stringify(n.d)), parent); }
  function el(tag, css, html){ var d=document.createElement(tag); if(css) d.style.cssText=css; if(html!=null) d.innerHTML=html; return d; }

  // ---------- tipSetup：选药品 ----------
  function tipChooseDrug(kind){
    var ids = kind==='life'?ST.LIFE_IDS: kind==='magic'?ST.MAGIC_IDS: ST.SPECIAL_IDS;
    var p = popup('tipSetup');
    closeBtn(p, p.findDeep('btnClose') || p.findDeep('img_close'));
    var list = p.ref('itemlist'), tpl = p.ref('item');
    if(!list || !tpl){ toast('药品选择面板缺失'); return; }
    // 清空
    while(list.children.length) list.children[list.children.length-1].destroy();
    tpl.setActive(false);
    ids.forEach(function(id){
      var c = cfg('item', id); if(!c) return;
      var n = cloneNode(tpl, list); n.setActive(true); n.name = ''+id;
      var qbg = n.find('qualitybg'); if(qbg) qbg.setImage(IMG+'battle/img_quality_item_'+(c.quality||1)+'.png');
      var ic = n.find('icon'); if(ic && c.icon) ic.setImage(IMG+'icon/'+c.icon+'.png');
      var ln = n.find('labname'); if(ln) ln.setString(c.name);
      var lc = n.find('labCnt'); if(lc) lc.setString('x'+countItem(id));
      n.on(function(){
        var res = ST.setDrugId(kind, id);
        if(res && res.indexOf('OK')!==0 && res!=='OK:'){ toast(res); return; }
        save(); closePopup(p); if(window._settingsRefresh) _settingsRefresh();
        toast('已选择 '+c.name);
      });
    });
    list.layout && list.layout();
  }

  // ---------- 原版 role_setup 全量接线 ----------
  function bindRoleSetup(p){
    ST.ensure();
    var st = ST.get();
    function ck(node, on){ var cm = node && node.find('checkmark'); if(cm) cm.setActive(!!on); }
    function bindToggle(ref, get, set){
      var t = p.ref(ref); if(!t) return;
      ck(t, get());
      t.on(function(){ var v=!get(); set(v); ck(t, get()); ST.applyLegacyMirrors(); });
    }
    // 回收
    bindToggle('noProfession', function(){ return st.recycle.noProfession; }, function(v){ st.recycle.noProfession=v; });
    bindToggle('eNonsuch', function(){ return st.recycle.nonsuch; }, function(v){ st.recycle.nonsuch=v; });
    bindToggle('eWhite', function(){ return st.recycle.white; }, function(v){ st.recycle.white=v; });
    bindToggle('eGreen', function(){ return st.recycle.green; }, function(v){ st.recycle.green=v; });
    bindToggle('eBule', function(){ return st.recycle.blue; }, function(v){ st.recycle.blue=v; });
    bindToggle('ePurple', function(){ return st.recycle.purple; }, function(v){ st.recycle.purple=v; });
    // 原版文案「自动回收」= 击杀掉落换金币；保留勾选标签，脚注说明与手动分解区别
    ['noProfession','eNonsuch','eWhite','eGreen','eBule','ePurple'].forEach(function(ref){
      var t=p.ref(ref); if(!t) return;
      t.children.forEach(function(ch){
        if(ch.lb && /自动分解/.test(ch.el.textContent)) ch.setString(ch.el.textContent.replace(/自动分解/g,'自动回收'));
      });
    });
    var note = p.findDeep('img_bg1') && p.findDeep('img_bg1').find('label');
    var rate = (Systems.prerogative && Systems.prerogative.recycleRate) ? Systems.prerogative.recycleRate() : 0.5;
    var rateTxt = Math.round(rate*100)+'%'+(rate>=1?'(特权满额)':'（默认；回收特权可满额）');
    if(note) note.setString('※自动回收→金币 '+rateTxt+'；手动「分解」→精华(5=1洗练石)；锁/套装/暗金默认保留  精华 '+(G.role.essence||0));

    function refreshDrugRow(kind, revertRef, nameRef, pctRef){
      var d = st.drug[kind];
      var t = p.ref(revertRef); ck(t, d.on);
      var nm = p.ref(nameRef); if(nm) nm.setString(ST.drugName(kind)+'x'+ST.drugCount(kind));
      var pc = p.ref(pctRef); if(pc) pc.setString(d.pct+'%');
      // 百分比 +/- 与选药挂在 toggle 子节点上
      if(t){
        var add = t.find('btn_add'), lose = t.find('btn_lose'), choose = t.find('btn_choose');
        if(add && !add._bound){ add._bound=1; add.on(function(){ ST.adjustPct(kind, 5); refreshDrugRow(kind, revertRef, nameRef, pctRef); }); }
        if(lose && !lose._bound){ lose._bound=1; lose.on(function(){ ST.adjustPct(kind, -5); refreshDrugRow(kind, revertRef, nameRef, pctRef); }); }
        if(choose && !choose._bound){ choose._bound=1; choose.on(function(){ tipChooseDrug(kind); }); }
      }
    }
    bindToggle('lifeRevert', function(){ return st.drug.life.on; }, function(v){ st.drug.life.on=v; });
    bindToggle('magicRevert', function(){ return st.drug.magic.on; }, function(v){ st.drug.magic.on=v; });
    bindToggle('specialRevert', function(){ return st.drug.special.on; }, function(v){ st.drug.special.on=v; });
    refreshDrugRow('life','lifeRevert','lifeName','lifePrecent');
    refreshDrugRow('magic','magicRevert','magicName','magicPrecent');
    refreshDrugRow('special','specialRevert','specialName','specialPrecent');

    bindToggle('soundSwitch', function(){ return !!st.sound; }, function(v){ st.sound=v; if(Systems.audio) Systems.audio.setEnabled(v); });

    closeBtn(p, p.ref('btnClose'));
    var bs = p.findDeep('btnSave');
    if(bs){
      bs.on(function(){ ST.applyLegacyMirrors(); save(); closePopup(p); msg('OK:设置已保存'); });
      if(!p._salvAll){
        var all = cloneNode(bs, bs.parent); all.x = bs.x + 220; all.place(); all.find('label').setString('一键分解');
        all.on(function(){ ST.applyLegacyMirrors(); save(); closePopup(p); msg(Systems.loot.salvageAll()); });
        bs.x -= 120; bs.place(); all.x = bs.x + 240; all.place(); p._salvAll = all;
      }
    }
    window._settingsRefresh = function(){ refreshDrugRow('life','lifeRevert','lifeName','lifePrecent'); refreshDrugRow('magic','magicRevert','magicName','magicPrecent'); refreshDrugRow('special','specialRevert','specialName','specialPrecent'); };
  }

  // ---------- 增补面板：挂机 / 技能 / 游戏（HTML 覆盖在 tip 风格底板上）----------
  var PANEL_CSS = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:640px;max-height:980px;overflow:auto;background:rgba(20,16,12,.94);border:2px solid #8a7040;border-radius:8px;padding:16px 18px 20px;color:#e8dcc8;z-index:40;font-size:22px;box-sizing:border-box;';
  var ROW = 'display:flex;align-items:center;justify-content:space-between;padding:10px 6px;border-bottom:1px solid #3a3228;';
  var BTN = 'background:linear-gradient(#5a4a30,#3a3020);border:1px solid #a08040;color:#ffd76a;border-radius:4px;padding:6px 14px;font-size:20px;cursor:pointer;';
  var TAB = 'display:inline-block;padding:8px 16px;margin:0 4px 12px 0;border:1px solid #6a5a40;border-radius:4px;cursor:pointer;color:#c8b898;';
  var TAB_ON = TAB + 'background:#4a3a20;color:#ffd76a;border-color:#c0a050;';

  function toggleRow(label, get, set){
    var row = el('div', ROW);
    row.appendChild(el('span', '', label));
    var box = el('span', 'width:36px;height:36px;border:2px solid #a08040;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;background:#2a2218;font-size:22px;color:#ffd76a;');
    function paint(){ box.textContent = get() ? '✓' : ''; }
    paint();
    box.onclick = function(){ set(!get()); paint(); ST.applyLegacyMirrors(); };
    row.appendChild(box);
    return row;
  }

  function openExtra(tab){
    ST.ensure();
    var st = ST.get();
    // 遮罩
    var mask = el('div', 'position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:39;');
    var box = el('div', PANEL_CSS);
    var stage = (UI.stage && UI.stage.el) || document.getElementById('stage');
    stage.appendChild(mask); stage.appendChild(box);
    function close(){ mask.remove(); box.remove(); }

    var tabs = el('div', 'text-align:center;');
    ['recycle','afk','skill','game'].forEach(function(k){
      var names={recycle:'回收/药品',afk:'挂机',skill:'技能',game:'游戏'};
      var b=el('span', (tab===k?TAB_ON:TAB), names[k]);
      b.onclick=function(){ close(); if(k==='recycle') openSettings('recycle'); else openExtra(k); };
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    box.appendChild(el('div', 'text-align:center;color:#ffd76a;font-size:28px;margin-bottom:8px;', {afk:'挂机设置',skill:'技能设置',game:'游戏设置'}[tab]));

    var body = el('div', '');
    box.appendChild(body);

    if(tab==='afk'){
      body.appendChild(toggleRow('自动战斗', function(){return st.afk.autoCombat;}, function(v){st.afk.autoCombat=v;}));
      body.appendChild(toggleRow('自动技能', function(){return st.afk.autoSkill;}, function(v){st.afk.autoSkill=v;}));
      body.appendChild(toggleRow('自动走位', function(){return st.afk.autoMove;}, function(v){st.afk.autoMove=v;}));
      body.appendChild(toggleRow('自动分解拾取装备', function(){return st.afk.autoPick;}, function(v){st.afk.autoPick=v;}));
      body.appendChild(toggleRow('背包满时停止挂机', function(){return st.afk.stopBagFull;}, function(v){st.afk.stopBagFull=v;}));
      body.appendChild(el('div', 'padding:12px 6px;color:#a89878;font-size:18px;', '自动分解品质阈值在「回收/药品」页设置（对应原版 role_setup）。'));
    } else if(tab==='skill'){
      var learned = Object.keys(G.role.skills||{});
      if(!learned.length) body.appendChild(el('div', 'padding:20px;color:#a89878;', '尚未学习主动技能'));
      learned.forEach(function(b){
        var base=+b, sc=null;
        try{ sc = skillRow(base, G.role.skills[b].lv); }catch(e){}
        if(!sc || sc.triggertype!==1) return; // 只列主动攻击技能
        body.appendChild(toggleRow((sc.name||('技能'+base))+' 自动施放', function(){return ST.skillEnabled(base);}, function(v){ ST.setSkillEnabled(base, v); }));
      });
      // 英雄自动合击复用
      if(Systems.hero && Systems.hero.has && Systems.hero.has()){
        body.appendChild(el('div', 'margin-top:12px;color:#ffd76a;', '英雄'));
        var hi = Systems.hero.info && Systems.hero.info();
        body.appendChild(toggleRow('自动合击', function(){ return !!(hi && hi.auto); }, function(v){ if(Systems.hero.setAuto) Systems.hero.setAuto(v); }));
      }
    } else if(tab==='game'){
      body.appendChild(toggleRow('游戏音效', function(){return !!st.sound;}, function(v){st.sound=v; if(Systems.audio) Systems.audio.setEnabled(v);}));
      body.appendChild(toggleRow('伤害数字', function(){return st.game.dmgNumbers!==false;}, function(v){st.game.dmgNumbers=v;}));
      body.appendChild(toggleRow('屏幕震动', function(){return st.game.screenShake!==false;}, function(v){st.game.screenShake=v;}));
      body.appendChild(toggleRow('高特效质量', function(){return st.game.fxQuality!==0;}, function(v){st.game.fxQuality=v?1:0;}));
    }

    var foot = el('div', 'text-align:center;margin-top:16px;');
    var saveBtn = el('button', BTN, '保存'); saveBtn.onclick=function(){ ST.applyLegacyMirrors(); save(); close(); toast('设置已保存'); };
    var closeBtn2 = el('button', BTN+'margin-left:16px;', '关闭'); closeBtn2.onclick=close;
    foot.appendChild(saveBtn); foot.appendChild(closeBtn2); box.appendChild(foot);
  }

  // ---------- 总入口 ----------
  window.openSettings = function(tab){
    tab = tab || 'recycle';
    if(tab==='recycle' || tab==='drug' || tab==='sound'){
      var p = popup('role_setup');
      // 顶栏快捷切到增补页
      try {
        var bar = el('div', 'position:absolute;left:50%;top:8%;transform:translateX(-50%);z-index:5;white-space:nowrap;');
        [['recycle','回收/药品'],['afk','挂机'],['skill','技能'],['game','游戏']].forEach(function(pair){
          var b=el('span', (pair[0]==='recycle'?TAB_ON:TAB)+'font-size:18px;padding:6px 10px;', pair[1]);
          b.onclick=function(){ closePopup(p); if(pair[0]==='recycle') openSettings('recycle'); else openExtra(pair[0]); };
          bar.appendChild(b);
        });
        p.el.style.position = p.el.style.position || 'relative';
        p.el.appendChild(bar);
      } catch(e){}
      bindRoleSetup(p);
      return p;
    }
    openExtra(tab);
  };

  // 兼容旧入口
  window.tipSalvage = function(){ openSettings('recycle'); };

  // 战斗设置钮
  function hookBtnSetup(){
    if(!UI.fight) return false;
    var btn = UI.fight.ref('btnSetup'); if(!btn) return false;
    btn.on(function(){ openSettings('recycle'); });
    return true;
  }
  var tries=0; (function wait(){ if(hookBtnSetup()) return; if(tries++<60) setTimeout(wait,200); })();

  // 开发截图入口
  var q = /[?&]settings=(\w+)/.exec(location.search);
  if(q) var iv=setInterval(function(){
    if(!G.role || !UI.main) return; clearInterval(iv);
    openSettings(q[1]);
  }, 200);
})();
