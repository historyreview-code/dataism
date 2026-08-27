import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'

import {
  Scene,
  AudioController,
  AudioOverlay,
  LoadingScreen,
  InteractionPulse,
  useChapter,
  useMicInput,
  useCursorIdle,
  chapterByBranch,
  presets,
} from '@studio/dataism-core'

import ChapterCard from './ChapterCard'
import ClockStrip from './ClockStrip'
import Credits from './Credits'
import './styles.css'

// —— 待机吸引模式 ——
const IDLE_MS = 45000 // 无互动多久后进入自我演示
const ATTRACT_RIPPLE_MS = 8000 // 自动演示时每隔多久放一朵柔和涟漪

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const kiosk = params.get('kiosk') === '1'
  const wantMic = params.get('mic') === '1'
  // ?duration=10 → 每 10 秒换一章（演示/展厅快放）；缺省按真实时辰两小时一章
  const durationSec = parseFloat(params.get('duration'))
  // ?chapter=子..亥 → 钉在指定章节（演示）
  const chapterParam = params.get('chapter')

  const durationMs = chapterParam
    ? 6 * 60 * 60 * 1000 // 固定章节：合成时钟 6h 一章 = 整场不换
    : Number.isFinite(durationSec) && durationSec > 0
      ? durationSec * 1000
      : null
  const startChapter = useMemo(() => {
    if (!chapterParam) return 0
    const c = chapterByBranch(chapterParam)
    return c ? c.index : 0
  }, [chapterParam])

  const mouseRef = useRef({ x: 99, y: 99 })
  const clickRef = useRef({ x: 99, y: 99, pending: false })
  const toneLevelsRef = useRef({ low: 0, mid: 0, high: 0, beat: 0 })
  const interactionRef = useRef({ level: 0, lastMoveAt: 0, lastClickAt: 0 })
  const lastInputRef = useRef(performance.now())

  const mic = useMicInput()
  // 光标闲置隐匿：静止 3s 隐去光标符号，粒子按其最后位置继续旋涡；一动即唤醒
  const cursorIdle = useCursorIdle(3000)
  // 双通道音频：Tone 合成音景 + 麦克风现场声，逐频段取最大值驱动粒子
  const audioLevelsRefs = useMemo(() => [toneLevelsRef, mic.levelsRef], [])

  const [loaded, setLoaded] = useState(false)
  const [fading, setFading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(() => params.get('audio') === '1')
  const [audioStartSignal, setAudioStartSignal] = useState(0)
  // 手动音景覆盖（?mode= 或 Credits 里选）；不覆盖时跟随章节
  const [manualMode, setManualMode] = useState(() => params.get('mode'))

  const { chapter, nextChapter, progress, remainingMs, forceNext } = useChapter({
    durationMs,
    startChapter,
  })

  const theme = useMemo(
    () => ({ palette: chapter.palette, behavior: chapter.behavior }),
    [chapter],
  )
  const audioMode = presets[manualMode]?.available ? manualMode : chapter.soundscape

  const enableAudio = () => {
    setAudioEnabled(true)
    setAudioStartSignal((v) => v + 1)
  }

  // —— 换章标题卡：载入时等 loading 渐隐后亮第一张，此后每次换章即亮 ——
  const [card, setCard] = useState({ chapter: null, visible: false })
  const firstChapterRef = useRef(true)
  useEffect(() => {
    const delay = firstChapterRef.current ? 2400 : 0
    firstChapterRef.current = false
    const t = setTimeout(() => setCard({ chapter, visible: true }), delay)
    return () => clearTimeout(t)
  }, [chapter])
  useEffect(() => {
    if (!card.visible) return
    const t = setTimeout(() => setCard((c) => ({ ...c, visible: false })), 9000)
    return () => clearTimeout(t)
  }, [card])

  // —— 移动端检测（展品以横屏大屏为主，移动端给引导文案）——
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

  // —— Loading 渐隐 ——
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 800)
    const t2 = setTimeout(() => setLoaded(true), 2400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // —— 键盘：F 全屏 / N 下一章（演示）/ I 关于 ——
  const [creditsOpen, setCreditsOpen] = useState(false)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
      } else if (e.key === 'n' || e.key === 'N') {
        forceNext()
      } else if (e.key === 'i' || e.key === 'I') {
        if (!kiosk) setCreditsOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [forceNext, kiosk])

  // —— kiosk：首个手势进全屏 + 屏幕常亮（Wake Lock）+ 禁右键 ——
  useEffect(() => {
    if (!kiosk) return
    const goFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch?.(() => {})
      }
    }
    window.addEventListener('pointerdown', goFullscreen)
    const noMenu = (e) => e.preventDefault()
    window.addEventListener('contextmenu', noMenu)

    let lock = null
    const requestWake = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen')
      } catch {
        /* 浏览器不支持则忽略（插座供电的屏幕通常也无妨） */
      }
    }
    requestWake()
    const onVis = () => {
      if (document.visibilityState === 'visible') requestWake()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      window.removeEventListener('pointerdown', goFullscreen)
      window.removeEventListener('contextmenu', noMenu)
      document.removeEventListener('visibilitychange', onVis)
      lock?.release?.()
    }
  }, [kiosk])

  // —— 麦克风：权限已授予则静默接入（展厅操作员首次授权后永久生效）——
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await navigator.permissions.query({ name: 'microphone' })
        if (!cancelled && p.state === 'granted') mic.start()
        p.onchange = () => {
          if (!cancelled && p.state === 'granted') mic.start()
        }
      } catch {
        /* Safari / Firefox 不支持查询麦克风权限，走手动按钮 */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // —— kiosk + ?mic=1：首个手势时请求麦克风（操作员应已在 setup 时授权）——
  useEffect(() => {
    if (!(kiosk && wantMic)) return
    const go = () => mic.start()
    window.addEventListener('pointerdown', go, { once: true })
    return () => window.removeEventListener('pointerdown', go)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kiosk, wantMic])

  // —— 待机吸引模式：45s 无互动 → 光标自动巡游 + 定期柔和涟漪，任何真实输入即让位 ——
  useEffect(() => {
    let raf = 0
    let angle = Math.random() * Math.PI * 2
    let lastRipple = 0
    let lastT = performance.now()
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - lastT) / 1000)
      lastT = now
      if (now - lastInputRef.current < IDLE_MS) return
      angle += dt * 0.22
      mouseRef.current.x = Math.cos(angle) * 2.3
      mouseRef.current.y = Math.sin(angle * 0.8) * 0.55
      if (now - lastRipple > ATTRACT_RIPPLE_MS) {
        lastRipple = now
        clickRef.current.x = (Math.random() - 0.5) * 3.5
        clickRef.current.y = (Math.random() - 0.5) * 1.2
        clickRef.current.pending = true
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const markInput = useCallback(() => {
    lastInputRef.current = performance.now()
  }, [])

  if (isMobile) {
    return (
      <div className="mobile-fallback">
        <div className="mobile-fallback__title">时辰 · Twelve Hours</div>
        <div className="mobile-fallback__hint">
          这件作品为横屏大屏而作——请在桌面浏览器或展厅屏幕上观看。
        </div>
      </div>
    )
  }

  return (
    <div className={`app exhibit-app ${kiosk ? 'is-kiosk' : ''} ${cursorIdle ? 'cursor-ghosted' : ''}`}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        camera={{ position: [0, 0, 8], fov: 55, near: 0.1, far: 100 }}
        onPointerMove={(e) => {
          markInput()
          if (e.pointer && Number.isFinite(e.pointer.x)) {
            mouseRef.current.x = e.pointer.x * 3.2
            mouseRef.current.y = e.pointer.y * 0.9
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
          markInput()
          interactionRef.current.level = Math.min(1, interactionRef.current.level + 0.35)
          interactionRef.current.lastClickAt = performance.now()
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000', 1)
        }}
      >
        <Scene
          mouseRef={mouseRef}
          clickRef={clickRef}
          audioLevelsRef={audioLevelsRefs}
          theme={theme}
        />
        <AudioController
          audioLevelsRef={toneLevelsRef}
          enabled={audioEnabled}
          startSignal={audioStartSignal}
          mode={audioMode}
          interactionRef={interactionRef}
        />
      </Canvas>

      <div className="overlay">
        {!kiosk && (
          <div className="exhibit-brand">
            <div className="exhibit-brand__cn">时辰</div>
            <div className="exhibit-brand__en">Twelve Hours · Dataism</div>
          </div>
        )}
      </div>

      <ChapterCard chapter={card.chapter} visible={card.visible} />

      <ClockStrip
        chapter={chapter}
        nextChapter={nextChapter}
        progress={progress}
        remainingMs={remainingMs}
        micLive={mic.status === 'live'}
        kiosk={kiosk}
        pinned={Boolean(chapterParam)}
      />

      {mic.status === 'idle' && !kiosk && (
        <button
          type="button"
          className="mic-chip"
          onClick={() => mic.start()}
          title="接入现场声音：观众的脚步、谈话与掌声将驱动粒子（只分析、不外放）"
        >
          ◉ 启用现场声
        </button>
      )}
      {mic.status === 'live' && (
        <div className="mic-chip mic-chip--live" title="现场声已接入（只分析、不外放）">
          ◉ 现场声
        </div>
      )}

      {!kiosk && (
        <div className="hint">移动 · 点击涟漪 · 现场声 · F 全屏 · N 下一辰</div>
      )}

      {!kiosk && (
        <button
          type="button"
          className="info-toggle"
          aria-label="关于这件作品"
          title="关于 · 音景 · 十二时辰（快捷键 I）"
          onClick={() => setCreditsOpen((v) => !v)}
        >
          i
        </button>
      )}

      {!kiosk && (
        <Credits
          open={creditsOpen}
          onOpenChange={setCreditsOpen}
          chapter={chapter}
          onModeChange={setManualMode}
          manualMode={manualMode}
        />
      )}

      <AudioOverlay enabled={audioEnabled} onEnable={enableAudio} kiosk={kiosk} />
      <InteractionPulse interactionRef={interactionRef} />

      {!loaded && <LoadingScreen fading={fading} />}
    </div>
  )
}
