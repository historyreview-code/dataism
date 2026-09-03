import { useCallback, useEffect, useRef, useState } from 'react'

// 频段划分与 AudioController 保持一致（fftSize 1024 → 512 bins）
const LOW_END = 8
const MID_END = 64
const HIGH_END = 256
const MIC_GAIN = 2.0 // 麦克风电平整体增益（现场声通常比合成音轻）
const BEAT_MIN_INTERVAL = 400
const BEAT_DECAY = 0.3

// ── 自适应噪声门参数 ──
const CALIBRATION_MS = 4000       // 开机后前 4 秒采集底噪
const CALIBRATION_MAX_SAMPLES = 120 // 4s × 30fps ≈ 120 个样本
const NOISE_WINDOW_MAX_SAMPLES = 300 // 10s × 30fps
const BASE_MULTIPLIER = 2.0       // threshold = median + 2.0 × MAD（基础）
const ENERGY_SENSITIVITY_RANGE = 0.6 // energy 0→1 时，阈值乘数在 [1 - range/2, 1 + range/2] 之间

function median(arr) {
  if (arr.length === 0) return 0
  const s = arr.slice().sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

function mad(arr, med) {
  if (arr.length === 0) return 0
  const deviations = arr.map((v) => Math.abs(v - med))
  deviations.sort((a, b) => a - b)
  const m = Math.floor(deviations.length / 2)
  return deviations.length % 2 === 0
    ? (deviations[m - 1] + deviations[m]) / 2
    : deviations[m]
}

/**
 * useMicInput —— 现场声音 → 粒子驱动（v1.2 展厅加固版）
 *
 * 新增自适应噪声门：
 *   1. 开机后 4 秒自动采集环境底噪 → 计算中位数 + MAD
 *   2. beat 阈值 = median + k×MAD，k 按章节 energy 反向调节
 *      （夜低昼高：安静画廊里一点响动就戏剧，嘈杂白天要大声才激发）
 *   3. 持续维护 10 秒滑动窗口噪声统计，自动适应环境变化
 */
export function useMicInput(energy = 0.5) {
  const levelsRef = useRef({ low: 0, mid: 0, high: 0, beat: 0 })
  const [status, setStatus] = useState('idle')
  const energyRef = useRef(energy)

  // energy 变化时同步到 ref（loop 通过 ref 读取，避免 RAF 链断裂）
  useEffect(() => {
    energyRef.current = energy
  }, [energy])

  const stateRef = useRef({
    ctx: null,
    stream: null,
    analyser: null,
    dataArray: null,
    rafId: 0,
    calibrationSamples: [],
    noiseWindow: [],
    calibrated: false,
    calibrationStartAt: 0,
    noiseMedian: 0,
    noiseMAD: 0,
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

    const now = performance.now()
    const dt = Math.min(0.1, (now - s.lastT) / 1000 || 0.016)
    s.lastT = now

    const energyValue = low * 0.7 + mid * 0.3

    // ── 校准阶段 ──
    if (!s.calibrated) {
      s.calibrationSamples.push(energyValue)
      if (s.calibrationSamples.length > CALIBRATION_MAX_SAMPLES) {
        s.calibrationSamples.shift()
      }
      if (now - s.calibrationStartAt >= CALIBRATION_MS && s.calibrationSamples.length >= 30) {
        s.noiseMedian = median(s.calibrationSamples)
        s.noiseMAD = Math.max(0.005, mad(s.calibrationSamples, s.noiseMedian))
        s.calibrated = true
        console.info(
          `[useMicInput] Noise gate calibrated: median=${s.noiseMedian.toFixed(3)}, MAD=${s.noiseMAD.toFixed(3)}, energy=${energyRef.current}`
        )
      }
    } else {
      // ── 运行阶段：维护滑动噪声窗口 ──
      s.noiseWindow.push(energyValue)
      if (s.noiseWindow.length > NOISE_WINDOW_MAX_SAMPLES) {
        s.noiseWindow.shift()
      }
      if (s.noiseWindow.length % 30 === 0) {
        s.noiseMedian = median(s.noiseWindow)
        s.noiseMAD = Math.max(0.005, mad(s.noiseWindow, s.noiseMedian))
      }
    }

    // ── Beat 检测 ──
    if (s.calibrated) {
      const currentEnergy = energyRef.current
      const sensitivityOffset = (0.5 - currentEnergy) * ENERGY_SENSITIVITY_RANGE
      const thresholdMultiplier = BASE_MULTIPLIER + sensitivityOffset
      const dynamicThreshold = s.noiseMedian + s.noiseMAD * thresholdMultiplier

      if (
        energyValue > dynamicThreshold &&
        energyValue > 0.08 &&
        now - s.lastBeatAt > BEAT_MIN_INTERVAL
      ) {
        s.beatPulse = 1.0
        s.lastBeatAt = now
      }
    }
    s.beatPulse = Math.max(0, s.beatPulse - dt / BEAT_DECAY)

    levelsRef.current.low = low
    levelsRef.current.mid = mid
    levelsRef.current.high = high
    levelsRef.current.beat = s.beatPulse
  }, []) // 无依赖：energy 通过 ref 读取，避免 RAF 链断裂

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
      src.connect(analyser)

      s.ctx = ctx
      s.stream = stream
      s.analyser = analyser
      s.dataArray = new Uint8Array(analyser.frequencyBinCount)
      s.calibrationSamples = []
      s.noiseWindow = []
      s.calibrated = false
      s.calibrationStartAt = performance.now()
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
    s.calibrated = false
    levelsRef.current.low = 0
    levelsRef.current.mid = 0
    levelsRef.current.high = 0
    levelsRef.current.beat = 0
    setStatus('idle')
  }, [])

  useEffect(() => () => stop(), [stop])

  return { levelsRef, status, start, stop }
}
