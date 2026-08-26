import { useEffect, useRef, useState } from 'react'
import './interaction-pulse.css'

/**
 * 右下角"互动强度"指示器
 * 透明度跟随 interactionRef.current.level（0~1）
 * - 静止 5 秒 → 完全淡出
 * - 鼠标移动 + 点击 → 变亮
 * 让观众看见自己在"驱动"声音
 */
export default function InteractionPulse({ interactionRef }) {
  const [level, setLevel] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const tick = () => {
      if (interactionRef && interactionRef.current) {
        setLevel(interactionRef.current.level)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [interactionRef])

  if (level < 0.02) return null  // 完全静止时隐藏

  return (
    <div
      className="interaction-pulse"
      style={{ opacity: Math.min(1, level * 2.0) }}
    >
      <span className="interaction-pulse__dot" />
      <span className="interaction-pulse__label">
        interaction · {Math.round(level * 100)}%
      </span>
    </div>
  )
}