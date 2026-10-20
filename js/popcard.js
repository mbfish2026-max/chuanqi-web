// Pop-out unit cards: card tilts back in 3D, the character cutout stands up out of the frame
// (lower body clipped by the card window, upper body breaking out above), idle breathing, lunge/hit/death.
// Cutout source: assets/cutout/<name>.png (transparent) if present, else the unit's existing sprite.
var POP = (function(){
  var exists = {};   // url -> true/false/Promise
  function probe(url){ if (exists[url] != null) return exists[url];
    return exists[url] = new Promise(function(res){ var im = new Image(); im.onload = function(){ exists[url] = true; res(true); }; im.onerror = function(){ exists[url] = false; res(false); }; im.src = url; }); }
  // it: itemRole node; icon: sprite node inside it; name: cutout key; fallback: sprite url
  function attach(it, icon, name, fallback, opts){
    if (!it || !icon) return; opts = opts || {};
    var card = it.el; card.classList.add('pop-card');
    // tilt the card frame (large sprite nodes), not the figure, so the figure stays upright and on top
    (function walk(n){ n.children.forEach(function(c){ if (c === icon) return; if (c.spEl && c.w >= it.w * .7 && c.h >= it.h * .5) c.el.classList.add('pop-tilt'); else walk(c); }); })(it);
    if (it._pop) it._pop.remove();
    var cs = icon.el.style, w = parseFloat(cs.width), h = parseFloat(cs.height), l = parseFloat(cs.left), t = parseFloat(cs.top);
    var rise = (opts.rise || 1.45) * 1.25;           // cutout height relative to window
    var win = document.createElement('div'); win.className = 'pop-win';
    win.style.cssText = 'left:' + l + 'px;top:' + t + 'px;width:' + w + 'px;height:' + h + 'px;';
    var fig = document.createElement('div'); fig.className = 'pop-fig';
    fig.style.cssText = 'height:' + (h * rise) + 'px;';
    var img = document.createElement('div'); img.className = 'pop-img'; fig.appendChild(img);
    var shadow = document.createElement('div'); shadow.className = 'pop-shadow'; win.appendChild(shadow);
    win.appendChild(fig); card.appendChild(win); it._pop = win; it._popFig = fig;
    icon.el.style.visibility = 'hidden';
    var set = function(u, cut){ img.style.backgroundImage = 'url("' + u + '")'; win.classList.toggle('pop-cut', !!cut); };
    set(fallback, false);
    var url = 'assets/cutout/' + name + '.png', e = probe(url);
    if (e === true) set(url, true); else if (e && e.then) e.then(function(ok){ if (ok && it._pop === win) set(url, true); });
    // spawn: card tilts back, figure rises out
    card.classList.remove('pop-spawn'); void card.offsetWidth; card.classList.add('pop-spawn');
    fig.style.animationDelay = '0s,' + (Math.random() * -2).toFixed(2) + 's';
  }
  function cls(it, c, ms){ if (!it || !it._popFig) return; var f = it._popFig; f.classList.remove(c); void f.offsetWidth; f.classList.add(c); clearTimeout(f['_t' + c]); f['_t' + c] = setTimeout(function(){ f.classList.remove(c); }, ms); }
  function byEl(el){ var all = [UI.roleItem].concat(UI.monItems || [], UI.petItems || []); for (var i = 0; i < all.length; i++) if (all[i] && all[i].el === el) return all[i]; return null; }
  return {
    attach: attach,
    atk: function(el){ cls(byEl(el), 'pop-atk', 600); },
    hit: function(el, crit){ cls(byEl(el), crit ? 'pop-hitc' : 'pop-hit', 380); },
    die: function(it, done){ if (!it || !it._pop) return done && done(); it.el.classList.add('pop-dying'); setTimeout(function(){ it.el.classList.remove('pop-dying'); if (done) done(); }, 520); }
  };
})();
