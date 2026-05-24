'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, getCached, TTL } from '../lib/apiCache'
import StarIcon from './StarIcon'

const INTERVAL = 6000 // ms between auto-advances

export default function HeroCarousel({ mediaType = 'movie' }) {
  const [movies, setMovies]       = useState([])
  const [activeIndex, setActive]  = useState(0)
  const timerRef                  = useRef(null)

  useEffect(() => {
    const endpoint = mediaType === 'tv'
      ? `${API_BASE_URL}/trending/tv/week?page=1`
      : mediaType === 'anime'
      ? `${API_BASE_URL}/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc&page=1`
      : `${API_BASE_URL}/trending/movie/week?page=1`

    // Serve from cache instantly — no flicker, no reset
    const cached = getCached(endpoint, TTL.browse)
    if (cached) {
      setMovies(cached.results?.slice(0, 10).filter(m => m.backdrop_path) || [])
      setActive(0)
      return
    }

    setMovies([])
    setActive(0)
    cachedFetch(endpoint, API_OPTIONS, TTL.browse)
      .then(data => setMovies(data.results?.slice(0, 10).filter(m => m.backdrop_path) || []))
      .catch(() => {})
  }, [mediaType])

  // Auto-rotate; restart whenever user manually picks a card
  const startTimer = (movies) => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActive(i => (i + 1) % movies.length)
    }, INTERVAL)
  }

  useEffect(() => {
    if (!movies.length) return
    startTimer(movies)
    return () => clearInterval(timerRef.current)
  }, [movies])

  const handlePick = (i) => {
    setActive(i)
    startTimer(movies) // reset timer on manual pick
  }

  const handlePrev = () => handlePick((activeIndex - 1 + movies.length) % movies.length)
  const handleNext = () => handlePick((activeIndex + 1) % movies.length)

  if (!movies.length) {
    return (
      <>
        <div className="hero-skeleton">
          <div className="hero-skeleton-shimmer" />
          <div className="hero-skeleton-content">
            <div className="hero-skeleton-badge" />
            <div className="hero-skeleton-title" />
            <div className="hero-skeleton-title hero-skeleton-title--short" />
            <div className="hero-skeleton-meta" />
            <div className="hero-skeleton-overview" />
            <div className="hero-skeleton-overview hero-skeleton-overview--short" />
            <div className="hero-skeleton-cta" />
          </div>
        </div>
        <section className="top10-section">
          <div className="hero-skeleton-top10-label" />
          <div className="top10-scroll">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="hero-skeleton-top10-card">
                <div className="hero-skeleton-shimmer" />
              </div>
            ))}
          </div>
        </section>
      </>
    )
  }

  const item     = movies[activeIndex]
  const title    = item.title || item.name
  const date     = item.release_date || item.first_air_date
  const year     = date?.split('-')[0] || ''
  const overview = item.overview?.length > 220
    ? item.overview.slice(0, 220).trimEnd() + '…'
    : item.overview || ''
  const href     = (mediaType === 'tv' || mediaType === 'anime') ? `/tv/${item.id}` : `/movie/${item.id}`
  const label    = mediaType === 'anime' ? 'Anime' : mediaType === 'tv' ? 'TV Show' : 'Movie'

  return (
    <>
      {/* ── Hero ── */}
      <div key={activeIndex} className="hero-section">
        {item.backdrop_path && (
          <div className="hero-poster-wrap">
            <img
              src={`https://image.tmdb.org/t/p/w1280${item.backdrop_path}`}
              alt={title}
              className="hero-poster-img"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        )}

        <div className="hero-gradient" />

        <button className="hero-arrow hero-arrow--prev" onClick={handlePrev} aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <button className="hero-arrow hero-arrow--next" onClick={handleNext} aria-label="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        <div className="hero-content-wrap">
          <div className="hero-content-inner">
          <div className="hero-content">
            <span className="hero-badge">#{activeIndex + 1} This Week</span>
            <h1 className="hero-title">{title}</h1>
            <div className="hero-meta">
              {item.vote_average > 0 && (
                <span className="hero-rating">
                  <StarIcon className="hero-star" />
                  {item.vote_average.toFixed(1)}
                </span>
              )}
              {year && <span className="hero-dot">·</span>}
              {year && <span className="hero-year">{year}</span>}
            </div>
            <p className="hero-overview">{overview}</p>
            <Link href={href} className="hero-cta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17" style={{ flexShrink: 0 }}>
                <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/>
                <path d="m6.2 5.3 3.1 3.9"/>
                <path d="m12.4 3.4 3.1 3.9"/>
                <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
              </svg>
              View Details
            </Link>
          </div>
          </div>
        </div>

        <div className="hero-progress">
          {movies.map((_, i) => (
            <button
              key={i}
              className={`hero-pip${i === activeIndex ? ' hero-pip--active' : ''}`}
              onClick={() => handlePick(i)}
              aria-label={`Show ${label} ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── Top 10 row ── */}
      <section className="top10-section">
        <h2 className="top10-heading">Top 10 This Week</h2>
        <div className="top10-scroll">
          {movies.map((m, i) => (
            <button
              key={m.id}
              className={`top10-card${i === activeIndex ? ' top10-card--active' : ''}`}
              onClick={() => handlePick(i)}
            >
              <span className="top10-rank">{i + 1}</span>
              <div className="top10-poster">
                <img
                  src={m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : '/No-Poster.png'}
                  alt={m.title || m.name}
                />
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
