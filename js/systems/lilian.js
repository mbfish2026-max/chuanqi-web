// [systems] 历练 (MainStory / ItemStory / lilian.txt) 与 任务类型 9 幸运 / 11 洗练 (ItemTask)
(function(S){
  S.on('taskProgress', function(v, t){
    if(t.type==9) return [calcAttr().lucky||0, t.parameter1];          // 幸运之星: 幸运属性达到 parameter1
    if(t.type==11){ S.ensure(); return [G.role.stat.remake||0, t.parameter1]; }   // 洗练次数 (taskInfo.remake)
  });

  function chapterOfTask(taskId){
    var list = (CFG.lilian || {list:[]}).list || [];
    for(var i=0;i<list.length;i++){
      var c = list[i]; if(!c || !c.task) continue;
      if(c.task.indexOf(taskId) >= 0) return c;
    }
    return null;
  }

  S.lilian = {
    // 原版 ItemStory: 第 4 章 (id>1003) 起未开放
    chapters: function(){ var r=G.role;
      return (CFG.lilian||{list:[]}).list.filter(Boolean).map(function(c){
        var tasks=c.task.map(function(id){ var t=cfg('task',id)||{id:id,name:'?'}; var p=t.type?taskProgress(t):null;
          var done=!!r.tasksDone[id], canClaim=!done && !!p && p[0]>=p[1];
          return {id:id, name:t.name, describe:t.describe||t.name, reward:t.reward,
            rewardName:t.reward?S.itemName(t.reward[0]):'', rewardCnt:t.reward?t.reward[1]:0,
            progress:p, done:done, canClaim:canClaim,
            // 原版 ItemTask: 完成可领 / 未完成也显示按钮文案
            btnLabel: done ? '' : (canClaim ? '领取' : '未完成')}; });
        var claimable = tasks.filter(function(x){ return x.canClaim; }).length;
        return {id:c.id, headline:c.headline, title:c.title, describe:c.describe, lvl:c.lvl, bg:c.bg_img,
          locked:c.id>1003,
          done:tasks.filter(function(x){return x.done;}).length, total:tasks.length,
          claimable:claimable, tasks:tasks}; }); },
    current: function(){ var l=S.lilian.chapters().filter(function(c){ return !c.locked && c.done<c.total; }); return l[0]||null; },
    chapterOfTask: chapterOfTask,
    claim: function(id){
      var t=cfg('task',id); if(!t) return '任务不存在';
      if(G.role.tasksDone[id]) return '已领取';
      var ch = chapterOfTask(id);
      if(ch && ch.id > 1003) return '该章节未开放';
      var p = taskProgress(t); if(!p || p[0] < p[1]) return '未完成';
      var res = claimTask(id); save(); return res;
    },
    // 当前章一键领取全部可领
    claimAll: function(chapterId){
      var chs = S.lilian.chapters().filter(function(c){ return !chapterId || c.id === chapterId; });
      var got = [], fail = null;
      chs.forEach(function(c){
        if(c.locked) return;
        c.tasks.forEach(function(t){
          if(!t.canClaim) return;
          var res = S.lilian.claim(t.id);
          if(res && res.indexOf('OK') === 0) got.push(res.slice(3));
          else if(!fail) fail = res;
        });
      });
      if(!got.length) return fail || '没有可领取的奖励';
      return S.ok(got.join('；'));
    },
    stageBg: function(c){
      // 原版: images/story/stage_<id>，>1002 用 stage_1002
      if(!c || c.locked) return null;
      var id = c.id > 1002 ? 1002 : c.id;
      return 'images/story/stage_' + id + '.png';
    }
  };
})(Systems);
