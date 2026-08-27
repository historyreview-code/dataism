# 《时辰》做本机屏保的三条路线

## 路线 A：双击启动 · 全屏陈列（已就绪 ✅ 推荐）

```
apps/dataism-exhibit/kiosk/shichen-kiosk.command
```

双击即进入全屏展示。独立 Chrome profile，不干扰日常浏览器；
`?kiosk=1` 自带光标隐匿、点击全屏、屏幕常亮、45 秒待机自演。
退出按 `⌘W`。

配合系统设置达到"屏保"效果：
- 系统设置 → 锁定屏幕 → **关闭"未操作时开启屏幕保护"**（让《时辰》接管这个职责）
- 或用「触发角」：鼠标甩到右下角 = 启动此 command（调度 → 触发角，选"其他…"关联 Automator 打开本文件）

## 路线 B：真·空闲自动唤起（可选，需 Hammerspoon）

装 [Hammerspoon](https://www.hammerspoon.org)（免费开源）后，
把 `hammerspoon-shichen.lua` 并入 `~/.hammerspoon/init.lua`。
效果：离开电脑 10 分钟自动进入陈列；回来动一动它会提醒你 ⌘W 退出。

## 路线 C：真·原生 .saver 屏保（远期，随 Tauri 封装一起做）

macOS 原生不支持网页屏保；现有开源 WebView .saver 多为 Intel 时代产物，
在新系统上不可靠。正确姿势是产品化路线里的 **Tauri 封装**：
打包成本地 .app 后注册为 `ScreenSaverCustomizationViewProvider`
（或用 SwiftSoup 桥接 WKWebView 的 ScreenSaver 模板），届时它是真正的
系统级屏保、可在"锁定屏幕"设置里被选中。列入 L3/L4 阶段任务。

## 能耗建议

- 《时辰》kiosk 已用 Wake Lock 保持屏幕常亮，插座供电场景无碍
- 笔记本电池模式长期挂展会耗电——晚上记得 ⌘W，或走路线 B 由"空闲才唤起"控制
- 音量：无声开启即可；想要音景加 `&audio=1` 到 URL（自动播放受浏览器策略限制，可能需点一下页面）
