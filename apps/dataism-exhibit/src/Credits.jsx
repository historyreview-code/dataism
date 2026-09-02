import { presets, presetOrder, CHAPTERS } from '@studio/dataism-core'

/**
 * 关于面板 —— 作品陈述 + 十二时辰总览 + 音景控制。
 * 线上版按 i 或 I 键唤出；kiosk 模式隐藏（展厅墙面不留按钮）。
 */
export default function Credits({ open, onOpenChange, chapter, onModeChange, manualMode }) {
  if (!open) return null

  return (
    <div className="credits-overlay" onClick={() => onOpenChange(false)}>
      <div className="credits-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="credits-modal__close"
          onClick={() => onOpenChange(false)}
        >
          close
        </button>

        <div className="credits-modal__title">时辰 · Twelve Hours</div>
        <div className="credits-modal__subtitle">一件随时间流转的数据粒子展品</div>

        <div className="credits-modal__section">
          <div className="credits-modal__heading">陈述 · Statement</div>
          <p className="credits-modal__para">
            古人把一昼夜分为十二时辰，每辰两小时。这件作品以五万枚粒子承接此刻的时辰——
            配色、行为与声音随子丑寅卯流转，画面亮度随真实昼夜呼吸：
            它是一件摆件，也是一座钟。你看到的永远是"现在"这一章。
          </p>
          <p className="credits-modal__para">
            移动鼠标扰动云气，点击送出涟漪；接入现场声后，观众的脚步与掌声也会驱动粒子。
            静止时作品安静下来——声音的强弱由你的在场决定。
          </p>
        </div>

        <div className="credits-modal__section">
          <div className="credits-modal__heading">当前章节 · {chapter.branch}时 {chapter.name}</div>
          <p className="credits-modal__para credits-modal__para--dim">{chapter.dataNote}</p>
        </div>

        <div className="credits-modal__section">
          <div className="credits-modal__heading">十二时辰 · The Twelve</div>
          <div className="chapter-list">
            {CHAPTERS.map((c) => (
              <div
                key={c.id}
                className={`chapter-list__item ${c.id === chapter.id ? 'is-current' : ''}`}
                style={{ '--ch': c.palette.inner }}
              >
                <span className="chapter-list__branch">{c.branch}</span>
                <span className="chapter-list__name">{c.name}</span>
                <span className="chapter-list__time">
                  {String(c.hours[0]).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="credits-modal__section">
          <div className="credits-modal__heading">音景 · Soundscape</div>
          <p className="credits-modal__para credits-modal__para--dim">
            声音即数据：频谱与节拍直接驱动粒子——低频推动流动，中频控制明暗，
            高频化为沙沙细颤，鼓点带来一阵阵舒张。接入现场声后，你的在场也加入其中。
          </p>
          <div className="sound-presets">
            <button
              type="button"
              className={`sound-preset ${!manualMode ? 'is-active' : ''}`}
              onClick={() => onModeChange(null)}
            >
              <span className="sound-preset__label">跟随时辰</span>
              <span className="sound-preset__desc">每辰自动更换</span>
            </button>
            {presetOrder.map((id) => (
              <button
                key={id}
                type="button"
                className={`sound-preset ${manualMode === id ? 'is-active' : ''}`}
                onClick={() => onModeChange(id)}
              >
                <span className="sound-preset__label">{presets[id].label}</span>
                <span className="sound-preset__desc">{presets[id].descZh || presets[id].description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="credits-modal__section">
          <div className="credits-modal__heading">Credits</div>
          <ul className="credits-modal__list">
            <li>inspired by Colorpong "Dataism" series</li>
            <li>50,000 particles · GLSL · Tone.js · WebAudio</li>
            <li>引擎 @studio/dataism-core · 2026</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
