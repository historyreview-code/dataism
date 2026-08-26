import { useState, useEffect } from 'react'
import { presets, presetOrder } from '@studio/dataism-core'
import './credits.css'

export default function Credits({ audioMode, onModeChange }) {
  // 初始 open/tab 可由 query string 控制（?credits=1&tab=sound 调试用）
  const [open, setOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('credits') === '1'
  })
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') === 'sound' ? 'sound' : 'about'
  })

  return (
    <>
      <button
        type="button"
        className="credits-toggle"
        aria-label="About this piece"
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>

      {open && (
        <div className="credits-overlay" onClick={() => setOpen(false)}>
          <div
            className="credits-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="credits-modal__close"
              onClick={() => setOpen(false)}
            >
              close
            </button>

            <div className="credits-modal__title">Dataism — 17</div>
            <div className="credits-modal__subtitle">an interactive piece</div>

            <div className="credits-modal__tabs">
              <button
                type="button"
                className={`credits-tab ${tab === 'about' ? 'is-active' : ''}`}
                onClick={() => setTab('about')}
              >
                About
              </button>
              <button
                type="button"
                className={`credits-tab ${tab === 'sound' ? 'is-active' : ''}`}
                onClick={() => setTab('sound')}
              >
                Soundscape
              </button>
            </div>

            {tab === 'about' && (
              <>
                <div className="credits-modal__section">
                  <div className="credits-modal__heading">Instructions</div>
                  <ul>
                    <li>move mouse — disturb the cloud</li>
                    <li>click — send a ripple</li>
                    <li>scroll — zoom</li>
                    <li>press F — fullscreen</li>
                  </ul>
                </div>

                <div className="credits-modal__section">
                  <div className="credits-modal__heading">Credits</div>
                  <ul>
                    <li>inspired by <em>Colorpong.com</em> "Dataism" series</li>
                    <li>50,000 particles, GLSL shaders, WebAudio</li>
                    <li>2026 · an interactive piece</li>
                  </ul>
                </div>
              </>
            )}

            {tab === 'sound' && (
              <div className="credits-modal__section">
                <div className="credits-modal__heading">Choose a soundscape</div>
                <div className="sound-presets">
                  {presetOrder.map((id) => {
                    const preset = presets[id]
                    const isActive = audioMode === id
                    const isAvailable = preset.available
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`sound-preset ${isActive ? 'is-active' : ''} ${!isAvailable ? 'is-disabled' : ''}`}
                        onClick={() => isAvailable && onModeChange && onModeChange(id)}
                        disabled={!isAvailable}
                      >
                        <span className="sound-preset__label">{preset.label}</span>
                        <span className="sound-preset__desc">
                          {preset.description}
                          {!isAvailable && <em className="sound-preset__soon"> · soon</em>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}