// [yyshop UI] role_yyshop：回收页（按品质）+ 药店页；挂钩 Systems.openYyShop
(function(){
  if(!window.Systems || !Systems.yyshop) return;
  var Y = Systems.yyshop;
  var QNAME = {1:'普通',2:'优秀',3:'精良',4:'稀有',5:'传说'};
  var QCOLOR = {1:'#ccc',2:'#6c6',3:'#6af',4:'#c6f',5:'#fa0'};

  function fmtMs(ms){
    var s = Math.floor(ms/1000), m = Math.floor(s/60), sec = s%60;
    return ('0'+m).slice(-2)+':'+('0'+sec).slice(-2);
  }

  function bindYyShop(root){
    Y.ensure();
    var tag = 'reclaim'; // reclaim | drugstore
    var includeNonsuch = true;
    var timer = null;

    function info(){ return Y.info(); }

    function setLab(ref, text){
      var n = root.ref(ref) || root.findDeep(ref);
      if(n && n.setString) n.setString(String(text));
    }

    function refreshHeader(){
      var inf = info();
      setLab('labpercent', inf.percent + '%');
      setLab('labPercent', inf.percent + '%');
      setLab('labgudong', inf.guwan + '/' + 1);
      setLab('labGudong', inf.guwan + '/' + 1);
      setLab('labReclaim', inf.yyReclaim + '/' + inf.maxReclaim);
      setLab('labtime', fmtMs(inf.refreshLeft));
      setLab('labTime', fmtMs(inf.refreshLeft));
      var pctNode = root.findDeep('labpercent') || root.findDeep('labPercent');
      if(pctNode && pctNode.el) pctNode.el.style.color = inf.percent >= 100 ? '#6c6' : '#e66';
      var btnReset = root.findDeep('btnreset') || root.findDeep('btnReset');
      if(btnReset) btnReset.setActive(inf.yyReclaim <= 0);
    }

    function clearContent(node){
      if(!node) return;
      while(node.children && node.children.length) node.children[node.children.length-1].destroy();
      if(node.el){
        // 清掉我们追加的 HTML 行
        var rows = node.el.querySelectorAll('.yy-row');
        for(var i=rows.length-1;i>=0;i--) rows[i].parentNode.removeChild(rows[i]);
      }
    }

    function addRow(host, html, onClick){
      if(!host || !host.el) return;
      var d = document.createElement('div');
      d.className = 'yy-row';
      d.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin:6px 8px;background:rgba(0,0,0,.35);border:1px solid #5a4a30;border-radius:6px;color:#e8dcc8;font-size:20px;cursor:pointer;';
      d.innerHTML = html;
      d.onclick = onClick;
      host.el.appendChild(d);
    }

    function drawReclaim(){
      var host = root.ref('reclaim') || root.findDeep('reclaim');
      clearContent(host);
      if(host) host.setActive(true);
      var drug = root.ref('drugstore') || root.findDeep('drugstore');
      if(drug) drug.setActive(false);
      var tog = root.findDeep('toggle') || root.findDeep('nontoggle');
      if(tog) tog.setActive(true);
      [1,2,3,4,5].forEach(function(q){
        var pv = Y.previewQuality(q, includeNonsuch);
        addRow(host,
          '<span style="color:'+QCOLOR[q]+'">'+QNAME[q]+'：'+pv.count+'</span><span>'+pv.gold+' 金币</span><span style="color:#ffd76a">回收</span>',
          function(){
            if(Systems.audio) Systems.audio.playSfx('ui_click');
            var res = Y.reclaimByQuality(q, includeNonsuch);
            if(res && res.indexOf('OK')===0){ toast(res.slice(3)); if(Systems.audio) Systems.audio.playSfx('game_coin'); }
            else toast(res||'');
            refreshHeader(); drawReclaim(); if(typeof refreshAll==='function') refreshAll();
          });
      });
    }

    function drawDrug(){
      var host = root.ref('drugstore') || root.findDeep('drugstore');
      // drugstore 可能是 ScrollView，内容在 content
      var content = host && (host.findDeep('content') || host.ref('content') || host);
      clearContent(content);
      if(host) host.setActive(true);
      var rec = root.ref('reclaim') || root.findDeep('reclaim');
      if(rec) rec.setActive(false);
      var tog = root.findDeep('toggle') || root.findDeep('nontoggle');
      if(tog) tog.setActive(false);
      Y.drugList().forEach(function(row){
        var c = cfg('item', row.items) || {};
        var price = Math.abs(row.price||0);
        addRow(content,
          '<span>'+(c.name||row.name||row.items)+'</span><span>'+price+' 金币</span><span style="color:#ffd76a">购买</span>',
          function(){
            if(Systems.audio) Systems.audio.playSfx('ui_click');
            var res = Y.buyDrug(row, 1);
            if(res && res.indexOf('OK')===0) toast(res.slice(3)); else toast(res||'');
            refreshHeader(); if(typeof refreshAll==='function') refreshAll();
          });
      });
    }

    function setTag(t){
      tag = t;
      if(tag === 'reclaim') drawReclaim(); else drawDrug();
      // 页签高亮
      var bR = root.findDeep('btnReclaim');
      var bD = root.findDeep('btnDrug') || root.findDeep('btnDrugstore');
      if(bR && bR.setImage) try{ bR.setImage(IMG+'basics/img_tag_1_'+(tag==='reclaim'?1:0)+'.png'); }catch(e){}
      if(bD && bD.setImage) try{ bD.setImage(IMG+'basics/img_tag_2_'+(tag==='drugstore'?1:0)+'.png'); }catch(e){}
    }

    // 绑定按钮
    var bR = root.findDeep('btnReclaim'); if(bR) bR.on(function(){ if(Systems.audio) Systems.audio.playSfx('ui_click'); setTag('reclaim'); });
    var bD = root.findDeep('btnDrug') || root.findDeep('btnDrugstore'); if(bD) bD.on(function(){ if(Systems.audio) Systems.audio.playSfx('ui_click'); setTag('drugstore'); });
    var huilu = root.findDeep('btnhuilu') || root.findDeep('btnHuilu');
    if(huilu) huilu.on(function(){
      if(Systems.audio) Systems.audio.playSfx('ui_click');
      var res = Y.useGuwanRefresh();
      if(res && res.indexOf('OK')===0) toast(res.slice(3)); else toast(res||'');
      refreshHeader(); if(tag==='reclaim') drawReclaim();
    });
    var delay = root.findDeep('btndelay') || root.findDeep('btnDelay');
    if(delay) delay.on(function(){
      if(Systems.audio) Systems.audio.playSfx('ui_click');
      toast(Y.delayRefreshByAd().replace(/^OK:/,''));
      refreshHeader();
    });
    var reset = root.findDeep('btnreset') || root.findDeep('btnReset');
    if(reset) reset.on(function(){
      if(Systems.audio) Systems.audio.playSfx('ui_click');
      toast(Y.resetReclaimByAd().replace(/^OK:/,''));
      refreshHeader();
    });
    var tog = root.findDeep('toggle') || root.findDeep('nontoggle');
    if(tog) tog.on(function(){
      includeNonsuch = !includeNonsuch;
      var ck = tog.find('checkmark'); if(ck) ck.setActive(includeNonsuch);
      if(tag==='reclaim') drawReclaim();
      if(Systems.audio) Systems.audio.playSfx('ui_click');
    });

    refreshHeader();
    setTag('reclaim');
    timer = setInterval(function(){
      if(!root.el || !root.el.parentNode){ clearInterval(timer); return; }
      Y.tickTimer(); refreshHeader();
    }, 1000);
    root._yyTimer = timer;
  }

  window._openYyShopUI = function(down){
    var p;
    try{ p = inst('role_yyshop'); }catch(e){ p = null; }
    if(!p){
      // 简易 HTML 回退
      var box = document.createElement('div');
      box.style.cssText = 'padding:8px;color:#e8dcc8;font-size:20px;';
      box.innerHTML = '<div style="color:#ffd76a;margin-bottom:8px;">云游商人</div>';
      down.el.appendChild(box);
      var fake = { el: box, ref: function(){return null;}, findDeep: function(){return null;}, setActive:function(){}, children:[] };
      // 直接画列表到 box
      Y.ensure();
      var inf = Y.info();
      box.innerHTML += '<div>回收比例 <b style="color:'+(inf.percent>=100?'#6c6':'#e66')+'">'+inf.percent+'%</b>　次数 '+inf.yyReclaim+'/'+inf.maxReclaim+'　古玩 '+inf.guwan+'</div>';
      var host = { el: box, children: [], setActive:function(){} };
      [1,2,3,4,5].forEach(function(q){
        var pv = Y.previewQuality(q, true);
        var d = document.createElement('div');
        d.style.cssText = 'padding:8px;margin:4px 0;background:rgba(0,0,0,.3);border:1px solid #5a4a30;cursor:pointer;';
        d.innerHTML = '<span style="color:'+QCOLOR[q]+'">'+QNAME[q]+' ×'+pv.count+'</span> → '+pv.gold+' 金币';
        d.onclick = function(){ var res=Y.reclaimByQuality(q,true); toast((res||'').replace(/^OK:/,'')); if(typeof refreshAll==='function') refreshAll(); };
        box.appendChild(d);
      });
      box.innerHTML += '<div style="margin-top:10px;color:#ffd76a;">药店</div>';
      Y.drugList().forEach(function(row){
        var c = cfg('item', row.items)||{};
        var d = document.createElement('div');
        d.style.cssText = 'padding:8px;margin:4px 0;background:rgba(0,0,0,.3);border:1px solid #5a4a30;cursor:pointer;';
        d.textContent = (c.name||row.name)+' — '+Math.abs(row.price||0)+' 金币（点购）';
        d.onclick = function(){ toast((Y.buyDrug(row,1)||'').replace(/^OK:/,'')); if(typeof refreshAll==='function') refreshAll(); };
        box.appendChild(d);
      });
      return fake;
    }
    down.addChild(p);
    bindYyShop(p);
    return p;
  };
})();
