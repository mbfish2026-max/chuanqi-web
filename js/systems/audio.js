// [audio] 原版 AudioTool：BGM/SFX，经 settings.soundSwitch 静音
// 资源：assets/audio/（自 src/assets/resources/audio 拷贝）；缺失时静默 stub
(function(S){
  var BASE = 'assets/audio/';
  var KEYS = {
    music_login:   'bgsound_login.mp3',
    music_sellect: 'bgsound_sellect.mp3',
    music_create:  'bgsound_create.mp3',
    game_start:    'bgsound_openDoor.mp3',
    game_coin:     'game_coin.mp3',
    game_levelup:  'game_levelup.mp3',
    game_die:      'game_die.wav',
    game_exmap:    'game_exmap.mp3',
    game_usedrugs: 'game_usedrugs.mp3',
    ui_click:      'ui_click.mp3',
    ui_close:      'ui_close.mp3',
    ui_weapon:     'ui_weapon.mp3'
  };
  var cache = {};       // path -> HTMLAudioElement | false(missing)
  var missing = {};     // path -> true
  var bgmEl = null;
  var curBgm = null;
  var unlocked = false;

  function enabled(){
    if(G.role && G.role.settings && G.role.settings.sound === false) return false;
    if(G.settings && (G.settings.sound === false || G.settings.voice === false)) return false;
    return true;
  }

  function pathOf(key){
    if(!key) return null;
    if(KEYS[key]) return BASE + KEYS[key];
    if(/^monster\//.test(key) || /^skill\//.test(key)) return BASE + key;
    if(/\.(mp3|wav|ogg)$/i.test(key)) return BASE + key.replace(/^audio\//, '');
    return BASE + key + '.mp3';
  }

  function loadEl(path){
    if(cache[path] !== undefined) return cache[path];
    if(typeof Audio === 'undefined'){ cache[path] = false; return false; }
    try{
      var a = new Audio(path);
      a.preload = 'none';   // 不预加载: 避免无手势时 headless/iOS 中止请求报 ERR_ABORTED (bgsound_openDoor 已在 assets/audio)
      a.addEventListener('error', function(){ cache[path] = false; missing[path] = true; });
      cache[path] = a;
      return a;
    }catch(e){ cache[path] = false; missing[path] = true; return false; }
  }

  function unlock(){
    if(unlocked) return;
    unlocked = true;
    // 浏览器需用户手势解锁；播放极短静音或恢复 BGM
    if(bgmEl && enabled()){ try{ bgmEl.play().catch(function(){}); }catch(e){} }
  }

  function setEnabled(on){
    on = !!on;
    if(G.role && G.role.settings) G.role.settings.sound = on;
    G.settings = G.settings || {};
    G.settings.sound = on; G.settings.voice = on;
    if(S.settings && S.settings.applyLegacyMirrors) S.settings.applyLegacyMirrors();
    if(!on){ pauseAll(); }
    else if(curBgm) playBgm(curBgm, true);
  }

  function pauseAll(){
    if(bgmEl){ try{ bgmEl.pause(); }catch(e){} }
  }

  function playBgm(key, force){
    curBgm = key;
    if(!enabled() && !force){ pauseAll(); return false; }
    if(!enabled()) return false;
    var path = pathOf(key); if(!path) return false;
    var el = loadEl(path);
    if(!el) return false;
    if(bgmEl && bgmEl !== el){ try{ bgmEl.pause(); bgmEl.currentTime = 0; }catch(e){} }
    bgmEl = el;
    el.loop = true; el.volume = 0.55;
    var p = el.play();
    if(p && p.catch) p.catch(function(){});
    return true;
  }

  function stopBgm(){
    curBgm = null;
    if(bgmEl){ try{ bgmEl.pause(); bgmEl.currentTime = 0; }catch(e){} }
    bgmEl = null; // M6: 先 pause 再释放引用, 避免旧 BGM 残留播放
  }

  function playSfx(key){
    if(!enabled()) return false;
    var path = pathOf(key); if(!path) return false;
    var proto = loadEl(path);
    if(!proto) return false;
    try{
      var a = proto.cloneNode ? proto.cloneNode(true) : new Audio(path);
      a.volume = 0.8;
      var p = a.play();
      if(p && p.catch) p.catch(function(){});
      return true;
    }catch(e){ return false; }
  }

  function playMonster(id, kind){
    // kind: atk|hit|die
    return playSfx('monster/monster_' + id + '_' + (kind || 'atk') + '.mp3');
  }
  function playSkill(id, hit){
    return playSfx('skill/mp3_s' + id + (hit ? '_hit' : '') + '.mp3');
  }

  function missingList(){
    var out = [];
    for(var k in KEYS){ var p = BASE + KEYS[k]; if(missing[p] || cache[p] === false) out.push(p); }
    return out;
  }

  // ---------- 行为钩子 ----------
  function hookGameplay(){
    // 升级
    if(typeof addExp === 'function' && !addExp._audio){
      var _add = addExp;
      addExp = function(n){
        var lv0 = G.role && G.role.level;
        var ret = _add.apply(this, arguments);
        if(G.role && G.role.level > lv0) playSfx('game_levelup');
        return ret;
      };
      addExp._audio = 1;
    }
    // 进图
    if(typeof enterMap === 'function' && !enterMap._audio){
      var _em = enterMap;
      enterMap = function(id){
        var prev = G.role && G.role.mapId;
        var ret = _em.apply(this, arguments);
        if(id && id !== prev) playSfx('game_exmap');
        return ret;
      };
      enterMap._audio = 1;
    }
    // 用药
    if(typeof useDrug === 'function' && !useDrug._audio){
      var _ud = useDrug;
      useDrug = function(){ var r = _ud.apply(this, arguments); playSfx('game_usedrugs'); return r; };
      useDrug._audio = 1;
    }
    // 死亡（die.js 已替换 roleDie；再包一层播音效）
    if(typeof roleDie === 'function' && !roleDie._audio){
      var _rd = roleDie;
      roleDie = function(){ playSfx('game_die'); return _rd.apply(this, arguments); };
      roleDie._audio = 1;
    }
  }

  // 设置开关联动
  if(S.settings && S.settings.set){
    var _set = S.settings.set;
    S.settings.set = function(path, value){
      var r = _set.apply(this, arguments);
      if(path === 'sound') setEnabled(!!value);
      return r;
    };
  }

  S.on('loaded', function(){
    if(G.role && G.role.settings) setEnabled(G.role.settings.sound !== false);
  });

  if(typeof setTimeout === 'function') setTimeout(hookGameplay, 0);
  S.on('configsLoaded', function(){ hookGameplay(); });

  // 文档点击解锁音频
  if(typeof document !== 'undefined'){
    var once = function(){ unlock(); document.removeEventListener('click', once, true); document.removeEventListener('touchstart', once, true); };
    document.addEventListener('click', once, true);
    document.addEventListener('touchstart', once, true);
  }

  S.audio = {
    KEYS: KEYS, BASE: BASE,
    playBgm: playBgm, stopBgm: stopBgm, playSfx: playSfx,
    playMonster: playMonster, playSkill: playSkill,
    setEnabled: setEnabled, enabled: enabled, unlock: unlock,
    pauseAll: pauseAll, missingList: missingList,
    // stub：文件不存在时 play* 返回 false，不抛错
    stub: function(key){ return playSfx(key); }
  };
})(Systems);
