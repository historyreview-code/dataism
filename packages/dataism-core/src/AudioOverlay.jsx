import { useState } from 'react'
import './audio-overlay.css'

/**
 * 右上角浮层：用户首次点击 → 启动 audio context。
 * 已启用后切到"mute"按钮：点击临时静音（再点恢复）。
 */
export default function AudioOverlay({ enabled, onEnable }) {
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
        <span className="audio-overlay__text">tap to enable sound</span>
      </button>
    )
  }

  // 已启动 → 显示 mute 按钮
  return (
    <button
      type="button"
      className={`audio-overlay audio-overlay--mute ${muted ? 'is-muted' : ''}`}
      onClick={() => setMuted((v) => !v)}
      aria-label={muted ? 'Unmute' : 'Mute'}
    >
      <span className="audio-overlay__icon">{muted ? '×' : '♪'}</span>
      <span className="audio-overlay__text">{muted ? 'muted' : 'sound on'}</span>
    </button>
  )
}