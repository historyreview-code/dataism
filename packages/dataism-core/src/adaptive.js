/**
 * 性能自适应分级系统 —— v1.2 展厅加固
 *
 * 根据设备 GPU 能力自动选择合适的粒子数量，
 * 展厅部署时可通过 URL 参数强制指定等级。
 *
 * Tier 分级：
 *   high   → 50k 粒子（Apple Silicon / 中高端独显）
 *   medium → 25k 粒子（Intel 核显 / Mali GPU / 3 年以上设备）
 *   low    → 12k 粒子（低端嵌入式 / N100 / 旧平板）
 *
 * URL 覆盖：?tier=high / ?tier=medium / ?tier=low
 */

const DEFAULT_CLOUD_COUNT = 50000
const DEFAULT_RAIN_COUNT = 4000

// GPU 渲染器名称关键词 → 预估 tier
const GPU_TIER_MAP = [
  { pattern: /apple.+m\d/i, tier: 'high' },         // Apple M 系列
  { pattern: /apple.+a\d/i, tier: 'high' },         // Apple A 系列（iPad）
  { pattern: /nvidia.+rtx/i, tier: 'high' },        // NVIDIA RTX
  { pattern: /nvidia.+gtx.10/i, tier: 'high' },     // GTX 10 系+
  { pattern: /amd.+rx/i, tier: 'high' },            // AMD RX
  { pattern: /intel.+iris/i, tier: 'medium' },      // Intel Iris
  { pattern: /intel.+uhd/i, tier: 'medium' },       // Intel UHD
  { pattern: /intel.+hd.6/i, tier: 'medium' },      // Intel HD 6xx
  { pattern: /mali.+g7/i, tier: 'medium' },         // Mali G7x
  { pattern: /mali/i, tier: 'low' },                // Mali 低端
  { pattern: /adreno/i, tier: 'medium' },           // 高通 Adreno
  { pattern: /powervr/i, tier: 'low' },             // PowerVR
]

function detectGPUTier() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return 'low'

    const renderer = gl.getParameter(gl.RENDERER) || ''
    const vendor = gl.getParameter(gl.VENDOR) || ''
    const combined = `${vendor} ${renderer}`

    for (const { pattern, tier } of GPU_TIER_MAP) {
      if (pattern.test(combined)) return tier
    }

    // 无法识别时，用屏幕像素量做启发式判断
    const totalPixels = window.screen.width * window.screen.height
    if (totalPixels > 5000000) return 'medium' // > 5M 像素（如 4K）降一档
    return 'high'
  } catch {
    return 'low'
  }
}

function getQueryTier() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const tier = params.get('tier')
  if (tier === 'high' || tier === 'medium' || tier === 'low') return tier
  return null
}

// ── 粒子数量表 ──
const CLOUD_COUNTS = { high: 50000, medium: 25000, low: 12000 }
const RAIN_COUNTS = { high: 4000, medium: 2000, low: 1000 }

let _cachedTier = null
let _cachedCloudCount = null
let _cachedRainCount = null

/**
 * 获取当前设备适用的粒子云数量
 * 首次调用时检测 GPU，结果缓存（不会热切换）
 */
export function getCloudCount() {
  if (_cachedCloudCount !== null) return _cachedCloudCount

  const queryTier = getQueryTier()
  const tier = queryTier || detectGPUTier()
  _cachedTier = tier
  _cachedCloudCount = CLOUD_COUNTS[tier]
  _cachedRainCount = RAIN_COUNTS[tier]

  console.info(`[Adaptive] GPU tier: ${tier} → cloud=${_cachedCloudCount}, rain=${_cachedRainCount}`)
  return _cachedCloudCount
}

/**
 * 获取当前设备适用的雨滴数量
 */
export function getRainCount() {
  if (_cachedRainCount !== null) return _cachedRainCount
  getCloudCount() // 会同时初始化两者
  return _cachedRainCount
}

/**
 * 获取当前 tier 等级（调试用）
 */
export function getTier() {
  if (_cachedTier === null) getCloudCount()
  return _cachedTier
}

/**
 * 重置缓存（仅用于测试）
 */
export function __resetAdaptiveCache() {
  _cachedTier = null
  _cachedCloudCount = null
  _cachedRainCount = null
}
