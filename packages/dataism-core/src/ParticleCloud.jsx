import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'

import cloudVert from './shaders/cloud.vert?raw'
import cloudFrag from './shaders/cloud.frag?raw'

const COUNT = 50000

// Mulberry32：确定性 PRNG，让粒子分布每次刷新都一样
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function ParticleCloud({ mouseRef, clickRef, audioLevelsRef }) {
  const matRef = useRef()
  const { gl } = useThree()

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
        uMouseStrength: { value: 1.5 },
        uPixelRatio:    { value: Math.min(gl.getPixelRatio(), 1.5) },
        uSizeBase:      { value: 8.0 },
        uClickPos:      { value: new THREE.Vector2(99, 99) },
        uClickTime:     { value: -100.0 },   // 负大值 = 无冲击波
        uClickStrength: { value: 0.0 },      // 0~1 自动衰减
        uAudioLow:      { value: 0 },
        uAudioMid:      { value: 0 },
        uAudioHigh:     { value: 0 },
        uAudioBeat:     { value: 0 },
      },
    }
  }, [gl])

  useFrame((state, dt) => {
    if (!matRef.current) return
    const t = state.clock.elapsedTime
    matRef.current.uniforms.uTime.value = t

    // mouse 平滑跟随
    const u = matRef.current.uniforms.uMouse.value
    u.x += (mouseRef.current.x - u.x) * 0.12
    u.y += (mouseRef.current.y - u.y) * 0.12

    // click 冲击波：处理 pending 标记 + 2 秒线性衰减
    if (clickRef && clickRef.current && clickRef.current.pending) {
      // 把 clickPos 同步给 shader，记录点击瞬间的时间
      matRef.current.uniforms.uClickPos.value.set(
        clickRef.current.x,
        clickRef.current.y,
      )
      matRef.current.uniforms.uClickTime.value = t
      clickRef.current.pending = false   // 清掉标记
    }
    // 强度按时间自动衰减
    const elapsed = t - matRef.current.uniforms.uClickTime.value
    matRef.current.uniforms.uClickStrength.value = Math.max(0, 1.0 - elapsed / 2.0)

    // audio 平滑跟随（lerp 让电平更柔，避免频谱"锯齿"）
    if (audioLevelsRef && audioLevelsRef.current) {
      const lerp = 0.25
      const u = matRef.current.uniforms
      u.uAudioLow.value  += (audioLevelsRef.current.low  - u.uAudioLow.value)  * lerp
      u.uAudioMid.value  += (audioLevelsRef.current.mid  - u.uAudioMid.value)  * lerp
      u.uAudioHigh.value += (audioLevelsRef.current.high - u.uAudioHigh.value) * lerp
      u.uAudioBeat.value += (audioLevelsRef.current.beat - u.uAudioBeat.value) * 0.5
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