// [systems] 历练 (MainStory / ItemStory / lilian.txt) 与 任务类型 9 幸运 / 11 洗练 (ItemTask)
(function(S){
  S.on('taskProgress', function(v, t){
    if(t.type==9) return [calcAttr().lucky||0, t.parameter1];          // 幸运之星: 幸运属性达到 parameter1
    if(t.type==11){ S.ensure(); return [G.role.stat.remake||0, t.parameter1]; }   // 洗练次数 (taskInfo.remake)
  });
  S.lilian = {
    // 原版 ItemStory: 第 4 章 (id>1003) 起未开放
    chapters: function(){ var r=G.role;
      return (CFG.lilian||{list:[]}).list.filter(Boolean).map(function(c){
        var tasks=c.task.map(function(id){ var t=cfg('task',id)||{id:id,name:'?'}; var p=t.type?taskProgress(t):null;
          return {id:id, name:t.name, describe:t.describe, reward:t.reward, rewardName:t.reward?S.itemName(t.reward[0]):'', progress:p, done:!!r.tasksDone[id], canClaim:!r.tasksDone[id] && !!p && p[0]>=p[1]}; });
        return {id:c.id, headline:c.headline, title:c.title, describe:c.describe, lvl:c.lvl, bg:c.bg_img, locked:c.id>1003,
          done:tasks.filter(function(x){return x.done;}).length, total:tasks.length, tasks:tasks}; }); },
    current: function(){ var l=S.lilian.chapters().filter(function(c){ return !c.locked && c.done<c.total; }); return l[0]||null; },
    claim: function(id){ var t=cfg('task',id); if(!t) return '任务不存在'; if(G.role.tasksDone[id]) return '已领取';
      if(Math.floor(id/1000)+1000 > 1003) return '该章节未开放'; var res=claimTask(id); save(); return res; }
  };
})(Systems);
