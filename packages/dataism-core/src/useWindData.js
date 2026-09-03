import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useWindData —— NOAA GFS 大西洋风场实时数据（v1.3 数据觉醒）
 *
 * 巳时（09:00–11:00）的粒子云不再只是程序化噪声模拟，
 * 而是真实世界大西洋风场的实时映射。
 *
 * 数据流：
 *   open-meteo GFS API → 16×16 网格 u/v 分量 → 平均风速/风向 →
 *   映射到粒子行为参数（flow 速度、noiseAmp、配色温度）
 *
 * 缓存策略：5 分钟本地缓存（NOAA 每 6 小时更新，不需要频繁请求）
 */

const CACHE_KEY = 'dataism_wind_cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 分钟

// 大西洋区域边界（与 dronestorm 保持一致）
const ATLANTIC_BOUNDS = {
  latMin: 20, latMax: 60,
  lonMin: -80, lonMax: 10,
}
const GRID_RES = 8 // 8×8 = 64 点，减小请求体积

function makeGrid() {
  const points = []
  for (let i = 0; i < GRID_RES; i++) {
    for (let j = 0; j < GRID_RES; j++) {
      points.push({
        lat: ATLANTIC_BOUNDS.latMin + (ATLANTIC_BOUNDS.latMax - ATLANTIC_BOUNDS.latMin) * (i / (GRID_RES - 1)),
        lon: ATLANTIC_BOUNDS.lonMin + (ATLANTIC_BOUNDS.lonMax - ATLANTIC_BOUNDS.lonMin) * (j / (GRID_RES - 1)),
      })
    }
  }
  return points
}

async function fetchWindData() {
  const points = makeGrid()
  const url = new URL('https://api.open-meteo.com/v1/gfs')
  url.searchParams.set('latitude', points.map((p) => p.lat).join(','))
  url.searchParams.set('longitude', points.map((p) => p.lon).join(','))
  url.searchParams.set('current', 'wind_u_component_10m,wind_v_component_10m,wind_speed_10m')
  url.searchParams.set('wind_speed_unit', 'ms')
  url.searchParams.set('timezone', 'GMT')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`NOAA fetch failed: ${res.status}`)
  const json = await res.json()

  if (!Array.isArray(json)) throw new Error('Unexpected NOAA response format')

  let totalU = 0, totalV = 0, totalSpeed = 0, maxSpeed = 0
  const count = json.length

  for (const row of json) {
    const u = row.current?.wind_u_component_10m ?? 0
    const v = row.current?.wind_v_component_10m ?? 0
    const speed = Math.sqrt(u * u + v * v)
    totalU += u
    totalV += v
    totalSpeed += speed
    maxSpeed = Math.max(maxSpeed, speed)
  }

  const avgU = totalU / count
  const avgV = totalV / count
  const avgSpeed = totalSpeed / count
  const avgDirection = Math.atan2(avgV, avgU) // 弧度，-π ~ π

  return {
    avgU,
    avgV,
    avgSpeed,
    maxSpeed,
    avgDirection,
    fetchedAt: Date.now(),
  }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached
    }
  } catch {
    /* 缓存损坏或不可用 */
  }
  return null
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    /* localStorage 可能已满 */
  }
}

/**
 * 将风速映射到粒子行为参数覆盖
 *
 * @param {number} avgSpeed m/s
 * @param {number} maxSpeed m/s
 * @returns {object} 主题行为覆盖 { flowScale, noiseScale, warmth }
 */
export function windToBehavior(avgSpeed, maxSpeed) {
  // 北大西洋平均风速约 5-15 m/s，风暴时 20+
  // flowScale: 0.8（平静）~ 1.6（风暴）
  const flowScale = 0.8 + Math.min(1, avgSpeed / 20) * 0.8
  // noiseScale: 0.7（平静）~ 1.4（风暴）
  const noiseScale = 0.7 + Math.min(1, avgSpeed / 18) * 0.7
  // warmth: 0（平静/冷蓝）~ 1（风暴/暖橙），基于 maxSpeed
  const warmth = Math.min(1, maxSpeed / 25)

  return { flowScale, noiseScale, warmth }
}

/**
 * useWindData hook
 *
 * @param {boolean} enabled 仅在巳时启用
 * @returns {object} { data, loading, error, refresh }
 */
export function useWindData(enabled) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 先尝试缓存
      const cached = loadCache()
      if (cached) {
        setData(cached)
        setLoading(false)
        // 后台静默刷新
        const fresh = await fetchWindData()
        saveCache(fresh)
        setData(fresh)
        return
      }

      const fresh = await fetchWindData()
      saveCache(fresh)
      setData(fresh)
    } catch (err) {
      console.error('[useWindData]', err)
      // 失败时尝试用过期缓存兜底
      const stale = loadCache()
      if (stale) {
        setData(stale)
        setError('stale')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setError(null)
      clearInterval(intervalRef.current)
      return
    }

    refresh() // 首次加载
    // 每 10 分钟检查一次（NOAA GFS 每 6 小时更新，不需要太频繁）
    intervalRef.current = setInterval(refresh, 10 * 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [enabled, refresh])

  return { data, loading, error, refresh }
}
