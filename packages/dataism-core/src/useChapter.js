import { useCallback, useEffect, useRef, useState } from 'react'

import { CHAPTERS, CHAPTER_MS, chapterClockAt } from './chapters.js'

/**
 * useChapter —— 十二时辰轮换引擎
 *
 * 两种时钟：
 *   真实时钟（默认）    章节按传统时辰边界轮换（23:00/01:00/03:00…），每章 2 小时。
 *                      展品陈列的真实形态：作品即时钟。
 *   合成时钟 durationMs 传毫秒数时启用：从 startChapter 起每 durationMs 换一章循环。
 *                      用于演示、录屏与展厅"一日十二辰快放"吸引模式（如 ?duration=10s）。
 *
 * 返回：
 *   chapter / nextChapter   当前与下一章节对象
 *   progress                0~1 当前章节进度
 *   remainingMs             距离下一次换章的毫秒数
 *   forceNext()             手动跳到下一章（演示用；真实时钟下按住到自然边界自动恢复）
 *   synthetic               是否合成时钟
 *   isTransitioning         是否处于换章转场中（3s 仪式感窗口）
 */
export function useChapter({ durationMs = null, startChapter = 0 } = {}) {
  const synthetic = typeof durationMs === 'number' && durationMs > 0
  const anchorRef = useRef(Date.now()) // 合成时钟锚点
  const holdRef = useRef(null)         // forceNext 的手动覆盖：{ index, natural }
  const [, setTick] = useState(0)

  // ── v1.4 章节转场仪式：换章时触发 3s 转场窗口 ──
  const [isTransitioning, setIsTransitioning] = useState(false)
  const prevIndexRef = useRef(startChapter)
  const transitionTimerRef = useRef(null)

  // 定时重算（合成时钟快放时提高刷新率，保证进度条平滑）
  useEffect(() => {
    const interval = synthetic
      ? Math.max(120, Math.min(500, durationMs / 20))
      : 1000
    const id = setInterval(() => setTick((v) => v + 1), interval)
    return () => clearInterval(id)
  }, [synthetic, durationMs])

  const compute = useCallback(() => {
    if (synthetic) {
      const elapsed = Date.now() - anchorRef.current
      const steps = Math.floor(elapsed / durationMs)
      const index = (((startChapter + steps) % 12) + 12) % 12
      const progress = (elapsed % durationMs) / durationMs
      const natural = index
      const held = holdRef.current
      if (held && held.natural !== natural) {
        holdRef.current = null // 自然轮换已越过手动覆盖，恢复自动
        return { index, progress, natural }
      }
      return { index: held ? held.index : index, progress: held ? 0 : progress, natural }
    }
    const clock = chapterClockAt(new Date())
    const held = holdRef.current
    if (held && held.natural !== clock.index) {
      holdRef.current = null
      return { index: clock.index, progress: clock.progress, natural: clock.index }
    }
    return {
      index: held ? held.index : clock.index,
      progress: held ? 0.02 : clock.progress,
      natural: clock.index,
    }
  }, [synthetic, durationMs, startChapter])

  const state = compute()
  const chapter = CHAPTERS[state.index]
  const nextChapter = CHAPTERS[(state.index + 1) % 12]
  const remainingMs = synthetic
    ? durationMs * (1 - state.progress)
    : CHAPTER_MS * (1 - state.progress)

  // ── 检测章节切换，触发转场仪式 ──
  useEffect(() => {
    if (prevIndexRef.current !== state.index) {
      // 章节切换了
      prevIndexRef.current = state.index
      setIsTransitioning(true)
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false)
        transitionTimerRef.current = null
      }, 3000)
    }
  }, [state.index])

  // 清理
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [])

  const forceNext = useCallback(() => {
    const cur = compute()
    if (synthetic) {
      // 把锚点拨到当前章结束，下一 tick 自然进入下一章
      const elapsed = Date.now() - anchorRef.current
      anchorRef.current += elapsed - (elapsed % durationMs) + durationMs
      holdRef.current = null
      setTick((v) => v + 1)
    } else {
      holdRef.current = { index: (cur.index + 1) % 12, natural: cur.natural }
      setTick((v) => v + 1)
    }
  }, [compute, synthetic, durationMs])

  return { chapter, nextChapter, progress: state.progress, remainingMs, forceNext, synthetic, isTransitioning }
}
