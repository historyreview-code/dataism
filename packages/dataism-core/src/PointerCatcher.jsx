import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// 把 NDC(-1..1) → 粒子场坐标（x∈[-3.2,3.2], y∈[-0.9,0.9]）
function ndcToField(ndcX, ndcY) {
  return { x: ndcX * 3.2, y: ndcY * 0.9 }
}

// 一块铺满相机视野的不可见 plane，专门用来接收 pointer 事件
// R3F 默认 Points 不接 pointer，必须有实体 mesh 才能拿到 onPointerMove
export default function PointerCatcher({ mouseRef, clickRef }) {
  const meshRef = useRef()

  return (
    <mesh
      ref={meshRef}
      // 在相机前一点点，铺满视野
      position={[0, 0, 0.5]}
      // 不写 frustumCulled 也不写 visible 控制——靠 material transparent 隐藏
      onPointerMove={(e) => {
        // e.pointer 是 NDC
        const p = ndcToField(e.pointer.x, e.pointer.y)
        mouseRef.current.x = p.x
        mouseRef.current.y = p.y
      }}
      onPointerLeave={() => {
        mouseRef.current.x = 99
        mouseRef.current.y = 99
      }}
      onClick={(e) => {
        // 写入 clickRef 标记，ParticleCloud 在 useFrame 里读到会处理
        if (!clickRef) return
        const p = ndcToField(e.pointer.x, e.pointer.y)
        clickRef.current.x = p.x
        clickRef.current.y = p.y
        clickRef.current.pending = true
      }}
    >
      <planeGeometry args={[20, 12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}