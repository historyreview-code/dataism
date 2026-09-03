import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'

import cloudVert from './shaders/cloud.vert?raw'
import cloudFrag from './shaders/cloud.frag?raw'
import { useRegisterRebuild } from './ContextRecovery.jsx'
import { getCloudCount } from './adaptive.js'

const COUNT = getCloudCount()

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
    coreLift: 0.0,    // 中央粒子尺寸增益——v1.0 锁定 = 关闭
    dotGain: 1.0,     // 亮核增益（fragment 衰减指数 2.0/gain）——v1.0 锁定 = 1.0
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

// ── 生成粒子分布数据（纯 CPU 侧，不涉及 GPU）──
function generateCloudData(count) {
  const rand = mulberry32(20260826)
  const noise3D = createNoise3D(rand)

  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    let x, y, z
    do {
      x = (rand() * 2 - 1)
      y = (rand() * 2 - 1)
    } while (x * x + y * y > 1)

    x *= 3.2
    y *= 0.9
    z = (rand() * 2 - 1) * 0.4

    const angle = Math.atan2(y / 0.9, x / 3.2)
    const targetR = 0.45 + Math.pow(rand(), 0.7) * 0.55
    x = Math.cos(angle) * targetR * 3.2
    y = Math.sin(angle) * targetR * 0.9

    const n = noise3D(x * 0.5, y * 1.2, z * 0.8)
    const density = 0.7 + n * 0.2
    if (rand() > density) {
      const a = rand() * Math.PI * 2
      const rr = 0.6 + rand() * 0.4
      x = Math.cos(a) * rr * 3.2
      y = Math.sin(a) * rr * 0.9
    }

    positions[i3]     = x
    positions[i3 + 1] = y
    positions[i3 + 2] = z

    seeds[i] = rand()
    sizes[i] = 0.4 + Math.pow(rand(), 4) * 2.5
  }

  return { positions, seeds, sizes }
}

// ── 从 theme 构建 uniforms 初始值 ──
function buildUniforms(theme, gl) {
  const t = normalizeTheme(theme)
  return {
    uTime:          { value: 0 },
    uMouse:         { value: new THREE.Vector2(99, 99) },
    uMouseStrength: { value: t.behavior.mouseStrength },
    uPixelRatio:    { value: Math.min(gl.getPixelRatio(), 1.5) },
    uSizeBase:      { value: 8.0 },
    uClickPos:      { value: new THREE.Vector2(99, 99) },
    uClickTime:     { value: -100.0 },
    uClickStrength: { value: 0.0 },
    uAudioLow:      { value: 0 },
    uAudioMid:      { value: 0 },
    uAudioHigh:     { value: 0 },
    uAudioBeat:     { value: 0 },
    uColorInner:    { value: new THREE.Color(t.palette.inner) },
    uColorOuter:    { value: new THREE.Color(t.palette.outer) },
    uColorCore:     { value: new THREE.Color(t.palette.core) },
    uFlowSpeed:     { value: t.behavior.flow },
    uNoiseAmp:      { value: t.behavior.noiseAmp },
    uSizeScale:     { value: t.behavior.sizeScale },
    uOrbitAmp:      { value: t.behavior.orbitAmp },
    uOrbitTempo:    { value: t.behavior.orbitTempo },
    uCoreLift:      { value: t.behavior.coreLift },
    uDotGain:       { value: t.behavior.dotGain },
    uPointEnv:      { value: 1.0 },
    // ── v1.4 章节转场仪式：粒子凝滞 + 环形冲击波 ──
    uTransitionFreeze: { value: 0.0 },
    uTransitionRing:   { value: -10.0 },
  }
}

/**
 * ParticleCloud —— 主题化粒子云引擎（v1.4 转场仪式版）
 *
 * 新增展厅级健壮性：
 *   - WebGL 上下文丢失恢复（ContextRecovery 兼容）
 *   - NaN 免疫护栏（保留）
 *   - 调试全局污染仅在 ?export=1 模式下启用
 *   - 章节转场仪式：粒子凝滞 + 环形冲击波
 */
