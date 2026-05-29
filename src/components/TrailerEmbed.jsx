'use client'
import { useState } from 'react'

/**
 * Lite YouTube embed. Until the user clicks play we render only the thumbnail
 * + a play button — no <iframe>. This keeps the page fast and, crucially, keeps
 * the YouTube iframe from swallowing wheel events / forcing per-frame
 * compositing, which caused scroll jitter over the hero on detail pages.
 */
export default function TrailerEmbed({ videoKey, title }) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoKey}?rel=0&modestbranding=1&autoplay=1`}
        title={title || 'Trailer'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  return (
    <button
      type="button"
      className="trailer-facade"
      onClick={() => setPlaying(true)}
      aria-label={`Play trailer${title ? `: ${title}` : ''}`}
    >
      <img
        src={`https://img.youtube.com/vi/${videoKey}/maxresdefault.jpg`}
        onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${videoKey}/hqdefault.jpg` }}
        alt={title || 'Trailer thumbnail'}
        className="trailer-facade-img"
        loading="lazy"
      />
      <span className="trailer-facade-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </span>
    </button>
  )
}
