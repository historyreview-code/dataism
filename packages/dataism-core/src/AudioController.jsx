import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as Tone from 'tone'

import { presets } from './audio/presets'

const LOW_END = 8
const MID_END = 64
const HIGH_END = 256
const BEAT_DECAY = 0.35
const FADE_OUT_MS = 1000
const FADE_IN_MS = 2000
// 互动强度联动：-14dB（安静）到 +6dB（活跃）
const VOL_MIN = -14
const VOL_MAX = 6
const VOL_RAMP = 0.3 // 秒

/**
 * 根据 preset 配置创建 Tone.js 节点
 * 修 Pulse 的 3 个 bug：
 *   1. MembraneSynth 不再独立 toDestination → 接入 masterGain 链路
 *   2. Sequence 在 Transport 启动后再创建（之前 Transport 没启动）
 *   3. kick 音量提到 -6dB（之前 -18dB 被掩盖）
 */
function createPreset(mode, analyser) {
  const preset = presets[mode]
  if (!preset || !preset.available) return null

  const nodes = {}
  const toneNodes = []
  const pendingSequences = [] // Sequence 必须在 Transport 启动后再注册

  preset.nodes.forEach((cfg) => {
    switch (cfg.type) {
      case 'Oscillator': {
        const osc = new Tone.Oscillator(cfg.freq, cfg.wave)
        osc.volume.value = cfg.volume ?? -12
        osc.start()
        toneNodes.push(osc)
        nodes[cfg.id] = osc
        break
      }
      case 'Noise': {
        const noise = new Tone.Noise(cfg.kind || 'white')
        noise.volume.value = cfg.volume ?? -18
        noise.start()
        toneNodes.push(noise)
        nodes[cfg.id] = noise
        break
      }
      case 'LFO': {
        const lfo = new Tone.LFO(cfg.freq, cfg.range[0], cfg.range[1]).start()
        toneNodes.push(lfo)
        nodes[cfg.id] = lfo
        break
      }
      case 'Filter': {
        const filter = new Tone.Filter(cfg.freq, cfg.kind)
        filter.Q.value = cfg.Q ?? 1
        toneNodes.push(filter)
        nodes[cfg.id] = filter
        break
      }
      case 'Gain': {
        const gain = new Tone.Gain(cfg.value ?? 0)
        toneNodes.push(gain)
        nodes[cfg.id] = gain
        break
      }
      case 'SequenceKick': {
        // 修：不再 toDestination，走 masterGain 链路
        const kick = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 6,
          envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 1.5 },
        })
        kick.volume.value = cfg.volume ?? -6  // 修：-6dB 让"咚"明显
        toneNodes.push(kick)
        nodes[cfg.id] = kick
        pendingSequences.push({ synth: kick, interval: cfg.interval })
        break
      }
      default:
        break
    }
  })

  // —— 路由：所有 source（Oscillator + Noise + MembraneSynth） → 所有 Filter 链 → masterGain
  const sources = Object.entries(nodes).filter(
    ([, n]) => n instanceof Tone.Oscillator || n instanceof Tone.Noise || n instanceof Tone.MembraneSynth,
  )
  const filters = Object.entries(nodes).filter(([, n]) => n instanceof Tone.Filter)
  const lfos = Object.entries(nodes).filter(([, n]) => n instanceof Tone.LFO)
  const masterGain = nodes['masterGain']

  sources.forEach(([, src]) => {
    if (filters.length > 0) {
      src.connect(filters[0][1])
    } else {
      src.connect(masterGain)
    }
  })

  // Filter 链
  for (let i = 0; i < filters.length - 1; i++) {
    filters[i][1].connect(filters[i + 1][1])
  }
  if (filters.length > 0) {
    filters[filters.length - 1][1].connect(masterGain)
  }

  // LFO 目标
  lfos.forEach(([id, lfo]) => {
    const cfg = preset.nodes.find((n) => n.id === id)
    if (!cfg?.target) return
    const [targetNodeId, targetParam] = cfg.target.split('.')
    const targetNode = nodes[targetNodeId]
    if (targetNode && targetParam && targetNode[targetParam] !== undefined) {
      lfo.connect(targetNode[targetParam])
    }
  })

  // masterGain → Tone.getDestination()
  masterGain.connect(Tone.getDestination())

  // analyser → 只接 analyser 不接 destination
  if (analyser) {
    Tone.getDestination().connect(analyser)
  }

  // Sequence 在 Transport 启动后注册
  if (pendingSequences.length > 0) {
    // 确保 Transport 干净
    Tone.getTransport().cancel(0)
    Tone.getTransport().start()
    pendingSequences.forEach(({ synth, interval }) => {
      const seq = new Tone.Sequence((time) => {
        synth.triggerAttackRelease('C2', '8n', time)
      }, [0], interval)
      seq.start(0)
      toneNodes.push(seq)
    })
  }

  return { nodes, toneNodes, masterGain, preset }
}

/**
 * AudioController —— 接受 mode prop，按 preset 创建/切换合成节点
 * 切换：1s 淡出旧 → dispose → 2s 淡入新
 * 互动强度联动：master output volume 跟随 interactionRef.current.level
 */
