// [roles UI] RoleList：多角色选择 / 创建 / 删除；接入 loading 后流程
(function(){
  if(!window.Systems || !Systems.roles) return;
  var R = Systems.roles;
  var PROF_N = {1:'战士',2:'法师',3:'道士'};

  function clearMain(){
    if(UI.create){ try{ UI.create.destroy(); }catch(e){} UI.create = null; }
    if(UI.roleList){ try{ UI.roleList.destroy(); }catch(e){} UI.roleList = null; }
    if(UI.main){ try{ UI.main.destroy(); }catch(e){} UI.main = null; }
  }

  function showRoleList(enterGame, showCreateFn){
    clearMain();
    R.migrate();
    var p;
    try{ p = inst('role_list'); }catch(e){ p = null; }
    if(!p){
      // 无 prefab 时用简易 HTML
      return showRoleListHtml(enterGame, showCreateFn);
    }
    CC.mount(p, UI.layerMain); UI.roleList = p;
    if(Systems.audio) Systems.audio.playBgm('music_sellect');

    function refresh(){
      var slots = R.list();
      var sel = R.selectId();
      if(sel < 0){
        for(var i=0;i<slots.length;i++) if(!slots[i].empty){ sel = i; break; }
      }
      var info = p.findDeep('playerIndo') || p.findDeep('playerInfo');
      var labName = p.findDeep('lab_name') || p.ref('labName');
      var labLevel = p.findDeep('lab_level') || p.ref('labLevel');
      var txtProf = p.findDeep('txt_profession') || p.ref('txtProfession');
      var cur = slots[sel];
      if(cur && !cur.empty){
        if(info) info.setActive(true);
        if(labName) labName.setString(cur.meta.name);
        if(labLevel) labLevel.setString(cur.meta.level + '级');
        if(txtProf){
          try{ txtProf.setImage(IMG + 'role_create/txt_profession_' + cur.meta.prof + '.png'); }catch(e){}
        }
      } else if(info) info.setActive(false);

      // avatar 槽：avatarNode 下或 itemNode
      var itemNode = p.ref('itemNode') || p.findDeep('itemNode');
      if(itemNode){
        // 清空后按 3 槽重建简易头像按钮
        while(itemNode.children && itemNode.children.length) itemNode.children[itemNode.children.length-1].destroy();
        slots.forEach(function(sl, i){
          var n = document.createElement('div');
          n.style.cssText = 'display:inline-block;width:140px;margin:8px;padding:8px;text-align:center;border:2px solid '+(i===sel?'#ffd76a':'#5a4a30')+';border-radius:8px;cursor:pointer;background:rgba(0,0,0,.35);color:#e8dcc8;vertical-align:top;';
          if(sl.empty){
            n.innerHTML = '<div style="font-size:48px;line-height:80px;">+</div><div>创建角色</div>';
            n.onclick = function(){ if(R.count() >= R.MAX){ toast('最多 '+R.MAX+' 个角色'); return; } p.destroy(); UI.roleList=null; showCreateFn(); };
          } else {
            n.innerHTML = '<img src="'+IMG+'role_create/icon_avatar_'+sl.meta.prof+'_'+(i===sel?1:0)+'.png" style="width:96px;height:96px;object-fit:contain;"><div>'+esc(sl.meta.name)+'</div><div style="font-size:16px;opacity:.8;">'+sl.meta.level+'级 '+PROF_N[sl.meta.prof]+'</div>';
            n.onclick = function(){
              // 选中高亮；长按不实现，用右下删除钮
              R.loadSlot(i); refresh();
            };
            n.oncontextmenu = function(ev){ ev.preventDefault(); if(confirm('删除角色「'+sl.meta.name+'」？')){ R.deleteSlot(i); refresh(); } };
          }
          itemNode.el.appendChild(n);
        });
      }
      // 删除当前
      var delHost = p.findDeep('img_back');
      // btnStart
      var btn = p.ref('btnStart') || p.findDeep('btnStart');
      if(btn) btn.on(function(){
        if(R.selectId() < 0 || !G.role){ toast('请选择角色'); if(Systems.audio) Systems.audio.playSfx('ui_click'); return; }
        if(Systems.audio){ Systems.audio.playSfx('game_start'); Systems.audio.stopBgm(); }
        p.destroy(); UI.roleList = null;
        enterGame();
      });
      // 返回/删除：img_back → 删除当前选中
      if(delHost && !delHost._rolesBound){
        delHost._rolesBound = 1;
        delHost.on(function(){
          var id = R.selectId();
          if(id < 0){ toast('无角色可删'); return; }
          var m = R.list()[id];
          if(!m || m.empty) return;
          if(confirm('删除角色「'+m.meta.name+'」？不可恢复')){ R.deleteSlot(id); if(R.count()===0){ p.destroy(); UI.roleList=null; showCreateFn(); } else refresh(); }
        });
      }
    }
    refresh();
  }

  function showRoleListHtml(enterGame, showCreateFn){
    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;background:#1a1410;color:#e8dcc8;z-index:20;padding:40px 24px;text-align:center;overflow:auto;';
    box.innerHTML = '<h2 style="color:#ffd76a;">选择角色</h2><div id="rl_slots"></div><div style="margin-top:24px;"><button id="rl_start" style="padding:10px 28px;font-size:22px;">进入游戏</button></div>';
    UI.layerMain.appendChild(box); UI.roleList = { el: box, destroy: function(){ if(box.parentNode) box.parentNode.removeChild(box); } };
    function paint(){
      var host = box.querySelector('#rl_slots'); host.innerHTML = '';
      R.list().forEach(function(sl, i){
        var d = document.createElement('div');
        d.style.cssText = 'display:inline-block;width:160px;margin:10px;padding:12px;border:2px solid '+(i===R.selectId()?'#ffd76a':'#5a4a30')+';border-radius:8px;cursor:pointer;';
        if(sl.empty){ d.innerHTML = '<div style="font-size:40px;">+</div>创建角色'; d.onclick = function(){ UI.roleList.destroy(); UI.roleList=null; showCreateFn(); }; }
        else {
          d.innerHTML = '<div><b>'+esc(sl.meta.name)+'</b></div><div>'+sl.meta.level+'级 '+PROF_N[sl.meta.prof]+'</div><div style="font-size:14px;margin-top:6px;opacity:.7;">右键删除</div>';
          d.onclick = function(){ R.loadSlot(i); paint(); };
          d.oncontextmenu = function(ev){ ev.preventDefault(); if(confirm('删除？')){ R.deleteSlot(i); paint(); } };
        }
        host.appendChild(d);
      });
    }
    paint();
    box.querySelector('#rl_start').onclick = function(){
      if(!G.role){ toast('请选择角色'); return; }
      UI.roleList.destroy(); UI.roleList=null; enterGame();
    };
  }

  // boot 钩子：loading 点开始后走角色列表
  window._rolesBoot = function(enterGame, showCreateFn){
    R.migrate();
    // seed/autostart 已有角色则直接进
    var q = {};
    try{ location.search.slice(1).split('&').forEach(function(kv){ var a=kv.split('='); if(a[0]) q[a[0]]=decodeURIComponent(a[1]||'1'); }); }catch(e){}
    if(q.seed || q.autostart){
      if(!G.role) load();
      if(G.role){ enterGame(); return; }
    }
    if(R.count() === 0){
      if(Systems.audio) Systems.audio.playBgm('music_create');
      showCreateFn();
      return;
    }
    showRoleList(enterGame, showCreateFn);
  };

  // 创建完成后登记（showCreate 原逻辑已 newRole+save+startMain；若经角色列表创建则 startMain 即可）
  var _showCreate = typeof showCreate === 'function' ? showCreate : null;
  if(_showCreate){
    // 不替换 showCreate；创建确认后已 startMain。若从列表进入创建，需要在确认时不要重复列表。
  }
})();
