import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'

import cloudVert from './shaders/cloud.vert?raw'
import cloudFrag from './shaders/cloud.frag?raw'

const COUNT = 50000

// v1.0 原版主题（dataism-17 不传 theme 时使用，保证零回归）
export const DEFAULT_THEME = {
  palette: {
    inner: '#8CC4FF', // 冷蓝
    outer: '#FFA94D', // 暖橙
    core: '#F2FAFF',  // 内核高光
  },
  behavior: {
    flow: 0.04,       // 水平流场速度
    noiseAmp: 0.18,   // 噪声扰动幅度
    sizeScale: 1.0,   // 粒子尺寸缩放
    mouseStrength: 1.5,
    orbitAmp: 0.0,    // 星云轨道场摆幅（rad）——v1.0 锁定 = 关闭
    orbitTempo: 0.0,  // 星云轨道场节奏（rad/s）
  },
}

// 主题过渡：时间常数 4s（95% 到位 ≈ 12s，够两小时一换的章节从容呼吸）
const THEME_LERP_RATE = 0.25

function normalizeTheme(theme) {
  const t = theme || {}
  return {
    palette: { ...DEFAULT_THEME.palette, ...t.palette },
    behavior: { ...DEFAULT_THEME.behavior, ...t.behavior },
  }
}

// Mulberry32：确定性 PRNG，让粒子分布每次刷新都一样
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * ParticleCloud —— 主题化粒子云引擎
 *
 * props:
 *   mouseRef / clickRef    交互 ref（同 v1.0）
 *   audioLevelsRef         单个 ref 或 ref 数组（多路音频取逐频段最大值：
 *                          Tone 输出频谱 + 麦克风现场声可以同时驱动粒子）
 *   theme                  { palette:{inner,outer,core}, behavior:{flow,noiseAmp,sizeScale,mouseStrength} }
 *                          变化时颜色/行为在 ~12s 内平滑过渡（不重建几何体）
 */
