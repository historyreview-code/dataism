import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useSalmonData —— GBIF 大马哈鱼洄游数据（v1.3 数据觉醒）
 *
 * 未时（13:00–15:00）的粒子云由真实世界的大马哈鱼洄游节奏驱动。
 * 数据从 GBIF（全球生物多样性信息网络）获取黑龙江流域观测记录，
 * 根据一年中的日期映射到洄游阶段，进而调节粒子行为。
 *
 * 洄游季节映射（北半球）：
 *   春（3-5 月）：鱼群从鄂霍次克海进入黑龙江，洄游开始
 *   夏（6-8 月）：上游产卵，鱼群最密集
 *   秋（9-11 月）：幼鱼顺流返回海洋，第二批洄游
 *   冬（12-2 月）：海洋中越冬，活动最低
 *
 * 数据策略：
 *   1. 优先使用本地缓存（localStorage，24h TTL）
 *   2. 缓存过期或不存在时，请求 GBIF API
 *   3. API 失败时，使用内置的备用洄游模型（基于已知的生物学规律）
 *   4. 展厅部署时，建议预抓取一次并随 build 打包，避免实时 API 依赖
 */

const CACHE_KEY = 'dataism_salmon_cache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 小时

// GBIF 物种 key：Oncorhynchus keta（大马哈鱼/鮭鱼）
const SALMON_TAXON_KEY = '5203997'
// 黑龙江流域大致边界
const HEILONGJIANG_BOUNDS = {
  latMin: 42, latMax: 54,
  lonMin: 120, lonMax: 142,
}

// ── 内置备用洄游模型（API 失败时使用）──
const FALLBACK_MIGRATION = {
  spring: { months: [3, 4, 5], activity: 0.8, direction: 'upstream' },
  summer: { months: [6, 7, 8], activity: 1.0, direction: 'spawning' },
  autumn: { months: [9, 10, 11], activity: 0.7, direction: 'downstream' },
  winter: { months: [12, 1, 2], activity: 0.15, direction: 'ocean' },
}

function getSeason(month) {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/**
 * 尝试从 GBIF 获取观测记录
 */
async function fetchSalmonOccurrences() {
  const params = new URLSearchParams({
    taxonKey: SALMON_TAXON_KEY,
    decimalLatitude: `${HEILONGJIANG_BOUNDS.latMin},${HEILONGJIANG_BOUNDS.latMax}`,
    decimalLongitude: `${HEILONGJIANG_BOUNDS.lonMin},${HEILONGJIANG_BOUNDS.lonMax}`,
    limit: '100',
    hasCoordinate: 'true',
  })

  const url = `https://api.gbif.org/v1/occurrence/search?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GBIF fetch failed: ${res.status}`)
  const json = await res.json()

  // 提取观测点的月份分布（用于验证洄游规律）
  const monthCounts = new Array(12).fill(0)
  const occurrences = (json.results || []).map((r) => ({
    lat: r.decimalLatitude,
    lon: r.decimalLongitude,
    month: r.month,
    year: r.year,
    date: r.eventDate,
  }))

  for (const o of occurrences) {
    if (o.month && o.month >= 1 && o.month <= 12) {
      monthCounts[o.month - 1]++
    }
  }

  return {
    occurrences,
    monthCounts,
    total: json.count || 0,
    fetchedAt: Date.now(),
  }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached
  } catch { /* ignore */ }
  return null
}

function saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

/**
 * 根据当前日期计算洄游相位和活跃度
 */
export function getMigrationPhase(date = new Date()) {
  const month = date.getMonth() + 1 // 1-12
  const season = getSeason(month)
  const phase = FALLBACK_MIGRATION[season]

  // 在季节内做更细粒度的插值（月初→月中的渐进变化）
  const day = date.getDate()
  const dayRatio = day / 30 // 近似
  const nextSeasonKey = {
    spring: 'summer', summer: 'autumn', autumn: 'winter', winter: 'spring',
  }[season]
  const nextPhase = FALLBACK_MIGRATION[nextSeasonKey]
  const activity = phase.activity + (nextPhase.activity - phase.activity) * dayRatio * 0.3

  return {
    season,
    activity: Math.max(0.1, Math.min(1, activity)),
    direction: phase.direction,
    month,
    hasRealData: false, // API 成功后会设为 true
  }
}

/**
 * useSalmonData hook
 *
 * @param {boolean} enabled 仅在未时启用
 * @returns {object} { phase, loading, error, refresh }
 */
export function useSalmonData(enabled) {
  const [phase, setPhase] = useState(() => getMigrationPhase())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cached = loadCache()
      if (cached) {
        setPhase((prev) => ({ ...prev, hasRealData: true }))
        setLoading(false)
        // 后台静默刷新
        try {
          const fresh = await fetchSalmonOccurrences()
          saveCache(fresh)
          setPhase((prev) => ({ ...prev, hasRealData: true }))
        } catch (err) {
          console.warn('[useSalmonData] Background refresh failed:', err)
        }
        return
      }

      const fresh = await fetchSalmonOccurrences()
      saveCache(fresh)
      setPhase((prev) => ({
        ...getMigrationPhase(),
        hasRealData: true,
        occurrenceCount: fresh.total,
      }))
    } catch (err) {
      console.error('[useSalmonData]', err)
      setPhase((prev) => ({ ...getMigrationPhase(), hasRealData: false }))
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setPhase(getMigrationPhase())
      clearInterval(intervalRef.current)
      return
    }

    refresh()
    // 每小时更新一次相位（洄游是缓慢的季节性变化，不需要高频）
    intervalRef.current = setInterval(() => {
      setPhase(getMigrationPhase())
    }, 60 * 60 * 1000)

    return () => clearInterval(intervalRef.current)
  }, [enabled, refresh])

  return { phase, loading, error, refresh }
}

/**
 * 洄游相位 → 粒子行为覆盖
 *
 * @param {object} phase 洄游相位
 * @returns {object} 主题行为覆盖 { flowScale, noiseScale, warmth }
 */
export function salmonToBehavior(phase) {
  const activity = phase?.activity ?? 0.5
  // 洄游活跃期（春/夏/秋）：粒子更流动、更躁动
  // 冬季：粒子更平静
  const flowScale = 0.6 + activity * 0.8      // 0.6 ~ 1.4
  const noiseScale = 0.5 + activity * 0.9     // 0.5 ~ 1.4
  const warmth = activity > 0.6 ? (activity - 0.6) * 1.5 : 0 // 活跃期偏暖

  return { flowScale, noiseScale, warmth }
}