export default function AudioController({
  audioLevelsRef,
  enabled,
  startSignal,
  mode = 'drift',
  interactionRef,
}) {
  const stateRef = useRef({
    ctx: null,
    analyser: null,
    dataArray: null,
    activeNodes: [],
    activeMasterGain: null,
    presetName: null,
    beatConfig: null,
    historyLow: 0,
    historyMid: 0,
    beatPulse: 0,
    lastBeatAt: 0,
    started: false,
    fading: false,
  })

  // 初始化 analyser（只做一次）
  const ensureAnalyser = async () => {
    const s = stateRef.current
    if (s.analyser) return
    try {
      await Tone.start()
      const ctx = Tone.getContext().rawContext
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.7
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      s.ctx = ctx
      s.analyser = analyser
      s.dataArray = dataArray
    } catch (err) {
      console.error('[AudioController] init failed:', err)
    }
  }

  const switchPreset = async (newMode) => {
    const s = stateRef.current
    if (s.presetName === newMode) return

    const oldNodes = s.activeNodes
    const oldGain = s.activeMasterGain

    if (oldGain) {
      s.fading = true
      oldGain.gain.rampTo(0, FADE_OUT_MS / 1000)
      setTimeout(() => {
        oldNodes.forEach((n) => {
          if (n?.dispose) n.dispose()
        })
        Tone.getTransport().cancel(0)

        const result = createPreset(newMode, s.analyser)
        if (!result) return
        s.activeNodes = result.toneNodes
        s.activeMasterGain = result.masterGain
        s.presetName = newMode
        s.beatConfig = presets[newMode].beatDetection
        result.masterGain.gain.rampTo(1, FADE_IN_MS / 1000)
        s.fading = false
      }, FADE_OUT_MS)
    } else {
      const result = createPreset(newMode, s.analyser)
      if (!result) return
      s.activeNodes = result.toneNodes
      s.activeMasterGain = result.masterGain
      s.presetName = newMode
      s.beatConfig = presets[newMode].beatDetection
      result.masterGain.gain.rampTo(1, FADE_IN_MS / 1000)
    }
  }

  // 启动（user gesture）
  useEffect(() => {
    if (!enabled) return
    if (startSignal === 0) return
    if (stateRef.current.started) return
    ;(async () => {
      await ensureAnalyser()
      await switchPreset(mode)
      stateRef.current.started = true
    })()
  }, [enabled, startSignal])

  // mode 变化
  useEffect(() => {
    if (!stateRef.current.started) return
    switchPreset(mode)
  }, [mode])

  // 卸载清理
  useEffect(() => {
    return () => {
      const s = stateRef.current
      s.activeNodes.forEach((n) => n?.dispose?.())
      s.activeNodes = []
      s.started = false
    }
  }, [])

  // ?audio=1 query 模式：首次 user gesture 补一次 start
  useEffect(() => {
    if (!enabled) return
    const onFirstGesture = async () => {
      const s = stateRef.current
      if (!s.started) {
        await ensureAnalyser()
        await switchPreset(mode)
        s.started = true
      }
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
    }
    window.addEventListener('pointerdown', onFirstGesture)
    window.addEventListener('keydown', onFirstGesture)
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
    }
  }, [enabled, mode])

  // 每帧：分析频谱 + 互动强度衰减 + 应用到 master volume
  useFrame((_, dt) => {
    const s = stateRef.current
    if (!s.started || !s.analyser || !s.presetName) {
      audioLevelsRef.current.low = 0
      audioLevelsRef.current.mid = 0
      audioLevelsRef.current.high = 0
      audioLevelsRef.current.beat = 0
      return
    }

    // —— 频谱分析 ——
    s.analyser.getByteFrequencyData(s.dataArray)
    const avg = (start,end) => {
      let sum = 0
      for (let i = start; i < end; i++) sum += s.dataArray[i]
      return sum / (end - start) / 255
    }
    const low = avg(0, LOW_END)
    const mid = avg(LOW_END, MID_END)
    const high = avg(MID_END, HIGH_END)

    // —— Beat detection ——
    const bd = s.beatConfig
    if (bd && bd.enabled) {
      const energy = low * 0.7 + mid * 0.3
      s.historyLow = s.historyLow * 0.95 + low * 0.05
      s.historyMid = s.historyMid * 0.95 + mid * 0.05
      const avgHistory = s.historyLow * 0.7 + s.historyMid * 0.3
      const now = performance.now()
      if (
        energy > avgHistory * (bd.threshold ?? 1.4) &&
        energy > 0.18 &&
        now - s.lastBeatAt > (bd.minInterval ?? 800)
      ) {
        s.beatPulse = 1.0
        s.lastBeatAt = now
      }
      s.beatPulse = Math.max(0, s.beatPulse - dt / (bd.decay ?? BEAT_DECAY))
    } else {
      s.beatPulse = 0
    }

    audioLevelsRef.current.low = low
    audioLevelsRef.current.mid = mid
    audioLevelsRef.current.high = high
    audioLevelsRef.current.beat = s.beatPulse

    // —— 互动强度衰减 + 应用到 master volume ——
    if (interactionRef && interactionRef.current) {
      const decay = Math.exp(-dt * 1.5) // 4 秒掉到 7%
      interactionRef.current.level *= decay
      const level = interactionRef.current.level
      const targetVol = VOL_MIN + level * (VOL_MAX - VOL_MIN)
      Tone.getDestination().volume.rampTo(targetVol, VOL_RAMP)
    }
  })

  return null
}