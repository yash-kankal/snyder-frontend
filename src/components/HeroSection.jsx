'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import StarIcon from './StarIcon'

export default function HeroSection() {
  const [movie, setMovie] = useState(null)

  useEffect(() => {
    cachedFetch(`${API_BASE_URL}/trending/movie/week?page=1`, API_OPTIONS, TTL.browse)
      .then(data => {
        const m = data.results?.find(r => r.backdrop_path)
        setMovie(m || null)
      })
      .catch(() => {})
  }, [])

  if (!movie?.backdrop_path) return null

  const backdrop = `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
  const year = movie.release_date?.split('-')[0] || ''
  const overview = movie.overview?.length > 220
    ? movie.overview.slice(0, 220).trimEnd() + '…'
    : movie.overview || ''

  return (
    <div className="hero-section" style={{ backgroundImage: `url(${backdrop})` }}>
      <div className="hero-gradient" />
      <div className="hero-content-wrap">
        <div className="hero-content">
          <span className="hero-badge">#1 This Week</span>
          <h1 className="hero-title">{movie.title}</h1>
          <div className="hero-meta">
            {movie.vote_average > 0 && (
              <span className="hero-rating">
                <StarIcon className="hero-star" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
            {year && <span className="hero-dot">·</span>}
            {year && <span className="hero-year">{year}</span>}
          </div>
          <p className="hero-overview">{overview}</p>
          <Link href={`/movie/${movie.id}`} className="hero-cta">
            More Info →
          </Link>
        </div>
      </div>
    </div>
  )
}
