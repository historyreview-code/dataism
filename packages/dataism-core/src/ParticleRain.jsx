import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import rainVert from './shaders/rain.vert?raw'
import rainFrag from './shaders/rain.frag?raw'
import { useRegisterRebuild } from './ContextRecovery.jsx'
import { getRainCount } from './adaptive.js'

const COUNT = getRainCount()
// 与 ParticleCloud 同步的主题过渡速率
const THEME_LERP_RATE = 0.25
// v1.0 原版雨色 = 纯白（不传 theme 时保持零回归）
const RAIN_WHITE = '#FFFFFF'

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── 生成雨滴分布数据（纯 CPU 侧）──
function generateRainData(count) {
  const rand = mulberry32(42)
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const speeds = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    positions[i3]     = (rand() * 2 - 1) * 3.2
    positions[i3 + 1] = (rand() * 2 - 1) * 2.5
    positions[i3 + 2] = (rand() * 2 - 1) * 0.4 - 0.5
    seeds[i]  = rand()
    speeds[i] = 0.6 + rand() * 1.4
  }

  return { positions, seeds, speeds }
}

/**
 * ParticleRain —— 顶部坠落的细雨（v1.4 转场仪式兼容版）
 *
 * 新增：WebGL 上下文丢失恢复（ContextRecovery 兼容）
 *       转场凝滞（transitionRef 同步 freeze）
 */
export default function ParticleRain({ theme, pointEnv, transitionRef }) {
  const matRef = useRef()
  const pointsRef = useRef()
  const { gl } = useThree()

  const rainColorRef = useRef(null)

  // ── 保存原始 CPU 数据，用于上下文恢复时重建 ──
  const dataRef = useRef(null)
  if (!dataRef.current) {
    dataRef.current = generateRainData(COUNT)
  }

  const { geometry, uniforms } = useMemo(() => {
    const d = dataRef.current
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(d.positions.slice(), 3))
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(d.seeds.slice(), 1))
    geo.setAttribute('aSpeed',   new THREE.BufferAttribute(d.speeds.slice(), 1))

    return {
      geometry: geo,
      uniforms: {
        uTime:       { value: 0 },
        uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.5) },
        uRainColor:  { value: new THREE.Color(RAIN_WHITE) },
        uRainEnv:    { value: 1.0 },
        uTransitionFreeze: { value: 0.0 },
      },
    }
  }, [gl])

  // ── 重建函数：WebGL 上下文恢复时调用 ──
  const rebuild = useCallback(() => {
    const d = dataRef.current
    if (!d || !pointsRef.current) return

    pointsRef.current.geometry?.dispose?.()
    pointsRef.current.material?.dispose?.()

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(d.positions.slice(), 3))
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(d.seeds.slice(), 1))
    geo.setAttribute('aSpeed',   new THREE.BufferAttribute(d.speeds.slice(), 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:       { value: 0 },
        uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.5) },
        uRainColor:  { value: new THREE.Color(RAIN_WHITE) },
        uRainEnv:    { value: 1.0 },
        uTransitionFreeze: { value: 0.0 },
      },
      vertexShader: rainVert,
      fragmentShader: rainFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    pointsRef.current.geometry = geo
    pointsRef.current.material = mat
    matRef.current = mat

    console.info('[ParticleRain] GPU resources rebuilt after context restore')
  }, [gl])

  useRegisterRebuild(rebuild)

  // theme 变化 → 预构建目标色，过渡在 useFrame 里做
  useEffect(() => {
    rainColorRef.current = new THREE.Color(theme?.palette?.core || RAIN_WHITE)
  }, [theme])

  useFrame((state, dt) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime

    if (pointEnv) {
      const hRatio = Math.pow(state.size.height / 1050, 1.10)
      const envTarget =
        Math.min(gl.getPixelRatio(), 2.0) * Math.max(0.30, Math.min(hRatio, 3.0))
      const u = matRef.current.uniforms
      u.uRainEnv.value += (envTarget - u.uRainEnv.value) * 0.08
    }

    if (rainColorRef.current) {
      const k = 1 - Math.exp(-THEME_LERP_RATE * Math.min(dt, 0.1))
      matRef.current.uniforms.uRainColor.value.lerp(rainColorRef.current, k)
    }

    // ── v1.4 转场凝滞：同步 ParticleCloud 的 freeze 状态 ──
    const tr = transitionRef?.current
    const u = matRef.current.uniforms
    if (tr && tr.active) {
      const elapsed = performance.now() - tr.startTime
      let freeze = 0.0
      if (elapsed < 1500) {
        freeze = 0.95
      } else if (elapsed < 3000) {
        freeze = 0.95 * (1.0 - (elapsed - 1500) / 1500)
      }
      u.uTransitionFreeze.value += (freeze - u.uTransitionFreeze.value) * 0.2
    } else {
      u.uTransitionFreeze.value += (0.0 - u.uTransitionFreeze.value) * 0.15
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={rainVert}
        fragmentShader={rainFrag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