export default function ParticleCloud({ mouseRef, clickRef, audioLevelsRef, theme, pointEnv, transitionRef }) {
  const matRef = useRef()
  const pointsRef = useRef()
  const { gl } = useThree()

  const initialTheme = useMemo(() => normalizeTheme(theme), [])
  const themeTargetRef = useRef(initialTheme)

  // ── 保存原始 CPU 数据，用于上下文恢复时重建 ──
  const dataRef = useRef(null)
  if (!dataRef.current) {
    dataRef.current = generateCloudData(COUNT)
  }

  // ── 初始化：从保存的数据创建 GPU 资源 ──
  const { geometry, uniforms } = useMemo(() => {
    const d = dataRef.current
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(d.positions.slice(), 3))
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(d.seeds.slice(), 1))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(d.sizes.slice(), 1))

    return {
      geometry: geo,
      uniforms: buildUniforms(initialTheme, gl),
    }
  }, [gl, initialTheme])

  // ── 重建函数：WebGL 上下文恢复时调用 ──
  const rebuild = useCallback(() => {
    const d = dataRef.current
    if (!d || !pointsRef.current) return

    // dispose 旧资源
    pointsRef.current.geometry?.dispose?.()
    pointsRef.current.material?.dispose?.()

    // 重建 geometry
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(d.positions.slice(), 3))
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(d.seeds.slice(), 1))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(d.sizes.slice(), 1))

    // 重建 material（uniforms 用当前目标值初始化，确保恢复后不会跳回默认色）
    const target = themeTargetRef.current
    const newUniforms = {
      uTime:          { value: 0 },
      uMouse:         { value: new THREE.Vector2(99, 99) },
      uMouseStrength: { value: target.behavior.mouseStrength },
      uPixelRatio:    { value: Math.min(gl.getPixelRatio(), 1.5) },
      uSizeBase:      { value: 8.0 },
      uClickPos:      { value: new THREE.Vector2(99, 99) },
      uClickTime:     { value: -100.0 },
      uClickStrength: { value: 0.0 },
      uAudioLow:      { value: 0 },
      uAudioMid:      { value: 0 },
      uAudioHigh:     { value: 0 },
      uAudioBeat:     { value: 0 },
      uColorInner:    { value: new THREE.Color(target.palette.inner) },
      uColorOuter:    { value: new THREE.Color(target.palette.outer) },
      uColorCore:     { value: new THREE.Color(target.palette.core) },
      uFlowSpeed:     { value: target.behavior.flow },
      uNoiseAmp:      { value: target.behavior.noiseAmp },
      uSizeScale:     { value: target.behavior.sizeScale },
      uOrbitAmp:      { value: target.behavior.orbitAmp },
      uOrbitTempo:    { value: target.behavior.orbitTempo },
      uCoreLift:      { value: target.behavior.coreLift },
      uDotGain:       { value: target.behavior.dotGain },
      uPointEnv:      { value: 1.0 },
      // ── v1.4 转场仪式 uniform（重建时保持静默）──
      uTransitionFreeze: { value: 0.0 },
      uTransitionRing:   { value: -10.0 },
    }

    const mat = new THREE.ShaderMaterial({
      uniforms: newUniforms,
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    pointsRef.current.geometry = geo
    pointsRef.current.material = mat
    matRef.current = mat

    console.info('[ParticleCloud] GPU resources rebuilt after context restore')
  }, [gl])

  useRegisterRebuild(rebuild)

  // theme 变化 → 只更新目标（颜色预构建，避免逐帧分配），过渡在 useFrame 里做
  useEffect(() => {
    const t = normalizeTheme(theme)
    const probe = (c) => (isFinite(c.r) && isFinite(c.g) && isFinite(c.b)) ? 'ok' : 'NaN'
    const ti = new THREE.Color(t.palette.inner)
    const to = new THREE.Color(t.palette.outer)
    const tc = new THREE.Color(t.palette.core)

    // v1.2 修复：调试探针仅在 ?export=1 模式下启用，不再污染 window 全局
    if (typeof window !== 'undefined' && window.__shichenRaf !== undefined) {
      window.__shichenTarget = { i: probe(ti), o: probe(to), c: probe(tc), src: String(t.palette.inner) }
    }

    themeTargetRef.current = {
      palette: { inner: ti, outer: to, core: tc },
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
    // v1.2 修复：调试探针仅在 ?export=1 模式下启用
    if (typeof window !== 'undefined' && window.__shichenRaf !== undefined) {
      window.__shichenDraw = (window.__shichenDraw || 0) + 1
      if (window.__shichenDraw % 90 === 0) {
        const u = matRef.current ? matRef.current.uniforms : null
        window.__shichenUni = u ? {
          t: +u.uTime.value.toFixed(2), env: +u.uPointEnv.value.toFixed(3),
          orb: +u.uOrbitAmp.value.toFixed(3), dot: +u.uDotGain.value.toFixed(2),
          lose: u.uColorInner.value.getHexString(),
        } : 'nomat'
      }
    }

    if (!matRef.current) return
    const u = matRef.current.uniforms
    const t = state.clock.elapsedTime
    u.uTime.value = t

    // —— 主题过渡（颜色 lerp + 标量 lerp，指数趋近）——
    // NaN 免疫护栏：任何一步出现非有限值，立即从目标恢复。
    const target = themeTargetRef.current
    const k = 1 - Math.exp(-THEME_LERP_RATE * Math.min(dt, 0.1))
    const safeK = isFinite(k) ? k : 0
    const safeColor = (c, tgt) => {
      if (!(isFinite(c.r) && isFinite(c.g) && isFinite(c.b))) { c.copy(tgt); return }
      c.lerp(tgt, safeK)
      if (!(isFinite(c.r) && isFinite(c.g) && isFinite(c.b))) c.copy(tgt)
    }
    safeColor(u.uColorInner.value, target.palette.inner)
    safeColor(u.uColorOuter.value, target.palette.outer)
    safeColor(u.uColorCore.value, target.palette.core)
    const safeNum = (cur, tgt) => {
      const v = cur + (tgt - cur) * safeK
      return isFinite(v) ? v : tgt
    }
    u.uFlowSpeed.value     = safeNum(u.uFlowSpeed.value, target.behavior.flow)
    u.uNoiseAmp.value      = safeNum(u.uNoiseAmp.value, target.behavior.noiseAmp)
    u.uSizeScale.value     = safeNum(u.uSizeScale.value, target.behavior.sizeScale)
    u.uMouseStrength.value = safeNum(u.uMouseStrength.value, target.behavior.mouseStrength)
    u.uOrbitAmp.value      = safeNum(u.uOrbitAmp.value, target.behavior.orbitAmp)
    u.uOrbitTempo.value    = safeNum(u.uOrbitTempo.value, target.behavior.orbitTempo)
    u.uCoreLift.value      = safeNum(u.uCoreLift.value, target.behavior.coreLift)
    u.uDotGain.value       = safeNum(u.uDotGain.value, target.behavior.dotGain)

    // —— v1.4 章节转场仪式：粒子凝滞 + 环形冲击波 ─—
    const tr = transitionRef?.current
    if (tr && tr.active) {
      const elapsed = performance.now() - tr.startTime
      // 0~1.5s：凝滞到 5% 流速；1.5~3s：线性恢复
      let freeze = 0.0
      if (elapsed < 1500) {
        freeze = 0.95
      } else if (elapsed < 3000) {
        freeze = 0.95 * (1.0 - (elapsed - 1500) / 1500)
      }
      u.uTransitionFreeze.value += (freeze - u.uTransitionFreeze.value) * 0.2
      // 环形冲击波：0~2s 内从中心向外扫到 r=5.0
      const ringTarget = elapsed < 2000 ? (elapsed / 2000) * 5.0 : -10.0
      u.uTransitionRing.value = ringTarget
    } else {
      // 转场结束，平滑归零
      u.uTransitionFreeze.value += (0.0 - u.uTransitionFreeze.value) * 0.15
      u.uTransitionRing.value = -10.0
    }

    // —— 分辨率环境补偿 ——
    if (pointEnv) {
      const hRatio = Math.pow(state.size.height / 1050, 1.10)
      const envTarget =
        Math.min(gl.getPixelRatio(), 2.0) * Math.max(0.30, Math.min(hRatio, 3.0))
      u.uPointEnv.value += (envTarget - u.uPointEnv.value) * 0.08
    }

    // mouse 平滑跟随
    const m = u.uMouse.value
    m.x += (mouseRef.current.x - m.x) * 0.12
    m.y += (mouseRef.current.y - m.y) * 0.12

    // click 冲击波
    if (clickRef && clickRef.current && clickRef.current.pending) {
      u.uClickPos.value.set(clickRef.current.x, clickRef.current.y)
      u.uClickTime.value = t
      clickRef.current.pending = false
    }
    const elapsed = t - u.uClickTime.value
    u.uClickStrength.value = Math.max(0, 1.0 - elapsed / 2.0)

    // audio 平滑跟随
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
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
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
