import { useEffect, useState } from 'react'

/**
 * useCursorIdle —— 光标闲置隐匿
 *
 * 鼠标静止超过 delayMs 后返回 true（调用方借此隐藏光标符号）；
 * 恢复移动的瞬间立即返回 false。
 *
 * 策展语义：光标隐去，但粒子算法仍按其最后位置继续作用——
 * 观众离场后，痕迹还在云气里旋涡；一动则唤醒光标。
 */
export function useCursorIdle(delayMs = 3000) {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer = null
    const arm = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), delayMs)
    }
    arm()
    window.addEventListener('pointermove', arm, { passive: true })
    window.addEventListener('pointerdown', arm, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', arm)
      window.removeEventListener('pointerdown', arm)
    }
  }, [delayMs])

  return idle
}
