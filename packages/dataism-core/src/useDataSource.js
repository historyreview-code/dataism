import { useEffect, useState } from 'react'

/**
 * Generic data-source loader with localStorage caching.
 * Returns { data, loading, error, refresh }.
 *
 * @param {string} cacheKey    unique cache key (e.g. "dronestorm.noaa.gfs")
 * @param {() => Promise<T>} fetcher  function that fetches fresh data
 * @param {object} opts
 * @param {number} opts.maxAgeMs       cache TTL in ms (default 30 min)
 * @param {T}    opts.fallback         fallback data if fetch fails and no cache
 *
 * Usage:
 *   const { data, loading, error } = useDataSource(
 *     'dronestorm.noaa.gfs',
 *     () => fetchNoaaGfs(),
 *     { maxAgeMs: 30 * 60 * 1000, fallback: [] },
 *   )
 */
export function useDataSource(cacheKey, fetcher, opts = {}) {
  const { maxAgeMs = 30 * 60 * 1000, fallback = null } = opts

  const [data, setData] = useState(fallback)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0)

  const load = async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      // Try cache first
      if (!force) {
        const cached = readCache(cacheKey)
        if (cached && Date.now() - cached.at < maxAgeMs) {
          setData(cached.data)
          setLastUpdatedAt(cached.at)
          setLoading(false)
          return
        }
      }
      // Fetch fresh
      const fresh = await fetcher()
      setData(fresh)
      const at = Date.now()
      setLastUpdatedAt(at)
      writeCache(cacheKey, { data: fresh, at })
    } catch (err) {
      setError(err)
      // Fall back to stale cache if available
      const cached = readCache(cacheKey)
      if (cached) {
        setData(cached.data)
        setLastUpdatedAt(cached.at)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Auto-refresh at half the max age
    const id = setInterval(() => load(true), maxAgeMs / 2)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  return {
    data,
    loading,
    error,
    lastUpdatedAt,
    refresh: () => load(true),
  }
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(`dataism:${key}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(`dataism:${key}`, JSON.stringify(value))
  } catch {
    /* quota exceeded — ignore */
  }
}