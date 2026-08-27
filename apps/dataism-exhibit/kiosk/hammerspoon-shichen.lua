-- ============================================================
-- 《时辰》自动屏保（可选 · 需要 Hammerspoon）
-- ------------------------------------------------------------
-- 作用：本机空闲 N 分钟后自动唤起《时辰》全屏陈列；
--       你回来动一下鼠标/键盘后手动 ⌘W 退出即可。
-- 安装：brew install --cask hammerspoon
--       然后把本文件内容并入 ~/.hammerspoon/init.lua 重载配置
-- ============================================================

local SHICHEN_IDLE_SEC = 600   -- 空闲多少秒后启动（10 分钟）
local KIOSK_CMD = os.getenv("HOME") ..
  "/创意编程探索/dataism/apps/dataism-exhibit/kiosk/shichen-kiosk.command"
local APP_FLAG_FILE = "/tmp/shichen-kiosk-active"

shichenTimer = hs.timer.doEvery(20, function()
  local idleSecs = hs.hid.systemIdleTime()
  local active = hs.fs.fileExists(APP_FLAG_FILE)

  if idleSecs >= SHICHEN_IDLE_SEC and not active then
    -- 标记文件由 kiosk 进程生命周期管理：这里只负责拉起
    hs.execute(KIOSK_CMD .. " >/dev/null 2>&1 &")
    local f = io.open(APP_FLAG_FILE, "w")
    if f then f:write(os.time()) f:close() end
    hs.alert.show("时辰 · 陈列模式已开启（⌘W 退出）", 2)
  elseif idleSecs < SHICHEN_IDLE_SEC and active then
    -- 用户回来了：提示手动退出（⌘W），不做强制关闭以免打断
    hs.alert.show("欢迎回来 — ⌘W 退出陈列模式", 2)
    os.remove(APP_FLAG_FILE)
  end
end)
