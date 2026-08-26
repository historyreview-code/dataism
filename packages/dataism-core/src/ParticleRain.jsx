import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import rainVert from './shaders/rain.vert?raw'
import rainFrag from './shaders/rain.frag?raw'

const COUNT = 4000
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

/**
 * ParticleRain —— 顶部坠落的细雨
 * theme 变化时雨色跟随章节 core 高光色平滑过渡；
 * 不传 theme 保持 v1.0 纯白（零回归）。
 */
export default function ParticleRain({ theme, pointEnv }) {
  const matRef = useRef()
  const { gl } = useThree()

  const rainColorRef = useRef(null)

  const { geometry, uniforms } = useMemo(() => {
    const rand = mulberry32(42)
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT)
    const speeds = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      positions[i3]     = (rand() * 2 - 1) * 3.2          // x 横跨视野
      positions[i3 + 1] = (rand() * 2 - 1) * 2.5          // y 随机起点
      positions[i3 + 2] = (rand() * 2 - 1) * 0.4 - 0.5    // z 略后景
      seeds[i]  = rand()
      speeds[i] = 0.6 + rand() * 1.4
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aSpeed',   new THREE.BufferAttribute(speeds, 1))

    return {
      geometry: geo,
      uniforms: {
        uTime:       { value: 0 },
        uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.5) },
        uRainColor:  { value: new THREE.Color(RAIN_WHITE) },
        uRainEnv:    { value: 1.0 },   // 分辨率环境系数（pointEnv=true 时逐帧补偿）
      },
    }
  }, [gl])

  // theme 变化 → 预构建目标色，过渡在 useFrame 里做
  useEffect(() => {
    rainColorRef.current = new THREE.Color(theme?.palette?.core || RAIN_WHITE)
  }, [theme])

  useFrame((state, dt) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime

    // 分辨率环境补偿（与 ParticleCloud 同公式，雨丝在大窗下也保持观感密度）
    if (pointEnv) {
      const envTarget =
        Math.min(gl.getPixelRatio(), 2.0) *
        Math.max(0.85, Math.min(state.size.height / 1050, 1.9))
      const u = matRef.current.uniforms
      u.uRainEnv.value += (envTarget - u.uRainEnv.value) * 0.08
    }

    if (rainColorRef.current) {
      const k = 1 - Math.exp(-THEME_LERP_RATE * Math.min(dt, 0.1))
      matRef.current.uniforms.uRainColor.value.lerp(rainColorRef.current, k)
    }
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
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
