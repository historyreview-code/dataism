// NOAA GFS 接入（通过 open-meteo 免费代理）
// API: https://open-meteo.com/en/docs/gfs-api
// 关键字段：wind_u_component_10m / wind_v_component_10m（u/v 风分量，单位 km/h）

// 大西洋区域：lat 20-60, lon -80 to 10（覆盖北美东海岸 + 北大西洋）
export const ATLANTIC_BOUNDS = {
  latMin: 20,
  latMax: 60,
  lonMin: -80,
  lonMax: 10,
}

// 网格分辨率（lat/lon 各 N 个点）
export const GRID_RES = 16 // 16x16 = 256 网格点

/**
 * 生成网格点（lat/lon 配对数组）
 */
export function makeGrid(bounds = ATLANTIC_BOUNDS, res = GRID_RES) {
  const lats = []
  const lons = []
  for (let i = 0; i < res; i++) {
    lats.push(bounds.latMin + (bounds.latMax - bounds.latMin) * (i / (res - 1)))
    lons.push(bounds.lonMin + (bounds.lonMax - bounds.lonMin) * (i / (res - 1)))
  }
  // open-meteo 需要 latitude 和 longitude 同长度
  // 这里我们生成 res^2 个 (lat, lon) 配对（笛卡尔积）
  const points = []
  for (const la of lats) {
    for (const lo of lons) {
      points.push({ lat: la, lon: lo })
    }
  }
  return { lats, lons, points }
}

/**
 * 抓取大西洋风场数据
 * 返回 { points: [{lat, lon, u, v, speed, time}], grid: {lats, lons}, fetchedAt }
 */
export async function fetchAtlanticWind() {
  const { points, lats, lons } = makeGrid()
  const url = new URL('https://api.open-meteo.com/v1/gfs')
  url.searchParams.set('latitude', points.map((p) => p.lat).join(','))
  url.searchParams.set('longitude', points.map((p) => p.lon).join(','))
  url.searchParams.set('current', 'wind_u_component_10m,wind_v_component_10m,wind_speed_10m')
  url.searchParams.set('wind_speed_unit', 'ms') // m/s，更适合视觉化
  url.searchParams.set('timezone', 'GMT')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`NOAA fetch failed: ${res.status}`)
  const json = await res.json()

  // open-meteo 返回结构：[{latitude, longitude, current: {wind_u_component_10m, ...}}, ...]
  if (!Array.isArray(json)) {
    // 老版本可能直接返回单点；尝试容错
    return normalizeSinglePoint(json, points)
  }

  const enriched = json.map((row, i) => {
    const u = row.current?.wind_u_component_10m ?? 0
    const v = row.current?.wind_v_component_10m ?? 0
    const speed = Math.sqrt(u * u + v * v)
    return {
      lat: row.latitude,
      lon: row.longitude,
      u: u * 0.36,        // km/h → 视觉化坐标尺度（粒子速度场 × 0.36）
      v: v * 0.36,
      speed,              // m/s，原始值
      rawSpeed: speed,
      time: row.current?.time ?? null,
    }
  })

  return {
    points: enriched,
    grid: { lats, lons, res: GRID_RES },
    bounds: ATLANTIC_BOUNDS,
    fetchedAt: Date.now(),
  }
}

function normalizeSinglePoint(json, points) {
  const u = json.current?.wind_u_component_10m ?? 0
  const v = json.current?.wind_v_component_10m ?? 0
  return {
    points: points.map((p) => ({ ...p, u: u * 0.36, v: v * 0.36, speed: 0, rawSpeed: 0 })),
    grid: { lats: points.map((p) => p.lat), lons: points.map((p) => p.lon), res: 1 },
    bounds: ATLANTIC_BOUNDS,
    fetchedAt: Date.now(),
  }
}

/**
 * 把风场数据映射到 50k 个粒子的位置和速度
 * - 每个粒子位置 = 在 (lat, lon) 网格附近随机偏移
 * - 粒子速度 = 该位置的 (u, v) 风分量（+少量噪声让粒子不死板）
 */
