import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import windVert from '../shaders/wind.vert?raw'
import windFrag from '../shaders/wind.frag?raw'

export default function WindField({ particleData, audioLevelsRef, mouseRef, clickClick, stormLevel }) {
  const matRef = useRef()
  const { gl } = useThree()

  const { geometry, uniforms } = useMemo(() => {
    if (!particleData) return { geometry: null, uniforms: null }

    const { positions, velocities, baseSpeeds, seeds, sizes } = particleData

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 2))
    geo.setAttribute('aBaseSpeed', new THREE.BufferAttribute(baseSpeeds, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    return {
      geometry: geo,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.5) },
        uSizeBase: { value: 8.0 },
        uStormLevel: { value: 0 },
      },
    }
  }, [particleData, gl])

  useFrame((state) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uStormLevel.value = stormLevel ?? 0
  })

  if (!geometry || !uniforms) return null

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={windVert}
        fragmentShader={windFrag}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}