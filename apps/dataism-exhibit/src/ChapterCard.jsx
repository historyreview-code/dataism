function fmtHours([h0, h1]) {
  const p = (n) => String(n % 24).padStart(2, '0')
  return `${p(h0)}:00 – ${p(h1)}:00`
}

/**
 * 换章标题卡 —— 每逢时辰更替在画面中央亮起 9 秒：
 * 地支大字 + 时辰名 + 意象诗 + 数据叙事，随后淡出、只余时钟条。
 */
export default function ChapterCard({ chapter, visible }) {
  if (!chapter) return null
  return (
    <div
      className={`chapter-card ${visible ? 'is-visible' : ''}`}
      style={{ '--ch': chapter.palette.inner }}
    >
      <div className="chapter-card__hours">{fmtHours(chapter.hours)}</div>
      <div className="chapter-card__branch">{chapter.branch}</div>
      <div className="chapter-card__name">
        {chapter.branchEn}时 · {chapter.name}
        <span className="chapter-card__en"> / {chapter.en}</span>
      </div>
      <div className="chapter-card__poem">{chapter.poem}</div>
      <div className="chapter-card__data">{chapter.dataNote}</div>
      <div className="chapter-card__sound">soundscape — {chapter.soundscape}</div>
    </div>
  )
}
