import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { API_BASE_URL, API_OPTIONS } from '../config'

const KEY_CREW_JOBS = [
  'Director', 'Producer', 'Executive Producer',
  'Screenplay', 'Story', 'Director of Photography',
  'Original Music Composer',
]

export default function MovieDetails() {
  const { id } = useParams()
  const [movie, setMovie]     = useState(null)
  const [cast, setCast]       = useState([])
  const [crew, setCrew]       = useState([])
  const [trailer, setTrailer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => { window.scrollTo(0, 0) }, [id])

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [detailsRes, creditsRes, videosRes] = await Promise.all([
          fetch(`${API_BASE_URL}/movie/${id}`, API_OPTIONS),
          fetch(`${API_BASE_URL}/movie/${id}/credits`, API_OPTIONS),
          fetch(`${API_BASE_URL}/movie/${id}/videos`, API_OPTIONS),
        ])
        if (!detailsRes.ok || !creditsRes.ok) throw new Error('Failed to fetch')

        const [details, credits, videos] = await Promise.all([
          detailsRes.json(),
          creditsRes.json(),
          videosRes.json(),
        ])

        setMovie(details)
        setCast(credits.cast?.slice(0, 15) || [])

        // Key crew — deduplicated by person+job
        const seen = new Set()
        const filteredCrew = (credits.crew || [])
          .filter(c => KEY_CREW_JOBS.includes(c.job))
          .filter(c => {
            const key = `${c.id}-${c.job}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .slice(0, 12)
        setCrew(filteredCrew)

        // First official YouTube trailer
        const tr = (videos.results || []).find(
          v => v.site === 'YouTube' && v.type === 'Trailer' && v.official
        ) || (videos.results || []).find(
          v => v.site === 'YouTube' && v.type === 'Trailer'
        )
        setTrailer(tr || null)
      } catch {
        setError('Could not load movie details.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [id])

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <Spinner />
      </main>
    )
  }

  if (error || !movie) {
    return (
      <main>
        <div className="wrapper">
          <p className="error-msg mt-10">{error || 'Movie not found.'}</p>
        </div>
      </main>
    )
  }

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}`
    : '/No-Poster.png'

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280/${movie.backdrop_path}`
    : null

  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null

  return (
    <main className="relative">
      {backdropUrl && (
        <div className="movie-backdrop" style={{ backgroundImage: `url(${backdropUrl})` }} />
      )}

      <div className="wrapper detail-wrapper">

        {/* ── Hero row: poster + info ── */}
        <div className="movie-details-layout">
          <div className="movie-details-poster">
            <img src={posterUrl} alt={movie.title} />
          </div>

          <div className="movie-details-info">
            <h1 className="detail-title">{movie.title}</h1>

            {/* Two side-by-side cards */}
            <div className="detail-cards-row">
              {/* Stats card */}
              <div className="detail-card">
                <div className="detail-stat">
                  <div className="detail-stat-value-row">
                    <img src="/star.svg" alt="" style={{ width: 16, height: 16 }} />
                    <span className="detail-stat-value">{movie.vote_average?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <span className="detail-stat-label">Rating</span>
                </div>

                {movie.release_date && (
                  <div className="detail-stat">
                    <span className="detail-stat-value">{movie.release_date.split('-')[0]}</span>
                    <span className="detail-stat-label">Year</span>
                  </div>
                )}
                {runtime && (
                  <div className="detail-stat">
                    <span className="detail-stat-value">{runtime}</span>
                    <span className="detail-stat-label">Runtime</span>
                  </div>
                )}
                {movie.original_language && (
                  <div className="detail-stat">
                    <span className="detail-stat-value">{movie.original_language.toUpperCase()}</span>
                    <span className="detail-stat-label">Language</span>
                  </div>
                )}
              </div>

              {/* Overview card */}
              {movie.overview && (
                <div className="detail-card detail-card-overview">
                  <p className="detail-overview-text">{movie.overview}</p>
                </div>
              )}
            </div>

            {/* Genres */}
            {movie.genres?.length > 0 && (
              <div className="genres">
                {movie.genres.map((g) => (
                  <span key={g.id} className="genre-tag">{g.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Trailer ── */}
        {trailer && (
          <section className="detail-section">
            <h2>Trailer</h2>
            <div className="trailer-wrap">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`}
                title={trailer.name || 'Trailer'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="trailer-iframe"
              />
            </div>
          </section>
        )}

        {/* ── Cast ── */}
        {cast.length > 0 && (
          <section className="detail-section">
            <h2>Cast</h2>
            <div className="cast-grid">
              {cast.map((member) => (
                <Link key={member.id} to={`/person/${member.id}`} className="cast-card">
                  <img
                    src={
                      member.profile_path
                        ? `https://image.tmdb.org/t/p/w185/${member.profile_path}`
                        : '/No-Poster.png'
                    }
                    alt={member.name}
                  />
                  <p className="cast-name">{member.name}</p>
                  <p className="cast-character">{member.character}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Crew ── */}
        {crew.length > 0 && (
          <section className="detail-section">
            <h2>Crew</h2>
            <div className="crew-grid">
              {crew.map((member) => (
                <Link
                  key={`${member.id}-${member.job}`}
                  to={`/person/${member.id}`}
                  className="crew-card"
                >
                  <img
                    src={
                      member.profile_path
                        ? `https://image.tmdb.org/t/p/w185/${member.profile_path}`
                        : '/No-Poster.png'
                    }
                    alt={member.name}
                  />
                  <p className="cast-name">{member.name}</p>
                  <p className="cast-character">{member.job}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