export default function ParticleCloud({ mouseRef, clickRef, audioLevelsRef, theme }) {
  const matRef = useRef()
  const { gl } = useThree()

  const initialTheme = useMemo(() => normalizeTheme(theme), []) // 只用于首帧，theme 变化走过渡
  const themeTargetRef = useRef(initialTheme)

  const { geometry, uniforms } = useMemo(() => {
    const rand = mulberry32(20260826)
    const noise3D = createNoise3D(rand)

    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT)
    const sizes = new Float32Array(COUNT)

    // 让粒子在椭圆带里**均匀分布**（环带：中心稍密，外圈稍密，中间稀）
    // 椭圆参数：x 半径 3.2，y 半径 0.9
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3

      // 在椭圆里均匀采样（拒绝采样，落在外面就重新抛）
      let x, y, z
      do {
        x = (rand() * 2 - 1)
        y = (rand() * 2 - 1)
      } while (x * x + y * y > 1)

      // 椭圆带（拉宽 x、压扁 y）
      x *= 3.2
      y *= 0.9
      z = (rand() * 2 - 1) * 0.4

      // 径向偏置：让粒子分布略偏向外圈（r=0.4~1.0）
      const angle = Math.atan2(y / 0.9, x / 3.2)
      const targetR = 0.45 + Math.pow(rand(), 0.7) * 0.55  // 偏外圈
      x = Math.cos(angle) * targetR * 3.2
      y = Math.sin(angle) * targetR * 0.9

      // 用噪声给整体加点"流形"不规则感
      const n = noise3D(x * 0.5, y * 1.2, z * 0.8)
      const density = 0.7 + n * 0.2
      if (rand() > density) {
        // 噪声筛掉的少数粒子，重新摆到外圈
        const a = rand() * Math.PI * 2
        const rr = 0.6 + rand() * 0.4
        x = Math.cos(a) * rr * 3.2
        y = Math.sin(a) * rr * 0.9
      }

      positions[i3]     = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      seeds[i] = rand()
      // 大部分小点 + 少量亮大点（控制亮度分布）
      sizes[i] = 0.4 + Math.pow(rand(), 4) * 2.5
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1))

    return {
      geometry: geo,
      uniforms: {
        uTime:          { value: 0 },
        uMouse:         { value: new THREE.Vector2(99, 99) },
        uMouseStrength: { value: initialTheme.behavior.mouseStrength },
        uPixelRatio:    { value: Math.min(gl.getPixelRatio(), 1.5) },
        uSizeBase:      { value: 8.0 },
        uClickPos:      { value: new THREE.Vector2(99, 99) },
        uClickTime:     { value: -100.0 },   // 负大值 = 无冲击波
        uClickStrength: { value: 0.0 },      // 0~1 自动衰减
        uAudioLow:      { value: 0 },
        uAudioMid:      { value: 0 },
        uAudioHigh:     { value: 0 },
        uAudioBeat:     { value: 0 },
        // —— 主题 uniforms（默认 = v1.0 原版）——
        uColorInner:    { value: new THREE.Color(initialTheme.palette.inner) },
        uColorOuter:    { value: new THREE.Color(initialTheme.palette.outer) },
        uColorCore:     { value: new THREE.Color(initialTheme.palette.core) },
        uFlowSpeed:     { value: initialTheme.behavior.flow },
        uNoiseAmp:      { value: initialTheme.behavior.noiseAmp },
        uSizeScale:     { value: initialTheme.behavior.sizeScale },
        uOrbitAmp:      { value: initialTheme.behavior.orbitAmp },
        uOrbitTempo:    { value: initialTheme.behavior.orbitTempo },
      },
    }
  }, [gl])

  // theme 变化 → 只更新目标（颜色预构建，避免逐帧分配），过渡在 useFrame 里做
  useEffect(() => {
    const t = normalizeTheme(theme)
    themeTargetRef.current = {
      palette: {
        inner: new THREE.Color(t.palette.inner),
        outer: new THREE.Color(t.palette.outer),
        core:  new THREE.Color(t.palette.core),
      },
      behavior: t.behavior,
    }
  }, [theme])

  // 把多路音频 ref 合并成逐频段最大值（任何一路有声都驱动粒子）
  const readMergedLevels = () => {
    if (!audioLevelsRef) return null
    const refs = Array.isArray(audioLevelsRef) ? audioLevelsRef : [audioLevelsRef]
    let low = 0, mid = 0, high = 0, beat = 0
    let any = false
    for (const r of refs) {
      const v = r?.current
      if (!v) continue
      any = true
      low  = Math.max(low,  v.low  || 0)
      mid  = Math.max(mid,  v.mid  || 0)
      high = Math.max(high, v.high || 0)
      beat = Math.max(beat, v.beat || 0)
    }
    return any ? { low, mid, high, beat } : null
  }

  useFrame((state, dt) => {
    if (!matRef.current) return
    const u = matRef.current.uniforms
    const t = state.clock.elapsedTime
    u.uTime.value = t

    // —— 主题过渡（颜色 lerp + 标量 lerp，指数趋近）——
    const target = themeTargetRef.current
    const k = 1 - Math.exp(-THEME_LERP_RATE * Math.min(dt, 0.1))
    u.uColorInner.value.lerp(target.palette.inner, k)
    u.uColorOuter.value.lerp(target.palette.outer, k)
    u.uColorCore.value.lerp(target.palette.core, k)
    u.uFlowSpeed.value     += (target.behavior.flow - u.uFlowSpeed.value) * k
    u.uNoiseAmp.value      += (target.behavior.noiseAmp - u.uNoiseAmp.value) * k
    u.uSizeScale.value     += (target.behavior.sizeScale - u.uSizeScale.value) * k
    u.uMouseStrength.value += (target.behavior.mouseStrength - u.uMouseStrength.value) * k
    u.uOrbitAmp.value      += (target.behavior.orbitAmp - u.uOrbitAmp.value) * k
    u.uOrbitTempo.value    += (target.behavior.orbitTempo - u.uOrbitTempo.value) * k

    // mouse 平滑跟随
    const m = u.uMouse.value
    m.x += (mouseRef.current.x - m.x) * 0.12
    m.y += (mouseRef.current.y - m.y) * 0.12

    // click 冲击波：处理 pending 标记 + 2 秒线性衰减
    if (clickRef && clickRef.current && clickRef.current.pending) {
      // 把 clickPos 同步给 shader，记录点击瞬间的时间
      u.uClickPos.value.set(clickRef.current.x, clickRef.current.y)
      u.uClickTime.value = t
      clickRef.current.pending = false   // 清掉标记
    }
    // 强度按时间自动衰减
    const elapsed = t - u.uClickTime.value
    u.uClickStrength.value = Math.max(0, 1.0 - elapsed / 2.0)

    // audio 平滑跟随（lerp 让电平更柔，避免频谱"锯齿"）
    const merged = readMergedLevels()
    if (merged) {
      const lerp = 0.25
      u.uAudioLow.value  += (merged.low  - u.uAudioLow.value)  * lerp
      u.uAudioMid.value  += (merged.mid  - u.uAudioMid.value)  * lerp
      u.uAudioHigh.value += (merged.high - u.uAudioHigh.value) * lerp
      u.uAudioBeat.value += (merged.beat - u.uAudioBeat.value) * 0.5
    }
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={cloudVert}
        fragmentShader={cloudFrag}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}
