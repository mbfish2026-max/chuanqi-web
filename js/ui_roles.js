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

    // S3/G7: 游戏内确认弹窗（替代 confirm()，iPhone 可用）
    function askConfirm(text, onYes){
      var host = UI.layerTop || p.el; var old = host.querySelector('.rl-confirm'); if(old) old.remove();
      var m = document.createElement('div');
      m.className = 'rl-confirm';
      m.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;z-index:50;pointer-events:auto;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;';
      m.innerHTML = '<div style="width:520px;padding:36px 28px 28px;background:#2a1f15;border:3px solid #a8844a;border-radius:14px;color:#e8dcc8;text-align:center;font-size:28px;line-height:42px;box-shadow:0 0 30px #000;">'+
        '<div class="rl-ctext" style="margin-bottom:32px;"></div>'+
        '<div style="display:flex;justify-content:space-around;">'+
        '<div class="rl-no" style="width:190px;height:72px;line-height:72px;border-radius:10px;background:#5a4a30;color:#eee;cursor:pointer;font-size:28px;">取消</div>'+
        '<div class="rl-yes" style="width:190px;height:72px;line-height:72px;border-radius:10px;background:#b2361f;color:#fff;cursor:pointer;font-size:28px;">确认删除</div></div></div>';
      m.querySelector('.rl-ctext').textContent = text;
      m.querySelector('.rl-no').onclick = function(ev){ ev.stopPropagation(); m.remove(); };
      m.querySelector('.rl-yes').onclick = function(ev){ ev.stopPropagation(); m.remove(); onYes(); };
      m.onclick = function(ev){ if(ev.target === m) m.remove(); };
      host.appendChild(m);
      return m;
    }
    function doDelete(i){
      var m = R.list()[i]; if(!m || m.empty) return;
      askConfirm('删除角色「'+m.meta.name+'」（'+m.meta.level+'级）？删除后不可恢复', function(){
        R.deleteSlot(i);
        if(R.count()===0){ p.destroy(); UI.roleList=null; showCreateFn(); } else refresh();
      });
    }
    UI._rolesConfirm = askConfirm; // 调试/截图用

    function refresh(){
      var slots = R.list();
      var sel = R.selectId();
      if(sel < 0 || !slots[sel] || slots[sel].empty){
        sel = -1;
        for(var i=0;i<slots.length;i++) if(!slots[i].empty){ sel = i; break; }
      }
      // S3: 默认选中的角色直接载入，点一次「进入游戏」即可进入
      if(sel >= 0 && (!G.role || R.selectId() !== sel)) R.loadSlot(sel);
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

      // S3: 卡片横向一排（设计坐标 750 宽），位于火盆下方、信息框(名称 y=-139 起)上方，互不重叠
      var itemNode = p.ref('itemNode') || p.findDeep('itemNode');
      if(itemNode){
        while(itemNode.children && itemNode.children.length) itemNode.children[itemNode.children.length-1].destroy();
        var oldRow = itemNode.el.querySelector('.rl-row'); if(oldRow) oldRow.remove();
        var row = document.createElement('div');
        row.className = 'rl-row';
        // itemNode 在舞台中心 (0,0)；行宽 690，高 290，底边距中心 +80（信息框顶在中心下方 116）
        row.style.cssText = 'position:absolute;left:-345px;top:-210px;width:690px;height:290px;display:flex;flex-direction:row;justify-content:center;align-items:stretch;gap:18px;box-sizing:border-box;';
        slots.forEach(function(sl, i){
          var n = document.createElement('div');
          n.className = 'rl-card';
          n.style.cssText = 'position:relative;flex:0 0 210px;width:210px;box-sizing:border-box;padding:10px 6px;text-align:center;border:3px solid '+(i===sel?'#ffd76a':'#5a4a30')+';border-radius:12px;cursor:pointer;background:rgba(0,0,0,'+(i===sel?'.55':'.35')+');color:#e8dcc8;font-size:22px;line-height:30px;overflow:hidden;';
          if(sl.empty){
            n.innerHTML = '<div style="font-size:72px;line-height:170px;color:#c9b48a;">+</div><div>创建角色</div>';
            n.onclick = function(){ if(R.count() >= R.MAX){ toast('最多 '+R.MAX+' 个角色'); return; } p.destroy(); UI.roleList=null; showCreateFn(); };
          } else {
            n.innerHTML = '<img src="'+IMG+'role_create/icon_avatar_'+sl.meta.prof+'_'+(i===sel?1:0)+'.png" style="width:110px;height:110px;object-fit:contain;display:block;margin:0 auto;">'+
              '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:'+(i===sel?'#ffd76a':'#e8dcc8')+';">'+esc(sl.meta.name)+'</div>'+
              '<div style="font-size:20px;opacity:.85;">'+sl.meta.level+'级 '+PROF_N[sl.meta.prof]+'</div>';
            var del = document.createElement('div');
            del.className = 'rl-del';
            del.textContent = '删除';
            del.style.cssText = 'margin:8px auto 0;width:120px;height:46px;line-height:46px;border-radius:8px;background:#7a2a1a;border:2px solid #c0573e;color:#fff;font-size:22px;';
            del.onclick = function(ev){ ev.stopPropagation(); doDelete(i); };
            n.appendChild(del);
            n.onclick = function(){ R.loadSlot(i); refresh(); };
          }
          row.appendChild(n);
        });
        itemNode.el.appendChild(row);
      }
    }

    // btnStart（只绑一次）
    var btn = p.ref('btnStart') || p.findDeep('btnStart');
    if(btn) btn.on(function(){
      if(R.selectId() < 0 || !G.role){ toast('请选择角色'); if(Systems.audio) Systems.audio.playSfx('ui_click'); return; }
      if(Systems.audio){ Systems.audio.playSfx('game_start'); Systems.audio.stopBgm(); }
      p.destroy(); UI.roleList = null;
      enterGame();
    });
    // G7: img_back 恢复为「返回」—— 回到登录/加载页
    var back = p.ref('btnBack') || p.findDeep('img_back');
    if(back) back.on(function(){
      if(Systems.audio){ try{ Systems.audio.playSfx('ui_click'); Systems.audio.stopBgm(); }catch(e){} }
      location.reload();
    });
    refresh();
  }

  function showRoleListHtml(enterGame, showCreateFn){
    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;background:#1a1410;color:#e8dcc8;z-index:20;padding:40px 24px;text-align:center;overflow:auto;';
    box.innerHTML = '<h2 style="color:#ffd76a;">选择角色</h2><div id="rl_slots"></div><div style="margin-top:24px;"><button id="rl_start" style="padding:10px 28px;font-size:22px;">进入游戏</button></div>';
    if(!G.role && R.selectId() >= 0) R.loadSlot(R.selectId());
    UI.layerMain.appendChild(box); UI.roleList = { el: box, destroy: function(){ if(box.parentNode) box.parentNode.removeChild(box); } };
    function askHtml(text, yes){
      var m=document.createElement('div'); m.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:30;';
      m.innerHTML='<div style="background:#2a1f15;border:2px solid #a8844a;border-radius:10px;padding:20px;max-width:80%;"><div class="t" style="margin-bottom:16px;"></div><button class="n" style="padding:8px 20px;margin:0 10px;">取消</button><button class="y" style="padding:8px 20px;margin:0 10px;">确认删除</button></div>';
      m.querySelector('.t').textContent=text; m.querySelector('.n').onclick=function(){ m.remove(); }; m.querySelector('.y').onclick=function(){ m.remove(); yes(); };
      box.appendChild(m);
    }
    function paint(){
      var host = box.querySelector('#rl_slots'); host.innerHTML = '';
      R.list().forEach(function(sl, i){
        var d = document.createElement('div');
        d.style.cssText = 'display:inline-block;width:160px;margin:10px;padding:12px;border:2px solid '+(i===R.selectId()?'#ffd76a':'#5a4a30')+';border-radius:8px;cursor:pointer;';
        if(sl.empty){ d.innerHTML = '<div style="font-size:40px;">+</div>创建角色'; d.onclick = function(){ UI.roleList.destroy(); UI.roleList=null; showCreateFn(); }; }
        else {
          d.innerHTML = '<div><b>'+esc(sl.meta.name)+'</b></div><div>'+sl.meta.level+'级 '+PROF_N[sl.meta.prof]+'</div>';
          var del = document.createElement('button'); del.textContent='删除'; del.style.cssText='margin-top:8px;padding:6px 18px;font-size:16px;';
          del.onclick = function(ev){ ev.stopPropagation(); askHtml('删除角色「'+sl.meta.name+'」？不可恢复', function(){ R.deleteSlot(i); paint(); }); };
          d.appendChild(del);
          d.onclick = function(){ R.loadSlot(i); paint(); };
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
