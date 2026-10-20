// 原版配置表加载 (assets/resources/config/*.txt, JSON 格式)
var CFG = {};
var TABLES = ['item','monster','map','map_info','skill','drop','profession','levelup','shop','task','libao','equip_qianghua','equip_qianghua_parts','cizhui','randomname','qiandao_m',
  /* systems */ 'qiandao_w','duihunma','fuse','lilian','buff','equip_cizhui'];
function loadConfigs(){
  return Promise.all(TABLES.map(function(n){
    return fetch('assets/config/'+n+'.txt').then(function(r){return r.text()}).then(function(t){
      var o = JSON.parse(t), byId = {}, list = [];
      Object.keys(o).forEach(function(k){ var v=o[k]; list.push(v); if(v && v.id!=null && byId[v.id]===undefined) byId[v.id]=v; });
      CFG[n] = {raw:o, list:list, byId:byId};
    });
  })).then(function(){ H('configsLoaded'); });
}
function cfg(t,id){ return CFG[t] && CFG[t].byId[id]; }

// 系统钩子: js/systems/*.js 注册 Systems.hooks[name](value, ...) ; 未注册时原样返回 value
var Systems = (typeof globalThis!=='undefined'?globalThis:window).Systems || {hooks:{}};
(typeof globalThis!=='undefined'?globalThis:window).Systems = Systems;
function H(name, v){ var fs=Systems.hooks[name]; if(!fs) return v; var args=[].slice.call(arguments,1);
  for(var i=0;i<fs.length;i++){ var r=fs[i].apply(null,args); if(r!==undefined){ v=r; args[0]=r; } } return v; }
