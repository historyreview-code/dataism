/**
 * heartbeat.js —— 展厅心跳系统（v1.5）
 *
 * 每小时 POST 一次存活 JSON 到自托管端点，包含：
 *   deviceId, version, uptime, fps, chapter, micStatus
 *
 * 使用方式：
 *   1. 环境变量：VITE_HEARTBEAT_URL=https://your.server/heartbeat
 *   2. URL 参数：?heartbeat=https://your.server/heartbeat
 *   3. 或先写死占位符，部署时替换
 *
 * 仅在 kiosk 模式下自动启用（展品场景）。
 */

const INTERVAL_MS = 60 * 60 * 1000 // 1 小时
const VERSION = '1.5.0'

function generateDeviceId() {
  // 基于 localStorage 持久化，同设备同 ID
  const key = '__dataism_device_id__'
  let id = localStorage.getItem(key)
  if (!id) {
    id = 'd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
    localStorage.setItem(key, id)
  }
  return id
}

function getEndpoint() {
  // 优先级：URL 参数 > 环境变量 > 空（不发送）
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('heartbeat')
  if (fromUrl) return fromUrl

  try {
    const fromEnv = import.meta.env?.VITE_HEARTBEAT_URL
    if (fromEnv) return fromEnv
  } catch {
    // import.meta.env 在部分环境不可用，静默忽略
  }

  return ''
}

function estimateFps() {
  // 用最近 10 帧估算 FPS，非精确但够用
  return window.__shichenRaf
    ? Math.round(window.__shichenRaf / (performance.now() / 1000))
    : 0
}

export function startHeartbeat({ chapterRef, micStatusRef } = {}) {
  const endpoint = getEndpoint()
  if (!endpoint) {
    console.info('[Heartbeat] 未配置端点，心跳系统待机（设 VITE_HEARTBEAT_URL 或 ?heartbeat= 启用）')
    return { stop: () => {} }
  }

  const deviceId = generateDeviceId()
  const startTime = performance.now()
  let timer = null
  let stopped = false

  const beat = async () => {
    if (stopped) return

    const payload = {
      deviceId,
      version: VERSION,
      uptime: Math.round((performance.now() - startTime) / 1000),
      fps: estimateFps(),
      chapter: chapterRef?.current ?? 'unknown',
      micStatus: micStatusRef?.current ?? 'unknown',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent.slice(0, 120),
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // 心跳不阻塞，超时短
        signal: AbortSignal.timeout(15000),
      })
      console.info('[Heartbeat] OK', res.status, payload.chapter)
    } catch (err) {
      // 网络失败静默处理，下次再试（展厅网络波动不应影响展品运行）
      console.warn('[Heartbeat] 发送失败，下次重试：', err.message)
    }

    if (!stopped) {
      timer = setTimeout(beat, INTERVAL_MS)
    }
  }

  // 首次发送延迟 30 秒（避免页面刚加载时的大量并发）
  timer = setTimeout(beat, 30000)

  return {
    stop: () => {
      stopped = true
      if (timer) clearTimeout(timer)
    },
  }
}
