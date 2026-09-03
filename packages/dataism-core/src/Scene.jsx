import { useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import ParticleCloud from './ParticleCloud'
import ParticleRain from './ParticleRain'
import PointerCatcher from './PointerCatcher'
import { ContextRecoveryBoundary } from './ContextRecovery'
import PostProcessing from './PostProcessing'

// 默认构图适配：让椭圆云横向铺满视口（云 x 半径 3.2 → 目标占视口宽 ~86%）
// 相机基准：z=8、fov=55（App 默认相机）；仅随视口尺寸变化，缩放交互不受影响。
const CAM_Z = 8
const CAM_FOV_DEG = 55
const CLOUD_W = 6.4
const FILL = 0.86
const MIN_SCALE = 0.55

function FitGroup({ children }) {
  const ref = useRef()
  const size = useThree((s) => s.size)
  const scale = useMemo(() => {
    const aspect = size.width / size.height
    const vFov = (CAM_FOV_DEG * Math.PI) / 180
    const visibleW = 2 * CAM_Z * Math.tan(vFov / 2) * aspect
    return Math.max(MIN_SCALE, (visibleW * FILL) / CLOUD_W)
  }, [size.width, size.height])
  return (
    <group ref={ref} scale={scale}>
      {children}
    </group>
  )
}

export default function Scene({ mouseRef, clickRef, audioLevelsRef, theme, transitionRef }) {
  return (
    <ContextRecoveryBoundary>
      <color attach="background" args={['#000000']} />

      <FitGroup>
        {/* 顶部雨（雨色跟随章节 core 高光色，缺省 = v1.0 纯白；分辨率自适应） */}
        <ParticleRain theme={theme} pointEnv transitionRef={transitionRef} />

        {/* 主粒子云（theme 控制配色与行为，缺省 = v1.0 原版；分辨率自适应） */}
        <ParticleCloud
          mouseRef={mouseRef}
          clickRef={clickRef}
          audioLevelsRef={audioLevelsRef}
          theme={theme}
          pointEnv
          transitionRef={transitionRef}
        />
      </FitGroup>

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

      {/* v1.4 审美跃迁：Bloom 辉光 + Vignette 暗角 */}
      <PostProcessing />
    </ContextRecoveryBoundary>
  )
}
