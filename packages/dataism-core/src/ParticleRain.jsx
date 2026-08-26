import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import rainVert from './shaders/rain.vert?raw'
import rainFrag from './shaders/rain.frag?raw'

const COUNT = 4000

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function ParticleRain() {
  const matRef = useRef()
  const { gl } = useThree()

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
      },
    }
  }, [gl])

  useFrame((state) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
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