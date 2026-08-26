function fmtRemaining(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

/**
 * 时辰时钟条 —— 画面左下角的常驻标识：
 * 当前时辰 + 真实钟点 + 章节进度 + 下一辰倒计时。
 * 作品本身即时钟：这一条是它唯一的"表盘"。
 */
export default function ClockStrip({ chapter, nextChapter, progress, remainingMs, micLive, kiosk }) {
  const now = new Date()
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div
      className={`clock-strip ${kiosk ? 'clock-strip--kiosk' : ''}`}
      style={{ '--ch': chapter.palette.inner }}
    >
      <div className="clock-strip__row">
        <span className="clock-strip__branch">{chapter.branch}</span>
        <span className="clock-strip__name">{chapter.name}</span>
        <span className="clock-strip__clock">{clock}</span>
        {micLive && <span className="clock-strip__mic" title="现场声已接入">◉</span>}
      </div>
      <div className="clock-strip__bar">
        <div className="clock-strip__fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="clock-strip__next">
        下一辰 {nextChapter.branch} · {nextChapter.name} — {fmtRemaining(remainingMs)}
      </div>
    </div>
  )
}
