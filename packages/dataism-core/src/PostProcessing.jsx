import { useMemo } from 'react'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

/**
 * PostProcessing —— v1.4 审美跃迁：Bloom + Vignette
 *
 * Bloom：让粒子的 core 高光区域真正"溢出"到相邻像素，产生辉光感。
 *   参数 tuned for 暗底高光点场景：低 threshold 捕获大部分粒子，
 *   适中 strength 避免过曝，小 radius 保持粒子锐度。
 *
 * Vignette：轻微暗角，聚焦视线到椭圆云中心，增加装置感。
 *
 * 技术说明：
 *   - 使用全局 Bloom（非 selective）：粒子是场景唯一高亮元素，
 *     UI 文字为低 alpha 白色，不会触发 Bloom。
 *   - 与 AdditiveBlending 的 rain 粒子叠加后，Bloom 效果极好。
 *   - 若未来加入文字/图表等高亮 UI，再切换到 selective bloom。
 */
export default function PostProcessing() {
  const bloomConfig = useMemo(() => ({
    intensity: 0.45,      // Bloom 强度：适中，不过曝
    luminanceThreshold: 0.15, // 亮度阈值：暗底场景中，>0.15 的像素触发 Bloom
    luminanceSmoothing: 0.4,  // 阈值过渡带：平滑边缘，避免硬切
    mipmapBlur: true,     // 使用 mipmap 做 blur，性能更好，大粒子更柔和
    radius: 0.55,         // Bloom 扩散半径：适中，保持粒子锐度同时有光晕
  }), [])

  return (
    <EffectComposer>
      <Bloom
        intensity={bloomConfig.intensity}
        luminanceThreshold={bloomConfig.luminanceThreshold}
        luminanceSmoothing={bloomConfig.luminanceSmoothing}
        mipmapBlur={bloomConfig.mipmapBlur}
        radius={bloomConfig.radius}
      />
      <Vignette
        offset={0.35}       // 暗角起始位置（画面边缘 35% 开始变暗）
        darkness={0.45}     // 暗角最大深度（适中，不压抑）
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
