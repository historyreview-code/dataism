import './loading.css'

export default function LoadingScreen({ fading }) {
  return (
    <div className={`loading-screen ${fading ? 'fading' : ''}`}>
      <div className="loading-inner">
        <div className="loading-title">Dataism — 17</div>
        <div className="loading-bar">
          <div className="loading-bar-fill" />
        </div>
        <div className="loading-hint">initializing particles…</div>
      </div>
    </div>
  )
}