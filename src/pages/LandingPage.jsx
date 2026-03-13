import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL, API_OPTIONS } from '../config'

function PosterColumn({ movies, className = '' }) {
  // Duplicate so the column fills tall viewports
  const filled = movies.length ? [...movies, ...movies] : []
  return (
    <div className={`poster-col ${className}`}>
      {filled.map((movie, i) => (
        <img
          key={`${movie.id}-${i}`}
          src={
            movie.poster_path
              ? `https://image.tmdb.org/t/p/w342/${movie.poster_path}`
              : '/No-Poster.png'
          }
          alt={movie.title}
          loading="lazy"
          className="poster-thumb"
        />
      ))}
    </div>
  )
}

export default function LandingPage() {
  const [movies, setMovies] = useState([])

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/movie/now_playing?page=1`,
          API_OPTIONS
        )
        const data = await res.json()
        setMovies(data.results?.slice(0, 20) || [])
      } catch {
        // page still looks great without posters
      }
    }
    fetchLatest()
  }, [])

  // Split 20 movies into 4 columns (interleaved)
  const col = [0, 1, 2, 3].map((offset) =>
    movies.filter((_, i) => i % 4 === offset)
  )

  return (
    <div className="landing">
      {/* ── Purple ambient glow ── */}
      <div className="landing-glow" />

      {/* ── Left poster wall ── */}
      <div className="landing-side landing-left">
        <PosterColumn movies={col[0]} />
        <PosterColumn movies={col[1]} className="col-offset" />
        <div className="poster-fade-edge right" />
        <div className="poster-fade-edge top" />
        <div className="poster-fade-edge bottom" />
      </div>

      {/* ── Right poster wall ── */}
      <div className="landing-side landing-right">
        <PosterColumn movies={col[2]} className="col-offset" />
        <PosterColumn movies={col[3]} />
        <div className="poster-fade-edge left" />
        <div className="poster-fade-edge top" />
        <div className="poster-fade-edge bottom" />
      </div>

      {/* ── Center content ── */}
      <div className="landing-content">
        <p className="landing-eyebrow">Your movie companion</p>
        <h1 className="landing-logo">
          Snyder<span className="text-gradient">Movies</span>
        </h1>
        <p className="landing-tagline">
          Browse ratings, trailers, cast &amp; crew for any movie — fast, clean, and ad-free. The IMDb alternative that stays out of your way.
        </p>
        <Link to="/browse?section=trending" className="landing-cta">
          Start Discovering →
        </Link>
      </div>
    </div>
  )
}
