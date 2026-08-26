import { useCallback, useEffect, useRef, useState } from 'react'

// 频段划分与 AudioController 保持一致（fftSize 1024 → 512 bins）
const LOW_END = 8
const MID_END = 64
const HIGH_END = 256
const MIC_GAIN = 2.0 // 麦克风电平整体增益（现场声通常比合成音轻）
const BEAT_THRESHOLD = 1.5
const BEAT_MIN_INTERVAL = 400
const BEAT_DECAY = 0.3

/**
 * useMicInput —— 现场声音 → 粒子驱动
 *
 * 画廊/家庭陈列的"呼吸通道"：观众的脚步、谈话、掌声会像音乐一样
 * 驱动粒子云（低频涌动 / 中频鼓胀 / 高频沙沙 / 突发声触发冲击式脉冲）。
 * 只分析、不外放——麦克风信号绝不进入输出链路，无啸叫风险。
 *
 * 用法：
 *   const { levelsRef, status, start, stop } = useMicInput()
 *   把 levelsRef 与 Tone 频谱 ref 一起以数组传给 ParticleCloud：
 *   <ParticleCloud audioLevelsRef={[toneLevelsRef, levelsRef]} />
 *
 * status: idle | requesting | live | denied | unsupported
 * 权限按浏览器惯例记忆：展厅部署时操作员授一次权，之后加载即自动 live。
 */
export function useMicInput() {
  const levelsRef = useRef({ low: 0, mid: 0, high: 0, beat: 0 })
  const [status, setStatus] = useState('idle')

  const stateRef = useRef({
    ctx: null,
    stream: null,
    analyser: null,
    dataArray: null,
    rafId: 0,
    historyLow: 0,
    historyMid: 0,
    beatPulse: 0,
    lastBeatAt: 0,
    lastT: 0,
  })

  const loop = useCallback(() => {
    const s = stateRef.current
    if (!s.analyser) return
    s.rafId = requestAnimationFrame(loop)

    s.analyser.getByteFrequencyData(s.dataArray)
    const avg = (start, end) => {
      let sum = 0
      for (let i = start; i < end; i++) sum += s.dataArray[i]
      return sum / (end - start) / 255
    }
    const low = Math.min(1, avg(0, LOW_END) * MIC_GAIN)
    const mid = Math.min(1, avg(LOW_END, MID_END) * MIC_GAIN)
    const high = Math.min(1, avg(MID_END, HIGH_END) * MIC_GAIN)

    // 突发声检测（脚步 / 掌声 / 击掌 → beat 脉冲）
    const now = performance.now()
    const dt = Math.min(0.1, (now - s.lastT) / 1000 || 0.016)
    s.lastT = now
    const energy = low * 0.7 + mid * 0.3
    s.historyLow = s.historyLow * 0.95 + low * 0.05
    s.historyMid = s.historyMid * 0.95 + mid * 0.05
    const history = s.historyLow * 0.7 + s.historyMid * 0.3
    if (
      energy > history * BEAT_THRESHOLD &&
      energy > 0.12 &&
      now - s.lastBeatAt > BEAT_MIN_INTERVAL
    ) {
      s.beatPulse = 1.0
      s.lastBeatAt = now
    }
    s.beatPulse = Math.max(0, s.beatPulse - dt / BEAT_DECAY)

    levelsRef.current.low = low
    levelsRef.current.mid = mid
    levelsRef.current.high = high
    levelsRef.current.beat = s.beatPulse
  }, [])

  const start = useCallback(async () => {
    const s = stateRef.current
    if (s.analyser) return true
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return false
    }
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (ctx.state === 'suspended') await ctx.resume()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.7
      src.connect(analyser) // 只接 analyser，不接 destination —— 不外放
      s.ctx = ctx
      s.stream = stream
      s.analyser = analyser
      s.dataArray = new Uint8Array(analyser.frequencyBinCount)
      s.lastT = performance.now()
      s.rafId = requestAnimationFrame(loop)
      setStatus('live')
      return true
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setStatus('denied')
      } else {
        setStatus('unsupported')
      }
      return false
    }
  }, [loop])

  const stop = useCallback(() => {
    const s = stateRef.current
    cancelAnimationFrame(s.rafId)
    s.stream?.getTracks?.().forEach((t) => t.stop())
    s.ctx?.close?.()
    s.ctx = null
    s.stream = null
    s.analyser = null
    levelsRef.current.low = 0
    levelsRef.current.mid = 0
    levelsRef.current.high = 0
    levelsRef.current.beat = 0
    setStatus('idle')
  }, [])

  // 卸载时彻底释放麦克风
  useEffect(() => () => stop(), [stop])

  return { levelsRef, status, start, stop }
}
