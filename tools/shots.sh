#!/bin/bash
# Screenshots of main screens via headless Chrome (CDP). Server must run on :8081.
cd "$(dirname "$0")/.."; OUT=${OUT:-/workspace/chuanqi/shots}; BASE=${BASE:-http://localhost:8081/}; mkdir -p "$OUT"
shot(){ node --experimental-websocket tools/cdp.js "$BASE$2" "$OUT/$1.png" ${3:-3500} 2>&1 | grep -v -i experimental; echo "$OUT/$1.png"; }
shot 01_loading "" 1500
shot 02_role_create "?autostart=1"
shot 03_main_fight_field "?seed=1&map=1003"
shot 04_main_fight_town "?seed=2&map=1004"
shot 05_main_role_bag "?seed=1&page=main_role"
shot 06_role_skill "?seed=2&page=role_skill"
shot 07_main_story "?seed=1&page=main_story"
shot 08_main_map "?seed=1&page=main_map"
shot 09_main_fuli "?seed=1&page=main_fuli"
shot 10_tip_equip "?seed=1&page=main_role&tip=equip"
shot 11_tip_props "?seed=1&page=main_role&tip=props"
shot 12_tip_store "?seed=1&map=1004&tip=store"
shot 13_tip_offline "?seed=1&tip=offline"
shot 14_role_die "?seed=1&tip=die"
shot 15_boss_list "?seed=1&tip=boss"
shot 16_buy "?seed=1&map=1004&tip=buy"
shot 17_tip_remake "?seed=1&tip=remake"
shot 18_blacksmith "?seed=1&map=1004&tip=smith"
shot 19_fuse "?seed=1&tip=fuse"
shot 20_fuli_week "?seed=1&tip=week"
shot 21_fuli_exchange "?seed=1&tip=exchange"
shot hero_field "?seed=1&map=1003&hero=2" 5000
shot hero_panel "?seed=1&map=1003&hero=2&panel=1" 4500
shot hero_heji "?seed=1&map=1003&hero=2&heji=1&hejiwait=1800" 4650
shot hero_unlock "?seed=3&map=1003&hero=0&panel=1&herowait=1500" 3800
shot quest_btn "?seed=1&map=1003&qdemo=1&quest=0" 4000
shot quest_main "?seed=1&map=1003&quest=main" 3800
shot quest_daily "?seed=1&map=1003&quest=daily&qdemo=1" 3800
shot quest_ach "?seed=1&map=1003&quest=ach&qdemo=1" 3800
shot eq_tip_unique "?seed=1&map=1003&eq=tip" 3500
shot eq_tip_set "?seed=1&map=1003&eq=set" 3500
shot eq_salvage "?seed=1&map=1003&eq=salvage" 3500
shot eq_bag "?seed=1&page=main_role&eq=bag" 3500
shot eq_beam "?seed=1&map=1003&eq=beam" 4200
shot settings_recycle "?seed=1&map=1003&settings=recycle" 3800
shot settings_afk "?seed=1&map=1003&settings=afk" 3800
shot settings_skill "?seed=1&map=1003&settings=skill" 4000
shot settings_game "?seed=1&map=1003&settings=game" 3800
shot p2_yyshop "?seed=1&page=main_role&tip=yyshop" 2500
shot p2_guide "?seed=1&tip=guide&noguide=0" 2500
