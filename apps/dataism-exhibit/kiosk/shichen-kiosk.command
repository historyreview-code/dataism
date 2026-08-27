#!/bin/zsh
# ============================================================
# 《时辰》本机屏保 / 陈列模式 —— 双击即进入全屏展示
#
# 特性：
#   · 独立 Chrome profile（~/.shichen-profile）——与日常浏览器完全隔离，
#     麦克风授权只需首次授权一次，此后永远生效
#   · ?kiosk=1 —— 页面自动隐藏光标、首个点击进全屏、屏幕常亮（Wake Lock）、
#     待机 45 秒后开始自主表演（光标巡游 + 柔和涟漪）
#   · caffeinate 保持系统不睡眠（挂后台，脚本退出后 -t 时长内有效）
#
# 退出：⌘W 关闭窗口（该 profile 的进程随之结束）
# ============================================================

URL="https://historyreview-code.github.io/dataism/?kiosk=1"
PROFILE="$HOME/.shichen-profile"

mkdir -p "$PROFILE"

# 展示期间防止系统休眠（8 小时上限，安全兜底）
caffeinate -dis -t 28800 & caffeinatePid=$!

open -na "Google Chrome" --args \
  --user-data-dir="$PROFILE" \
  --app="$URL" \
  --start-fullscreen \
  --disable-features=TranslateUI

echo "《时辰》已启动。退出：⌘W 关闭窗口"
