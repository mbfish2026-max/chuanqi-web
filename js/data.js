// 原版配置表加载 (assets/resources/config/*.txt, JSON 格式)
var CFG = {};
var TABLES = ['item','monster','map','map_info','skill','drop','profession','levelup','shop','task','libao','equip_qianghua','equip_qianghua_parts','cizhui','randomname','qiandao_m'];
function loadConfigs(){
  return Promise.all(TABLES.map(function(n){
    return fetch('assets/config/'+n+'.txt').then(function(r){return r.text()}).then(function(t){
      var o = JSON.parse(t), byId = {}, list = [];
      Object.keys(o).forEach(function(k){ var v=o[k]; list.push(v); if(v && v.id!=null && byId[v.id]===undefined) byId[v.id]=v; });
      CFG[n] = {raw:o, list:list, byId:byId};
    });
  }));
}
function cfg(t,id){ return CFG[t] && CFG[t].byId[id]; }
