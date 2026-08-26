import { useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Scene,
  AudioController,
  AudioOverlay,
  LoadingScreen,
  InteractionPulse,
} from '@studio/dataism-core'

import Credits from './Credits'
import { labels } from './data/labels'

export default function App() {
  const mouseRef = useRef({ x: 99, y: 99 })
  const clickRef = useRef({ x: 99, y: 99, pending: false })
  const audioLevelsRef = useRef({ low: 0, mid: 0, high: 0, beat: 0 })
  // 互动强度：pointermove 累加、衰减、应用到 master volume
  const interactionRef = useRef({ level: 0, lastMoveAt: 0, lastClickAt: 0 })

  const [loaded, setLoaded] = useState(false)
  const [fading, setFading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  // ?audio=1 query string 允许绕过 autoplay 直接启动（用于演示录屏）
  const [audioEnabled, setAudioEnabled] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('audio') === '1'
  })
  // startSignal 是递增整数；每次 AudioOverlay 上"tap to enable"按钮被点击就 +1
  const [audioStartSignal, setAudioStartSignal] = useState(0)
  // 当前音轨场景（'drift' / 'bloom' / 'pulse' / 'storm' / 'tide' / 'drone'）
  // ?mode=drone 等 query string 可直接预设（用于演示）
  const [audioMode, setAudioMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const m = params.get('mode')
    return m && ['drift','bloom','pulse','storm','tide','drone'].includes(m) ? m : 'drift'
  })
  const enableAudio = () => {
    setAudioEnabled(true)
    setAudioStartSignal((v) => v + 1)
  }

  // 检测移动端（粗略）
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

  // Loading fade out：800ms 后启动 1.5s 渐变
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 800)
    const t2 = setTimeout(() => setLoaded(true), 2400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // 全屏键 F / Esc
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

  // 录制视频用的自动演示
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const demoMode = params.get('demo')
    if (!demoMode) return

    const presets = {
      '1': [
        { t: 1500, type: 'mouse', x: 1.5,  y: 0.0 },
        { t: 4000, type: 'click', x: 0.0,  y: 0.0 },
        { t: 6500, type: 'mouse', x: -1.5, y: 0.3 },
        { t: 8500, type: 'click', x: 1.0,  y: -0.2 },
      ],
      'mouse': [
        { t: 800,  type: 'mouse', x: 1.8,  y: 0.4 },
        { t: 3000, type: 'mouse', x: -0.5, y: -0.6 },
        { t: 5500, type: 'mouse', x: -1.8, y: 0.2 },
        { t: 8000, type: 'mouse', x: 1.0,  y: -0.4 },
      ],
      'click': [
        { t: 1200, type: 'click', x: -1.2, y: 0.0 },
        { t: 3500, type: 'click', x: 1.5,  y: -0.3 },
        { t: 5800, type: 'click', x: 0.0,  y: 0.6 },
        { t: 8200, type: 'click', x: -0.5, y: -0.5 },
      ],
    }

    const events = presets[demoMode] || presets['1']
    const timers = events.map((ev) =>
      setTimeout(() => {
        if (ev.type === 'mouse') {
          mouseRef.current.x = ev.x * 3.2
          mouseRef.current.y = ev.y * 0.9
        } else if (ev.type === 'click') {
          clickRef.current.x = ev.x * 3.2
          clickRef.current.y = ev.y * 0.9
          clickRef.current.pending = true
        }
      }, ev.t),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  // 移动端 fallback
  if (isMobile) {
    return (
      <div className="mobile-fallback">
        <div className="mobile-fallback__title">Dataism — 17</div>
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
            mouseRef.current.x = e.pointer.x * 3.2
            mouseRef.current.y = e.pointer.y * 0.9
            // 互动强度：移动累加（按时间间隔衰减贡献）
            const now = performance.now()
            const dt = Math.max(16, now - interactionRef.current.lastMoveAt)
            const inc = 0.04 * Math.min(1, 50 / dt) // 移动越快、累加越快
            interactionRef.current.level = Math.min(1, interactionRef.current.level + inc)
            interactionRef.current.lastMoveAt = now
          }
        }}
        onPointerLeave={() => {
          mouseRef.current.x = 99
          mouseRef.current.y = 99
        }}
        onPointerDown={() => {
          // 点击大幅累加
          interactionRef.current.level = Math.min(1, interactionRef.current.level + 0.35)
          interactionRef.current.lastClickAt = performance.now()
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000', 1)
        }}
      >
        <Scene mouseRef={mouseRef} clickRef={clickRef} audioLevelsRef={audioLevelsRef} />
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

        <div className="hint">move mouse · click to ripple · F for fullscreen</div>
      </div>

      <Credits audioMode={audioMode} onModeChange={setAudioMode} />
      <AudioOverlay
        enabled={audioEnabled}
        onEnable={enableAudio}
      />
      <InteractionPulse interactionRef={interactionRef} />

      {!loaded && <LoadingScreen fading={fading} />}
    </div>
  )
}