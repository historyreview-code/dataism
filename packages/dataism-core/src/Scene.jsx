import { OrbitControls } from '@react-three/drei'

import ParticleCloud from './ParticleCloud'
import ParticleRain from './ParticleRain'
import PointerCatcher from './PointerCatcher'

export default function Scene({ mouseRef, clickRef, audioLevelsRef, theme }) {
  return (
    <>
      <color attach="background" args={['#000000']} />

      {/* 顶部雨 */}
      <ParticleRain />

      {/* 主粒子云（theme 控制配色与行为，缺省 = v1.0 原版） */}
      <ParticleCloud
        mouseRef={mouseRef}
        clickRef={clickRef}
        audioLevelsRef={audioLevelsRef}
        theme={theme}
      />

      {/* 不可见的 pointer 接收 plane（铺满视野） */}
      <PointerCatcher mouseRef={mouseRef} clickRef={clickRef} />

      {/* 仅允许缩放，不旋转/平移，避免破坏构图 */}
      <OrbitControls
        enableRotate={false}
        enablePan={false}
        enableZoom
        minDistance={4}
        maxDistance={14}
        zoomSpeed={0.5}
      />
    </>
  )
}