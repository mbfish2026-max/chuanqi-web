// Paperdoll: compose layered, aligned transparent PNGs (assets/paperdoll/<prof>/*) into the player figure
// (pop-out card + character page avatar). Re-renders on equip/unequip with a shimmer. Falls back to the cutout.
// paperdoll.json: {"<prof>": {canvas:[w,h], layers:["cape","body","armor","helmet","weapon","shield"],
//   base:{body:"body.png"}, tiers:{armor:[{tier,file,itemIds:[..]|minLevel}], weapon:[..], helmet:[..], cape:[..], shield:[..]}}}
var PD = (function(){
  var SLOT = {weapon: 5, armor: 10, helmet: 15};          // stdmode of the equip slot feeding each layer
  var base = 'assets/paperdoll/', cfg = null, loading = null, mounts = [];
  try { var q = /[?&]pdbase=([^&]+)/.exec(location.search); if (q) base = decodeURIComponent(q[1]).replace(/\/?$/, '/'); } catch (e) {}
  function load(){ return loading || (loading = fetch(base + 'paperdoll.json').then(function(r){ if (!r.ok) throw 0; return r.json(); }).then(function(j){ cfg = j; refresh(); return j; }).catch(function(){ cfg = {}; return cfg; })); }
  function conf(prof){ return cfg && cfg[prof]; }
  function has(prof){ var c = conf(prof); return !!(c && c.layers); }
  function equipFor(slot){ var r = G.role; if (!r || !r.equip) return null;
    if (SLOT[slot] != null) return r.equip[SLOT[slot]] || null;
    var list = Object.keys(r.equip).map(function(k){ return r.equip[k]; }).filter(Boolean);   // cape/shield: any equipped item listed in itemIds
    return list.filter(function(s){ return ((conf(r.prof).tiers || {})[slot] || []).some(function(t){ return (t.itemIds || []).indexOf(s.id) >= 0; }); })[0] || null; }
  function pick(prof, slot){
    var c = conf(prof), tiers = (c.tiers || {})[slot] || [], s = equipFor(slot); if (!s) return null;
    var lvl = (stuffCfg(s) || {}).needlevel || 0, best = null;
    tiers.forEach(function(t){ if (t.itemIds && t.itemIds.indexOf(s.id) >= 0) best = t; });
    if (!best) tiers.forEach(function(t){ if (!t.itemIds && t.minLevel != null && t.minLevel <= lvl && (!best || t.minLevel >= best.minLevel)) best = t; });
    return best;
  }
  // ordered list of layer urls for the current gear
  function layers(prof){
    var c = conf(prof); if (!c) return null; var out = [];
    c.layers.forEach(function(L){
      var f = (c.base || {})[L] || (L === 'body' ? 'body.png' : null), t = (c.base || {})[L] ? null : pick(prof, L);
      if (t) f = t.file || (L + '_' + t.tier + '.png');
      if (f) out.push(base + prof + '/' + f);
    });
    return out;
  }
  function key(prof){ return (layers(prof) || []).join('|'); }
  // render stacked layers into el (keeps el's size; each layer contain-fit, bottom-aligned, same canvas => aligned)
  function paint(m, flash){
    var prof = G.role && G.role.prof; if (!prof || !has(prof)) { delete m.el.dataset.pd; if (m.stack) { m.stack.remove(); m.stack = null; m.el.style.backgroundImage = m.fallback; m.key = null; } return false; }
    var k = key(prof); if (k === m.key) return true; var first = m.key == null; m.key = k;
    if (!m.stack) { m.fallback = m.el.style.backgroundImage; m.stack = document.createElement('div'); m.stack.className = 'pd-stack'; m.el.appendChild(m.stack); }
    m.el.style.backgroundImage = 'none'; m.el.dataset.pd = '1';
    var urls = layers(prof), st = m.stack, imgs = [];
    // preload all, then swap in one frame (no flicker)
    Promise.all(urls.map(function(u){ return new Promise(function(res){ var i = new Image(); i.onload = function(){ res(u); }; i.onerror = function(){ res(null); }; i.src = u; }); })).then(function(ok){
      if (m.key !== k) return; st.innerHTML = '';
      ok.forEach(function(u){ if (!u) return; var d = document.createElement('div'); d.className = 'pd-layer'; d.style.backgroundImage = 'url("' + u + '")'; st.appendChild(d); });
      if (flash && !first) { m.el.classList.remove('pd-shimmer'); void m.el.offsetWidth; m.el.classList.add('pd-shimmer'); setTimeout(function(){ m.el.classList.remove('pd-shimmer'); }, 700); }
    });
    return true;
  }
  // mount on an element showing the player figure; returns true if paperdoll is active
  function mount(el){ if (!el) return false; mounts = mounts.filter(function(m){ return m.el.isConnected && m.el !== el; });
    var m = {el: el, key: null}; mounts.push(m); load(); return paint(m, false); }
  function refresh(){ mounts = mounts.filter(function(m){ return m.el.isConnected; }); mounts.forEach(function(m){ paint(m, true); }); }
  // hook equip/unequip (game.js globals) without editing them
  function wrap(name){ var f = window[name]; if (typeof f !== 'function' || f._pd) return; var g = function(){ var r = f.apply(this, arguments); try { refresh(); } catch (e) {} return r; }; g._pd = true; window[name] = g; }
  ['equipItem', 'unequip'].forEach(wrap);
  load();
  return {mount: mount, refresh: refresh, has: has, layers: layers, load: load};
})();
