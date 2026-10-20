// [systems] 福利: 月签到 (qiandao_m), 七日签到 (qiandao_w), 兑换码 (duihunma)  —— FuliSign / ItemSign / FuliExchange
// 充值 (chongzhi / FuliRecharge) 为真实付费, 不实现。
(function(S){
  function give(id, n){ var s=createStuff(id, n); if(s){ if(stuffCfg(s).type==2) s.count=1; addItem(s); } }   // ItemSign.onGetItemVO
  function monthKey(d){ return d.getFullYear()+'-'+(d.getMonth()+1); }
  function rows(t){ return (CFG[t]||{list:[]}).list.filter(function(x){return x && x.id;}); }
  S.fuli = {
    // 月签到: 只能在 当月日期 == 配置 id 当天签到 (ItemSign.onBtnSignClick: c != Number(u) -> NOT_SIGN_DATE)
    monthList: function(){ var r=S.ensure(), d=S.now(); if(r.signInfo.month!=monthKey(d)){ r.signInfo.month=monthKey(d); r.signInfo.already=[]; }
      return rows('qiandao_m').map(function(c){ return {id:c.id, name:c.name, item:c.item[0], itemName:S.itemName(c.item[0]), count:c.item[1],
        signed:r.signInfo.already.indexOf(c.id)!=-1, today:c.id==d.getDate()}; }); },
    canSign: function(){ var l=S.fuli.monthList(), d=S.now().getDate(); var c=l.filter(function(x){return x.id==d;})[0]; return !!(c && !c.signed); },
    // double: 原版需看广告翻倍 (TipMultiple), Web 版不接广告, 传 true 时同样只给单倍
    sign: function(){
      var r=S.ensure(), d=S.now(); S.fuli.monthList();
      var c=rows('qiandao_m').filter(function(x){return x.id==d.getDate();})[0]; if(!c) return '今日无签到奖励';
      if(r.signInfo.already.indexOf(c.id)!=-1) return '今日已签到';
      give(c.item[0], c.item[1]); r.signInfo.already.push(c.id); save();
      return S.ok('签到成功: '+S.itemName(c.item[0])+' x'+c.item[1]);
    },
    // 七日签到: 按顺序每天领取一天 (already_week), 同一天只能领一次 (原版用星期几判断, 这里用日期, 避免隔 7 天无法领取的问题)
    weekList: function(){ var r=S.ensure(), n=r.signInfo.already_week.length, can=S.fuli.canSignWeek();
      return rows('qiandao_w').map(function(c){ var items=[]; for(var i=1;i<=4;i++) if(c['item'+i]) items.push({id:c['item'+i][0], name:S.itemName(c['item'+i][0]), count:c['item'+i][1]});
        return {id:c.id, name:c.name, items:items, signed:r.signInfo.already_week.indexOf(c.id)!=-1, canSign:can && c.id==n+1}; }); },
    canSignWeek: function(){ var r=S.ensure(); return r.signInfo.cur_sign != S.today(S.now()) && r.signInfo.already_week.length < rows('qiandao_w').length; },
    signWeek: function(){
      var r=S.ensure(); if(!S.fuli.canSignWeek()) return r.signInfo.already_week.length>=rows('qiandao_w').length ? '七日签到已全部领取' : '今日已领取';
      var id=r.signInfo.already_week.length+1, c=rows('qiandao_w').filter(function(x){return x.id==id;})[0]; if(!c) return '配置缺失';
      if(S.bag.free() < 4) return '背包空间不足';
      r.signInfo.cur_sign=S.today(S.now()); r.signInfo.already_week.push(id);
      var got=[]; for(var i=1;i<=4;i++) if(c['item'+i]){ give(c['item'+i][0], c['item'+i][1]); got.push(S.itemName(c['item'+i][0])+' x'+c['item'+i][1]); }
      save(); return S.ok(c.name+' 领取: '+got.join(', '));
    },
    // 兑换码 (FuliExchange.onBtnLibaoClick): 每个码每个角色一次, 奖励为对应礼包道具
    redeem: function(code){
      var r=S.ensure(); code=String(code||'').trim();
      var c=rows('duihunma').filter(function(x){return x.cdkey==code;})[0] || (CFG.duihunma && CFG.duihunma.list.filter(function(x){return x.cdkey==code;})[0]);
      if(!c) return '兑换码无效';
      if(r.exchanges.indexOf(c.cdkey)!=-1) return '该兑换码已使用';
      if(!S.bag.canAdd(c.id)) return '背包已满';
      give(c.id, 1); r.exchanges.push(c.cdkey); save(); return S.ok('兑换成功: '+S.itemName(c.id));
    }
  };
})(Systems);
