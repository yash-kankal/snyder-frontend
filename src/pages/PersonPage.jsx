import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import Card from '../components/Card'
import { API_BASE_URL, API_OPTIONS } from '../config'

export default function PersonPage() {
  const { id } = useParams()
  const [person, setPerson] = useState(null)
  const [movies, setMovies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    const fetchPerson = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [personRes, creditsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/person/${id}`, API_OPTIONS),
          fetch(`${API_BASE_URL}/person/${id}/movie_credits`, API_OPTIONS),
        ])
        if (!personRes.ok || !creditsRes.ok) throw new Error('Failed to fetch')
        const [personData, creditsData] = await Promise.all([
          personRes.json(),
          creditsRes.json(),
        ])
        setPerson(personData)
        const sorted = [...(creditsData.cast || [])]
          .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
          .slice(0, 20)
        setMovies(sorted)
      } catch {
        setError('Could not load actor details.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchPerson()
  }, [id])

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <Spinner />
      </main>
    )
  }

  if (error || !person) {
    return (
      <main>
        <div className="wrapper">
          <p className="error-msg mt-10">{error || 'Person not found.'}</p>
        </div>
      </main>
    )
  }

  return (
    <main>
      <div className="wrapper">
        <div className="movie-details-layout">
          {/* Photo */}
          <div className="movie-details-poster">
            <img
              src={
                person.profile_path
                  ? `https://image.tmdb.org/t/p/w342/${person.profile_path}`
                  : '/No-Poster.png'
              }
              alt={person.name}
            />
          </div>

          {/* Info */}
          <div className="movie-details-info">
            <h1 className="detail-title">{person.name}</h1>

            <div className="meta-row">
              {person.known_for_department && (
                <span className="meta-chip">{person.known_for_department}</span>
              )}
              {person.birthday && (
                <span className="meta-chip">Born {person.birthday}</span>
              )}
              {person.place_of_birth && (
                <span className="meta-chip">{person.place_of_birth}</span>
              )}
            </div>

            {person.biography && (
              <div className="overview-section">
                <h3>Biography</h3>
                <p className="person-bio">{person.biography}</p>
              </div>
            )}
          </div>
        </div>

        {/* Filmography */}
        {movies.length > 0 && (
          <section className="cast-section">
            <h2>Known For</h2>
            <ul className="all-movies-grid mt-5">
              {movies.map((movie) => (
                <Card key={`${movie.id}-${movie.character}`} movie={movie} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