export function particlesFromWind(weatherData, particleCount = 50000) {
  if (!weatherData?.points?.length) return null
  const { points, bounds, grid } = weatherData

  // 把 lat/lon 投影到 NDC（在 JS 端做，不在 shader 里做）
  const { latMin, latMax, lonMin, lonMax } = bounds
  const lonRange = lonMax - lonMin
  const latRange = latMax - latMin
  function projectX(lon) {
    return ((lon - lonMin) / lonRange) * 2.0 - 1.0  // -1..1
  }
  function projectY(lat) {
    return ((lat - latMin) / latRange) * 2.0 - 1.0  // -1..1
  }

  // 计算每个网格点的"权重"（wind speed 越大权重越高 → 粒子越密）
  const maxSpeed = Math.max(0.1, ...points.map((p) => p.rawSpeed))
  const weights = points.map((p) => 0.3 + (p.rawSpeed / maxSpeed) * 1.7)
  const weightSum = weights.reduce((a, b) => a + b, 0)

  const positions = new Float32Array(particleCount * 3)
  const velocities = new Float32Array(particleCount * 2)
  const baseSpeeds = new Float32Array(particleCount)
  const seeds = new Float32Array(particleCount)
  const sizes = new Float32Array(particleCount)

  // NDC 缩放因子（保持宽高比 ~2:1）
  const NDC_SCALE_X = 0.9  // 横向 ±0.9
  const NDC_SCALE_Y = 0.45  // 纵向 ±0.45
  // 把 u/v 速度换算成 NDC 速度
  const NDC_PER_DEG_LON = (NDC_SCALE_X * 2.0) / lonRange
  const NDC_PER_DEG_LAT = (NDC_SCALE_Y * 2.0) / latRange

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3
    const i2 = i * 2

    // 按权重选一个网格点
    let r = Math.random() * weightSum
    let pick = 0
    for (let k = 0; k < weights.length; k++) {
      r -= weights[k]
      if (r <= 0) {
        pick = k
        break
      }
    }
    const pt = points[pick]

    // 在网格点周围做小范围抖动
    const jitterLat = (Math.random() - 0.5) * 1.5
    const jitterLon = (Math.random() - 0.5) * 1.5

    // —— 关键：直接在 JS 端投影到 NDC ——
    const ndcX = projectX(pt.lon + jitterLon) * NDC_SCALE_X
    const ndcY = projectY(pt.lat + jitterLat) * NDC_SCALE_Y

    positions[i3]     = ndcX
    positions[i3 + 1] = ndcY
    positions[i3 + 2] = (Math.random() - 0.5) * 0.1

    // 速度也用 NDC 尺度（u/v 是 km/h, 0.36 是从 noaa.js 来的换算系数）
    velocities[i2]     = pt.u * NDC_PER_DEG_LON
    velocities[i2 + 1] = pt.v * NDC_PER_DEG_LAT

    baseSpeeds[i]      = pt.rawSpeed
    seeds[i]           = Math.random()
    sizes[i]           = 0.4 + Math.pow(Math.random(), 4) * 2.5
  }

  return {
    positions,
    velocities,
    baseSpeeds,
    seeds,
    sizes,
    bounds,
    grid,
  }
}

/**
 * 评估当前风场是否构成"风暴"——返回 0~1 强度
 * 阈值：北大西洋平均风速 > 12 m/s（约 6 级风）开始算风暴
 */
export function stormIntensity(weatherData) {
  if (!weatherData?.points?.length) return 0
  const speeds = weatherData.points.map((p) => p.rawSpeed)
  const max = Math.max(...speeds)
  const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length
  // 综合 max 和 avg，max 风速 25m/s+ 满
  const intensity = Math.min(1, (max / 25) * 0.6 + (avg / 15) * 0.4)
  return intensity
}