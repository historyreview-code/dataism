import { useState, useEffect } from 'react'
import { presets, presetOrder } from '@studio/dataism-core'
import { ATLANTIC_BOUNDS } from './data/noaa'

export default function Credits({ audioMode, onModeChange, stormLevel }) {
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

            <div className="credits-modal__title">DroneStorm</div>
            <div className="credits-modal__subtitle">
              an atlantic wind atlas · driven by NOAA GFS
            </div>

            {/* 风暴强度指示器 */}
            <div className="credits-modal__storm">
              <div className="credits-modal__storm-label">
                storm intensity
              </div>
              <div className="credits-modal__storm-bar">
                <div
                  className="credits-modal__storm-fill"
                  style={{ width: `${stormLevel * 100}%` }}
                />
              </div>
              <div className="credits-modal__storm-value">
                {Math.round(stormLevel * 100)}%
                {stormLevel > 0.6 && ' ⚠ storm soundscape engaged'}
              </div>
            </div>

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
                    <li>move mouse — disturb the wind field</li>
                    <li>click — send a ripple</li>
                    <li>scroll — zoom</li>
                    <li>press F — fullscreen</li>
                  </ul>
                </div>

                <div className="credits-modal__section">
                  <div className="credits-modal__heading">Data</div>
                  <ul>
                    <li>
                      NOAA GFS wind field · 16×16 grid · u/v components
                    </li>
                    <li>
                      region: lat {ATLANTIC_BOUNDS.latMin}–{ATLANTIC_BOUNDS.latMax}°
                      / lon {ATLANTIC_BOUNDS.lonMin}–{ATLANTIC_BOUNDS.lonMax}°
                    </li>
                    <li>
                      refreshes every 30 min · cached in localStorage
                    </li>
                    <li>
                      50,000 particles colored by wind speed
                    </li>
                  </ul>
                </div>

                <div className="credits-modal__section">
                  <div className="credits-modal__heading">Credits</div>
                  <ul>
                    <li>inspired by Colorpong "Dataism" series</li>
                    <li>NOAA data via open-meteo GFS API</li>
                    <li>WebGL particles, GLSL shaders, WebAudio</li>
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