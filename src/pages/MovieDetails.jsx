import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { API_BASE_URL, API_OPTIONS } from '../config'

function MovieDetails() {
  const { id } = useParams()
  const apiOptions = API_OPTIONS
  const apiBaseUrl = API_BASE_URL
  const [movie, setMovie] = useState(null)
  const [cast, setCast] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [detailsRes, creditsRes] = await Promise.all([
          fetch(`${apiBaseUrl}/movie/${id}`, apiOptions),
          fetch(`${apiBaseUrl}/movie/${id}/credits`, apiOptions),
        ])
        if (!detailsRes.ok || !creditsRes.ok) throw new Error('Failed to fetch')
        const [details, credits] = await Promise.all([detailsRes.json(), creditsRes.json()])
        setMovie(details)
        setCast(credits.cast?.slice(0, 12) || [])
      } catch {
        setError('Could not load movie details.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchDetails()
  }, [id, apiBaseUrl, apiOptions])

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
          <p className="text-red-400 text-sm mt-10">{error || 'Movie not found.'}</p>
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
      {/* Full-page blurred backdrop */}
      {backdropUrl && (
        <div className="movie-backdrop" style={{ backgroundImage: `url(${backdropUrl})` }} />
      )}

      <div className="wrapper detail-wrapper">
        {/* Hero: poster + info side by side */}
        <div className="movie-details-layout">
          <div className="movie-details-poster">
            <img src={posterUrl} alt={movie.title} />
          </div>

          <div className="movie-details-info">
            <h1 className="detail-title">{movie.title}</h1>

            {movie.tagline && (
              <p className="tagline">"{movie.tagline}"</p>
            )}

            <div className="meta-row">
              <div className="rating-badge">
                <img src="/star.svg" alt="rating" className="size-4" />
                <span>{movie.vote_average?.toFixed(1) || 'N/A'}</span>
              </div>
              {movie.release_date && (
                <span className="meta-chip">{movie.release_date.split('-')[0]}</span>
              )}
              {runtime && <span className="meta-chip">{runtime}</span>}
              {movie.original_language && (
                <span className="meta-chip">{movie.original_language.toUpperCase()}</span>
              )}
            </div>

            {movie.genres?.length > 0 && (
              <div className="genres">
                {movie.genres.map((g) => (
                  <span key={g.id} className="genre-tag">{g.name}</span>
                ))}
              </div>
            )}

            {movie.overview && (
              <div className="overview-section">
                <h3>Overview</h3>
                <p>{movie.overview}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="cast-section">
            <h2>Cast</h2>
            <div className="cast-grid">
              {cast.map((member) => (
                <div key={member.id} className="cast-card">
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
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default MovieDetails
