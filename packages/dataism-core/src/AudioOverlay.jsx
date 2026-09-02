import { useState } from 'react'
import './audio-overlay.css'

/**
 * 右上角浮层：用户首次点击 → 启动 audio context。
 * 已启用后切到"mute"按钮：点击临时静音（再点恢复）。
 * 启用时显示当前音景名与一句话描述（声音即数据，是本作品的亮点）。
 */
export default function AudioOverlay({ enabled, onEnable, label, desc }) {
  const [muted, setMuted] = useState(false)

  // 还没启动 → 显示 tap-to-enable
  if (!enabled) {
    return (
      <button
        type="button"
        className="audio-overlay audio-overlay--prompt"
        onClick={onEnable}
      >
        <span className="audio-overlay__icon">♪</span>
        <span className="audio-overlay__text">点击开启音效</span>
      </button>
    )
  }

  // 已启动 → 显示 mute 按钮 + 当前音景说明
  return (
    <button
      type="button"
      className={`audio-overlay audio-overlay--mute ${muted ? 'is-muted' : ''}`}
      onClick={() => setMuted((v) => !v)}
      aria-label={muted ? '取消静音' : '静音'}
    >
      <span className="audio-overlay__icon">{muted ? '×' : '♪'}</span>
      <span className="audio-overlay__text">
        {muted ? '已静音 · 点击恢复' : `${label || '音景'} · 点击静音`}
      </span>
      {!muted && desc && <span className="audio-overlay__desc">{desc}</span>}
    </button>
  )
}
