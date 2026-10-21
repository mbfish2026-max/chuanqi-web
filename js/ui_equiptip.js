// [equiptip] 发现更好装备提醒 (传奇手游风格「发现更好装备」+ 一键穿戴) + 好装备掉落顶部横幅
// 原版无对应 prefab (grep 更好/穿戴/equipTip 仅 guide「点击穿戴装备」)，按 tipToast/tip 底板风格用 DOM 实现。
// 规则: 新入包装备 (掉落/购买/奖励, 走 addItem) 且 职业/等级可穿 且 Systems.loot.compare 战力 delta>0 → 入队;
//   同部位只保留战力提升最大的一件; 击杀批次/自动回收期间只入队不弹, 600ms 防抖后逐个显示; 显示前重新校验。
//   设置: role.settings.game.equipTip (默认开)。点空白处关闭 = 跳过当前件。
(function(){
  var Q = [], showing = null, timer = null;
  function on(){ var st = Systems.settings && Systems.settings.get(); return !st || !st.game || st.game.equipTip !== false; }
  function wearable(s){ var r = G.role, c = stuffCfg(s); if(!r || !c || c.type != 2) return false;
    if((c.needlevel||0) > r.level) return false; if(c.profession && c.profession != r.prof) return false;
    return [5,10,15,20,22,23,24,25,62,64].indexOf(c.stdmode) >= 0; }
  function gain(s){ if(!G.role.bag.some(function(x){ return x.uid == s.uid; })) return null;
    var cp = Systems.loot && Systems.loot.compare(s.uid); return cp && cp.power.delta > 0 ? cp : null; }
  function check(s){ if(!s || !G.role || !on() || !wearable(s)) return;
    var cp = gain(s); if(!cp) return; var sm = stuffCfg(s).stdmode;
    for(var i = 0; i < Q.length; i++){ var o = Q[i]; if(o.uid == s.uid) return;
      if(o.sm == sm){ if(o.delta >= cp.power.delta) return; Q.splice(i, 1); break; } }
    Q.push({uid: s.uid, sm: sm, delta: cp.power.delta}); schedule(); }
  function schedule(){ clearTimeout(timer); timer = setTimeout(next, 600); }
  // [S1] 全屏层队列: 系统弹窗 (离线/死亡) 或新手引导显示期间只缓存, 不弹
  // [N1] 任何弹窗/浮层 (任务面板、商店、设置增补面板等都在 UI.popups) 或不在战斗页时也只缓存, 回到战斗页且无浮层再显示
  function busy(){ return (UI.popups && UI.popups.length) || UI.pageKey !== 'fight' || (window._guideActive && window._guideActive()); }
  function next(){ if(showing || !Q.length || !UI.layerTop) return;
    if(busy()) return schedule();
    if(Systems.loot && Systems.loot._batch) return schedule();
    var it = Q.shift(), s = G.role.bag.filter(function(x){ return x.uid == it.uid; })[0];
    var cp = s && on() && wearable(s) && gain(s); if(!cp) return next();
    show(s, cp, it); }
  function el(t, css, html){ var e = document.createElement(t); if(css) e.style.cssText = css; if(html != null) e.innerHTML = html; return e; }
  function show(s, cp, it){ var c = stuffCfg(s), col = typeof stuffColor == 'function' ? stuffColor(s) : '#fff';
    var box = el('div', 'position:absolute;left:50%;bottom:250px;transform:translateX(-50%);z-index:60;pointer-events:auto;width:520px;max-width:92%;box-sizing:border-box;background:rgba(24,18,12,.95);border:2px solid #a08040;border-radius:8px;padding:14px 16px;color:#e8dcc8;font-size:22px;box-shadow:0 0 18px rgba(0,0,0,.7);');
    box.className = 'equip-tip';
    var lab = Systems.loot.label ? Systems.loot.label(s) : '';
    box.appendChild(el('div', 'color:#ffd76a;font-size:24px;margin-bottom:6px;', '发现更好装备'));
    box.appendChild(el('div', 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;', '<span style="color:'+col+'">['+esc(lab)+']'+esc(c.name)+'</span> <span style="color:#32C63D">战力 +'+cp.power.delta+'</span>'));
    var row = el('div', 'display:flex;flex-wrap:nowrap;justify-content:center;gap:16px;margin-top:12px;white-space:nowrap;');
    var B = 'flex:0 0 auto;white-space:nowrap;background:linear-gradient(#5a4a30,#3a3020);border:1px solid #a08040;color:#ffd76a;border-radius:4px;padding:8px 22px;font-size:22px;cursor:pointer;';
    var bOk = el('button', B, '一键穿戴'), bNo = el('button', B + 'color:#c8b898;', '关闭');
    row.appendChild(bOk); row.appendChild(bNo); box.appendChild(row);
    // [N1] 不再加全屏透明遮罩: 只有卡片本身接收点击, 其余区域点击照常穿透到界面; 8 秒无操作自动收起
    UI.layerTop.appendChild(box); showing = box; box._item = it;
    var auto = setTimeout(done, 8000);
    function done(){ clearTimeout(auto); if(showing !== box) return; box.remove(); showing = null; setTimeout(next, 200); }
    box.onclick = function(e){ e.stopPropagation(); };
    bNo.onclick = done;
    bOk.onclick = function(){ var res = equipItem(s.uid); if(res === 'OK'){ toast('已穿戴 ' + c.name); save(); try{ refreshAll(); }catch(e){} } else toast(res); done(); };
  }
  // 好装备仪式感: 紫/橙/暗金/套装 → 一次性顶部横幅 + 音效 (光柱由 loot.js FXE('drop') 负责, 一次性)
  var bannerT = 0;
  function banner(s){ if(!UI.layerTop) return; var c = stuffCfg(s), lab = Systems.loot.label(s), col = stuffColor(s);
    var now = Date.now(); if(now - bannerT < 400) return; bannerT = now;
    var b = el('div', 'position:absolute;left:50%;top:150px;transform:translateX(-50%);max-width:90%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:61;pointer-events:none;padding:8px 28px;font-size:26px;background:linear-gradient(90deg,transparent,rgba(0,0,0,.75),transparent);color:#fff;transition:opacity .6s;',
      '恭喜获得 <span style="color:'+col+';text-shadow:0 0 6px '+col+'">【'+esc(lab)+'·'+esc(c.name)+'】</span>');
    b.className = 'drop-banner'; UI.layerTop.appendChild(b);
    if(Systems.audio) Systems.audio.playSfx('ui_weapon');
    setTimeout(function(){ b.style.opacity = '0'; }, 2200); setTimeout(function(){ b.remove(); }, 2900); }
  var _add = addItem;
  addItem = function(s){ var v = _add.apply(this, arguments);
    try { if(v !== false && s && G.role && isEquip(s)){
      if(Systems.loot && Systems.loot._killing && (s.q >= 4 || s.uq || s.set) && G.role.bag.some(function(x){ return x.uid == s.uid; })) banner(s);
      check(s); } } catch(e){ console.warn('[equiptip]', e); }
    return v; };
  // 系统弹窗弹出时, 正在显示的提示收起并放回队首, 弹窗关闭后再显示
  if(UI.onLayerChange) UI.onLayerChange(function(modal){
    if((modal || busy()) && showing){ var it = showing._item; showing.remove(); showing = null; if(it) Q.unshift(it); }
    if(!busy() && Q.length) schedule(); });
  function reeval(){ if(busy() && showing){ var it = showing._item; showing.remove(); showing = null; if(it) Q.unshift(it); } if(!busy() && Q.length) schedule(); }
  if(typeof showPage === 'function'){ var _sp = showPage; showPage = function(){ var r = _sp.apply(this, arguments); try { reeval(); } catch(e){} return r; }; }
  window.EquipTip = {queue: Q, check: check, next: next, wearable: wearable, banner: banner, isShowing: function(){ return !!showing; }};
})();
