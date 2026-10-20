# 音频资源

来源：原版 `src/assets/resources/audio/`（约 1.6MB，已拷贝）。

| 目录/文件 | 用途 |
|---|---|
| bgsound_login/create/sellect/openDoor | 登录/创角/选角/进门 BGM·SFX |
| game_*.mp3/wav | 升级/死亡/切图/用药/金币 |
| ui_*.mp3 | UI 点击/关闭 |
| skill/ | 技能施放（按需） |
| monster/ | 怪物 atk/hit/die（按需） |

播放：`Systems.audio.playBgm(key)` / `playSfx(key)`，受 `role.settings.sound`（设置里「游戏音效」）控制。  
文件缺失时 API 返回 `false`，不抛错（stub 行为）。
