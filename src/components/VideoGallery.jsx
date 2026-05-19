'use client'
import { useRef, useCallback, memo } from 'react'

const TYPE_PRIORITY = {
  'Trailer':           0,
  'Teaser':            1,
  'Clip':              2,
  'Featurette':        3,
  'Behind the Scenes': 4,
}

const TYPE_COLORS = {
  'Trailer':           '#e62429',
  'Teaser':            '#a855f7',
  'Clip':              '#3b82f6',
  'Featurette':        '#f59e0b',
  'Behind the Scenes': '#22c55e',
}

const TYPE_LABELS = {
  'Behind the Scenes': 'BTS',
}

/** Sort & filter raw video results from TMDB to YouTube only, priority-ordered */
export function sortVideos(rawVideos) {
  return (rawVideos || [])
    .filter(v => v.site === 'YouTube')
    .sort((a, b) => {
      const ap = TYPE_PRIORITY[a.type] ?? 99
      const bp = TYPE_PRIORITY[b.type] ?? 99
      return ap - bp
    })
}

const VideoGallery = memo(function VideoGallery({ videos }) {
  const scrollRef = useRef(null)

  const scroll = useCallback((dir) => {
    scrollRef.current?.scrollBy({ left: dir * 620, behavior: 'smooth' })
  }, [])

  if (!videos || videos.length === 0) return null

  return (
    <div className="vg-section detail-card">
      <div className="vg-header">
        <h2 className="vg-title">Videos</h2>
        <div className="ep-arrows">
          <button className="ep-arrow" onClick={() => scroll(-1)} aria-label="Scroll left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button className="ep-arrow" onClick={() => scroll(1)} aria-label="Scroll right">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="vg-scroll" ref={scrollRef}>
        {videos.map(video => (
          <a
            key={video.id}
            href={`https://www.youtube.com/watch?v=${video.key}`}
            target="_blank"
            rel="noopener noreferrer"
            className="vg-card"
          >
            <div className="vg-thumb">
              <img
                src={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
                alt={video.name}
                loading="lazy"
              />
              <div className="vg-play">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <span
                className="vg-type-badge"
                style={{ '--badge-color': TYPE_COLORS[video.type] || '#6b7280' }}
              >
                {TYPE_LABELS[video.type] || video.type}
              </span>
            </div>
            <p className="vg-name">{video.name}</p>
          </a>
        ))}
      </div>
    </div>
  )
})

export default VideoGallery
