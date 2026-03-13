import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { API_BASE_URL, API_OPTIONS } from '../config'

export default function MovieDetails() {
  const { id } = useParams()
  const [movie, setMovie] = useState(null)
  const [cast, setCast] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Always start at the top when opening a movie
  useEffect(() => { window.scrollTo(0, 0) }, [id])

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [detailsRes, creditsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/movie/${id}`, API_OPTIONS),
          fetch(`${API_BASE_URL}/movie/${id}/credits`, API_OPTIONS),
        ])
        if (!detailsRes.ok || !creditsRes.ok) throw new Error('Failed to fetch')
        const [details, credits] = await Promise.all([detailsRes.json(), creditsRes.json()])
        setMovie(details)
        setCast(credits.cast?.slice(0, 15) || [])
      } catch {
        setError('Could not load movie details.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchDetails()
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
        <div className="movie-details-layout">
          <div className="movie-details-poster">
            <img src={posterUrl} alt={movie.title} />
          </div>

          <div className="movie-details-info">
            <h1 className="detail-title">{movie.title}</h1>

            <div className="detail-cards-row">
              {/* Left card — stats */}
              <div className="detail-card">
                <div className="detail-stat">
                  <img src="/star.svg" alt="rating" className="size-4" />
                  <span className="detail-stat-value">{movie.vote_average?.toFixed(1) || 'N/A'}</span>
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

              {/* Right card — overview */}
              {movie.overview && (
                <div className="detail-card detail-card-overview">
                  <p className="detail-overview-text">{movie.overview}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cast — each card links to the actor's page */}
        {cast.length > 0 && (
          <section className="cast-section">
            <h2>Cast</h2>
            <div className="cast-grid">
              {cast.map((member) => (
                <Link
                  key={member.id}
                  to={`/person/${member.id}`}
                  className="cast-card"
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
                  <p className="cast-character">{member.character}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
