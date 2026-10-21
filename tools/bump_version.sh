#!/bin/bash
# 给 index.html 中本地 js/css 引用加/更新 ?v=<版本>（默认 git HEAD 短号）。发布: 提交改动 -> tools/bump_version.sh -> 提交 index.html -> push
cd "$(dirname "$0")/.."; V=${1:-$(git rev-parse --short HEAD)}
sed -i -E "s#((src|href)=\"(js|css|ui)/[^\"?]+\.(js|css))(\?v=[^\"]*)?\"#\1?v=$V\"#g" index.html
echo "index.html -> ?v=$V ($(grep -c "?v=$V" index.html) refs)"
