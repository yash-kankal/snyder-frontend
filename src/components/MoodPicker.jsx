'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import Spinner from './Spinner'

const MOODS = [
  {
    id: 'thrilled',
    label: 'Thrilled',
    sub: 'Action & suspense',
    genres: [28, 53, 12],
    color: '#f97316',
    glow: 'rgba(249,115,22,0.15)',
  },
  {
    id: 'scared',
    label: 'Scared',
    sub: 'Horror & mystery',
    genres: [27, 9648],
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.15)',
  },
  {
    id: 'laughing',
    label: 'Laughing',
    sub: 'Pure comedy',
    genres: [35],
    color: '#eab308',
    glow: 'rgba(234,179,8,0.15)',
  },
  {
    id: 'heartwarmed',
    label: 'Heartwarmed',
    sub: 'Romance & family',
    genres: [10749, 18, 10751],
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.15)',
  },
  {
    id: 'mindblown',
    label: 'Mind-blown',
    sub: 'Sci-fi & twists',
    genres: [878, 9648],
    color: '#AB8BFF',
    glow: 'rgba(171,139,255,0.15)',
  },
  {
    id: 'adventurous',
    label: 'Adventurous',
    sub: 'Epic journeys',
    genres: [12, 14],
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.15)',
  },
  {
    id: 'emotional',
    label: 'Emotional',
    sub: 'Deep drama',
    genres: [18, 36],
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.15)',
  },
  {
    id: 'inspired',
    label: 'Inspired',
    sub: 'Triumph & courage',
    genres: [36, 10752, 18],
    color: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
  },
]

// Pre-compute mood card styles once — avoids new object on every render
const MOOD_STYLES = Object.fromEntries(
  MOODS.map(m => [m.id, { '--mood-color': m.color, '--mood-glow': m.glow }])
)

function MoodIcon({ id }) {
  const shared = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.75',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'mood-icon-svg',
  }

  switch (id) {
    case 'thrilled':
      return (
        <svg {...shared}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case 'scared':
      return (
        <svg {...shared}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'laughing':
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
          <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
        </svg>
      )
    case 'heartwarmed':
      return (
        <svg {...shared}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )
    case 'mindblown':
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" />
        </svg>
      )
    case 'adventurous':
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      )
    case 'emotional':
      return (
        <svg {...shared}>
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          <path d="M16 14v6M8 14v6M12 16v6" />
        </svg>
      )
    case 'inspired':
      return (
        <svg {...shared}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      )
    default:
      return null
  }
}

export default function MoodPicker({ onClose }) {
  const router = useRouter()
  const [selected, setSelected] = useState(null)
  const [movies, setMovies]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [step, setStep]         = useState('pick')

  const pickMood = async (mood) => {
    setSelected(mood)
    setLoading(true)
    setStep('results')
    try {
      const genres = mood.genres.join('|')
      const base   = `${API_BASE_URL}/discover/movie?with_genres=${genres}&sort_by=vote_average.desc&vote_count.gte=1200&vote_average.gte=7.0`

      // Pick 2 distinct random pages from 1–6 so we always have enough candidates
      const p1 = Math.floor(Math.random() * 6) + 1
      let   p2 = Math.floor(Math.random() * 6) + 1
      if (p2 === p1) p2 = (p2 % 6) + 1

      const [r1, r2] = await Promise.all([
        cachedFetch(`${base}&page=${p1}`, API_OPTIONS, TTL.browse),
        cachedFetch(`${base}&page=${p2}`, API_OPTIONS, TTL.browse),
      ])

      // Merge, deduplicate by id, keep only movies with a poster
      const seen = new Set()
      const pool = []
      for (const m of [...(r1.results || []), ...(r2.results || [])]) {
        if (m.poster_path && !seen.has(m.id)) { seen.add(m.id); pool.push(m) }
      }

      // Fisher-Yates shuffle so order differs each time
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]]
      }
      setMovies(pool.slice(0, 10))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => { setStep('pick'); setMovies([]); setSelected(null) }

  return createPortal(
    <div className="mood-overlay" onClick={onClose}>
      <div className="mood-panel" onClick={e => e.stopPropagation()}>

        {step === 'pick' && (
          <>
            <div className="mood-header">
              <div className="mood-header-text">
                <h2 className="mood-title">What's the vibe?</h2>
                <p className="mood-subtitle">Pick a mood, get the 10 best films for it</p>
              </div>
              <button className="mood-close-btn" onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mood-grid">
              {MOODS.map(mood => (
                <button
                  key={mood.id}
                  className="mood-card"
                  onClick={() => pickMood(mood)}
                  style={MOOD_STYLES[mood.id]}
                >
                  <span className="mood-card-label">{mood.label}</span>
                  <span className="mood-card-sub">{mood.sub}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'results' && (
          <>
            <div className="mood-header">
              <div className="mood-header-text">
                <button className="mood-back-btn" onClick={goBack}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Back
                </button>
                <h2 className="mood-title" style={{ color: selected?.color }}>
                  {selected?.label}
                </h2>
                <p className="mood-subtitle">Top 10 by rating</p>
              </div>
              <button className="mood-close-btn" onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="mood-loading"><Spinner /></div>
            ) : (
              <div className="mood-results">
                {movies.map((movie, i) => (
                  <button
                    key={movie.id}
                    className="mood-result-item"
                    onClick={() => { router.push(`/movie/${movie.id}`); onClose() }}
                    style={{ '--mood-color': selected?.color }}
                  >
                    <span className="mood-result-rank">#{i + 1}</span>
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                      alt={movie.title}
                      className="mood-result-poster"
                    />
                    <div className="mood-result-info">
                      <p className="mood-result-title">{movie.title}</p>
                      <div className="mood-result-meta">
                        <span>{movie.release_date?.split('-')[0]}</span>
                        <span className="mood-result-rating">
                          <svg viewBox="0 0 20 20" fill="#f5c518" className="mood-star-icon">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {movie.vote_average?.toFixed(1)}
                        </span>
                      </div>
                      <p className="mood-result-overview">
                        {movie.overview?.length > 110
                          ? movie.overview.slice(0, 110) + '…'
                          : movie.overview}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>,
    document.body
  )
}
