import { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'

/**
 * WebGL Context Recovery 系统
 *
 * 展厅级 7×24 运行的刚需：GPU 驱动更新、电源管理、过热降频、内存压力
 * 都可能导致 WebGL 上下文丢失。没有恢复 = 直接黑屏。
 *
 * 用法：
 *   1. 在 R3F Canvas 内部放 <ContextRecoveryBoundary />
 *   2. 任何需要重建 GPU 资源的组件调用 useRegisterRebuild(rebuildFn)
 *
 * 重建契约：
 *   - rebuildFn 必须是幂等的（多次调用无副作用）
 *   - rebuildFn 内应重新创建 BufferGeometry 和 ShaderMaterial
 *   - 不重建 React 树，只重建 GPU 资源
 */

const RecoveryContext = createContext(null)

export function ContextRecoveryBoundary({ children, onLost, onRestored }) {
  const { gl } = useThree()
  const rebuildersRef = useRef(new Set())
  const [lost, setLost] = useState(false)
  const rafRef = useRef(0)

  const register = useCallback((fn) => {
    rebuildersRef.current.add(fn)
    return () => rebuildersRef.current.delete(fn)
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    if (!canvas) return

    const handleLost = (e) => {
      e.preventDefault() // 关键：阻止浏览器默认的上下文销毁
      console.warn('[ContextRecovery] WebGL context lost — attempting recovery...')
      setLost(true)
      onLost?.()
    }

    const handleRestored = () => {
      console.info('[ContextRecovery] WebGL context restored — rebuilding GPU resources...')
      // 用 rAF 延迟一帧，确保 GL 状态完全恢复
      rafRef.current = requestAnimationFrame(() => {
        rebuildersRef.current.forEach((fn) => {
          try {
            fn()
          } catch (err) {
            console.error('[ContextRecovery] Rebuild failed:', err)
          }
        })
        setLost(false)
        onRestored?.()
      })
    }

    canvas.addEventListener('webglcontextlost', handleLost)
    canvas.addEventListener('webglcontextrestored', handleRestored)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost)
      canvas.removeEventListener('webglcontextrestored', handleRestored)
      cancelAnimationFrame(rafRef.current)
    }
  }, [gl, onLost, onRestored])

  return (
    <RecoveryContext.Provider value={{ register, lost }}>
      {children}
      {lost && (
        // 上下文丢失时显示一个极淡的恢复提示（展厅场景：观众知道作品还在）
        <mesh renderOrder={999}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.85} depthTest={false} />
        </mesh>
      )}
    </RecoveryContext.Provider>
  )
}

export function useRegisterRebuild(rebuildFn) {
  const ctx = useContext(RecoveryContext)
  useEffect(() => {
    if (!ctx) {
      console.warn('[useRegisterRebuild] called outside ContextRecoveryBoundary — rebuild will not work on context loss')
      return
    }
    return ctx.register(rebuildFn)
  }, [ctx, rebuildFn])
}

export function useContextLost() {
  const ctx = useContext(RecoveryContext)
  return ctx?.lost ?? false
}
