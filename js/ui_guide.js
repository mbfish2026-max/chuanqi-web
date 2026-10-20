// [guide UI] 轻量引导遮罩；不阻挡 ?noguide=1 / seed / autostart 试玩
(function(){
  if(!window.Systems || !Systems.guide) return;
  var GDE = Systems.guide;
  var overlay = null;

  function remove(){
    if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  function paint(force){
    remove();
    if(!force && !GDE.active()) return;
    var stage = GDE.getStage();
    if(!stage || stage === 0){ GDE.setStage(GDE.STAGE.introduce); stage = GDE.STAGE.introduce; }
    if(!force && stage >= GDE.STAGE.finish) return;
    var info = { stage: stage, text: GDE.textOf(stage), key: '' };
    if(!info.text && !force) return;
    overlay = document.createElement('div');
    overlay.id = 'cq-guide';
    overlay.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;z-index:50;pointer-events:auto;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;';
    var card = document.createElement('div');
    card.style.cssText = 'max-width:680px;width:90%;margin-bottom:120px;background:rgba(28,22,14,.95);border:2px solid #a08040;border-radius:10px;padding:18px 20px 16px;color:#f0e6d0;font-size:22px;line-height:1.45;box-shadow:0 8px 24px rgba(0,0,0,.5);';
    var tip = document.createElement('div');
    tip.textContent = info.text || ('引导步骤 '+info.stage);
    tip.style.cssText = 'margin-bottom:14px;white-space:pre-wrap;';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;';
    var skip = document.createElement('button');
    skip.textContent = '跳过引导';
    skip.style.cssText = 'background:transparent;border:1px solid #666;color:#aaa;padding:8px 14px;border-radius:4px;font-size:18px;cursor:pointer;';
    var next = document.createElement('button');
    next.textContent = info.stage === GDE.STAGE.introduce ? '开始' : '下一步';
    next.style.cssText = 'background:linear-gradient(#6a5530,#3a3020);border:1px solid #c0a050;color:#ffd76a;padding:8px 22px;border-radius:4px;font-size:20px;cursor:pointer;';
    skip.onclick = function(ev){
      ev.stopPropagation();
      GDE.skipAll(); remove();
      if(Systems.audio) Systems.audio.playSfx('ui_click');
      toast('已跳过新手引导');
    };
    next.onclick = function(ev){
      ev.stopPropagation();
      if(Systems.audio) Systems.audio.playSfx('ui_click');
      var cur = info.stage;
      GDE.onStepAction(cur);
      var n = GDE.advance();
      if(n >= GDE.STAGE.finish){ remove(); toast('引导完成，开始冒险吧！'); if(typeof refreshAll==='function') refreshAll(); }
      else { if(typeof refreshAll==='function') refreshAll(); paint(); }
    };
    row.appendChild(skip); row.appendChild(next);
    card.appendChild(tip); card.appendChild(row);
    overlay.appendChild(card);
    var host = (UI && UI.layerTop) || document.getElementById('stage') || document.body;
    host.appendChild(overlay);
  }

  function maybeStart(){
    if(!G.role || !UI.main) return;
    if(window._guideForce){ window._guideForce = false; paint(true); return; }
    if(GDE.disabledByQuery()) return;
    if(!GDE.active() && GDE.getStage() !== 0) return;
    paint();
  }

  window._guideStart = maybeStart;
  window._guideRefresh = paint;

  // 进主界面后稍延迟弹出，避免挡 loading
  var _startMain = typeof startMain === 'function' ? startMain : null;
  if(_startMain && !_startMain._guide){
    startMain = function(){
      var r = _startMain.apply(this, arguments);
      setTimeout(maybeStart, 400);
      return r;
    };
    startMain._guide = 1;
  }
})();
