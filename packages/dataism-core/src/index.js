// @studio/dataism-core
// Public entry — apps import from '@studio/dataism-core'

// Particle engine
export { default as ParticleCloud } from './ParticleCloud.jsx'
export { default as ParticleRain } from './ParticleRain.jsx'
export { default as Scene } from './Scene.jsx'
export { default as PointerCatcher } from './PointerCatcher.jsx'

// Post-processing（v1.4 审美跃迁：Bloom + Vignette）
export { default as PostProcessing } from './PostProcessing.jsx'

// WebGL Context Recovery（展厅级 7×24 运行刚需）
export {
  ContextRecoveryBoundary,
  useRegisterRebuild,
  useContextLost,
} from './ContextRecovery.jsx'

// Audio engine
export { default as AudioController } from './AudioController.jsx'
export { default as AudioOverlay } from './AudioOverlay.jsx'
export { presets, presetOrder } from './audio/presets.js'

// Overlays
export { default as LoadingScreen } from './LoadingScreen.jsx'
export { default as ErrorBoundary } from './ErrorBoundary.jsx'
export { default as InteractionPulse } from './InteractionPulse.jsx'

// Base styles (CSS — apps can import as side-effect)
import './styles.css'
import './loading.css'
import './audio-overlay.css'
import './interaction-pulse.css'

// Data-source hooks for derivative apps (dronestorm / salmonrun / 风场)
export { useDataSource } from './useDataSource.js'
export { useWindData, windToBehavior } from './useWindData.js'
export { useSalmonData, salmonToBehavior, getMigrationPhase } from './useSalmonData.js'

// Chapter engine（十二时辰章节轮换 —— 展品核心）
export { CHAPTERS, CHAPTER_MS, chapterClockAt, chapterByBranch, chapterById } from './chapters.js'
export { useChapter } from './useChapter.js'

// Live-sound input（现场声音 → 粒子驱动，只分析不外放）
export { useMicInput } from './useMicInput.js'

// Cursor idle（光标闲置隐匿 —— 隐去后算法仍在原位继续作用）
export { useCursorIdle } from './useCursorIdle.js'

// 展厅心跳系统（v1.5：远程存活监控）
export { startHeartbeat } from './heartbeat.js'

// 性能自适应分级（展厅级设备兼容性：GPU 检测 → 粒子数 LOD）
export { getCloudCount, getRainCount, getTier } from './adaptive.js'

// Shader URLs (apps can re-import if they want to wrap)
// GLSL strings are imported via Vite ?raw in the source files already.
