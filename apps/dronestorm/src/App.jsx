import { useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  AudioController,
  AudioOverlay,
  LoadingScreen,
  InteractionPulse,
  ErrorBoundary,
  useDataSource,
} from '@studio/dataism-core'

import WindField from './components/WindField'
import Credits from './Credits'
import { labels } from './data/labels'
import {
  fetchAtlanticWind,
  particlesFromWind,
  stormIntensity,
} from './data/noaa'

// 5min 缓存（NOAA 数据每小时更新一次，缓存长一点也行）
const NOAA_CACHE_MS = 5 * 60 * 1000

export default function App() {
  const mouseRef = useRef({ x: 99, y: 99 })
  const clickRef = useRef({ x: 99, y: 99, pending: false })
  const audioLevelsRef = useRef({ low: 0, mid: 0, high: 0, beat: 0 })
  const interactionRef = useRef({ level: 0, lastMoveAt: 0, lastClickAt: 0 })

  const [loaded, setLoaded] = useState(false)
  const [fading, setFading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('audio') === '1'
  })
  const [audioStartSignal, setAudioStartSignal] = useState(0)

  // —— 数据源：NOAA GFS 大西洋风场（带 localStorage 缓存）
  const { data: weather, loading: dataLoading, error: dataError } = useDataSource(
    'dronestorm.noaa.atlantic.gfs',
    fetchAtlanticWind,
    { maxAgeMs: NOAA_CACHE_MS },
  )

  // —— 粒子化（天气数据 → 50k 粒子位置/速度）
  const particleData = weather ? particlesFromWind(weather, 50000) : null

  // —— 风暴强度（0~1）
  const stormLevel = weather ? stormIntensity(weather) : 0

  // —— 音轨模式自动切换：默认 Drone，stormLevel > 0.6 切换到 Storm
  const [audioMode, setAudioMode] = useState('drone')
  useEffect(() => {
    if (stormLevel > 0.6) {
      setAudioMode('storm')
    } else {
      setAudioMode('drone')
    }
  }, [stormLevel])

  const enableAudio = () => {
    setAudioEnabled(true)
    setAudioStartSignal((v) => v + 1)
  }

  // 移动端 fallback
  useEffect(() => {
    const check = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmall = window.innerWidth < 768
      setIsMobile(isTouch && isSmall)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Loading fade out
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 800)
    const t2 = setTimeout(() => setLoaded(true), 2400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // 全屏键 F
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 移动端 fallback
  if (isMobile) {
    return (
      <div className="mobile-fallback">
        <div className="mobile-fallback__title">DroneStorm</div>
        <div className="mobile-fallback__hint">
          This piece is best viewed on a desktop browser.
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        camera={{ position: [0, 0, 8], fov: 55, near: 0.1, far: 100 }}
        onPointerMove={(e) => {
          if (e.pointer && Number.isFinite(e.pointer.x)) {
            mouseRef.current.x = e.pointer.x * 1.5  // 配合 wind.vert 的 NDC 尺度
            mouseRef.current.y = e.pointer.y * 0.6
            const now = performance.now()
            const dt = Math.max(16, now - interactionRef.current.lastMoveAt)
            const inc = 0.04 * Math.min(1, 50 / dt)
            interactionRef.current.level = Math.min(1, interactionRef.current.level + inc)
            interactionRef.current.lastMoveAt = now
          }
        }}
        onPointerLeave={() => {
          mouseRef.current.x = 99
          mouseRef.current.y = 99
        }}
        onPointerDown={() => {
          interactionRef.current.level = Math.min(1, interactionRef.current.level + 0.35)
          interactionRef.current.lastClickAt = performance.now()
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000', 1)
        }}
      >
        {particleData && (
          <WindField
            particleData={particleData}
            audioLevelsRef={audioLevelsRef}
            mouseRef={mouseRef}
            clickClick={clickRef}
            stormLevel={stormLevel}
          />
        )}
        <AudioController
          audioLevelsRef={audioLevelsRef}
          enabled={audioEnabled}
          startSignal={audioStartSignal}
          mode={audioMode}
          interactionRef={interactionRef}
        />
      </Canvas>

      <div className="overlay">
        <div className="labels">
          {labels.map((l) => (
            <div key={l.text} className={`label label--${l.align}`}>
              <span className="label__slash">/</span>
              <span className="label__text">{l.text}</span>
            </div>
          ))}
        </div>

        <div className="hint">
          {dataLoading
            ? 'fetching NOAA GFS wind data…'
            : dataError
              ? 'data error — showing last cached wind'
              : `Atlantic wind field · 16×16 grid · ${stormLevel > 0.6 ? '⚠ STORM' : 'calm'} · move mouse · click to ripple`}
        </div>
      </div>

      <Credits audioMode={audioMode} onModeChange={setAudioMode} stormLevel={stormLevel} />
      <AudioOverlay
        enabled={audioEnabled}
        onEnable={enableAudio}
      />
      <InteractionPulse interactionRef={interactionRef} />

      {!loaded && <LoadingScreen fading={fading} />}
    </div>
  )
}